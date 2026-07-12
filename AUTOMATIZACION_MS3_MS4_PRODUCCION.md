# Automatizacion MS3 + MS4/N8N en Produccion

Esta guia explica como se integra el requisito de automatizacion pedido por el docente y como revisarlo en produccion.

## Objetivo del flujo

El flujo minimo automatizado del proyecto es:

```text
WhatsApp -> MS3 -> MS4/N8N -> sistema de activos -> email -> WhatsApp
```

En terminos funcionales:

1. El responsable de area envia un mensaje por WhatsApp indicando el codigo del activo.
2. MS3 recibe automaticamente el webhook de WhatsApp en Google Cloud Run.
3. MS3 actua como bot LLM en modo agente: Azure OpenAI clasifica la intencion y MS3 permite solo operaciones logicas para chat.
4. Si la intencion es una solicitud de revision o mantenimiento correctivo, MS3 dispara el workflow versionado de MS4/N8N en Azure.
5. MS4/N8N identifica el codigo, consulta MS1 y crea la orden o ticket de revision mediante MS3.
6. MS4/N8N verifica documentos del activo en MS2.
7. MS4/N8N solicita a MS3 enviar el correo de confirmacion.
8. MS4/N8N solicita a MS3 responder por WhatsApp al responsable.

Con esto interactuan las tres plataformas mencionadas por el docente: WhatsApp, el sistema desarrollado y un servicio de email. N8N queda como motor de automatizacion visual, pero la entrada productiva y la seguridad del flujo siguen controladas por MS3.

## Responsabilidades por componente

| Componente | Responsabilidad en el flujo |
| --- | --- |
| WhatsApp Business API o Twilio WhatsApp | Recibir el mensaje del responsable y entregarlo al webhook publico de MS3. |
| MS3 - NestJS / Cloud Run | Punto de entrada publico, validacion de webhook, coordinacion de negocio, integracion con WhatsApp y email, unico consumidor autorizado de MS4. |
| MS4 - N8N / Azure | Ejecutar el workflow visual versionado `flujo_01_solicitud_revision.json`. |
| MS1 - Spring Boot / Azure | Consultar activo por codigo y registrar la orden o ticket de revision. |
| MS2 - FastAPI / AWS | Verificar documentos asociados al activo. |
| SendGrid o SMTP | Enviar correo de confirmacion al responsable o administrador. |

Regla de arquitectura: frontend, mobile, MS1 y MS2 nunca consumen MS4 directamente. La URL de MS4 se configura solo en MS3 mediante `MS3_MS4_N8N_WEBHOOK_URL`.

## Alcance del bot WhatsApp

WhatsApp no reemplaza a la aplicacion web ni a la app movil. MS3 usa Azure OpenAI como agente LLM para interpretar el mensaje y despues aplica una lista blanca de intenciones antes de llamar a MS4/N8N:

| Operacion | Canal permitido | Motivo |
| --- | --- | --- |
| Consultar estado, ubicacion o responsable de un activo por codigo | WhatsApp | Es una consulta simple, textual y de bajo riesgo. |
| Solicitar revision o mantenimiento correctivo de un activo | WhatsApp | Es un reporte conversacional que genera ticket y notificaciones. |
| Ver ayuda/menu de comandos | WhatsApp | No modifica datos de negocio. |
| Registrar, editar o eliminar activos | Web | Requiere formularios completos, validaciones y auditoria detallada. |
| Asignar responsables, trasladar activos o dar de baja | Web/movil | Son transacciones formales que cambian estado y generan blockchain. |
| Subir/descargar documentos o versiones | Web/movil | Requiere archivos, permisos y auditoria documental. |
| Diagnostico IA con imagen, GPS o camara | Movil | Depende de recursos nativos del dispositivo. |
| Usuarios, roles, BI y configuracion administrativa | Web | Requiere permisos administrativos y vistas completas. |

Si el mensaje pide una operacion no permitida por chat, MS3 responde por WhatsApp indicando que debe realizarse desde web o movil y no invoca MS4 ni MS1. La decision final de autorizacion no depende solo del LLM: MS3 bloquea en codigo las operaciones sensibles.

## Endpoints usados

| Paso | Endpoint productivo | Proposito |
| --- | --- | --- |
| Entrada WhatsApp | `POST https://<ms3-cloud-run>/whatsapp/webhook` | Webhook configurado en WhatsApp Business API o Twilio. |
| Estado del flujo | `GET https://<ms3-cloud-run>/api/flujos` | Revisa estado `solicitud-revision`, `alerta-garantia` y `alerta-mantenimiento`. |
| Disparo N8N desde MS3 | `POST https://<ms4-azure>/webhook/solicitud-revision` | MS3 invoca MS4 usando `MS3_MS4_N8N_WEBHOOK_URL`. |
| Crear orden desde N8N | `POST https://<ms3-cloud-run>/api/webhooks/reportar-problema` | N8N vuelve a MS3 para crear la orden/ticket en el sistema. |
| Enviar email desde N8N | `POST https://<ms3-cloud-run>/api/notificaciones/email` | N8N usa MS3 para enviar email por SendGrid/SMTP. |
| Responder WhatsApp desde N8N | `POST https://<ms3-cloud-run>/api/whatsapp/enviar` | N8N usa MS3 para responder al numero solicitante. |

## Variables requeridas en produccion

### MS3 - Google Cloud Run

