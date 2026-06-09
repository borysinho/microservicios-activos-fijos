# MS3 - Automatizacion y Orquestacion

Microservicio NestJS + N8N para CU-67 a CU-74.

## Endpoints principales

- `GET /whatsapp/webhook`: verificacion inicial de WhatsApp Business API.
- `POST /whatsapp/webhook`: recibe mensajes entrantes y dispara el flujo de revision.
- `POST /webhooks/vencimiento-garantia`: alerta de garantia desde MS1.
- `POST /webhooks/mantenimiento-programado`: alerta de mantenimiento desde MS1.
- `POST /webhooks/diagnostico-critico`: alerta desde MS2 por diagnostico CNN critico.
- `POST /webhook/activos`: compatibilidad con el cliente actual de MS1.
- `GET /api/flujos`: estado de los 3 flujos para frontend.
- `POST /api/webhook/reportar-problema`: reporte desde mobile.

Los endpoints tambien estan disponibles con prefijo `/api` cuando el frontend o la app movil lo usan.

## Ejecutar local

```bash
npm install
npm run start:dev
```

## Pruebas

```bash
npm test
npm run build
```

## N8N

Los workflows exportados estan en `n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`

Para entorno local con N8N:

```bash
docker compose up --build
```
