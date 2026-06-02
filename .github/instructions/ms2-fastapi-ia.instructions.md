---
applyTo: "ms2/**,**/ms2/**,**/documentos/**,**/ia/**,**/ml/**"
description: "Instrucciones para MS2 — Gestión Documental e Inteligencia Artificial con FastAPI, DynamoDB, S3, Deep Learning y Machine Learning. Usar cuando se trabaje en el microservicio Python/AWS."
---

# MS2 — Gestión Documental e IA (Python / FastAPI)

**Cloud**: Amazon Web Services  
**BD**: DynamoDB (metadatos + auditoría) + Amazon S3 (archivos binarios)  
**API**: REST

## Stack Técnico

- Python 3.11+ con FastAPI 0.130+
- boto3 (AWS SDK: DynamoDB, S3)
- TensorFlow / Keras o PyTorch (CNN para Deep Learning)
- scikit-learn (Random Forest, K-Means)
- Pydantic v2 para validación de esquemas
- Uvicorn como servidor ASGI

## Estructura de Módulos

```
ms2-documentos-ia/
├── app/
│   ├── controllers/
│   │   ├── documento_controller.py
│   │   ├── ia_controller.py
│   │   └── auditoria_controller.py
│   ├── services/
│   │   ├── documento_service.py
│   │   ├── auditoria_service.py
│   │   ├── diagnostico_ia_service.py
│   │   └── ml_service.py
│   ├── infrastructure/
│   │   ├── s3_adapter.py
│   │   └── dynamodb_adapter.py
│   └── modelos/
│       ├── model_loader.py
│       ├── cnn_estado_activo/     # Modelo Deep Learning (imagen → estado)
│       ├── rf_vida_util/          # Random Forest (vida útil restante)
│       └── kmeans_clustering/     # K-Means (agrupación de activos)
├── tests/
└── requirements.txt
```

## Funcionalidades Clave

### Gestión Documental

- Subida/descarga de archivos (PDF, imágenes, contratos, facturas) a **S3**
- Metadatos y auditoría almacenados en **DynamoDB**
- Historial de versiones de documentos
- Registro de accesos: quién visualizó o editó cada documento

### Auditoría (DynamoDB)

- Cada acción (lectura, escritura, descarga) genera un registro en DynamoDB
- Campos mínimos: `documentoId`, `usuarioId`, `accion`, `timestamp`, `ipOrigen`

### Modelos de IA

| Modelo                  | Tipo                | Entrada                                         | Salida                                     |
| ----------------------- | ------------------- | ----------------------------------------------- | ------------------------------------------ |
| `CNN_EstadoActivo`      | Deep Learning (CNN) | Imagen del activo                               | Estado físico: BUENO, REGULAR, DETERIORADO |
| `RandomForest_VidaUtil` | ML Supervisado      | Features del activo (edad, uso, mantenimientos) | Años de vida útil restante                 |
| `KMeans_Clustering`     | ML No Supervisado   | Vectores de comportamiento de activos           | Grupo/cluster del activo                   |

### Reglas para IA

- Los modelos entrenados se almacenan en S3 y se cargan en memoria al iniciar via `model_loader.py`
- No reentrenar en cada request; cargar modelos una sola vez (`@app.on_event("startup")`)
- Las predicciones deben registrarse en DynamoDB con timestamp y parámetros de entrada

## Integración con App Móvil

El endpoint de diagnóstico por imagen es el principal usado por la app React Native:

```
POST /ia/diagnostico-imagen
Content-Type: multipart/form-data
Body: { imagen: <archivo>, activoId: <uuid> }
Response: { estado: "REGULAR", confianza: 0.87, recomendacion: "..." }
```

## Seguridad

- No exponer credenciales AWS en el código; usar IAM Roles o variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)
- Validar tipos MIME de archivos subidos antes de enviar a S3
- Registrar toda operación de acceso a documentos en auditoría

## Despliegue (AWS)

- Docker → Amazon ECR → AWS Lambda (funciones ligeras) o ECS Fargate
- Variables de entorno: `S3_BUCKET_NAME`, `DYNAMODB_TABLE_DOCS`, `DYNAMODB_TABLE_AUDITORIA`
- Cuidar límites del free tier de DynamoDB y S3
