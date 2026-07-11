"""Servicio de gestión documental — orquesta S3 + DynamoDB."""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, status

from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.infrastructure.s3_adapter import S3Adapter
from app.services.auditoria_service import AuditoriaService


class DocumentoService:
    def __init__(
        self,
        s3: S3Adapter,
        db: DynamoDBAdapter,
        auditoria: AuditoriaService,
    ) -> None:
        self._s3 = s3
        self._db = db
        self._auditoria = auditoria

    # ── CU-26: Cargar documento ───────────────────────────────────────────────

    def cargar(
        self,
        activo_id: str,
        nombre: str,
        tipo: str,
        file_data: bytes,
        content_type: str,
        usuario: str,
        ip_origen: str,
    ) -> dict:
        documento_id = str(uuid4())
        s3_key = f"{activo_id}/{documento_id}/{nombre}"
        s3_url = self._s3.upload(file_data, s3_key, content_type)
        fecha = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"doc#{documento_id}",
            "SK": "v#1",
            "documentoId": documento_id,
            "activoId": activo_id,
            "nombre": nombre,
            "tipo": tipo,
            "s3Key": s3_key,
            "s3Url": s3_url,
            "version": 1,
            "subidoPor": usuario,
            "fechaCreacion": fecha,
            "activo": True,
        }
        self._db.put_documento(item)
        self._auditoria.registrar(documento_id, activo_id, "CREAR", usuario, ip_origen, {"nombre": nombre, "tipo": tipo})
        return item

    # ── CU-27: URL presignada ─────────────────────────────────────────────────

    def url_descarga(self, documento_id: str, usuario: str, ip_origen: str) -> dict:
        doc = self._db.get_documento_latest(documento_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

        url = self._s3.presigned_url(doc["s3Key"])
        self._auditoria.registrar(documento_id, doc["activoId"], "DESCARGAR", usuario, ip_origen)
        return {"documentoId": documento_id, "url": url, "expiraEn": 900}

    # ── CU-28: Nueva versión ──────────────────────────────────────────────────

    def nueva_version(
        self,
        documento_id: str,
        nombre: str,
        file_data: bytes,
        content_type: str,
        usuario: str,
        ip_origen: str,
    ) -> dict:
        versiones = self._db.get_versiones(documento_id)
        if not versiones:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

        version_actual = max(int(v["SK"].replace("v#", "")) for v in versiones)

        # Marcar versión anterior como inactiva
        self._db.soft_delete_documento(documento_id, version_actual)

        nueva_v = version_actual + 1
        activo_id = versiones[0]["activoId"]
        s3_key = f"{activo_id}/{documento_id}/v{nueva_v}/{nombre}"
        s3_url = self._s3.upload(file_data, s3_key, content_type)
        fecha = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"doc#{documento_id}",
            "SK": f"v#{nueva_v}",
            "documentoId": documento_id,
            "activoId": activo_id,
            "nombre": nombre,
            "tipo": versiones[0]["tipo"],
            "s3Key": s3_key,
            "s3Url": s3_url,
            "version": nueva_v,
            "subidoPor": usuario,
            "fechaCreacion": fecha,
            "activo": True,
        }
        self._db.put_documento(item)
        self._auditoria.registrar(documento_id, activo_id, "ACTUALIZAR", usuario, ip_origen, {"version": nueva_v})
        return item

    # ── CU-29: Historial de versiones ─────────────────────────────────────────

    def versiones(self, documento_id: str, usuario: str, ip_origen: str) -> list[dict]:
        items = self._db.get_versiones(documento_id)
        if not items:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")
        self._auditoria.registrar(documento_id, items[0]["activoId"], "VER", usuario, ip_origen)
        return items

    # ── CU-30: Soft delete ────────────────────────────────────────────────────

    def eliminar(self, documento_id: str, usuario: str, ip_origen: str) -> dict:
        doc = self._db.get_documento_latest(documento_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")

        version = int(doc["SK"].replace("v#", ""))
        self._db.soft_delete_documento(documento_id, version)
        self._auditoria.registrar(documento_id, doc["activoId"], "ELIMINAR", usuario, ip_origen)
        return {"mensaje": "Documento eliminado (soft delete)", "documentoId": documento_id}

    # ── CU-32/33: Listar y buscar documentos ──────────────────────────────────

    def listar_por_activo(
        self,
        activo_id: str,
        tipo: Optional[str] = None,
        desde: Optional[str] = None,
        hasta: Optional[str] = None,
        usuario: Optional[str] = None,
        ip_origen: Optional[str] = None,
    ) -> list[dict]:
        items = self._db.query_by_activo(activo_id)

        if tipo:
            items = [d for d in items if d.get("tipo") == tipo]
        if desde:
            items = [d for d in items if d.get("fechaCreacion", "") >= desde]
        if hasta:
            items = [d for d in items if d.get("fechaCreacion", "") <= hasta]

        if usuario and ip_origen:
            for doc in items:
                self._auditoria.registrar(
                    doc["documentoId"],
                    doc["activoId"],
                    "LISTAR",
                    usuario,
                    ip_origen,
                    {"tipoFiltro": tipo, "desde": desde, "hasta": hasta},
                )

        return items
