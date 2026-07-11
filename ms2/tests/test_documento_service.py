"""Tests del DocumentoService — CU-26 a CU-33."""

import pytest

from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.infrastructure.s3_adapter import S3Adapter
from app.services.auditoria_service import AuditoriaService
from app.services.documento_service import DocumentoService

ACTIVO_ID = "activo-uuid-001"
FILE_DATA = b"%PDF-1.4 fake content"
CONTENT_TYPE = "application/pdf"


def _build_service() -> DocumentoService:
    s3 = S3Adapter()
    db = DynamoDBAdapter()
    auditoria = AuditoriaService(db)
    return DocumentoService(s3, db, auditoria)


class TestCU26CargarDocumento:
    def test_cargar_crea_registro_en_dynamodb(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="factura.pdf",
            tipo="FACTURA",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        assert doc["documentoId"] is not None
        assert doc["activoId"] == ACTIVO_ID
        assert doc["version"] == 1
        assert doc["activo"] is True

    def test_cargar_rechaza_tipo_mime_invalido(self, aws_mock):
        svc = _build_service()
        with pytest.raises(ValueError, match="Tipo de archivo no permitido"):
            svc.cargar(
                activo_id=ACTIVO_ID,
                nombre="script.exe",
                tipo="OTRO",
                file_data=b"MZ",
                content_type="application/x-msdownload",
                usuario="admin",
                ip_origen="127.0.0.1",
            )

    def test_cargar_rechaza_archivo_demasiado_grande(self, aws_mock):
        svc = _build_service()
        big_file = b"x" * (51 * 1024 * 1024)  # 51 MB
        with pytest.raises(ValueError, match="límite"):
            svc.cargar(
                activo_id=ACTIVO_ID,
                nombre="gigante.pdf",
                tipo="OTRO",
                file_data=big_file,
                content_type="application/pdf",
                usuario="admin",
                ip_origen="127.0.0.1",
            )

    def test_cargar_registra_auditoria_crear(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="contrato.pdf",
            tipo="CONTRATO",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="10.0.0.1",
        )
        db = DynamoDBAdapter()
        audit = AuditoriaService(db)
        eventos = audit.obtener_por_documento(doc["documentoId"])
        assert len(eventos) == 1
        assert eventos[0]["accion"] == "CREAR"
        assert eventos[0]["usuario"] == "admin"


class TestCU27UrlDescarga:
    def test_url_presignada_se_genera(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="poliza.pdf",
            tipo="POLIZA",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        resultado = svc.url_descarga(doc["documentoId"], "lector", "127.0.0.1")
        assert "url" in resultado
        assert resultado["expiraEn"] == 900

    def test_url_descarga_registra_auditoria(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="manual.pdf",
            tipo="MANUAL",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        svc.url_descarga(doc["documentoId"], "responsable", "192.168.1.1")
        db = DynamoDBAdapter()
        audit = AuditoriaService(db)
        eventos = audit.obtener_por_documento(doc["documentoId"])
        acciones = [e["accion"] for e in eventos]
        assert "DESCARGAR" in acciones

    def test_url_documento_inexistente_retorna_404(self, aws_mock):
        from fastapi import HTTPException
        svc = _build_service()
        with pytest.raises(HTTPException) as exc_info:
            svc.url_descarga("no-existe", "user", "127.0.0.1")
        assert exc_info.value.status_code == 404


class TestCU28NuevaVersion:
    def test_nueva_version_incrementa_numero(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="contrato_v1.pdf",
            tipo="CONTRATO",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        doc_v2 = svc.nueva_version(
            documento_id=doc["documentoId"],
            nombre="contrato_v2.pdf",
            file_data=b"%PDF nuevo contenido",
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        assert doc_v2["version"] == 2

    def test_nueva_version_inactiva_version_anterior(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="doc.pdf",
            tipo="OTRO",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        svc.nueva_version(
            documento_id=doc["documentoId"],
            nombre="doc_v2.pdf",
            file_data=b"nuevo",
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        db = DynamoDBAdapter()
        v1 = db.get_documento(doc["documentoId"], 1)
        assert v1["activo"] is False


class TestCU29Versiones:
    def test_historial_retorna_todas_las_versiones(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="img.png",
            tipo="IMAGEN",
            file_data=b"\x89PNG",
            content_type="image/png",
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        svc.nueva_version(
            documento_id=doc["documentoId"],
            nombre="img_v2.png",
            file_data=b"\x89PNG v2",
            content_type="image/png",
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        versiones = svc.versiones(doc["documentoId"], "admin", "127.0.0.1")
        assert len(versiones) == 2


class TestCU30Eliminar:
    def test_soft_delete_oculta_documento(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="a_borrar.pdf",
            tipo="OTRO",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        svc.eliminar(doc["documentoId"], "admin", "127.0.0.1")
        db = DynamoDBAdapter()
        remaining = db.query_by_activo(ACTIVO_ID)
        ids = [d["documentoId"] for d in remaining]
        assert doc["documentoId"] not in ids

    def test_soft_delete_preserva_auditoria(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(
            activo_id=ACTIVO_ID,
            nombre="privado.pdf",
            tipo="CONTRATO",
            file_data=FILE_DATA,
            content_type=CONTENT_TYPE,
            usuario="admin",
            ip_origen="127.0.0.1",
        )
        svc.eliminar(doc["documentoId"], "admin", "127.0.0.1")
        db = DynamoDBAdapter()
        audit = AuditoriaService(db)
        eventos = audit.obtener_por_documento(doc["documentoId"])
        acciones = [e["accion"] for e in eventos]
        assert "ELIMINAR" in acciones


class TestCU3233ListarBuscar:
    def test_listar_retorna_documentos_del_activo(self, aws_mock):
        svc = _build_service()
        svc.cargar(ACTIVO_ID, "a.pdf", "FACTURA", FILE_DATA, CONTENT_TYPE, "admin", "127.0.0.1")
        svc.cargar(ACTIVO_ID, "b.pdf", "CONTRATO", FILE_DATA, CONTENT_TYPE, "admin", "127.0.0.1")
        docs = svc.listar_por_activo(ACTIVO_ID)
        assert len(docs) == 2

    def test_filtrar_por_tipo(self, aws_mock):
        svc = _build_service()
        svc.cargar(ACTIVO_ID, "a.pdf", "FACTURA", FILE_DATA, CONTENT_TYPE, "admin", "127.0.0.1")
        svc.cargar(ACTIVO_ID, "b.pdf", "CONTRATO", FILE_DATA, CONTENT_TYPE, "admin", "127.0.0.1")
        facturas = svc.listar_por_activo(ACTIVO_ID, tipo="FACTURA")
        assert len(facturas) == 1
        assert facturas[0]["tipo"] == "FACTURA"

    def test_listar_registra_acceso_en_auditoria(self, aws_mock):
        svc = _build_service()
        doc = svc.cargar(ACTIVO_ID, "a.pdf", "FACTURA", FILE_DATA, CONTENT_TYPE, "admin", "127.0.0.1")
        svc.listar_por_activo(ACTIVO_ID, usuario="auditor", ip_origen="10.0.0.5")

        eventos = AuditoriaService(DynamoDBAdapter()).obtener_por_documento(doc["documentoId"])
        acciones = [evento["accion"] for evento in eventos]
        assert "LISTAR" in acciones

    def test_activo_sin_documentos_retorna_lista_vacia(self, aws_mock):
        svc = _build_service()
        docs = svc.listar_por_activo("activo-sin-docs")
        assert docs == []
