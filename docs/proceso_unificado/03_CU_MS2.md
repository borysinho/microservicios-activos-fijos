# Especificaciones de Casos de Uso — MS2 (FastAPI + IA)

**Microservicio**: MS2 — Gestión Documental e Inteligencia Artificial
**Tecnología**: Python / FastAPI / DynamoDB / S3 / TensorFlow / scikit-learn
**Cloud**: Amazon AWS
**CUs**: CU-26 a CU-36 · CU-61 a CU-66 · CU-83

---

## Estructura del Proyecto MS2

```
ms2/
├── main.py                        # Punto de entrada FastAPI
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── app/
│   ├── config.py                  # Variables de entorno (AWS, JWT secret)
│   ├── auth/
│   │   └── jwt_middleware.py      # Verificar JWT emitido por MS1
│   ├── controllers/
│   │   ├── documento_controller.py
│   │   ├── ia_controller.py
│   │   └── auditoria_controller.py
│   ├── services/
│   │   ├── documento_service.py
│   │   ├── diagnostico_service.py
│   │   ├── ml_service.py
│   │   └── auditoria_service.py
│   ├── adapters/
│   │   ├── s3_adapter.py
│   │   └── dynamodb_adapter.py
│   ├── modelos/
│   │   ├── cnn_estado_activo.py   # Deep Learning — CNN
│   │   ├── rf_vida_util.py        # ML Supervisado — Random Forest
│   │   └── kmeans_clustering.py   # ML No Supervisado — K-Means
│   └── schemas/
│       ├── documento_schema.py
│       ├── diagnostico_schema.py
│       └── auditoria_schema.py
```

---

## Modelo de Datos — DynamoDB

### Tabla `documentos`

```
PK: doc#{documentoId}
SK: v#{version}
---
activoId:      String
nombre:        String
tipo:          String  (FACTURA | POLIZA | CONTRATO | MANUAL | IMAGEN | OTRO)
s3Key:         String
s3Url:         String
version:       Number
subidoPor:     String (userId)
fechaCreacion: String (ISO 8601)
activo:        Boolean
```

### Tabla `auditoria`

```
PK: evt#{eventoId}
SK: {timestamp}
---
documentoId:   String
activoId:      String
accion:        String (CREAR | VER | DESCARGAR | ACTUALIZAR | ELIMINAR)
usuario:       String
ipOrigen:      String
detalles:      String (JSON serializado)
```

### Tabla `diagnosticos_ia`

```
PK: diag#{diagnosticoId}
SK: {timestamp}
---
activoId:      String
imagenS3Key:   String
estado:        String (BUENO | DETERIORADO | REQUIERE_MANTENIMIENTO)
confianza:     Number (0.0 - 1.0)
detalles:      String (JSON con probabilidades por clase)
solicitadoPor: String (userId)
```

---

## Módulo 4 — Gestión Documental

### CU-26: Cargar documento asociado a un activo

**Actor**: Administrador, Responsable de Área
**Precondiciones**: El usuario está autenticado (JWT válido de MS1). El archivo cumple con los tipos permitidos (PDF, DOCX, JPG, PNG).
**Postcondiciones**: El archivo está almacenado en S3. Los metadatos están en DynamoDB. Se registra evento de auditoría CREAR.

**Flujo principal**:

1. El usuario selecciona el activo y sube el archivo.
2. El sistema valida tipo de archivo y tamaño (máx. 50 MB).
3. El sistema genera un `documentoId` (UUID).
4. El sistema sube el archivo a S3: `PUT /{activoId}/{documentoId}/{nombre_original}`.
5. El sistema persiste los metadatos en DynamoDB (versión inicial = 1).
6. El sistema registra evento de auditoría: `CREAR`.
7. El sistema retorna el documento creado con la URL de acceso.

**Alternativas**:

- 2a. Tipo de archivo no permitido: `400 Bad Request` con detalle del error.
- 2b. Archivo supera el tamaño máximo: `400 Bad Request`.
- 4a. Error en S3: `503 Service Unavailable`, no persiste metadatos.

**Notas técnicas**:

