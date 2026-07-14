---
name: fastapi-ia-models
description: >
  Implement FastAPI endpoints, AWS integrations (DynamoDB + S3), and AI/ML models
  for MS2 (Python / FastAPI) of the Sistema de Activos Fijos. Use this skill when
  working on MS2: building REST endpoints for document management, implementing the
  CNN image diagnosis endpoint, Random Forest life prediction, K-Means clustering,
  integrating with Amazon S3 for file storage, or DynamoDB for metadata and auditing.
  Use when: creating document upload/download endpoints, implementing IA diagnosis,
  ML predictions, audit logging, S3 integration, DynamoDB operations.
---

# FastAPI + IA Models — MS2 Gestión Documental e IA

This skill guides implementation of MS2: the document management and AI microservice
built with FastAPI, boto3 (AWS), TensorFlow/Keras, and scikit-learn.

## Delivery Rule

At the end of every interaction that modifies files, run the relevant validation
available for the touched area, review `git status`, and create a Git commit with
the completed changes. Stage only files related to the requested work unless the
user explicitly asks to commit all pending changes.

## Project Structure

```
ms2-documentos-ia/
├── app/
│   ├── main.py                      # FastAPI app, startup model loading
│   ├── controllers/
│   │   ├── documento_controller.py  # Upload, download, versioning
│   │   ├── ia_controller.py         # CNN diagnosis, RF prediction, K-Means
│   │   └── auditoria_controller.py  # Audit log queries
│   ├── services/
│   │   ├── documento_service.py     # S3 + DynamoDB document logic
│   │   ├── auditoria_service.py     # Writes audit records to DynamoDB
│   │   ├── diagnostico_ia_service.py # CNN inference
│   │   └── ml_service.py            # Random Forest + K-Means inference
│   ├── infrastructure/
│   │   ├── s3_adapter.py            # boto3 S3 wrapper
│   │   └── dynamodb_adapter.py      # boto3 DynamoDB wrapper
│   └── modelos/
│       ├── model_loader.py          # Loads all models at startup from S3
│       ├── cnn_estado_activo/       # Saved CNN model (TensorFlow SavedModel)
│       ├── rf_vida_util/            # Saved Random Forest (joblib)
│       └── kmeans_clustering/       # Saved K-Means (joblib)
├── tests/
└── requirements.txt
```

## FastAPI App Startup — Model Loading

Models are loaded **once at startup**, never per-request:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.modelos.model_loader import ModelLoader

model_loader = ModelLoader()

@asynccontextmanager
async def lifespan(app: FastAPI):
    model_loader.load_all()   # load CNN, RF, K-Means from S3
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(documento_router, prefix="/documentos")
app.include_router(ia_router, prefix="/ia")
app.include_router(auditoria_router, prefix="/auditoria")
```

## Model Loader

```python
# app/modelos/model_loader.py
import joblib
import tensorflow as tf
from app.infrastructure.s3_adapter import S3Adapter

class ModelLoader:
    cnn_model = None
    rf_model = None
    kmeans_model = None

    def load_all(self):
        s3 = S3Adapter()
        self.cnn_model = tf.keras.models.load_model(
            s3.download_to_tmp("models/cnn_estado_activo")
        )
        self.rf_model = joblib.load(
            s3.download_to_tmp("models/rf_vida_util.joblib")
        )
        self.kmeans_model = joblib.load(
            s3.download_to_tmp("models/kmeans_clustering.joblib")
        )
```

## IA Endpoints

### CNN — Image Diagnosis (primary mobile endpoint)

```python
# app/controllers/ia_controller.py
@router.post("/diagnostico-imagen")
async def diagnostico_imagen(
    imagen: UploadFile = File(...),
    activoId: str = Form(...),
    latitud: float = Form(None),
    longitud: float = Form(None)
):
    # 1. Validate MIME type
    if imagen.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    # 2. Store image in S3
    s3_url = await s3_adapter.upload(imagen, f"diagnosticos/{activoId}/{uuid4()}")

    # 3. Run CNN inference
    resultado = await diagnostico_ia_service.inferir(imagen, model_loader.cnn_model)

    # 4. Persist in DynamoDB
    await auditoria_service.registrar_diagnostico(activoId, s3_url, resultado, latitud, longitud)

    return resultado
