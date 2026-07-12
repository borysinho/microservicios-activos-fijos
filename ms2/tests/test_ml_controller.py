"""Tests de endpoints ML y auditoria de predicciones."""

import os
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import pytest_asyncio
from jose import jwt

from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.services.auditoria_service import AuditoriaService
from main import app

pytestmark = pytest.mark.asyncio

JWT_SECRET = os.environ["MS2_JWT_SECRET"]
JWT_ALGORITHM = "HS512"


@pytest_asyncio.fixture
async def client(monkeypatch):
    import app.controllers.ia_controller as ia_controller

    monkeypatch.setattr(ia_controller, "_s3", None)
    monkeypatch.setattr(ia_controller, "_auditoria", None)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


def _make_token(username: str = "admin", roles: list[str] | None = None) -> str:
    payload = {
        "sub": username,
        "roles": roles or ["ROLE_ADMINISTRADOR"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_prediccion_vida_util_registra_auditoria_ml(aws_mock, client):
    token = _make_token()

    resp = await client.get(
        "/api/ml/prediccion-vida-util?categoriaId=cat-a&valorAdquisicion=1000&aniosFabricacion=2",
        headers=_auth(token),
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["categoriaId"] == "cat-a"
    eventos = AuditoriaService(DynamoDBAdapter()).obtener_por_documento("ml#vida-util#cat-a")
    assert len(eventos) == 1
    assert eventos[0]["accion"] == "PREDICCION_RANDOM_FOREST"
    assert eventos[0]["usuario"] == "admin"


async def test_clustering_registra_auditoria_ml(aws_mock, client):
    token = _make_token("auditor", ["ROLE_AUDITOR"])

    resp = await client.get("/api/ml/clustering?categoriaId=cat-b", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json()["clusters"]
    eventos = AuditoriaService(DynamoDBAdapter()).obtener_por_documento("ml#clustering#cat-b")
    assert len(eventos) == 1
    assert eventos[0]["accion"] == "CLUSTERING_KMEANS"
    assert eventos[0]["usuario"] == "auditor"
