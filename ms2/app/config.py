from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # AWS
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_region: str = "us-east-1"
    aws_endpoint_url: Optional[str] = None  # LocalStack: http://localhost:4566
    s3_bucket_name: str = "activos-fijos-documentos-dev"
    dynamodb_table_docs: str = "documentos"
    dynamodb_table_auditoria: str = "auditoria"
    auto_bootstrap_aws_resources: bool = True

    # JWT (mismo secret que MS1)
    jwt_secret: str = "saf-ms1-super-secret-key-2026-activos-fijos-bolivia-uagrm"
    jwt_algorithm: str = "HS512"

    # Servidor
    allowed_origins: str = "http://localhost:4200,http://localhost:8100"

    # Desarrollo — si se define, los modelos IA se cargan desde esta ruta local
    # en vez de descargarse desde S3 (útil para probar TensorFlow sin AWS)
    # Ejecutar primero: python scripts/train_models.py
    local_models_path: Optional[str] = None
    load_ai_models: bool = True


settings = Settings()
