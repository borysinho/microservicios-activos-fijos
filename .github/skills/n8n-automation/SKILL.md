---
name: n8n-automation
description: >
  Implement NestJS webhooks and N8N automation workflows for MS3 (Node.js / Google Cloud)
  of the Sistema de Activos Fijos. Use this skill when working on MS3: building NestJS
  webhook controllers, creating N8N workflow JSON exports, integrating with SendGrid for
  email notifications, WhatsApp Business API for incoming requests, or orchestrating
  multi-step flows between MS1 and MS2.
  Use when: creating automation flows, implementing webhook endpoints, configuring N8N
  workflows, sending email notifications, receiving WhatsApp messages, building NestJS
  controllers or services for event orchestration.
---

# N8N Automation + NestJS — MS3 Automatización

This skill guides implementation of MS3: the automation and orchestration microservice
built with NestJS (TypeScript), N8N, SendGrid, and WhatsApp Business API, deployed
on Google Cloud Run.

## Project Structure

```
ms3-automatizacion/
├── src/
│   ├── webhooks/
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts   # Receives events from MS1
│   │   ├── webhooks.service.ts      # Triggers N8N or handles directly
│   │   └── dto/
│   │       └── evento-activo.dto.ts
│   ├── notificaciones/
│   │   ├── notificaciones.module.ts
│   │   └── notificaciones.service.ts  # SendGrid + WhatsApp
│   ├── ms1-client/
│   │   └── ms1.service.ts           # HTTP client to MS1 REST endpoints
│   ├── ms2-client/
│   │   └── ms2.service.ts           # HTTP client to MS2 REST endpoints
│   ├── app.module.ts
│   └── main.ts
├── n8n-workflows/
│   └── flujo-revision-activo.json   # N8N workflow export (versioned)
├── Dockerfile
└── package.json
```

## Webhook Endpoint (consumed by MS1)

```typescript
// dto/evento-activo.dto.ts
import { IsEnum, IsUUID, IsEmail, IsObject } from "class-validator";

export enum TipoEvento {
  ASIGNACION = "ASIGNACION",
  TRASLADO = "TRASLADO",
  BAJA = "BAJA",
  GARANTIA_PROXIMA = "GARANTIA_PROXIMA",
  DIAGNOSTICO_CRITICO = "DIAGNOSTICO_CRITICO",
}

export class EventoActivoDto {
  @IsEnum(TipoEvento)
  tipo: TipoEvento;

  @IsUUID()
  activoId: string;

  @IsEmail()
  responsableEmail: string;

  @IsObject()
  detalles: Record<string, unknown>;
}
```

```typescript
// webhooks.controller.ts
import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { EventoActivoDto } from "./dto/evento-activo.dto";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("evento-activo")
  @HttpCode(202)
  async recibirEvento(@Body() dto: EventoActivoDto): Promise<void> {
    await this.webhooksService.procesarEvento(dto);
  }
}
```

## Main Automation Flow (≥3 steps — required by professor)

The mandatory flow triggered when MS1 detects a warranty expiring in ≤15 days:

```
Step 1: MS1 → POST /webhooks/evento-activo  (tipo: GARANTIA_PROXIMA)
Step 2: N8N queries MS2 → GET /documentos/{activoId}  (verify docs complete)
Step 3: N8N creates review order → POST /activos/{id}/ordenes (MS1)
Step 4: N8N sends email via SendGrid to responsable
Step 5: N8N sends push notification to mobile app
```

## WebhooksService — Event Dispatch

