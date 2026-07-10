"""Controlador REST de auditoría — CU-31 (vista global de auditoría)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.jwt_middleware import get_current_user
from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.services.auditoria_service import AuditoriaService

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


async def _get_auditoria_service() -> AuditoriaService:
    return AuditoriaService(DynamoDBAdapter())


@router.get("/{documento_id}")
async def get_auditoria(
    documento_id: str,
    current_user: dict = Depends(get_current_user),
    service: AuditoriaService = Depends(_get_auditoria_service),
):
    """Retorna el log de auditoría de un documento. Solo ADMINISTRADOR y AUDITOR."""
    roles = current_user.get("roles", [])
    if not any(r in roles for r in ["ROLE_ADMINISTRADOR", "ROLE_AUDITOR"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a auditores y administradores",
        )
    return service.obtener_por_documento(documento_id)
