"""Controlador IA/ML — CU-35/36, CU-61, CU-62, CU-63, CU-65, CU-66.

Rutas registradas bajo /api:
  POST  /ia/diagnostico              — verificación visual IA (CU-35/36)
  GET   /ml/prediccion-vida-util     — Random Forest vida útil + riesgo (CU-61/62)
  GET   /ml/clustering               — K-Means clustering (CU-63/66)
"""

import logging
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.auth.jwt_middleware import get_current_user
from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.infrastructure.s3_adapter import S3Adapter
from app.modelos.model_loader import model_loader
from app.schemas.ia_schema import ClusteringResponse, DiagnosticoResponse, PrediccionVidaUtilResponse
from app.services.auditoria_service import AuditoriaService
from app.services.diagnostico_ia_service import DiagnosticoIAService
from app.services.ml_service import MLService

logger = logging.getLogger(__name__)

# Dos sub-routers para separar prefijos /ia y /ml
ia_router = APIRouter(prefix="/ia", tags=["IA"])
ml_router = APIRouter(prefix="/ml", tags=["ML"])

_diagnostico_service = DiagnosticoIAService()
_ml_service = MLService()

# Infraestructura AWS — instanciada con lazy init para tolerancia a fallos en dev
_s3: Optional[S3Adapter] = None
_auditoria: Optional[AuditoriaService] = None


def _get_infraestructura() -> tuple[Optional[S3Adapter], Optional[AuditoriaService]]:
    """Inicializa S3 y AuditoriaService la primera vez que se necesitan (lazy)."""
    global _s3, _auditoria  # noqa: PLW0603
    if _s3 is None:
        try:
            _s3 = S3Adapter()
            _auditoria = AuditoriaService(DynamoDBAdapter())
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo inicializar infraestructura AWS: %s", exc)
    return _s3, _auditoria

# ── Tipos de imagen permitidos ────────────────────────────────────────────────
_MIME_IMAGEN = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


# ── CU-35/36: Verificación visual IA ─────────────────────────────────────────