- REST: `POST /api/documentos/upload`
- Multipart/form-data: `file`, `activoId`, `tipo`, `nombre`
- JWT Middleware: verificar `Authorization: Bearer {token}` en cada request
- S3 bucket: `activos-fijos-documentos-{env}`
- DynamoDB: tabla `documentos`
- Pydantic schema: `DocumentoCreateRequest`, `DocumentoResponse`
- Usar `boto3.client('s3').upload_fileobj()` con `ExtraArgs={'ContentType': content_type}`

---

### CU-27: Descargar o visualizar documento

**Actor**: Todos los roles
**Precondiciones**: El documento existe en S3 y está activo.
**Postcondiciones**: Se retorna una URL presignada de S3 válida por 15 minutos. Se registra evento de auditoría DESCARGAR.

**Notas técnicas**:

- REST: `GET /api/documentos/{documentoId}/url`
- Usar `boto3.client('s3').generate_presigned_url('get_object', ExpiresIn=900)`
- Registrar auditoría antes de retornar la URL

---

### CU-28: Actualizar versión de un documento (nueva carga)

**Actor**: Administrador, Responsable de Área
**Precondiciones**: El documento existe y está activo.
**Postcondiciones**: Se crea una nueva versión en S3 y DynamoDB. La versión anterior queda inactiva. Se registra evento ACTUALIZAR.

**Flujo principal**:

1. El usuario sube el nuevo archivo para el documento existente.
2. El sistema obtiene la versión actual del documento.
3. El sistema marca la versión anterior como `activo = false`.
4. El sistema sube el nuevo archivo a S3 con nueva `s3Key` (incluye número de versión).
5. El sistema persiste los nuevos metadatos en DynamoDB con `version + 1`.
6. El sistema registra evento de auditoría ACTUALIZAR.

**Notas técnicas**:

- REST: `PUT /api/documentos/{documentoId}/version`
- Multipart/form-data: `file`
- La `s3Key` antigua se mantiene para preservar el historial de versiones

---

### CU-29: Consultar historial de versiones de un documento

**Actor**: Todos los roles
**Notas técnicas**:

- REST: `GET /api/documentos/{documentoId}/versiones`
- Query DynamoDB: `PK = doc#{documentoId}`, retorna todos los ítems (todas las versiones)
- Ordenar por `version` descendente

---

### CU-30: Eliminar documento (baja lógica)

**Actor**: Administrador
**Precondiciones**: El documento existe y está activo.
**Postcondiciones**: El documento queda con `activo = false` en DynamoDB. El archivo en S3 NO se borra físicamente. Se registra evento ELIMINAR.

**Notas técnicas**:

- REST: `DELETE /api/documentos/{documentoId}`
- DynamoDB update: `activo = false` en la versión activa
- El archivo en S3 se puede mover a un "bucket de archivo" (S3 Glacier) si se desea
- Seguridad: verificar rol ADMINISTRADOR en el JWT

---

### CU-31: Consultar log de auditoría de un documento

**Actor**: Administrador, Auditor
**Notas técnicas**:

- REST: `GET /api/documentos/{documentoId}/auditoria`
- Query DynamoDB: tabla `auditoria`, filtro por `documentoId`
- Ordenar por `SK` (timestamp) descendente

---

### CU-32: Buscar documentos por filtros

**Actor**: Todos los roles
**Notas técnicas**:

- REST: `GET /api/documentos?activoId={id}&tipo={tipo}&desde={fecha}&hasta={fecha}`
- Query DynamoDB usando un GSI (Global Secondary Index) por `activoId`
- Filtros adicionales aplicados en Python (DynamoDB FilterExpression)

---

### CU-33: Listar todos los documentos de un activo

**Notas técnicas**:

- REST: `GET /api/documentos?activoId={activoId}`
- Retorna solo la versión más reciente (activa) de cada documento
- Usa GSI en DynamoDB: `activoId-index` con `PK = activoId` (considerar diseño de GSI)

---

## Módulo 5 — Verificación Visual IA

### CU-35: Enviar imagen para verificación visual del activo

