"""Wrapper de boto3 para Amazon DynamoDB."""

from typing import Any, Optional

import boto3
from boto3.dynamodb.conditions import Attr, Key

from app.config import settings


class DynamoDBAdapter:
    def __init__(self) -> None:
        kwargs: dict = {
            "region_name": settings.aws_region,
            "aws_access_key_id": settings.aws_access_key_id,
            "aws_secret_access_key": settings.aws_secret_access_key,
        }
        if settings.aws_endpoint_url:
            kwargs["endpoint_url"] = settings.aws_endpoint_url
        self._resource = boto3.resource("dynamodb", **kwargs)
        self._docs_table_name = settings.dynamodb_table_docs
        self._audit_table_name = settings.dynamodb_table_auditoria

    # ── Table bootstrap ───────────────────────────────────────────────────────

    def ensure_tables(self) -> None:
        """Crea las tablas si no existen (desarrollo / tests)."""
        existing = {t.name for t in self._resource.tables.all()}

        if self._docs_table_name not in existing:
            self._resource.create_table(
                TableName=self._docs_table_name,
                KeySchema=[
                    {"AttributeName": "PK", "KeyType": "HASH"},
                    {"AttributeName": "SK", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "PK", "AttributeType": "S"},
                    {"AttributeName": "SK", "AttributeType": "S"},
                    {"AttributeName": "activoId", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "activoId-index",
                        "KeySchema": [{"AttributeName": "activoId", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )

        if self._audit_table_name not in existing:
            self._resource.create_table(
                TableName=self._audit_table_name,
                KeySchema=[
                    {"AttributeName": "PK", "KeyType": "HASH"},
                    {"AttributeName": "SK", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "PK", "AttributeType": "S"},
                    {"AttributeName": "SK", "AttributeType": "S"},
                    {"AttributeName": "documentoId", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "documentoId-index",
                        "KeySchema": [{"AttributeName": "documentoId", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )

    # ── Documentos ────────────────────────────────────────────────────────────

    @property
    def _docs(self):
        return self._resource.Table(self._docs_table_name)

    def put_documento(self, item: dict[str, Any]) -> None:
        self._docs.put_item(Item=item)

    def get_documento(self, documento_id: str, version: int) -> Optional[dict]:
        resp = self._docs.get_item(
            Key={"PK": f"doc#{documento_id}", "SK": f"v#{version}"}
        )
        return resp.get("Item")

    def get_documento_latest(self, documento_id: str) -> Optional[dict]:
        """Obtiene la versión más reciente activa de un documento."""
        resp = self._docs.query(
            KeyConditionExpression=Key("PK").eq(f"doc#{documento_id}"),
            FilterExpression=Attr("activo").eq(True),
            ScanIndexForward=False,  # descendente
            Limit=1,
        )
        items = resp.get("Items", [])
        return items[0] if items else None

    def get_versiones(self, documento_id: str) -> list[dict]:
        """Historial de todas las versiones de un documento."""
        resp = self._docs.query(
            KeyConditionExpression=Key("PK").eq(f"doc#{documento_id}"),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    def query_by_activo(self, activo_id: str) -> list[dict]:
        """Retorna la última versión activa de cada documento de un activo."""
        resp = self._docs.query(
            IndexName="activoId-index",
            KeyConditionExpression=Key("activoId").eq(activo_id),
            FilterExpression=Attr("activo").eq(True),
        )
        return resp.get("Items", [])

    def query_by_activo_all(self, activo_id: str) -> list[dict]:
        """Retorna todos los documentos (cualquier versión) de un activo."""
        resp = self._docs.query(
            IndexName="activoId-index",
            KeyConditionExpression=Key("activoId").eq(activo_id),
        )
        return resp.get("Items", [])

    def soft_delete_documento(self, documento_id: str, version: int) -> None:
        self._docs.update_item(
            Key={"PK": f"doc#{documento_id}", "SK": f"v#{version}"},
            UpdateExpression="SET activo = :f",
            ExpressionAttributeValues={":f": False},
        )

    # ── Auditoría ─────────────────────────────────────────────────────────────

    @property
    def _audit(self):
        return self._resource.Table(self._audit_table_name)

    def put_auditoria(self, item: dict[str, Any]) -> None:
        self._audit.put_item(Item=item)

    def query_auditoria_by_documento(self, documento_id: str) -> list[dict]:
        resp = self._audit.query(
            IndexName="documentoId-index",
            KeyConditionExpression=Key("documentoId").eq(documento_id),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])
