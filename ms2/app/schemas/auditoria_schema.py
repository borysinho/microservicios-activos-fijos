from typing import Optional
from pydantic import BaseModel


class AuditoriaResponse(BaseModel):
    eventoId: str
    documentoId: str
    activoId: str
    accion: str  # CREAR | LISTAR | VER | DESCARGAR | ACTUALIZAR | ELIMINAR | IA/ML
    usuario: str
    ipOrigen: str
    detalles: Optional[str] = None
    timestamp: str