**Actor**: Administrador, Responsable de Área, App Móvil
**Precondiciones**: El usuario está autenticado. El activo existe en MS1 (validación opcional por llamada a MS1).
**Postcondiciones**: La imagen está almacenada en S3. Se inicia el proceso de verificación visual IA. Se retorna un resultado auditable.

**Flujo principal**:

1. El usuario (o la app móvil) envía la imagen y el `activoId`.
2. El sistema valida: tipo de imagen (JPG, PNG, WEBP), tamaño ≤ 10 MB.
3. El sistema busca la última imagen histórica del activo, si existe.
4. El sistema invoca `DiagnosticoIAService.inferir(imagenBytes, referenciaBytes, activoId)`.
5. El servicio valida calidad fotográfica, presencia visual del activo y similitud histórica.
6. Si hay un CNN disponible, su salida se registra solo como señal auxiliar.
7. El sistema sube la imagen a S3: `verificaciones/{activoId}/{uuid}.jpg`.
8. El sistema persiste el resultado en DynamoDB dentro de auditoría.
9. Si el resultado es `POSIBLE_INCONSISTENCIA`, queda disponible para revisión operativa.
10. El sistema retorna la verificación completa.

**Notas técnicas**:

- REST: `POST /api/ia/diagnostico`
- Multipart/form-data: `imagen`, `activoId`, `codigoEsperado` opcional, `imagenReferenciaS3Key` opcional
- Resultados: `EVIDENCIA_VALIDADA`, `REQUIERE_REVISION`, `FOTO_NO_CONFIABLE`, `POSIBLE_INCONSISTENCIA`
- CU-79 (Blockchain) se dispara desde MS1 cuando MS1 recibe la notificación de MS3

---

### CU-36: Procesar imagen con IA y retornar verificación

**Actor**: Sistema (ejecutado internamente por CU-35)
**Notas técnicas**:

**Modelo IA `CNN_VerificacionVisual`**:

- Arquitectura base: MobileNetV2 (transfer learning desde ImageNet)
- Capas finales: `GlobalAveragePooling2D → Dense(128, relu) → Dropout(0.3) → Dense(3, softmax)`
- Input shape: `(224, 224, 3)`
- Uso: señal auxiliar de clasificación visual, no dictamen final de estado físico
- Framework: TensorFlow 2.x / Keras

**Implementación `diagnostico_ia_service.py`**:

```python
class DiagnosticoIAService:
    def inferir(self, imagen_bytes, cnn_model=None, referencia_bytes=None):
        metricas = calcular_calidad_y_presencia(imagen_bytes)
        similitud = comparar_hash(imagen_bytes, referencia_bytes) if referencia_bytes else None
        senal_cnn = ejecutar_cnn(cnn_model, imagen_bytes) if cnn_model else None
        return {
            "diagnostico": resolver_resultado(metricas, similitud),
            "confianza": calcular_confianza(metricas, similitud),
            "tipoAnalisis": "VERIFICACION_VISUAL_EVIDENCIA",
            "senalModelo": senal_cnn,
        }
```

**Estrategia del modelo (offline)**:

- Los datasets externos se usan como base técnica, no como verdad de negocio.
- La decisión final se apoya en reglas conservadoras: calidad, presencia visual y similitud histórica.
- Las correcciones humanas y nuevas capturas forman el dataset propio del sistema.
- El modelo CNN cargado desde S3 se registra como señal auxiliar (`senalModelo`).

---

## Módulo 9 — Machine Learning

### CU-61: Predicción de vida útil restante (Random Forest Regresión)

**Actor**: Administrador, Auditor
**Precondiciones**: El activo tiene suficiente historial (fecha de adquisición, número de mantenimientos, diagnósticos).
**Postcondiciones**: Se retorna la predicción de meses restantes de vida útil.

**Notas técnicas**:

- REST: `GET /api/ml/prediccion-vida-util?activoId={id}`
- **Modelo `RandomForest_VidaUtil`**: regresión
  - Features: `edad_meses`, `n_mantenimientos`, `n_diagnosticos_deteriorados`, `categoria_encoded`, `valor_adquisicion`
  - Target: `meses_restantes`
  - Framework: scikit-learn `RandomForestRegressor`

**Implementación `rf_vida_util.py`**:

```python
import joblib
import numpy as np
import pandas as pd

class RandomForest_VidaUtil:
    def __init__(self, model_path: str = "modelos/rf_vida_util.pkl"):
        self.model = joblib.load(model_path)
        self.encoder = joblib.load("modelos/categoria_encoder.pkl")

    def predecir(self, activo_data: dict) -> dict:
        features = self._extraer_features(activo_data)
        meses_restantes = float(self.model.predict([features])[0])
        return {
            "activoId": activo_data["id"],
            "mesesRestantes": max(0, meses_restantes),
            "aniosRestantes": round(max(0, meses_restantes) / 12, 1),
            "confianzaModelo": 0.85  # R² del modelo en validación
        }

    def _extraer_features(self, data: dict) -> list:
        categoria_enc = self.encoder.transform([[data["categoria"]]])[0][0]
        return [
            data["edad_meses"],
            data["n_mantenimientos"],
            data["n_diagnosticos_deteriorados"],
            categoria_enc,
            data["valor_adquisicion"]
        ]
```

---

### CU-62: Probabilidad de fallo próximo (Random Forest Clasificación)

**Notas técnicas**:

- Puede ser el mismo modelo `RandomForestClassifier` separado, o un segundo head del mismo pipeline
- Target de clasificación: `riesgo_fallo_6_meses` (0 = no, 1 = sí)
- Features: mismo conjunto que CU-61 más `valorLibros_actual`
- REST: `GET /api/ml/riesgo-fallo?activoId={id}`
- Retorna: `{ riesgo: "ALTO" | "MEDIO" | "BAJO", probabilidad: 0.0-1.0 }`

---

### CU-63: Clustering de activos por patrones de uso (K-Means)

**Actor**: Administrador, Auditor
**Notas técnicas**:

- REST: `GET /api/ml/clustering`
- **Modelo `KMeans_Clustering`**: segmentación no supervisada
  - Features: `frecuencia_mantenimiento_anual`, `vida_util_consumida_pct`, `n_fallas_historicas`, `categoria_encoded`
  - K = 3 clusters: `CRITICO` (alto riesgo), `NORMAL`, `EFICIENTE`
  - Framework: scikit-learn `KMeans`
  - La etiqueta de cada cluster se asigna post-clustering basada en los centroides

**Implementación `kmeans_clustering.py`**:

```python
import joblib
import numpy as np
from typing import List

class KMeans_Clustering:
    def __init__(self, model_path: str = "modelos/kmeans.pkl"):
        self.model = joblib.load(model_path)
        # Mapa de cluster_id → etiqueta (definido tras analizar centroides)
        self.etiquetas = {0: "CRITICO", 1: "NORMAL", 2: "EFICIENTE"}

    def predecir_todos(self, activos: List[dict]) -> List[dict]:
        if not activos:
            return []
        X = np.array([[
            a["frecuencia_mantenimiento_anual"],
            a["vida_util_consumida_pct"],
            a["n_fallas_historicas"],
            a["categoria_encoded"]
        ] for a in activos])
        clusters = self.model.predict(X)
        return [
            {**activo, "cluster": int(c), "etiqueta": self.etiquetas[int(c)]}
            for activo, c in zip(activos, clusters)
        ]
```

---

### CU-64: Consultar resultado de predicción en ficha del activo

**Notas técnicas**:

- El frontend llama a `GET /api/ml/prediccion-vida-util?activoId={id}` desde la ficha del activo en Angular
- El resultado se muestra en un componente "Análisis IA" dentro de la ficha del activo
- En la app móvil, se muestra en `ActivoDetailScreen`

---

### CU-65: Recomendación automática de mantenimiento preventivo

**Notas técnicas**:

- Basado en los resultados de CU-61 y CU-62
- Reglas:
  - `meses_restantes < 12` → "Programar revisión técnica urgente"
  - `riesgo_fallo = ALTO` → "Solicitar mantenimiento preventivo inmediato"
  - `cluster = CRITICO` → "Activo en grupo de alto riesgo, monitoreo constante recomendado"
- Retornado como campo `recomendaciones: List[str]` en la respuesta del endpoint ML

---

