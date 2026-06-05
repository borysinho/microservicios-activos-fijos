"""Controlador IA/ML — CU-35/36, CU-61, CU-62, CU-63, CU-65, CU-66.

Rutas registradas bajo /api:
  POST  /ia/diagnostico              — diagnóstico CNN (CU-35/36)
  GET   /ml/prediccion-vida-util     — Random Forest vida útil + riesgo (CU-61/62)
  GET   /ml/clustering               — K-Means clustering (CU-63/66)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.auth.jwt_middleware import get_current_user
from app.modelos.model_loader import model_loader
from app.schemas.ia_schema import ClusteringResponse, DiagnosticoResponse, PrediccionVidaUtilResponse
from app.services.diagnostico_ia_service import DiagnosticoIAService
from app.services.ml_service import MLService

logger = logging.getLogger(__name__)

# Dos sub-routers para separar prefijos /ia y /ml
ia_router = APIRouter(prefix="/ia", tags=["IA"])
ml_router = APIRouter(prefix="/ml", tags=["ML"])

_diagnostico_service = DiagnosticoIAService()
_ml_service = MLService()

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

    return DiagnosticoResponse(
        activoId=activoId,
        diagnostico=resultado["diagnostico"],
        confianza=resultado["confianza"],
        recomendacion=resultado["recomendacion"],
    )


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
