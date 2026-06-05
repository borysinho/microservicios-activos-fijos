"""Tests de integración del DocumentoController — endpoints REST (CU-26 a CU-33)."""

import io
import os
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

# Importar DESPUÉS de que conftest.py establezca las variables de entorno
from main import app

client = TestClient(app, raise_server_exceptions=True)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS512"


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
    def test_upload_201(self, aws_mock):
        token = _make_token()
        resp = client.post(
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

    def test_upload_401_sin_token(self, aws_mock):
        resp = client.post(
            "/api/documentos/upload",
            files={"file": ("test.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-001", "tipo": "FACTURA"},
        )
        assert resp.status_code == 401

    def test_upload_400_tipo_no_permitido(self, aws_mock):
        token = _make_token()
        resp = client.post(
            "/api/documentos/upload",
            files={"file": ("malware.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
            data={"activoId": "activo-001", "tipo": "OTRO"},
            headers=_auth(token),
        )
        assert resp.status_code == 400


class TestListarDocumentos:
    def test_listar_por_activo_retorna_200(self, aws_mock):
        token = _make_token()
        # Subir primero
        client.post(
            "/api/documentos/upload",
            files={"file": ("doc.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-002", "tipo": "CONTRATO"},
            headers=_auth(token),
        )
        resp = client.get("/api/documentos?activoId=activo-002", headers=_auth(token))
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) >= 1

    def test_filtro_tipo(self, aws_mock):
        token = _make_token()
        client.post(
            "/api/documentos/upload",
            files={"file": ("fac.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-003", "tipo": "FACTURA"},
            headers=_auth(token),
        )
        client.post(
            "/api/documentos/upload",
            files={"file": ("pol.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-003", "tipo": "POLIZA"},
            headers=_auth(token),
        )
        resp = client.get("/api/documentos?activoId=activo-003&tipo=FACTURA", headers=_auth(token))
        body = resp.json()
        assert all(d["tipo"] == "FACTURA" for d in body)


class TestVersiones:
    def test_nueva_version_retorna_version_2(self, aws_mock):
        token = _make_token()
        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("v1.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-v", "tipo": "MANUAL"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]

        resp = client.put(
            f"/api/documentos/{doc_id}/version",
            files={"file": ("v2.pdf", io.BytesIO(b"%PDF v2"), "application/pdf")},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["version"] == 2

    def test_historial_versiones(self, aws_mock):
        token = _make_token()
        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("hist.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-hist", "tipo": "CONTRATO"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        client.put(
            f"/api/documentos/{doc_id}/version",
            files={"file": ("hist_v2.pdf", io.BytesIO(b"%PDF v2"), "application/pdf")},
            headers=_auth(token),
        )

        resp = client.get(f"/api/documentos/{doc_id}/versiones", headers=_auth(token))
        assert resp.status_code == 200
        assert len(resp.json()) == 2


class TestSoftDelete:
    def test_delete_retorna_200(self, aws_mock):
        token = _make_token()
        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("del.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-del", "tipo": "FACTURA"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]

        resp = client.delete(f"/api/documentos/{doc_id}", headers=_auth(token))
        assert resp.status_code == 200

    def test_documento_eliminado_no_aparece_en_lista(self, aws_mock):
        token = _make_token()
        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("hidden.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-hidden", "tipo": "OTRO"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        client.delete(f"/api/documentos/{doc_id}", headers=_auth(token))

        resp = client.get("/api/documentos?activoId=activo-hidden", headers=_auth(token))
        ids = [d["documentoId"] for d in resp.json()]
        assert doc_id not in ids


class TestAuditoriaEndpoint:
    def test_auditoria_solo_admin_o_auditor(self, aws_mock):
        token_admin = _make_token(roles=["ROLE_ADMINISTRADOR"])
        token_responsable = _make_token(roles=["ROLE_RESPONSABLE_AREA"])

        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("audit.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-audit", "tipo": "CONTRATO"},
            headers=_auth(token_admin),
        )
        doc_id = upload.json()["documentoId"]

        resp_ok = client.get(f"/api/documentos/{doc_id}/auditoria", headers=_auth(token_admin))
        assert resp_ok.status_code == 200

        resp_forbidden = client.get(
            f"/api/documentos/{doc_id}/auditoria",
            headers=_auth(token_responsable),
        )
        assert resp_forbidden.status_code == 403

    def test_auditoria_contiene_evento_crear(self, aws_mock):
        token = _make_token(roles=["ROLE_ADMINISTRADOR"])
        upload = client.post(
            "/api/documentos/upload",
            files={"file": ("aud2.pdf", io.BytesIO(PDF_BYTES), "application/pdf")},
            data={"activoId": "activo-aud2", "tipo": "POLIZA"},
            headers=_auth(token),
        )
        doc_id = upload.json()["documentoId"]
        resp = client.get(f"/api/documentos/{doc_id}/auditoria", headers=_auth(token))
        acciones = [e["accion"] for e in resp.json()]
        assert "CREAR" in acciones


class TestHealthEndpoint:
    def test_health_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
