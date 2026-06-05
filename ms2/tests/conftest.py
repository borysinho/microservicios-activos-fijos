"""Fixtures compartidos para todos los tests de MS2."""

import os

import boto3
import pytest
from moto import mock_aws

# Configurar variables de entorno ANTES de importar la app
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("S3_BUCKET_NAME", "test-bucket")
os.environ.setdefault("DYNAMODB_TABLE_DOCS", "documentos")
os.environ.setdefault("DYNAMODB_TABLE_AUDITORIA", "auditoria")
os.environ.setdefault(
    "JWT_SECRET",
    "saf-ms1-super-secret-key-2026-activos-fijos-bolivia-uagrm",
)


@pytest.fixture()
def aws_mock():
    """Inicia moto mock para S3 + DynamoDB."""
    with mock_aws():
        # Crear bucket S3
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-bucket")

        # Crear tablas DynamoDB
        ddb = boto3.resource("dynamodb", region_name="us-east-1")

        ddb.create_table(
            TableName="documentos",
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

        ddb.create_table(
            TableName="auditoria",
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

        yield
