# Especificaciones de Casos de Uso — MS3 (NestJS + N8N)

**Microservicio**: MS3 — Automatización y Orquestación  
**Tecnología**: Node.js / NestJS / N8N  
**Cloud**: Google Cloud Platform  
**CUs**: CU-67 a CU-74

---

## Estructura del Proyecto MS3

```
ms3/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml          # Incluye NestJS + N8N
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── configuration.ts    # Variables de entorno
│   ├── webhooks/
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts  # Recibe eventos internos de MS1
│   │   └── webhooks.service.ts
│   ├── whatsapp/
│   │   ├── whatsapp.module.ts
│   │   ├── whatsapp.controller.ts  # Recibe mensajes de WhatsApp Business API
│   │   └── whatsapp.service.ts
│   ├── notificaciones/
│   │   ├── notificaciones.module.ts
│   │   └── notificaciones.service.ts  # SendGrid email
│   ├── ms1-client/
│   │   └── ms1-client.service.ts     # HTTP client para MS1
│   └── ms2-client/
│       └── ms2-client.service.ts     # HTTP client para MS2
├── n8n-workflows/
│   ├── flujo_01_solicitud_revision.json
│   ├── flujo_02_alerta_garantia.json
│   └── flujo_03_alerta_mantenimiento.json
```

---

## Módulo 10 — Automatización N8N

### CU-67: Recibir mensaje de WhatsApp del responsable de área

**Actor**: Responsable de Área (vía WhatsApp)  
**Precondiciones**: El número de WhatsApp del responsable está registrado en el sistema. El webhook de WhatsApp Business API está configurado y activo en MS3.  
**Postcondiciones**: El mensaje es recibido y encolado para procesamiento. Se retorna una respuesta de confirmación de recepción a WhatsApp.

**Flujo principal**:

1. El responsable envía un mensaje de WhatsApp al número empresarial del sistema.
2. WhatsApp Business API envía el payload al webhook de MS3: `POST /whatsapp/webhook`.
3. MS3 valida la firma HMAC-SHA256 del payload (seguridad de WhatsApp).
4. MS3 extrae: número de origen, cuerpo del mensaje, timestamp.
5. MS3 emite un evento interno o llama a N8N via webhook para procesar el mensaje.
6. MS3 responde `200 OK` a WhatsApp (requisito obligatorio; si demora >3s, WhatsApp reintenta).

**Alternativas**:

- 3a. Firma inválida: `403 Forbidden` — posible intento de spoofing.
- 4a. Mensaje vacío o de tipo no soportado (audio, video): responder "Solo acepto texto con el código del activo".

**Notas técnicas**:

- REST (NestJS): `POST /whatsapp/webhook`
- GET de verificación inicial de WhatsApp: `GET /whatsapp/webhook?hub.challenge=...&hub.verify_token=...`
- Validar firma: `crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBody).digest('hex')`
- Variable de entorno: `WHATSAPP_API_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`
- N8N Trigger: `Webhook` node configurado como `POST /n8n/solicitud-revision`

---

### CU-68: Identificar activo por código en el mensaje

**Actor**: Sistema (N8N — Nodo 2 del Flujo 1)  
**Precondiciones**: El mensaje de WhatsApp fue recibido (CU-67).  
**Postcondiciones**: El activo es identificado en MS1. Si no existe, se notifica al remitente.

**Flujo principal**:

1. N8N extrae el código del activo del texto del mensaje (regex: `ACT-\d{4}-\d+` o texto libre).
2. N8N llama a MS1 GraphQL: `query { activo(codigo: "ACT-2024-001") { id, nombre, estado, areaActual { nombre } } }`.
3. Si se encuentra el activo, continúa con CU-69.
4. Si no se encuentra: N8N llama a `POST /whatsapp/enviar` → respuesta al remitente: "Código de activo no encontrado".

**Notas técnicas**:

- N8N Nodo tipo: `HTTP Request` → MS1 GraphQL endpoint
- Autenticación: el token de servicio de MS3 está en la variable de N8N `MS1_SERVICE_TOKEN`
- Extracción de código: nodo `Code` en N8N con JavaScript: `const match = message.match(/ACT-\d{4}-\d+/i)`

---

