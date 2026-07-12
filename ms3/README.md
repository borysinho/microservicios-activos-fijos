# MS3 - Automatizacion y Orquestacion

Microservicio NestJS encargado de coordinar flujos entre WhatsApp, MS1, MS2, email, notificaciones y MS4/N8N. Expone webhooks para eventos de activos, garantia, mantenimiento y diagnosticos criticos. MS3 es el unico servicio autorizado para invocar MS4.

## Stack

- Node.js 20
- NestJS
- MS4/N8N mediante webhooks
- WhatsApp Business API o WAHA en desarrollo
- SendGrid
- Firebase Cloud Messaging opcional
- Docker
- Google Cloud Run en produccion

## Endpoints principales

- `GET /health`: health check productivo para Cloud Run y CI/CD.
- `GET /whatsapp/webhook`: verificacion inicial de WhatsApp Business API.
- `POST /whatsapp/webhook`: recibe mensajes entrantes, aplica el agente de politica conversacional y solo dispara operaciones permitidas por chat.
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

- `MS3_PORT`: puerto HTTP, por defecto `3000`.
- `MS3_DEV_TOOLS_ENABLED`: habilita endpoints `/api/dev/**`.
- `MS3_MS1_GRAPHQL_URL`: endpoint GraphQL de MS1.
- `MS3_MS1_TICKETS_URL`: endpoint de tickets/solicitudes en MS1 si aplica.
- `MS3_MS2_BASE_URL`: URL base REST de MS2 con prefijo `/api`.
- `MS3_MS2_AUTH_TOKEN`: JWT Bearer para consultar endpoints protegidos de MS2.
- `MS3_MS4_N8N_WEBHOOK_URL`: URL base de MS4/N8N.
- `MS3_EMAIL_PROVIDER`: `smtp` para Gmail o `sendgrid` para SendGrid.
- `MS3_SMTP_HOST`, `MS3_SMTP_PORT`, `MS3_SMTP_USER`, `MS3_SMTP_PASSWORD`, `MS3_SMTP_FROM_EMAIL`: correo SMTP; Gmail usa `smtp.gmail.com:587`.
- `MS3_WHATSAPP_PROVIDER`: `twilio`, `meta` o `waha`.
- `MS3_TWILIO_ACCOUNT_SID`, `MS3_TWILIO_AUTH_TOKEN`, `MS3_TWILIO_WHATSAPP_FROM`: sandbox/API de Twilio WhatsApp.
- `MS3_WAHA_BASE_URL`, `MS3_WAHA_SESSION`, `MS3_WAHA_API_KEY`: WhatsApp local con WAHA.
- `MS3_SENDGRID_API_KEY`, `MS3_SENDGRID_FROM_EMAIL`: email.
- `MS3_FCM_PROJECT_ID`, `MS3_FCM_ACCESS_TOKEN`: notificaciones push opcionales.
- `MS3_AZURE_OPENAI_ENDPOINT`, `MS3_AZURE_OPENAI_DEPLOYMENT`, `MS3_AZURE_OPENAI_API_VERSION`, `MS3_AZURE_OPENAI_API_KEY`: LLM Azure OpenAI usado como agente conversacional de WhatsApp.

## Arranque en desarrollo con Docker

Levanta solo MS3. Para ejecutar N8N localmente, iniciar `ms4/` en otra terminal.

```bash
cd ms3
cp .env.example .env
docker compose up --build
```

URLs locales:

```text
http://localhost:3000/api/flujos
http://localhost:3000/api/dev/health
```

MS4 local debe estar disponible en `http://localhost:5678`, y MS3 debe tener:

```dotenv
MS3_MS4_N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

Detener:

```bash
docker compose down
```

Los datos de N8N se gestionan desde `ms4/docker-compose.yml`.

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
MS3_WHATSAPP_PROVIDER=waha \
MS3_WAHA_BASE_URL=http://localhost:3001 \
MS3_WAHA_SESSION=default \
MS3_WAHA_API_KEY=activos-local-waha-key \
npm run start:dev
```

## Bot WhatsApp con LLM en modo agente

MS3 usa Azure OpenAI como LLM agente antes de llamar a MS4/N8N. Cada mensaje se clasifica con el deployment configurado en `MS3_AZURE_OPENAI_DEPLOYMENT`; despues MS3 vuelve a validar la decision con una lista blanca de negocio. Si Azure OpenAI no esta configurado en desarrollo, MS3 usa el clasificador deterministico local para poder probar el flujo.

