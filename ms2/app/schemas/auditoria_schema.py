from typing import Optional
from pydantic import BaseModel


class AuditoriaResponse(BaseModel):
    eventoId: str
    documentoId: str
    activoId: str
    accion: str  # CREAR | VER | DESCARGAR | ACTUALIZAR | ELIMINAR
    usuario: str
    ipOrigen: str
    detalles: Optional[str] = None
    timestamp: str
