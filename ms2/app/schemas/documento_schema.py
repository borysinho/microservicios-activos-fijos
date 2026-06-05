from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────────────────────────

class DocumentoUploadRequest(BaseModel):
    activoId: str
    tipo: str  # FACTURA | POLIZA | CONTRATO | MANUAL | IMAGEN | OTRO
    nombre: Optional[str] = None


class DocumentoVersionRequest(BaseModel):
    nombre: Optional[str] = None


# ── Responses ─────────────────────────────────────────────────────────────────

class DocumentoResponse(BaseModel):
    documentoId: str
    activoId: str
    nombre: str
    tipo: str
    s3Key: str
    s3Url: str
    version: int
    subidoPor: str
    fechaCreacion: str
    activo: bool


class VersionResponse(BaseModel):
    documentoId: str
    version: int
    nombre: str
    s3Key: str
    fechaCreacion: str
    subidoPor: str
    activo: bool


class PresignedUrlResponse(BaseModel):
    documentoId: str
    url: str
    expiraEn: int  # segundos


# ── Filtros ───────────────────────────────────────────────────────────────────

class FiltroDocumento(BaseModel):
    activoId: Optional[str] = None
    tipo: Optional[str] = None
    desde: Optional[str] = None
    hasta: Optional[str] = None