```typescript
// webhooks.service.ts
@Injectable()
export class WebhooksService {
  constructor(
    private readonly notificaciones: NotificacionesService,
    private readonly ms1Client: Ms1Service,
    private readonly ms2Client: Ms2Service,
  ) {}

  async procesarEvento(evento: EventoActivoDto): Promise<void> {
    switch (evento.tipo) {
      case TipoEvento.ASIGNACION:
        await this.notificaciones.enviarEmailAsignacion(evento);
        break;

      case TipoEvento.GARANTIA_PROXIMA:
        // Full N8N-orchestrated flow
        const docStatus = await this.ms2Client.verificarDocumentacion(
          evento.activoId,
        );
        const orden = await this.ms1Client.crearOrdenRevision(evento.activoId);
        await this.notificaciones.enviarEmailGarantiaProxima(
          evento,
          orden,
          docStatus,
        );
        break;

      case TipoEvento.DIAGNOSTICO_CRITICO:
        const ordenMant = await this.ms1Client.crearOrdenMantenimiento(
          evento.activoId,
        );
        await this.notificaciones.enviarEmailDiagnosticoCritico(
          evento,
          ordenMant,
        );
        break;
    }
  }
}
```

## NotificacionesService — SendGrid

```typescript
// notificaciones.service.ts
import * as sgMail from "@sendgrid/mail";

@Injectable()
export class NotificacionesService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async enviarEmailAsignacion(evento: EventoActivoDto): Promise<void> {
    await sgMail.send({
      to: evento.responsableEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Activo asignado — ${evento.detalles["codigoActivo"]}`,
      html: `<p>Se le ha asignado el activo <strong>${evento.detalles["nombreActivo"]}</strong>.</p>`,
    });
  }

  async enviarEmailGarantiaProxima(
    evento: EventoActivoDto,
    orden: { numero: string },
    docStatus: { completo: boolean },
  ): Promise<void> {
    await sgMail.send({
      to: evento.responsableEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Garantía próxima a vencer — Activo ${evento.detalles["codigoActivo"]}`,
      html: `<p>Orden generada: <strong>${orden.numero}</strong>. Documentación: ${docStatus.completo ? "completa" : "pendiente"}.</p>`,
    });
  }
}
```

## N8N Workflow — JSON Export Convention

N8N workflows are version-controlled as JSON exports in `n8n-workflows/`:

```json
{
  "name": "flujo-revision-activo",
  "nodes": [
    { "type": "n8n-nodes-base.webhook", "name": "Recibir evento MS1" },
    { "type": "n8n-nodes-base.httpRequest", "name": "Verificar docs en MS2" },
    { "type": "n8n-nodes-base.httpRequest", "name": "Crear orden en MS1" },
    { "type": "n8n-nodes-base.sendGrid", "name": "Enviar email SendGrid" },
    { "type": "n8n-nodes-base.httpRequest", "name": "Notificación push móvil" }
  ]
}
```

**Rules for N8N workflows:**

- Every workflow must have ≥3 connected nodes (professor requirement).
- Export as JSON and commit to `n8n-workflows/` after every change.
- Use the **Webhook Trigger** node as the entry point.
- Use **HTTP Request** nodes to call MS1 and MS2.
- Credentials (API keys) must be stored in N8N's credential store — never hardcoded in workflow JSON.

## WhatsApp Business API — Incoming Messages

Incoming WhatsApp messages are routed via webhook into N8N:

```
POST /webhooks/whatsapp
Body: { "from": "+591...", "message": "Activo COD-123 requiere revisión urgente" }
```

N8N flow:

1. Parse asset code from message text (regex or simple substring match).
2. `GET /activos/{codigo}` on MS1 — confirm asset exists.
3. `POST /activos/{id}/tickets` on MS1 — create review ticket.
4. Send confirmation back via WhatsApp API and email via SendGrid.

## Environment Variables

```
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
WHATSAPP_API_TOKEN
WHATSAPP_PHONE_NUMBER_ID
MS1_BASE_URL                # e.g. https://ms1.azurewebsites.net
MS2_BASE_URL                # e.g. https://ms2.aws.example.com
N8N_WEBHOOK_URL             # Internal N8N webhook base URL
```

## Deployment (Google Cloud Run)

- NestJS app and N8N run as separate services in Cloud Run (or as a sidecar).
- `Dockerfile` for NestJS: standard Node.js multi-stage build.
- N8N uses the official `n8nio/n8n` Docker image.
- Use Google Cloud Secret Manager for all secrets — not environment variables directly in Cloud Run config.
