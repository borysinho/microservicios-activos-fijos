---
applyTo: "ms3/**,**/ms3/**,**/automatizacion/**,**/n8n/**"
description: "Instrucciones para MS3 — Automatización con NestJS y N8N en Google Cloud. Usar cuando se trabaje en el microservicio de orquestación/automatización."
---

# MS3 — Automatización (NestJS + N8N)

**Cloud**: Google Cloud Platform — Cloud Run  
**API**: REST + Webhooks  
**Herramienta de flujos**: N8N

## Stack Técnico

- NestJS 11+ con TypeScript (Node.js 20+ como runtime)
- N8N self-hosted (desplegado en GCP Cloud Run o GCE)
- `@nestjs/axios` para llamadas HTTP a MS1 y MS2
- Integraciones: SendGrid (email), WhatsApp Business API, webhooks HTTP

## Flujo de Automatización Mínimo Requerido (3 pasos)

El docente requiere explícitamente un flujo de ≥ 3 pasos integrados:

```
1. WhatsApp Business API → recibe solicitud de revisión de activo
2. MS3 (N8N) → consulta MS1 o MS2, procesa la solicitud
3. SendGrid → envía notificación/confirmación por email al responsable
```

Este flujo debe estar implementado como un **workflow de N8N**.

## Estructura del Proyecto

```
ms3-automatizacion/
├── src/
│   ├── webhooks/
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts  # Recibe eventos de MS1
│   │   └── webhooks.service.ts
│   ├── notificaciones/
│   │   ├── notificaciones.module.ts
│   │   └── notificaciones.service.ts  # SendGrid, WhatsApp
│   ├── app.module.ts
│   └── main.ts
├── n8n-workflows/
│   └── flujo-revision-activo.json  # Exportación del workflow N8N
├── Dockerfile
└── package.json
```

## Responsabilidades del Microservicio

1. **Recibir webhooks de MS1**: cuando ocurre una asignación, traslado o baja de activo
2. **Orquestar flujos N8N** en respuesta a dichos eventos
3. **Conectar con MS2** para verificar documentación del activo en cuestión
4. **Disparar notificaciones** vía email (SendGrid) y/o WhatsApp

## Webhook Expuesto (consumido por MS1)

```
POST /webhooks/evento-activo
Body: {
  "tipo": "ASIGNACION" | "TRASLADO" | "BAJA",
  "activoId": "<uuid>",
  "responsableEmail": "...",
  "detalles": { ... }
}
```

El controlador NestJS usa el decorador `@Post('evento-activo')` dentro de `WebhooksController`. Validar el body con `class-validator` y DTOs de Pydantic.

## Integración N8N

- N8N corre como proceso separado (puede ser en el mismo contenedor o sidecar)
- Los workflows se versionan exportando el JSON desde la UI de N8N y guardándolo en `n8n-workflows/`
- Activar el workflow mediante webhook trigger en N8N

## Variables de Entorno

- `SENDGRID_API_KEY` — clave API de SendGrid
- `WHATSAPP_API_TOKEN` — token WhatsApp Business
- `MS1_BASE_URL` — URL interna de MS1
- `MS2_BASE_URL` — URL interna de MS2
- `N8N_WEBHOOK_URL` — URL base de N8N para disparar workflows

No hardcodear ninguna credencial; usar Secret Manager de GCP o variables de entorno en Cloud Run.

## Despliegue (GCP)

- Docker → Google Container Registry (GCR) → Cloud Run
- El servicio N8N puede desplegarse en la misma instancia de Cloud Run o en Google Compute Engine si requiere persistencia de workflows
