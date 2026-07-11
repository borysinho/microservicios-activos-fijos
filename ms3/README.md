# MS3 - Automatizacion y Orquestacion

Microservicio NestJS encargado de automatizar flujos entre WhatsApp, MS1, MS2, email y notificaciones. Expone webhooks para eventos de activos, garantia, mantenimiento y diagnosticos criticos. Incluye workflows N8N exportados para evidencia del flujo WhatsApp -> sistema -> email.

## Stack

- Node.js 20
- NestJS
- N8N
- WhatsApp Business API o WAHA en desarrollo
- SendGrid
- Firebase Cloud Messaging opcional
- Docker
- Google Cloud Run en produccion

## Endpoints principales

- `GET /health`: health check productivo para Cloud Run y CI/CD.
- `GET /whatsapp/webhook`: verificacion inicial de WhatsApp Business API.
- `POST /whatsapp/webhook`: recibe mensajes entrantes y dispara el flujo de revision.
- `POST /webhooks/vencimiento-garantia`: alerta de garantia desde MS1.
- `POST /webhooks/mantenimiento-programado`: alerta de mantenimiento desde MS1.
- `POST /webhooks/diagnostico-critico`: alerta desde MS2 por diagnostico CNN critico.
- `POST /webhook/activos`: compatibilidad con el cliente actual de MS1.
- `GET /api/flujos`: estado de los 3 flujos para Angular.
- `POST /api/webhook/reportar-problema`: reporte desde mobile.

Los endpoints tambien estan disponibles con prefijo `/api` cuando frontend o mobile los consumen.

## Variables principales

Crear el archivo local:

```bash
cd ms3
cp .env.example .env
```

Variables clave:

- `PORT`: puerto HTTP, por defecto `3000`.
- `MS3_DEV_TOOLS_ENABLED`: habilita endpoints `/api/dev/**`.
- `MS1_GRAPHQL_URL`: endpoint GraphQL de MS1.
- `MS1_TICKETS_URL`: endpoint de tickets/solicitudes en MS1 si aplica.
- `MS2_BASE_URL`: URL base REST de MS2 con prefijo `/api`.
- `MS2_AUTH_TOKEN`: JWT Bearer para consultar endpoints protegidos de MS2.
- `N8N_WEBHOOK_URL`: URL de N8N.
- `WHATSAPP_PROVIDER`: `meta` o `waha`.
- `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_API_KEY`: WhatsApp local con WAHA.
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`: email.
- `FCM_PROJECT_ID`, `FCM_ACCESS_TOKEN`: notificaciones push opcionales.

## Arranque en desarrollo con Docker

Modo recomendado. Levanta MS3 y N8N.

```bash
cd ms3
cp .env.example .env
docker compose up --build
```

URLs locales:

```text
http://localhost:3000/api/flujos
http://localhost:3000/api/dev/health
http://localhost:5678
```

Detener:

```bash
docker compose down
```

Eliminar tambien datos de N8N:

```bash
docker compose down -v
```

## Arranque en desarrollo sin Docker

```bash
cd ms3
npm install
cp .env.example .env
npm run start:dev
```

Tambien puedes habilitar herramientas de desarrollo directamente:

```bash
MS3_DEV_TOOLS_ENABLED=true npm run start:dev
```

Si MS1 o MS2 no estan disponibles localmente, el modo desarrollo usa datos demo para activos como `ACT-2024-001`, `ACT-2024-002` y `ACT-2024-003`.

## WhatsApp local con WAHA

Para ejecutar MS3 fuera de Docker contra WAHA local:

```bash
WHATSAPP_PROVIDER=waha \
WAHA_BASE_URL=http://localhost:3001 \
WAHA_SESSION=default \
WAHA_API_KEY=activos-local-waha-key \
npm run start:dev
```

## Arranque en produccion con Docker

Construir la imagen productiva:

```bash
cd ms3
docker build -t ms3-automatizacion:prod .
```

Ejecutar con variables reales:

```bash
docker run -d \
  --name ms3-automatizacion-prod \
  --env-file .env.production \
  -p 3000:3000 \
  ms3-automatizacion:prod
```

Variables minimas de `.env.production`:

```dotenv
NODE_ENV=production
PORT=3000
MS3_DEV_TOOLS_ENABLED=false
MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS2_BASE_URL=https://<ms2-aws>/api
MS2_AUTH_TOKEN=<JWT_MS2>
N8N_WEBHOOK_URL=https://<n8n-o-webhook>
SENDGRID_API_KEY=<SENDGRID_API_KEY>
SENDGRID_FROM_EMAIL=noreply@activos.empresa.com
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=<PHONE_NUMBER_ID>
WHATSAPP_TOKEN=<WHATSAPP_TOKEN>
WHATSAPP_VERIFY_TOKEN=<VERIFY_TOKEN>
```

## Despliegue en produccion con GitHub Actions

Workflow:

```text
.github/workflows/ms3-gcp-cd.yml
```

El workflow se ejecuta al hacer `push` a `main` con cambios en `ms3/**`, o manualmente desde GitHub Actions. Ejecuta `npm ci`, tests, build y despliega a Google Cloud Run con `gcloud run deploy --source ms3`.

Secreto requerido:

- `GCP_SA_KEY`
- `MS2_AUTH_TOKEN`

Variables requeridas:

- `GCP_PROJECT_ID`
- `MS1_GRAPHQL_URL`
- `MS2_BASE_URL`

Variables opcionales:

- `GCP_REGION`
- `MS3_CLOUD_RUN_SERVICE`
- `SENDGRID_FROM_EMAIL`
- `N8N_WEBHOOK_URL`

El despliegue usa limites conservadores para presentacion y capa gratuita:
`--min-instances=0`, `--max-instances=1`, `--cpu=1`, `--memory=512Mi`,
`--cpu-throttling` y `--no-cpu-boost`. Tras desplegar, GitHub Actions ejecuta
un smoke test contra `/health`.

## Probar funcionalidades en desarrollo

Health:

```bash
curl -sS http://localhost:3000/api/dev/health
```

Simular WhatsApp -> sistema -> email:

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"59170000000","text":"Solicito revision de ACT-2024-001"}'
```

Alerta de garantia:

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/vencimiento-garantia \
  -H "Content-Type: application/json" \
  -d '{}'
```

Alerta de mantenimiento:

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/mantenimiento-programado \
  -H "Content-Type: application/json" \
  -d '{}'
```

Diagnostico critico desde MS2:

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/diagnostico-critico \
  -H "Content-Type: application/json" \
  -d '{}'
```

Estado de flujos para Angular:

```bash
curl -sS http://localhost:3000/api/flujos
```

Contrato usado por mobile:

```bash
curl -sS -X POST http://localhost:3000/api/webhook/reportar-problema \
  -H "Content-Type: application/json" \
  -d '{
    "activoId": "550e8400-e29b-41d4-a716-446655440000",
    "activoCodigo": "ACT-2024-001",
    "descripcion": "Pantalla rota"
  }'
```

## Pruebas

```bash
cd ms3
npm test
npm run build
```

## N8N

Los workflows exportados estan en `n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`
