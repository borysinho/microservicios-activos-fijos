"""Esquemas Pydantic para IA y ML — CU-35/36, CU-61, CU-62, CU-63."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ── Verificacion visual IA (CU-35/36) ─────────────────────────────────────────

class DiagnosticoRequest(BaseModel):
    activoId: Optional[str] = None


class VerificacionVisualItem(BaseModel):
    criterio: str
    resultado: str
    detalle: str


class DiagnosticoResponse(BaseModel):
    activoId: Optional[str] = None
    diagnostico: str  # EVIDENCIA_VALIDADA | REQUIERE_REVISION | FOTO_NO_CONFIABLE | POSIBLE_INCONSISTENCIA
    confianza: float  # 0.0 - 1.0
    recomendacion: str
    imagenS3Key: Optional[str] = None
    # Alias consumidos por la app móvil React Native.
    estado: Optional[str] = None
    detalle: Optional[str] = None
    imagenUrl: Optional[str] = None
    fechaDiagnostico: Optional[str] = None
    tipoAnalisis: Optional[str] = None
    verificaciones: List[VerificacionVisualItem] = Field(default_factory=list)
    metricas: dict[str, Any] = Field(default_factory=dict)
    similitudReferencia: Optional[float] = None
    referenciaS3Key: Optional[str] = None
    senalModelo: Optional[dict[str, Any]] = None


# ── Predicción de vida útil — Random Forest (CU-61/62) ───────────────────────

class PrediccionVidaUtilResponse(BaseModel):
    categoriaId: Optional[str] = None
    vidaUtilRestante: int          # meses restantes (regresión)
    probabilidad_fallo_6m: float   # 0.0 – 1.0 (clasificación)
    cluster: int                   # índice del cluster K-Means
    cluster_label: str             # "Alta criticidad" | "Mantenimiento regular" | "Rendimiento eficiente"
    confianza: float               # confianza del modelo RF
    recomendacion_mantenimiento: str  # CU-65: recomendación textual de mantenimiento preventivo


# ── Clustering K-Means (CU-63/66) ────────────────────────────────────────────

class ClusterItem(BaseModel):
    id: int
    nombre: str
    activos: List[str]  # lista de activoIds o nombres


class ClusteringResponse(BaseModel):
    clusters: List[ClusterItem]
