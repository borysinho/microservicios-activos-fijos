from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.config import settings


def get_current_user(request: Request) -> dict:
    """
    Extrae y valida el JWT emitido por MS1.
    Retorna el payload con 'sub' (username) y 'roles'.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        username: str = payload.get("sub", "")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sin subject",
            )
        return {"username": username, "roles": payload.get("roles", [])}
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_roles(*allowed_roles: str):
    """Dependencia que restringe el acceso a roles específicos."""

    def _check(request: Request) -> dict:
        user = get_current_user(request)
        user_roles: list[str] = user.get("roles", [])
        if not any(r in user_roles for r in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta operación",
            )
        return user

    return _check
