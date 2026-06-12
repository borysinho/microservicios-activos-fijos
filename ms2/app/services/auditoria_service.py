"""Servicio de auditoría — escribe eventos en DynamoDB."""

import json
from datetime import datetime, timezone
from uuid import uuid4

from app.infrastructure.dynamodb_adapter import DynamoDBAdapter


class AuditoriaService:
    def __init__(self, db: DynamoDBAdapter) -> None:
        self._db = db

    def registrar(
        self,
        documento_id: str,
        activo_id: str,
        accion: str,
        usuario: str,
        ip_origen: str,
        detalles: dict | None = None,
    ) -> str:
        evento_id = str(uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"evt#{evento_id}",
            "SK": timestamp,
            "eventoId": evento_id,
            "documentoId": documento_id,
            "activoId": activo_id,
            "accion": accion,
            "usuario": usuario,
            "ipOrigen": ip_origen,
            "detalles": json.dumps(detalles) if detalles else "",
            "timestamp": timestamp,
        }
        self._db.put_auditoria(item)
        return evento_id

    def obtener_por_documento(self, documento_id: str) -> list[dict]:
        return self._db.query_auditoria_by_documento(documento_id)

    def obtener_diagnosticos_por_activo(self, activo_id: str) -> list[dict]:
        return self._db.query_auditoria_by_activo_accion(activo_id, "DIAGNOSTICO_CNN")
