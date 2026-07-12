"""Tests de integración del DocumentoController — endpoints REST (CU-26 a CU-33)."""

import io
import os
from datetime import datetime, timedelta, timezone

import httpx
import pytest
import pytest_asyncio
from jose import jwt

# Importar DESPUÉS de que conftest.py establezca las variables de entorno
from main import app

pytestmark = pytest.mark.asyncio

JWT_SECRET = os.environ["MS2_JWT_SECRET"]
JWT_ALGORITHM = "HS512"


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


def _make_token(username: str = "admin", roles: list[str] | None = None) -> str:
    if roles is None:
        roles = ["ROLE_ADMINISTRADOR"]
    payload = {
        "sub": username,
        "roles": roles,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


PDF_BYTES = b"%PDF-1.4 test content"


class TestUploadEndpoint:
    async def test_upload_201(self, aws_mock, client):
        token = _make_token()
        resp = await client.post(
            "/api/documentos/upload",
            files={"file": ("test.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-001", "tipo": "FACTURA"},
            headers=_auth(token),
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["activoId"] == "activo-001"
        assert body["version"] == 1
        assert body["activo"] is True

    async def test_upload_401_sin_token(self, aws_mock, client):
        resp = await client.post(
            "/api/documentos/upload",
            files={"file": ("test.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-001", "tipo": "FACTURA"},
        )
        assert resp.status_code == 401

    async def test_upload_400_tipo_no_permitido(self, aws_mock, client):
        token = _make_token()
        resp = await client.post(
            "/api/documentos/upload",
            files={"file": ("malware.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
            data={"activoId": "activo-001", "tipo": "OTRO"},
            headers=_auth(token),
        )
        assert resp.status_code == 400


class TestListarDocumentos:
    async def test_listar_por_activo_retorna_200(self, aws_mock, client):
        token = _make_token()
        await client.post(
            "/api/documentos/upload",
            files={"file": ("doc.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-002", "tipo": "CONTRATO"},
            headers=_auth(token),
        )
        resp = await client.get("/api/documentos?activoId=activo-002", headers=_auth(token))
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) >= 1

    async def test_filtro_tipo(self, aws_mock, client):
        token = _make_token()
        await client.post(
            "/api/documentos/upload",
            files={"file": ("fac.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-003", "tipo": "FACTURA"},
            headers=_auth(token),
        )
        await client.post(
            "/api/documentos/upload",
            files={"file": ("pol.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-003", "tipo": "POLIZA"},
            headers=_auth(token),
        )
        resp = await client.get("/api/documentos?activoId=activo-003&tipo=FACTURA", headers=_auth(token))
        body = resp.json()
        assert all(d["tipo"] == "FACTURA" for d in body)


class TestVersiones:
    async def test_nueva_version_retorna_version_2(self, aws_mock, client):
        token = _make_token()
        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("v1.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-v", "tipo": "MANUAL"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]

        resp = await client.put(
            f"/api/documentos/{doc_id}/version",
            files={"file": ("v2.pdf", io.BytesIO(b"%PDF v2"), "application/pdf")},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["version"] == 2

    async def test_historial_versiones(self, aws_mock, client):
        token = _make_token()
        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("hist.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-hist", "tipo": "CONTRATO"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        await client.put(
            f"/api/documentos/{doc_id}/version",
            files={"file": ("hist_v2.pdf", io.BytesIO(b"%PDF v2"), "application/pdf")},
            headers=_auth(token),
        )

        resp = await client.get(f"/api/documentos/{doc_id}/versiones", headers=_auth(token))
        assert resp.status_code == 200
        assert len(resp.json()) == 2


class TestSoftDelete:
    async def test_delete_retorna_200(self, aws_mock, client):
        token = _make_token()
        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("del.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-del", "tipo": "FACTURA"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]

        resp = await client.delete(f"/api/documentos/{doc_id}", headers=_auth(token))
        assert resp.status_code == 200

    async def test_documento_eliminado_no_aparece_en_lista(self, aws_mock, client):
        token = _make_token()
        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("hidden.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-hidden", "tipo": "OTRO"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        await client.delete(f"/api/documentos/{doc_id}", headers=_auth(token))

        resp = await client.get("/api/documentos?activoId=activo-hidden", headers=_auth(token))
        ids = [d["documentoId"] for d in resp.json()]
        assert doc_id not in ids


class TestAuditoriaEndpoint:
    async def test_auditoria_solo_admin_o_auditor(self, aws_mock, client):
        token_admin = _make_token(roles=["ROLE_ADMINISTRADOR"])
        token_responsable = _make_token(roles=["ROLE_RESPONSABLE_AREA"])

        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("audit.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-audit", "tipo": "CONTRATO"},
            headers=_auth(token_admin),
        )
        doc_id = upload.json()["documentoId"]

        resp_ok = await client.get(f"/api/documentos/{doc_id}/auditoria", headers=_auth(token_admin))
        assert resp_ok.status_code == 200

        resp_forbidden = await client.get(
            f"/api/documentos/{doc_id}/auditoria",
            headers=_auth(token_responsable),
        )
        assert resp_forbidden.status_code == 403

    async def test_auditoria_contiene_evento_crear(self, aws_mock, client):
        token = _make_token(roles=["ROLE_ADMINISTRADOR"])
        upload = await client.post(
            "/api/documentos/upload",
            files={"file": ("aud2.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-aud2", "tipo": "POLIZA"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        resp = await client.get(f"/api/documentos/{doc_id}/auditoria", headers=_auth(token))
        acciones = [e["accion"] for e in resp.json()]
        assert "CREAR" in acciones


class TestHealthEndpoint:
    async def test_health_ok(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
