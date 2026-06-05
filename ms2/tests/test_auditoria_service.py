"""Tests del AuditoriaService — CU-31."""

from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.services.auditoria_service import AuditoriaService


class TestAuditoriaService:
    def test_registrar_evento_persiste_en_dynamodb(self, aws_mock):
        db = DynamoDBAdapter()
        svc = AuditoriaService(db)
        evento_id = svc.registrar(
            documento_id="doc-001",
            activo_id="activo-001",
            accion="CREAR",
            usuario="admin",
            ip_origen="127.0.0.1",
            detalles={"nombre": "prueba.pdf"},
        )
        assert evento_id is not None

    def test_obtener_por_documento_retorna_eventos(self, aws_mock):
        db = DynamoDBAdapter()
        svc = AuditoriaService(db)
        svc.registrar("doc-002", "activo-002", "VER", "user1", "10.0.0.1")
        svc.registrar("doc-002", "activo-002", "DESCARGAR", "user2", "10.0.0.2")

        eventos = svc.obtener_por_documento("doc-002")
        assert len(eventos) == 2
        acciones = {e["accion"] for e in eventos}
        assert {"VER", "DESCARGAR"} == acciones

    def test_obtener_por_documento_diferente_no_mezcla(self, aws_mock):
        db = DynamoDBAdapter()
        svc = AuditoriaService(db)
        svc.registrar("doc-A", "activo-A", "CREAR", "admin", "127.0.0.1")
        svc.registrar("doc-B", "activo-B", "CREAR", "admin", "127.0.0.1")

        eventos_a = svc.obtener_por_documento("doc-A")
        assert all(e["documentoId"] == "doc-A" for e in eventos_a)

    def test_evento_contiene_campos_requeridos(self, aws_mock):
        db = DynamoDBAdapter()
        svc = AuditoriaService(db)
        svc.registrar("doc-003", "activo-003", "ELIMINAR", "auditor", "192.168.0.1")

        eventos = svc.obtener_por_documento("doc-003")
        evento = eventos[0]
        for campo in ("eventoId", "documentoId", "activoId", "accion", "usuario", "ipOrigen", "timestamp"):
            assert campo in evento, f"Campo '{campo}' ausente en el evento de auditoría"

    def test_documento_sin_eventos_retorna_lista_vacia(self, aws_mock):
        db = DynamoDBAdapter()
        svc = AuditoriaService(db)
        eventos = svc.obtener_por_documento("doc-inexistente")
        assert eventos == []
