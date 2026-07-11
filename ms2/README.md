# MS2 - Documentos e IA

Microservicio FastAPI para gestion documental, auditoria, verificacion visual de evidencia con imagenes y modelos ML para vida util y clustering.

## Stack

- Python 3.11
- FastAPI
- DynamoDB
- Amazon S3
- LocalStack para desarrollo
- Deep Learning/CNN como senal auxiliar para verificacion visual de evidencia
- Random Forest para prediccion de vida util/riesgo
- K-Means para clustering
- Docker
- AWS Lambda Function URL + ECR en produccion

## Endpoints principales

- `GET /health`: health check.
- `POST /api/documentos/upload`: carga documento en S3 y registra metadatos.
- `GET /api/documentos?activoId=<id>`: lista documentos por activo.
- `GET /api/documentos/{documento_id}/url`: URL presignada de descarga.
- `PUT /api/documentos/{documento_id}/version`: nueva version.
- `DELETE /api/documentos/{documento_id}`: soft delete.
- `GET /api/documentos/{documento_id}/auditoria`: auditoria del documento.
- `GET /api/auditoria/{documento_id}`: auditoria global.
- `POST /api/ia/diagnostico`: verificacion visual IA por imagen.
- `POST /api/ia/diagnostico-imagen`: alias usado por mobile.
- `GET /api/ia/diagnosticos?activoId=<id>`: historial de verificaciones.
- `GET /api/ml/prediccion-vida-util`: prediccion Random Forest.
- `GET /api/ml/clustering`: clustering K-Means.

Los endpoints protegidos requieren JWT compatible con MS1.

## Cobertura funcional MS2

- `DocumentoController`: carga, descarga presignada, versiones, soft delete, busqueda por activo/filtros y auditoria documental.
- `IAController`: verificacion visual de evidencia con imagenes, S3, DynamoDB e historial por activo.
- `AuditoriaController`: consulta de eventos para administradores y auditores.
- `MLController`: prediccion de vida util/riesgo con Random Forest y agrupacion con K-Means.
- `app/modelos/`: wrappers `CNN_EstadoActivo`, `RandomForest_VidaUtil` y `KMeans_Clustering` cargados por `ModelLoader`.
- Auditoria DynamoDB: documentos, accesos/listados, versiones, verificaciones visuales y predicciones ML.

## IA de imagen: verificacion visual, no diagnostico absoluto

MS2 ya no intenta determinar con precision el estado fisico de un activo usando
solo una fotografia, porque los modelos entrenados con datasets externos no
representan necesariamente los activos reales de la organizacion. La imagen se
usa como evidencia documental y de auditoria.

El endpoint de IA retorna uno de estos resultados:

- `EVIDENCIA_VALIDADA`: la foto tiene calidad suficiente y muestra evidencia visual util.
- `REQUIERE_REVISION`: la evidencia no permite validacion automatica y requiere confirmacion humana.
- `FOTO_NO_CONFIABLE`: la imagen es oscura, borrosa, uniforme o insuficiente para auditoria.
- `POSIBLE_INCONSISTENCIA`: la imagen actual difiere de una imagen historica del mismo activo.

La respuesta conserva los campos compatibles con mobile/frontend:

```json
{
  "diagnostico": "EVIDENCIA_VALIDADA",
  "estado": "evidencia_validada",
  "confianza": 0.82,
  "detalle": "Resultado de verificacion visual...",
  "recomendacion": "La fotografia es util como evidencia documental...",
  "tipoAnalisis": "VERIFICACION_VISUAL_EVIDENCIA",
  "verificaciones": [
    {
      "criterio": "calidad_fotografica",
      "resultado": "OK",
      "detalle": "Calidad 82.1%; brillo=..."
    }
  ],
  "similitudReferencia": 0.91
}
```

Si existe una imagen historica en S3 para el activo, MS2 la descarga y compara
la similitud visual mediante hash perceptual simple. Si no existe referencia,
solo valida calidad de captura y presencia visual. Si hay un CNN cargado desde
S3 o `LOCAL_MODELS_PATH`, su salida se registra como `senalModelo`, pero no
decide por si sola el resultado final.

## ML y trazabilidad

Los endpoints ML registran cada inferencia en DynamoDB mediante auditoria:

