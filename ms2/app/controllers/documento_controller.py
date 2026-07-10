"""Controlador REST para gestión documental — CU-26 a CU-33."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.auth.jwt_middleware import get_current_user
from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.infrastructure.s3_adapter import S3Adapter
from app.services.auditoria_service import AuditoriaService
from app.services.documento_service import DocumentoService

router = APIRouter(prefix="/documentos", tags=["Documentos"])

# ── Inyección de dependencias ─────────────────────────────────────────────────


async def _get_service() -> DocumentoService:
    s3 = S3Adapter()
    db = DynamoDBAdapter()
    auditoria = AuditoriaService(db)
    return DocumentoService(s3, db, auditoria)


# ── CU-26: Cargar documento ───────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_documento(
    request: Request,
    file: UploadFile = File(...),
    activoId: str = Form(...),
    tipo: str = Form(...),
    nombre: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-26 — Subir un documento a S3 y registrar metadatos en DynamoDB."""
    nombre_final = nombre or file.filename or "documento"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    ip = request.client.host if request.client else "0.0.0.0"

    try:
        doc = service.cargar(
            activo_id=activoId,
            nombre=nombre_final,
            tipo=tipo,
            file_data=data,
            content_type=content_type,
            usuario=current_user["username"],
            ip_origen=ip,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return doc


# ── CU-27: URL presignada ─────────────────────────────────────────────────────

@router.get("/{documento_id}/url")
async def get_url(
    documento_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-27 — Retorna URL presignada de S3 válida 15 minutos."""
    ip = request.client.host if request.client else "0.0.0.0"
    return service.url_descarga(documento_id, current_user["username"], ip)


# ── CU-28: Nueva versión ──────────────────────────────────────────────────────

@router.put("/{documento_id}/version")
async def nueva_version(
    documento_id: str,
    request: Request,
    file: UploadFile = File(...),
    nombre: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-28 — Sube una nueva versión del documento."""
    nombre_final = nombre or file.filename or "documento"
    content_type = file.content_type or "application/octet-stream"
    data = await file.read()
    ip = request.client.host if request.client else "0.0.0.0"

    try:
        doc = service.nueva_version(
            documento_id=documento_id,
            nombre=nombre_final,
            file_data=data,
            content_type=content_type,
            usuario=current_user["username"],
            ip_origen=ip,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return doc


# ── CU-29: Historial de versiones ─────────────────────────────────────────────

@router.get("/{documento_id}/versiones")
async def get_versiones(
    documento_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-29 — Lista todas las versiones de un documento."""
    ip = request.client.host if request.client else "0.0.0.0"
    return service.versiones(documento_id, current_user["username"], ip)


# ── CU-30: Soft delete ────────────────────────────────────────────────────────

@router.delete("/{documento_id}")
async def eliminar_documento(
    documento_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-30 — Elimina (soft delete) el documento. El log de auditoría persiste."""
    ip = request.client.host if request.client else "0.0.0.0"
    return service.eliminar(documento_id, current_user["username"], ip)


# ── CU-31: Log de auditoría de un documento ────────────────────────────────────

@router.get("/{documento_id}/auditoria")
async def get_auditoria_documento(
    documento_id: str,
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-31 — Historial de acciones sobre un documento específico."""
    roles = current_user.get("roles", [])
    if not any(r in roles for r in ["ROLE_ADMINISTRADOR", "ROLE_AUDITOR"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores y auditores pueden ver el log de auditoría",
        )
    db = DynamoDBAdapter()
    audit_svc = AuditoriaService(db)
    return audit_svc.obtener_por_documento(documento_id)


# ── CU-32/33: Listar y buscar documentos ─────────────────────────────────────

@router.get("")
async def listar_documentos(
    activoId: str,
    tipo: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    service: DocumentoService = Depends(_get_service),
):
    """CU-32/33 — Lista documentos de un activo con filtros opcionales."""
    return service.listar_por_activo(activo_id=activoId, tipo=tipo, desde=desde, hasta=hasta)
