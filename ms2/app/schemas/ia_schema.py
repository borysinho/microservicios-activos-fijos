"""Esquemas Pydantic para IA y ML — CU-35/36, CU-61, CU-62, CU-63."""

from typing import List, Literal, Optional
from pydantic import BaseModel


# ── Diagnóstico CNN (CU-35/36) ────────────────────────────────────────────────

class DiagnosticoRequest(BaseModel):
    activoId: Optional[str] = None


class DiagnosticoResponse(BaseModel):
    activoId: Optional[str] = None
    diagnostico: str  # BUENO | DETERIORADO | REQUIERE_MANTENIMIENTO | OXIDADO
    confianza: float  # 0.0 – 1.0
    recomendacion: str
    imagenS3Key: Optional[str] = None


# ── Predicción de vida útil — Random Forest (CU-61/62) ───────────────────────

class PrediccionVidaUtilResponse(BaseModel):
    categoriaId: Optional[str] = None
    vidaUtilRestante: int          # meses restantes (regresión)
    probabilidad_fallo_6m: float   # 0.0 – 1.0 (clasificación)
    cluster: int                   # índice del cluster K-Means
    cluster_label: str             # "Alta criticidad" | "Mantenimiento regular" | "Rendimiento eficiente"
    confianza: float               # confianza del modelo RF


# ── Clustering K-Means (CU-63/66) ────────────────────────────────────────────

class ClusterItem(BaseModel):
    id: int
    nombre: str
    activos: List[str]  # lista de activoIds o nombres


class ClusteringResponse(BaseModel):
    clusters: List[ClusterItem]