### CU-69: Crear ticket de revisión en MS1

**Actor**: Sistema (N8N — Nodo 3 del Flujo 1)  
**Precondiciones**: El activo fue identificado (CU-68).  
**Postcondiciones**: Se crea un registro de solicitud de revisión en MS1 (o en una tabla local de MS3 si MS1 no tiene ese modelo).

**Notas técnicas**:

- Si MS1 tiene una entidad `SolicitudRevision`: N8N → `HTTP Request` → `POST /api/solicitudes-revision`
- **Alternativa simplificada**: MS3 guarda el ticket en memoria/logs y lo comunica a las partes
- N8N Nodo: `HTTP Request` → `POST http://ms1:8081/api/solicitudes`
- Payload: `{ activoId, solicitadoPorWhatsApp: "+591...", motivo: "{texto del mensaje}", fechaSolicitud: "..." }`

---

### CU-70: Verificar documentación del activo en MS2

**Actor**: Sistema (N8N — Nodo 4 del Flujo 1)  
**Precondiciones**: El activo fue identificado.  
**Postcondiciones**: N8N obtiene el estado documental del activo (si tiene documentos activos).

**Notas técnicas**:

- N8N Nodo: `HTTP Request` → `GET http://ms2:8000/api/documentos?activoId={activoId}`
- Retorna la lista de documentos activos
- N8N Nodo `IF`: si `documentos.length > 0` → adjuntar resumen al email; si `= 0` → incluir alerta "Sin documentación"

---

### CU-71: Enviar email de confirmación al responsable (SendGrid)

**Actor**: Sistema (N8N — Nodo 5 del Flujo 1)  
**Precondiciones**: El responsable del activo tiene email registrado en MS1.  
**Postcondiciones**: El responsable recibe un email con los detalles de la solicitud de revisión.

**Flujo principal**:

1. N8N obtiene el email del responsable del área desde los datos del activo (ya consultado en CU-68).
2. N8N llama a la API de SendGrid con el email estructurado.
3. SendGrid envía el correo.

**Notas técnicas**:

- N8N Nodo tipo: `SendGrid` (nodo nativo) o `HTTP Request` → `POST https://api.sendgrid.com/v3/mail/send`
- Variable de entorno N8N: `SENDGRID_API_KEY`
- Template del email:
  ```
  Asunto: Solicitud de revisión de activo {codigo} — {nombre}
  Cuerpo:
    Se recibió una solicitud de revisión vía WhatsApp.
    Activo: {codigo} — {nombre}
    Estado actual: {estado}
    Solicitante: {telefono}
    Mensaje: {textoOriginal}
    Documentos asociados: {n} documentos
    Acceder al sistema: https://activos.empresa.com/activos/{id}
  ```

---

### CU-72: Responder a WhatsApp con el estado de la solicitud

**Actor**: Sistema (N8N — Nodo 6 del Flujo 1)  
**Precondiciones**: El flujo se completó (ticket creado, email enviado).  
**Postcondiciones**: El responsable recibe una respuesta de WhatsApp confirmando que su solicitud fue recibida.

**Notas técnicas**:

- N8N Nodo: `HTTP Request` → `POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`
- Payload:
  ```json
  {
    "messaging_product": "whatsapp",
    "to": "{numero_remitente}",
    "type": "text",
    "text": {
      "body": "✅ Tu solicitud de revisión para el activo {codigo} fue recibida. Se notificó al responsable vía email. Referencia: #TKT-{ticketId}"
    }
  }
  ```
- Esto completa el **Flujo 1** de N8N (mínimo de 3 pasos cumplido: recibir → procesar → notificar)

---

### CU-73: Enviar alerta por vencimiento de garantía

**Actor**: Sistema (disparado por scheduler de MS1)  
**Precondiciones**: MS1 detecta activos cuya garantía vence en los próximos 30 días.  
**Postcondiciones**: Se envía email y notificación push al responsable del área.

**Flujo de automatización (Flujo 2 de N8N)**:

