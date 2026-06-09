"""Controlador IA/ML — CU-35/36, CU-61, CU-62, CU-63, CU-65, CU-66.

Rutas registradas bajo /api:
  POST  /ia/diagnostico              — diagnóstico CNN (CU-35/36)
  GET   /ml/prediccion-vida-util     — Random Forest vida útil + riesgo (CU-61/62)
  GET   /ml/clustering               — K-Means clustering (CU-63/66)
"""

import logging
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


# ── CU-35/36: Diagnóstico CNN ────────────────────────────────────────────────

@ia_router.post(
    "/diagnostico",
    response_model=DiagnosticoResponse,
    status_code=status.HTTP_200_OK,
    summary="CU-35/36 — Diagnóstico de estado del activo por imagen (CNN)",
)
async def diagnostico_imagen(
    request: Request,
    imagen: UploadFile = File(..., description="Imagen JPG/PNG/WEBP del activo"),
    activoId: Optional[str] = Form(None, description="UUID del activo (opcional)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Recibe una imagen del activo, ejecuta la CNN y retorna el estado diagnosticado
    con su nivel de confianza y recomendación de acción.

    Clases posibles: BUENO | DETERIORADO | REQUIERE_MANTENIMIENTO | OXIDADO
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

    resultado = _diagnostico_service.inferir(
        imagen_bytes=imagen_bytes,
        cnn_model=model_loader.cnn_model,
    )

    # ── Persistencia: imagen en S3 + registro en DynamoDB (CU-35/36) ─────────
    s3, auditoria = _get_infraestructura()
    imagen_s3_key: Optional[str] = None

    if s3 is not None:
        try:
            diagnostico_id = str(uuid4())
            s3_key = f"diagnosticos/{activoId or 'unknown'}/{diagnostico_id}{_ext(imagen.content_type)}"
            s3.upload(imagen_bytes, s3_key, imagen.content_type)
            imagen_s3_key = s3_key
            logger.info("Imagen diagnóstico subida a S3: %s", s3_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo subir imagen a S3: %s", exc)

    if auditoria is not None:
        try:
            usuario = current_user.get("sub", "desconocido")
            ip = request.client.host if request.client else "0.0.0.0"
            auditoria.registrar(
                documento_id=imagen_s3_key or "sin-s3",
                activo_id=activoId or "",
                accion="DIAGNOSTICO_CNN",
                usuario=usuario,
                ip_origen=ip,
                detalles={
                    "diagnostico": resultado["diagnostico"],
                    "confianza": resultado["confianza"],
                    "recomendacion": resultado["recomendacion"],
                    "imagenS3Key": imagen_s3_key,
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("No se pudo registrar diagnóstico en DynamoDB: %s", exc)

    return DiagnosticoResponse(
        activoId=activoId,
        diagnostico=resultado["diagnostico"],
        confianza=resultado["confianza"],
        recomendacion=resultado["recomendacion"],
        imagenS3Key=imagen_s3_key,
    )


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
def prediccion_vida_util(
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
def clustering(
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
