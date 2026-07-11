"""Wrapper de boto3 para Amazon S3."""

import io
import mimetypes
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import settings

# Tipos de archivo permitidos para documentos
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


class S3Adapter:
    def __init__(self) -> None:
        kwargs: dict = {
            "region_name": settings.aws_region,
        }
        if settings.aws_endpoint_url or _has_real_static_credentials():
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        if settings.aws_endpoint_url:
            kwargs["endpoint_url"] = settings.aws_endpoint_url
        self._client = boto3.client("s3", **kwargs)
        self._bucket = settings.s3_bucket_name

    # ── Bucket bootstrapping ──────────────────────────────────────────────────

    def ensure_bucket(self) -> None:
        """Crea el bucket si no existe (útil en desarrollo / tests)."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            if settings.aws_region == "us-east-1":
                self._client.create_bucket(Bucket=self._bucket)
            else:
                self._client.create_bucket(
                    Bucket=self._bucket,
                    CreateBucketConfiguration={"LocationConstraint": settings.aws_region},
                )

    # ── Upload ────────────────────────────────────────────────────────────────

    def upload(self, file_data: bytes, s3_key: str, content_type: Optional[str] = None) -> str:
        """
        Sube bytes a S3.
        Retorna la URL pública (o la clave si no hay dominio configurado).
        """
        if len(file_data) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"El archivo supera el límite de {MAX_FILE_SIZE_BYTES // (1024*1024)} MB")

        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Tipo de archivo no permitido: {content_type}")

        resolved_ct = content_type or "application/octet-stream"
        self._client.put_object(
            Bucket=self._bucket,
            Key=s3_key,
            Body=file_data,
            ContentType=resolved_ct,
        )
        return f"s3://{self._bucket}/{s3_key}"

    # ── Presigned URL ─────────────────────────────────────────────────────────

    def presigned_url(self, s3_key: str, expires_in: int = 900) -> str:
        """Genera una URL presignada para descarga directa (15 min por defecto).

        En desarrollo con LocalStack el cliente boto3 genera la URL usando el
        endpoint_url interno de Docker (ej. http://localstack:4566). Ese hostname
        no es accesible desde el browser del desarrollador, así que lo reemplazamos
        por localhost para que el link funcione en el entorno local.
        """
        url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": s3_key},
            ExpiresIn=expires_in,
        )
        # Reescribir hostname interno de Docker → localhost accesible desde browser
        if settings.aws_endpoint_url:
            from urllib.parse import urlparse, urlunparse
            internal = urlparse(settings.aws_endpoint_url)
            parsed = urlparse(url)
            if parsed.hostname == internal.hostname:
                url = urlunparse(parsed._replace(netloc=f"localhost:{internal.port}"))
        return url

    def download_bytes(self, s3_key: str) -> bytes:
        """Descarga un objeto de S3 y retorna su contenido en memoria."""
        obj = self._client.get_object(Bucket=self._bucket, Key=s3_key)
        return obj["Body"].read()

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, s3_key: str) -> None:
        """Elimina un objeto de S3."""
        self._client.delete_object(Bucket=self._bucket, Key=s3_key)

    # ── Descarga de modelos IA/ML ─────────────────────────────────────────────

    def download_to_tmp(self, s3_key: str) -> str:
        """
        Descarga un objeto de S3 a un archivo temporal y retorna su ruta local.
        Usado para cargar modelos joblib (Random Forest, K-Means).
        """
        import tempfile
        import os

        suffix = os.path.splitext(s3_key)[-1] or ".bin"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        self._client.download_fileobj(self._bucket, s3_key, tmp)
        tmp.close()
        return tmp.name

    def download_directory(self, s3_prefix: str, local_dir: str) -> None:
        """
        Descarga todos los objetos bajo `s3_prefix` a `local_dir`, preservando
        la estructura de subdirectorios. Usado para cargar TensorFlow SavedModel
        (que es un directorio, no un solo archivo).
        """
        import os

        paginator = self._client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self._bucket, Prefix=s3_prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                # Ruta local relativa al prefijo
                relative = key[len(s3_prefix):].lstrip("/")
                local_path = os.path.join(local_dir, relative)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                self._client.download_file(self._bucket, key, local_path)


def _has_real_static_credentials() -> bool:
    return (
        bool(settings.aws_access_key_id)
        and bool(settings.aws_secret_access_key)
        and settings.aws_access_key_id != "test"
        and settings.aws_secret_access_key != "test"
    )