| Intencion | Permitida por WhatsApp | Resultado |
| --- | --- | --- |
| Consultar activo | Si | Consulta informacion basica en MS1 por codigo. |
| Solicitar revision o mantenimiento correctivo | Si | Dispara `solicitud-revision` hacia MS4/N8N o procesa el flujo interno en desarrollo. |
| Ayuda/menu | Si | Devuelve ejemplos de comandos permitidos. |
| Alta, edicion, baja, traslado, transferencia o asignacion | No | Responde rechazo y no llama a MS4 ni a MS1. |
| Documentos, diagnostico con camara, usuarios, roles, BI o administracion | No | Indica que debe usarse web o movil. |

Ejemplos permitidos:

```text
consultar ACT-2024-001
estado de ACT-2024-001
revisar ACT-2024-001 no enciende
solicito mantenimiento de EQ-2024-005 por falla electrica
```

Ejemplos rechazados:

```text
dar de baja ACT-2024-001
trasladar ACT-2024-001 al area Contabilidad
asignar ACT-2024-001 a Juan Perez
subir documento de ACT-2024-001
diagnosticar ACT-2024-001 con foto
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
MS3_NODE_ENV=production
MS3_PORT=3000
MS3_DEV_TOOLS_ENABLED=false
MS3_MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS3_MS2_BASE_URL=https://<ms2-aws>/api
MS3_MS2_AUTH_TOKEN=<JWT_MS2>
MS3_MS4_N8N_WEBHOOK_URL=https://<ms4-azure>/webhook
MS3_EMAIL_PROVIDER=smtp
MS3_SMTP_HOST=smtp.gmail.com
MS3_SMTP_PORT=587
MS3_SMTP_SECURE=false
MS3_SMTP_USER=<gmail>
MS3_SMTP_PASSWORD=<gmail-app-password>
MS3_SMTP_FROM_EMAIL=<gmail>
MS3_WHATSAPP_PROVIDER=twilio
MS3_TWILIO_ACCOUNT_SID=<MS3_TWILIO_ACCOUNT_SID>
MS3_TWILIO_AUTH_TOKEN=<MS3_TWILIO_AUTH_TOKEN>
MS3_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
MS3_WHATSAPP_VERIFY_TOKEN=<VERIFY_TOKEN>
MS3_AZURE_OPENAI_ENDPOINT=https://activos-whatsapp-llm.openai.azure.com/
MS3_AZURE_OPENAI_DEPLOYMENT=whatsapp-agent-mini
MS3_AZURE_OPENAI_API_VERSION=2025-01-01-preview
MS3_AZURE_OPENAI_API_KEY=<azure-openai-key>
```

## Despliegue en produccion con GitHub Actions

Workflow:

```text
.github/workflows/ms3-gcp-cd.yml
```

El workflow se ejecuta al hacer `push` a `main` con cambios en `ms3/**`, o manualmente desde GitHub Actions. Ejecuta `npm ci`, tests, build y despliega a Google Cloud Run con `gcloud run deploy --source ms3`.

Secreto requerido:

- `MS3_GCP_SA_KEY`
- `MS3_MS2_AUTH_TOKEN`

Variables requeridas:

- `MS3_GCP_PROJECT_ID`
- `MS3_MS1_GRAPHQL_URL`
- `MS3_MS2_BASE_URL`

Variables opcionales:

- `MS3_GCP_REGION`
- `MS3_CLOUD_RUN_SERVICE`
- `MS3_SENDGRID_FROM_EMAIL`
- `MS3_MS4_N8N_WEBHOOK_URL`

El despliegue usa limites conservadores para presentacion y capa gratuita:
`--min-instances=0`, `--max-instances=1`, `--cpu=1`, `--memory=512Mi`,
`--cpu-throttling` y `--no-cpu-boost`. Tras desplegar, GitHub Actions ejecuta
un smoke test contra `/health`.

## Flujo de automatizacion en produccion

El flujo que cubre el requisito del docente entra siempre por MS3:

```text
WhatsApp -> MS3 Cloud Run -> MS4/N8N Azure -> MS3 -> MS1/MS2 -> email/WhatsApp
```

MS3 recibe `POST /whatsapp/webhook`, valida y normaliza el mensaje, consulta el agente LLM de Azure OpenAI, aplica la lista blanca de operaciones permitidas por chat, dispara MS4 con `MS3_MS4_N8N_WEBHOOK_URL` solo cuando corresponde y conserva el estado visible en `GET /api/flujos`. N8N ejecuta el workflow `flujo_01_solicitud_revision.json` y vuelve a MS3 para crear la orden/ticket, enviar email y responder WhatsApp.

La guia completa de revision productiva esta en `AUTOMATIZACION_MS3_MS4_PRODUCCION.md`.

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

## Integracion con MS4/N8N

Los workflows exportados ya no viven en MS3. Estan en `../ms4/n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`

Regla de integracion: MS3 dispara esos workflows usando `MS3_MS4_N8N_WEBHOOK_URL`. Ningun cliente externo debe llamar directamente a MS4.