```

Response schema:

```python
class DiagnosticoResponse(BaseModel):
    estado: Literal["bueno", "deteriorado", "requiere_mantenimiento", "oxidado"]
    confianza: float          # 0.0 – 1.0
    detalle: str
    recomendacion: str
```

### Random Forest — Life Prediction

```
GET /ia/prediccion-vida-util?categoriaId=<id>
```

Input features per asset: `edad_anios`, `num_mantenimientos`, `promedio_confianza_cnn`, `categoria_encoded`

Response:

```python
class PrediccionVidaUtilResponse(BaseModel):
    activoId: str
    meses_restantes: int
    probabilidad_fallo_6m: float   # 0.0 – 1.0
    cluster: int                   # from K-Means
    cluster_label: str             # "Alta criticidad" | "Mantenimiento regular" | "Rendimiento eficiente"
```

### K-Means — Clustering

```
GET /ia/clustering?categoriaId=<id>
```

Returns all assets of a category grouped by cluster. Run RF and K-Means together in `ml_service.py`.

## Document Management

### Upload Endpoint

```python
@router.post("/documentos/{activoId}")
async def subir_documento(
    activoId: str,
    archivo: UploadFile = File(...),
    tipo: str = Form(...),         # "factura" | "contrato" | "foto" | "informe"
    usuario_id: str = Header(...),
    ip_origen: str = Header(default="unknown")
):
    # 1. Validate MIME
    tipos_permitidos = ["application/pdf", "image/jpeg", "image/png",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if archivo.content_type not in tipos_permitidos:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    # 2. Upload to S3
    s3_url = await s3_adapter.upload(archivo, f"documentos/{activoId}/{uuid4()}")

    # 3. Save metadata in DynamoDB
    doc_id = await documento_service.guardar_metadata(activoId, s3_url, tipo, archivo.filename)

    # 4. Audit log — MANDATORY
    await auditoria_service.registrar(doc_id, usuario_id, "SUBIDA", ip_origen)

    return {"documentoId": doc_id, "url": s3_url}
```

## Audit Service — DynamoDB Schema

Every document access (read, write, download, delete) must produce an audit record:

```python
# DynamoDB item structure
{
    "documentoId": str,      # Partition key
    "timestamp": str,        # Sort key (ISO 8601)
    "usuarioId": str,
    "accion": str,           # "SUBIDA" | "LECTURA" | "DESCARGA" | "ELIMINACION" | "MODIFICACION"
    "ipOrigen": str,
    "versionAnterior": str   # S3 URL, only for MODIFICACION
}
```

```python
# app/services/auditoria_service.py
async def registrar(doc_id: str, usuario_id: str, accion: str, ip_origen: str):
    await dynamodb_adapter.put_item(
        table=settings.DYNAMODB_TABLE_AUDITORIA,
        item={
            "documentoId": doc_id,
            "timestamp": datetime.utcnow().isoformat(),
            "usuarioId": usuario_id,
            "accion": accion,
            "ipOrigen": ip_origen,
        }
    )
```

## S3 Adapter

```python
# app/infrastructure/s3_adapter.py
import boto3
from app.config import settings

class S3Adapter:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION
            # Credentials via IAM Role / env vars — NEVER hardcode
        )

    async def upload(self, file: UploadFile, key: str) -> str:
        self.client.upload_fileobj(file.file, settings.S3_BUCKET_NAME, key)
        return f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
```

## Environment Variables

```
AWS_ACCESS_KEY_ID        # or use IAM Role (preferred)
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
DYNAMODB_TABLE_DOCS
DYNAMODB_TABLE_AUDITORIA
```

**NEVER** hardcode AWS credentials in source code. Use IAM Roles in production (ECS/Lambda).

## Security Rules

- Validate MIME type of every uploaded file before sending to S3.
- Generate presigned URLs for downloads instead of exposing S3 directly.
- All document access must generate an audit record — no exceptions.
- Store only metadata in DynamoDB; binary files always in S3.