@ia_router.post(
    "/diagnostico",
    response_model=DiagnosticoResponse,
    status_code=status.HTTP_200_OK,
    summary="CU-35/36 — Verificación visual del activo por imagen (IA)",
)
@ia_router.post(
    "/diagnostico-imagen",
    response_model=DiagnosticoResponse,
    status_code=status.HTTP_200_OK,
    summary="CU-35/36 — Verificación visual del activo por imagen (alias móvil)",
)
async def diagnostico_imagen(
    request: Request,
    imagen: UploadFile = File(..., description="Imagen JPG/PNG/WEBP del activo"),
    activoId: Optional[str] = Form(None, description="UUID del activo (opcional)"),
    codigoEsperado: Optional[str] = Form(None, description="Código patrimonial esperado (opcional)"),
    imagenReferenciaS3Key: Optional[str] = Form(None, description="Imagen histórica S3 para comparación (opcional)"),
    latitud: Optional[float] = Form(None, description="Latitud GPS enviada por mobile (opcional)"),
    longitud: Optional[float] = Form(None, description="Longitud GPS enviada por mobile (opcional)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Recibe una imagen del activo y genera una verificación visual auditable.

    No determina el estado físico exacto. La salida indica si la foto es una
    evidencia válida, si requiere revisión humana, si no es confiable o si
    difiere de una fotografía histórica del activo.
    """
    content_type = imagen.content_type or ""
    if content_type not in _MIME_IMAGEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido: {content_type}. Use JPG, PNG o WEBP.",
        )

    imagen_bytes = await imagen.read()
    if len(imagen_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío.",
        )

    # ── Persistencia: imagen en S3 + registro en DynamoDB (CU-35/36) ─────────
    s3, auditoria = _get_infraestructura()
    imagen_s3_key: Optional[str] = None
    imagen_s3_url: Optional[str] = None
    referencia_s3_key: Optional[str] = imagenReferenciaS3Key
    referencia_bytes: Optional[bytes] = None
    fecha_diagnostico = datetime.now(timezone.utc).isoformat()

    if referencia_s3_key is None and auditoria is not None and activoId:
        referencia_s3_key = _ultima_imagen_historial(auditoria, activoId)

    if s3 is not None and referencia_s3_key:
        try:
            referencia_bytes = s3.download_bytes(referencia_s3_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo descargar imagen histórica %s: %s", referencia_s3_key, exc)
            referencia_s3_key = None

    resultado = _diagnostico_service.inferir(
        imagen_bytes=imagen_bytes,
        cnn_model=model_loader.cnn_model,
        referencia_bytes=referencia_bytes,
        codigo_esperado=codigoEsperado,
    )

    if s3 is not None:
        try:
            diagnostico_id = str(uuid4())
            s3_key = f"verificaciones/{activoId or 'unknown'}/{diagnostico_id}{_ext(imagen.content_type)}"
            imagen_s3_url = s3.upload(imagen_bytes, s3_key, imagen.content_type)
            imagen_s3_key = s3_key
            logger.info("Imagen de verificación subida a S3: %s", s3_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo subir imagen a S3: %s", exc)

    if auditoria is not None:
        try:
            usuario = current_user.get("username", "desconocido")
            ip = request.client.host if request.client else "0.0.0.0"
            auditoria.registrar(
                documento_id=imagen_s3_key or "sin-s3",
                activo_id=activoId or "",
                accion="DIAGNOSTICO_CNN",
                usuario=usuario,
                ip_origen=ip,
                detalles={
                    "diagnostico": resultado["diagnostico"],
                    "estado": resultado.get("estado") or _estado_mobile(resultado["diagnostico"]),
                    "confianza": resultado["confianza"],
                    "detalle": resultado["detalle"],
                    "recomendacion": resultado["recomendacion"],
                    "imagenS3Key": imagen_s3_key,
                    "imagenUrl": imagen_s3_url,
                    "fechaDiagnostico": fecha_diagnostico,
                    "tipoAnalisis": resultado.get("tipoAnalisis"),
                    "verificaciones": resultado.get("verificaciones", []),
                    "metricas": resultado.get("metricas", {}),
                    "similitudReferencia": resultado.get("similitudReferencia"),
                    "referenciaS3Key": referencia_s3_key,
                    "senalModelo": resultado.get("senalModelo"),
                    "codigoEsperado": codigoEsperado,
                    "latitud": latitud,
                    "longitud": longitud,
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo registrar verificación en DynamoDB: %s", exc)

    return DiagnosticoResponse(
        activoId=activoId,
        diagnostico=resultado["diagnostico"],
        confianza=resultado["confianza"],
        recomendacion=resultado["recomendacion"],
        imagenS3Key=imagen_s3_key,
        estado=resultado.get("estado") or _estado_mobile(resultado["diagnostico"]),
        detalle=resultado["detalle"],
        imagenUrl=imagen_s3_url,
        fechaDiagnostico=fecha_diagnostico,
        tipoAnalisis=resultado.get("tipoAnalisis"),
        verificaciones=resultado.get("verificaciones", []),
        metricas=resultado.get("metricas", {}),
        similitudReferencia=resultado.get("similitudReferencia"),
        referenciaS3Key=referencia_s3_key,
        senalModelo=resultado.get("senalModelo"),
    )


@ia_router.get(
    "/diagnosticos",
    summary="CU-38 — Historial de verificaciones visuales IA por activo",
)
async def historial_diagnosticos(
    activoId: str,
    current_user: dict = Depends(get_current_user),
):
    """Retorna verificaciones visuales registradas para la app móvil y el detalle del activo."""
    try:
        auditoria = AuditoriaService(DynamoDBAdapter())
        eventos = auditoria.obtener_diagnosticos_por_activo(activoId)
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo consultar historial de verificaciones: %s", exc)
        return []

    historial = []
    for evento in eventos:
        detalles_raw = evento.get("detalles") or "{}"
        try:
            detalles = json.loads(detalles_raw)
        except json.JSONDecodeError:
            detalles = {}

        diagnostico = detalles.get("diagnostico", "REQUIERE_REVISION")
        confianza = float(detalles.get("confianza", 0.0))
        historial.append(
            {
                "id": evento.get("eventoId"),
                "activoId": evento.get("activoId", activoId),
                "estado": detalles.get("estado") or _estado_mobile(diagnostico),
                "diagnostico": diagnostico,
                "confianza": confianza,
                "detalle": detalles.get("detalle") or _detalle_diagnostico(diagnostico, confianza),
                "recomendacion": detalles.get("recomendacion", ""),
                "imagenS3Key": detalles.get("imagenS3Key"),
                "imagenUrl": detalles.get("imagenUrl"),
                "fechaDiagnostico": detalles.get("fechaDiagnostico") or evento.get("timestamp"),
                "tipoAnalisis": detalles.get("tipoAnalisis"),
                "verificaciones": detalles.get("verificaciones", []),
                "metricas": detalles.get("metricas", {}),
                "similitudReferencia": detalles.get("similitudReferencia"),
                "referenciaS3Key": detalles.get("referenciaS3Key"),
                "senalModelo": detalles.get("senalModelo"),
            }
        )
    return historial


def _estado_mobile(diagnostico: str) -> str:
    return diagnostico.lower()


def _detalle_diagnostico(diagnostico: str, confianza: float) -> str:
    porcentaje = round(confianza * 100, 1)
    return f"Verificación {diagnostico.replace('_', ' ').lower()} con {porcentaje}% de confianza."


def _ultima_imagen_historial(auditoria: AuditoriaService, activo_id: str) -> Optional[str]:
    """Obtiene la última imagen histórica registrada para comparar evidencia."""
    try:
        eventos = auditoria.obtener_diagnosticos_por_activo(activo_id)
        for evento in eventos:
            detalles_raw = evento.get("detalles") or "{}"
            try:
                detalles = json.loads(detalles_raw)
            except json.JSONDecodeError:
                continue
            s3_key = detalles.get("imagenS3Key")
            if s3_key:
                return s3_key
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo obtener referencia histórica del activo %s: %s", activo_id, exc)
    return None


def _ext(content_type: Optional[str]) -> str:
    """Retorna la extensión de archivo según el content-type."""
    _map = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    return _map.get(content_type or "", ".jpg")


# ── CU-61/62: Predicción de vida útil y riesgo de fallo ──────────────────────

@ml_router.get(
    "/prediccion-vida-util",
    response_model=PrediccionVidaUtilResponse,
    summary="CU-61/62 — Predicción de vida útil (RF regresión) y probabilidad de fallo (RF clasificación)",
)
async def prediccion_vida_util(
    categoriaId: Optional[str] = None,
    valorAdquisicion: float = 0.0,
    aniosFabricacion: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """
    Predice los meses de vida útil restante del activo (Random Forest regresión)
    y la probabilidad de fallo en los próximos 6 meses (Random Forest clasificación).
    También retorna el cluster K-Means al que pertenece el activo.
    """
    resultado = _ml_service.predecir_vida_util(
        categoria_id=categoriaId,
        valor_adquisicion=valorAdquisicion,
        anios_fabricacion=aniosFabricacion,
        rf_model=model_loader.rf_model,
        kmeans_model=model_loader.kmeans_model,
    )
    return PrediccionVidaUtilResponse(**resultado)


# ── CU-63/66: Clustering K-Means ─────────────────────────────────────────────

@ml_router.get(
    "/clustering",
    response_model=ClusteringResponse,
    summary="CU-63/66 — Clustering de activos por patrones (K-Means)",
)
async def clustering(
    categoriaId: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Agrupa los activos en clusters según patrones de mantenimiento, vida útil
    y frecuencia de fallas usando K-Means.

    Retorna cada cluster con su etiqueta (Alta criticidad / Mantenimiento regular /
    Rendimiento eficiente) y la lista de activos pertenecientes.
    """
    resultado = _ml_service.clustering(
        categoria_id=categoriaId,
        kmeans_model=model_loader.kmeans_model,
    )
    return ClusteringResponse(**resultado)