1. **Trigger**: Webhook de MS1 `POST http://ms3:3000/webhooks/vencimiento-garantia` (ejecutado diariamente por un `@Scheduled` en Spring Boot)
2. **Nodo 2**: Enriquecer datos del activo (llamada a MS1 GraphQL para obtener detalles completos)
3. **Nodo 3**: Verificar documentos en MS2 (¿tiene póliza de seguro vigente?)
4. **Nodo 4**: Enviar email via SendGrid al responsable y al administrador
5. **Nodo 5**: Emitir push notification (HTTP Request a FCM) al responsable

**Notas técnicas**:

- NestJS Controller (MS3): `POST /webhooks/vencimiento-garantia`
  - Payload: `{ activoId, codigo, nombre, fechaVencimientoGarantia, responsableEmail, responsablePhone }`
- FCM: `POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send`
  - Variable: `FCM_SERVICE_ACCOUNT_KEY`
- N8N Flujo 2: `Webhook → HTTP Request (MS1) → HTTP Request (MS2) → SendGrid → HTTP Request (FCM)`

---

### CU-74: Enviar alerta de mantenimiento programado

**Actor**: Sistema (disparado por scheduler de MS1)  
**Precondiciones**: MS1 detecta activos con mantenimiento programado para los próximos 7 días.  
**Postcondiciones**: El responsable recibe email y mensaje de WhatsApp con los detalles.

**Flujo de automatización (Flujo 3 de N8N)**:

1. **Trigger**: Webhook de MS1 `POST http://ms3:3000/webhooks/mantenimiento-programado`
2. **Nodo 2**: Obtener datos completos del activo en MS1
3. **Nodo 3**: Enviar email via SendGrid al responsable
4. **Nodo 4**: Enviar mensaje proactivo de WhatsApp al responsable

**Notas técnicas**:

- NestJS Controller (MS3): `POST /webhooks/mantenimiento-programado`
- Mensaje WhatsApp proactivo: requiere template aprobado por Meta
  - Template: `"Recordatorio: El activo {{1}} tiene mantenimiento programado para el {{2}}. Por favor coordine su disponibilidad."`
- N8N Flujo 3: `Webhook → HTTP Request (MS1) → SendGrid → HTTP Request (WhatsApp API)`

---

## Resumen de Flujos N8N

| Flujo                                | Trigger                   | Pasos   | Integración                                |
| ------------------------------------ | ------------------------- | ------- | ------------------------------------------ |
| **Flujo 1**: Solicitud por WhatsApp  | Mensaje WhatsApp entrante | 6 pasos | WhatsApp → MS1 → MS2 → SendGrid → WhatsApp |
| **Flujo 2**: Alerta de garantía      | Webhook diario de MS1     | 5 pasos | MS1 → MS1 GraphQL → MS2 → SendGrid → FCM   |
| **Flujo 3**: Alerta de mantenimiento | Webhook de MS1            | 4 pasos | MS1 → MS1 GraphQL → SendGrid → WhatsApp    |

> Los 3 flujos superan el requisito mínimo del docente de "flujo N8N con mínimo 3 pasos".

---

## Webhooks NestJS — Referencia de Endpoints

```
POST /whatsapp/webhook          → Recibe mensajes de WhatsApp Business API
GET  /whatsapp/webhook          → Verificación inicial de WhatsApp
POST /webhooks/vencimiento-garantia    → Trigger desde MS1 (scheduler)
POST /webhooks/mantenimiento-programado → Trigger desde MS1 (scheduler)
POST /webhooks/diagnostico-critico     → Trigger desde MS2 (CNN resultado crítico)
```

---

## Variables de Entorno MS3 `.env`

```env
PORT=3000
MS1_GRAPHQL_URL=http://ms1:8081/graphql
MS1_AUTH_URL=http://ms1:8081/auth/login
MS2_BASE_URL=http://ms2:8000/api
MS3_SERVICE_USER=ms3-service
MS3_SERVICE_PASSWORD=<password-segura>

WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=<id>
WHATSAPP_TOKEN=<bearer-token>
WHATSAPP_APP_SECRET=<secret-para-validar-firma>
WHATSAPP_VERIFY_TOKEN=<token-de-verificacion>

SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=noreply@activos.empresa.com

FCM_PROJECT_ID=<gcp-project-id>
FCM_SERVICE_ACCOUNT_KEY=<json-en-base64>

N8N_WEBHOOK_URL=http://n8n:5678/webhook
```