```dotenv
MS3_NODE_ENV=production
MS3_DEV_TOOLS_ENABLED=false
MS3_MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS3_MS2_BASE_URL=https://<ms2-aws>/api
MS3_MS2_AUTH_TOKEN=<JWT_MS2>
MS3_MS4_N8N_WEBHOOK_URL=https://<ms4-azure>/webhook
MS3_EMAIL_PROVIDER=sendgrid
MS3_SENDGRID_API_KEY=<sendgrid-api-key>
MS3_SENDGRID_FROM_EMAIL=noreply@activos.empresa.com
MS3_WHATSAPP_PROVIDER=twilio
MS3_TWILIO_ACCOUNT_SID=<twilio-account-sid>
MS3_TWILIO_AUTH_TOKEN=<twilio-auth-token>
MS3_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
MS3_WHATSAPP_VERIFY_TOKEN=<verify-token>
```

Si se usa WhatsApp Cloud API de Meta en lugar de Twilio, configurar `MS3_WHATSAPP_PROVIDER=meta`, `MS3_WHATSAPP_PHONE_NUMBER_ID`, `MS3_WHATSAPP_TOKEN` y `MS3_WHATSAPP_APP_SECRET`.

### MS4 - Azure N8N

```dotenv
MS4_N8N_HOST=<host-ms4>
MS4_N8N_PROTOCOL=https
MS4_N8N_EDITOR_BASE_URL=https://<host-ms4>
MS4_WEBHOOK_URL=https://<host-ms4>
MS4_N8N_ENCRYPTION_KEY=<clave-fija-larga>
MS4_N8N_BASIC_AUTH_ACTIVE=true
MS4_N8N_BASIC_AUTH_USER=admin
MS4_N8N_BASIC_AUTH_PASSWORD=<password>
MS4_N8N_IMPORT_WORKFLOWS=true
MS4_N8N_DIAGNOSTICS_ENABLED=false
MS4_N8N_VERSION_NOTIFICATIONS_ENABLED=false
MS4_N8N_TEMPLATES_ENABLED=false
MS4_N8N_PERSONALIZATION_ENABLED=false
MS4_MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS4_MS2_BASE_URL=https://<ms2-aws>/api
MS4_MS3_BASE_URL=https://<ms3-cloud-run>/api
RESPONSABLE_DEFAULT_EMAIL=<correo-para-demo>
```

## Preparacion de N8N para la demo

1. Desplegar MS4 con `.github/workflows/ms4-azure-cd.yml`.
2. Entrar a `https://<ms4-azure>` con basic auth.
3. Confirmar que existe el workflow `Flujo 01 - Solicitud de Revision por WhatsApp`.
4. Activar el workflow en N8N.
5. Verificar que el webhook productivo quede disponible en:

```text
https://<ms4-azure>/webhook/solicitud-revision
```

No entregar esta URL a frontend, mobile, MS1 ni MS2. Es una URL interna de integracion entre MS3 y MS4.

## Configuracion del webhook de WhatsApp

En Twilio WhatsApp Sandbox o WhatsApp Business API, configurar la URL de mensajes entrantes apuntando a MS3:

```text
https://<ms3-cloud-run>/whatsapp/webhook
```

Para verificacion de Meta WhatsApp Cloud API:

```text
GET https://<ms3-cloud-run>/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<verify-token>&hub.challenge=<challenge>
```

El `verify_token` debe coincidir con `MS3_WHATSAPP_VERIFY_TOKEN` en MS3.

## Como revisar el flujo en produccion

1. Confirmar salud de MS3:

```bash
curl -sS https://<ms3-cloud-run>/health
```

2. Confirmar que MS3 expone el estado de flujos:

```bash
curl -sS https://<ms3-cloud-run>/api/flujos
```

3. Enviar desde WhatsApp un mensaje con codigo de activo existente:

```text
Solicito revision de ACT-2024-001
```

4. Revisar en N8N la ejecucion del workflow `Flujo 01 - Solicitud de Revision por WhatsApp`.

5. Revisar en MS3:

```bash
curl -sS https://<ms3-cloud-run>/api/flujos
```

El flujo `solicitud-revision` debe pasar por `EN_PROCESO` y terminar como `COMPLETADO` si la orden, la verificacion documental y las notificaciones se ejecutan correctamente.

6. Verificar las evidencias:

| Evidencia | Donde revisar |
| --- | --- |
| Mensaje recibido | Logs de Cloud Run de MS3. |
| Workflow ejecutado | Historial de ejecuciones de N8N en MS4. |
| Orden/ticket creado | MS1, consulta del activo o historial de solicitudes. |
| Documentos consultados | Logs de MS2 o respuesta del nodo `Verificar Documentos MS2`. |
| Email enviado | SendGrid Activity o bandeja del destinatario. |
| Respuesta WhatsApp | Conversacion del responsable en WhatsApp. |

## Prueba controlada sin enviar WhatsApp real

Para una prueba tecnica controlada desde produccion, llamar el endpoint publico de MS3 con un payload equivalente al proveedor usado.

Ejemplo compatible con Twilio:

```bash
curl -sS -X POST https://<ms3-cloud-run>/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+59170000000" \
  --data-urlencode "Body=Solicito revision de ACT-2024-001" \
  --data-urlencode "MessageSid=SM-DEMO-001"
```

Esta prueba mantiene la regla de arquitectura porque entra por MS3. No se debe probar el flujo productivo llamando MS4 desde el cliente final.

## Criterio de cumplimiento para el docente

El requisito de automatizacion queda cubierto cuando se puede mostrar:

- MS3 desplegado en Cloud Run con `MS3_MS4_N8N_WEBHOOK_URL` configurado.
- MS4/N8N desplegado en Azure con el workflow `flujo_01_solicitud_revision.json` importado y activo.
- Mensaje WhatsApp con codigo de activo recibido por MS3.
- Ejecucion visible en N8N con al menos tres pasos automatizados.
- Orden/ticket generado en el sistema.
- Correo de confirmacion enviado.
- Respuesta enviada al responsable por WhatsApp.