### CU-66: Visualizar grupos de clustering con etiquetas

**Notas técnicas**:

- REST: `GET /api/ml/clustering` retorna todos los activos con su cluster y etiqueta
- El frontend muestra:
  - Tabla de activos agrupados por cluster
  - Estadísticas de cada cluster (promedio de vida útil, n_fallas, etc.)
  - Gráfica de dispersión (scatter plot) en el frontend si se agregan 2 features para los ejes X e Y

---

## Configuración y Seguridad

### JWT Middleware para MS2

```python
# app/auth/jwt_middleware.py
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

def verificar_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
```

> El `JWT_SECRET` de MS1 y MS2 debe ser el mismo para que MS2 pueda validar los tokens emitidos por MS1.

### Variables de entorno `.env`

```env
MS2_AWS_ACCESS_KEY_ID=...
MS2_AWS_SECRET_ACCESS_KEY=...
MS2_AWS_REGION=us-east-1
MS2_S3_BUCKET_NAME=activos-fijos-docs
MS2_DYNAMODB_TABLE_DOCS=documentos
MS2_DYNAMODB_TABLE_AUDITORIA=auditoria
MS2_DYNAMODB_TABLE_DIAGNOSTICOS=diagnosticos_ia
MS2_JWT_SECRET=<mismo-secreto-que-MS1>
MS2_MS3_WEBHOOK_URL=http://ms3-service/webhooks/diagnostico-critico
```

---

## Módulo 12 — CI/CD y Despliegue Automático

### CU-83: Desplegar automáticamente MS2 en AWS

**Actor**: DevOps / Desarrollador
**Precondiciones**: Existe un cambio aprobado en la rama `main` que modifica `ms2/**` o `deploy/aws-ms2/**`. Los secretos de GitHub Actions para AWS están configurados.
**Postcondiciones**: MS2 queda publicado en AWS con una imagen Docker Lambda versionada por `github.sha`; CloudFormation actualiza Lambda, API Gateway, S3 y DynamoDB si corresponde.

**Flujo principal**:

1. El desarrollador integra cambios de MS2 en `main`.
2. GitHub Actions ejecuta `.github/workflows/ms2-aws-cd.yml`.
3. El pipeline instala dependencias Python y ejecuta `pytest`.
4. Si las pruebas pasan, autentica contra AWS con `aws-actions/configure-aws-credentials`.
5. Ejecuta `bash deploy/aws-ms2/deploy.sh`.
6. El script crea o reutiliza el repositorio ECR, construye la imagen Lambda y la publica con tag `{github.sha}`.
7. El script ejecuta `cloudformation deploy` para actualizar Lambda, API Gateway, DynamoDB y S3.
8. El pipeline muestra la URL pública del API Gateway desde los outputs de CloudFormation.

**Alternativas**:

- 3a. Si fallan pruebas: el despliegue se cancela.
- 4a. Si las credenciales AWS son inválidas o expiraron: el despliegue se cancela.
- 7a. Si CloudFormation falla: AWS conserva el último stack estable o ejecuta rollback según el estado del stack.

**Notas técnicas**:

- Workflow: `.github/workflows/ms2-aws-cd.yml`
- Trigger: `push` a `main` con cambios en `ms2/**`, `deploy/aws-ms2/**` o `workflow_dispatch`
- Script de despliegue: `deploy/aws-ms2/deploy.sh`
- Infraestructura como código: `deploy/aws-ms2/cloudformation.yml`
- Secretos requeridos: `MS2_AWS_ACCESS_KEY_ID`, `MS2_AWS_SECRET_ACCESS_KEY`, `MS2_JWT_SECRET`
- Secretos opcionales: `MS2_AWS_SESSION_TOKEN`
- Variables opcionales: `MS2_AWS_REGION`, `MS2_PROJECT_NAME`, `MS2_STACK_NAME`, `MS2_ECR_REPO`, `MS2_S3_BUCKET_NAME`, `MS2_DYNAMODB_TABLE_DOCS`, `MS2_DYNAMODB_TABLE_AUDITORIA`, `MS2_ALLOWED_ORIGINS`, `MS2_JWT_ALGORITHM`