- `PREDICCION_RANDOM_FOREST`: entrada de categoria/valor/edad y salida de vida util, riesgo, cluster y recomendacion.
- `CLUSTERING_KMEANS`: entrada de categoria y grupos resultantes.

Esto permite demostrar parametros de entrada, usuario, IP, timestamp y resultado
sin reentrenar modelos en cada request.

## Variables principales

Crear el archivo local:

```bash
cd ms2
cp .env.example .env
```

Variables clave:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`: credenciales AWS o fake para LocalStack.
- `AWS_REGION`: region AWS.
- `AWS_ENDPOINT_URL`: `http://localhost:4566` para LocalStack; vacio en produccion.
- `S3_BUCKET_NAME`: bucket de documentos e imagenes.
- `DYNAMODB_TABLE_DOCS`: tabla de metadatos documentales.
- `DYNAMODB_TABLE_AUDITORIA`: tabla de auditoria.
- `JWT_SECRET`: debe coincidir con MS1.
- `ALLOWED_ORIGINS`: origenes CORS.
- `LOCAL_MODELS_PATH`: ruta local de modelos IA opcional para desarrollo.

## Arranque en desarrollo con Docker

Modo recomendado. Levanta LocalStack y MS2.

```bash
cd ms2
cp .env.example .env
docker compose up --build
```

URLs locales:

```text
http://localhost:8002/health
http://localhost:8002/docs
http://localhost:8002/api
```

Detener:

```bash
docker compose down
```

Eliminar tambien los datos LocalStack:

```bash
docker compose down -v
```

## Arranque en desarrollo sin Docker

Requiere Python 3.11. Para documentos y auditoria completos, tambien requiere LocalStack o AWS real.

```bash
cd ms2
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8002
```

Opcional: generar modelos de prueba.

```bash
python scripts/train_models.py
```

## Arranque en produccion con Docker

Construir y ejecutar la imagen con variables AWS reales. No usar `AWS_ENDPOINT_URL` en produccion.

```bash
cd ms2
docker build -t ms2-documentos-ia:prod .
docker run -d \
  --name ms2-documentos-ia-prod \
  --env-file .env.production \
  -p 8002:8002 \
  ms2-documentos-ia:prod
```

Variables minimas de `.env.production`:

```dotenv
AWS_ACCESS_KEY_ID=<ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<SECRET_KEY>
AWS_SESSION_TOKEN=<SESSION_TOKEN_OPCIONAL>
AWS_REGION=us-east-1
S3_BUCKET_NAME=<BUCKET>
DYNAMODB_TABLE_DOCS=activos-fijos-ms2-documentos
DYNAMODB_TABLE_AUDITORIA=activos-fijos-ms2-auditoria
JWT_SECRET=<MISMO_SECRET_DE_MS1>
ALLOWED_ORIGINS=https://<frontend-angular>
```

## Despliegue en produccion con GitHub Actions

Workflow:

```text
.github/workflows/ms2-aws-cd.yml
```

El workflow se ejecuta al hacer `pull_request` hacia `main`, al hacer `push` a `main` con cambios en `ms2/**` o `deploy/aws-ms2/**`, o manualmente desde GitHub Actions. En PR ejecuta tests; en `main` construye una imagen Lambda, la publica en ECR y despliega CloudFormation con Lambda Function URL, S3 y DynamoDB.

Secretos requeridos:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET`

Sin credenciales AWS, el workflow ejecuta tests y omite el despliegue con warning. Al configurar los secretos AWS, el siguiente `push` o `workflow_dispatch` despliega MS2.

Secreto opcional:

- `AWS_SESSION_TOKEN`

Variables opcionales:

- `AWS_REGION`
- `MS2_PROJECT_NAME`
- `MS2_STACK_NAME`
- `MS2_ECR_REPO`
- `MS2_S3_BUCKET_NAME`
- `DYNAMODB_TABLE_DOCS`
- `DYNAMODB_TABLE_AUDITORIA`
- `MS2_ALLOWED_ORIGINS`
- `JWT_ALGORITHM`

## Pruebas

```bash
cd ms2
pytest
```

## Verificacion rapida

```bash
curl http://localhost:8002/health
```

Documentacion OpenAPI:

```text
http://localhost:8002/docs
```
