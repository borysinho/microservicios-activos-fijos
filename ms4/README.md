# MS4 - Automatizacion N8N

MS4 contiene exclusivamente la instancia self-hosted de N8N y los workflows exportados del sistema de activos fijos. No es consumido por frontend, mobile, MS1 ni MS2; la unica integracion permitida es MS3 -> MS4 mediante webhooks N8N.

## Responsabilidad

- Ejecutar workflows N8N versionados.
- Exponer webhooks internos para que MS3 dispare automatizaciones.
- Mantener credenciales, historial de ejecuciones y configuracion propia de N8N.
- Desplegarse en Azure con CI/CD independiente.

## Relacion con MS3

MS3 conserva la orquestacion de negocio: recibe WhatsApp, eventos de MS1 y alertas de MS2. Cuando el flujo requiere automatizacion visual/versionada, MS3 llama a MS4 usando:

```dotenv
MS3_MS4_N8N_WEBHOOK_URL=https://<ms4-azure>/webhook
```

MS4 no debe recibir llamadas directas de clientes externos. Para la demo, los endpoints publicos se prueban desde MS3.

## Arranque local

```bash
cd ms4
cp .env.example .env
docker compose up --build
```

UI local:

```text
http://localhost:5678
```

MS3 local debe apuntar a:

```dotenv
MS3_MS4_N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## Workflows

Los exports estan en `n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`

La imagen importa estos workflows al iniciar cuando `MS4_N8N_IMPORT_WORKFLOWS=true`. El import es idempotente por volumen: despues del primer seed crea el marcador `/home/node/.n8n/.ms4-workflows-imported` y los siguientes reinicios no vuelven a importar los mismos JSON, evitando duplicados en N8N. Si el volumen ya tenia estos workflows antes de crear el marcador, el arranque los detecta por nombre, marca el seed como completado e importa solo los faltantes.

Antes de iniciar N8N, el contenedor tambien sanea el volumen persistente y deja una sola instancia por cada workflow semilla versionado. Esto corrige duplicados creados por arranques anteriores sin borrar otros workflows que no pertenezcan a MS4. `MS4_N8N_FORCE_IMPORT_WORKFLOWS=true` elimina primero las semillas existentes y luego las importa otra vez desde `n8n-workflows/`, evitando que el modo forzado cree copias adicionales.

### Flujo 01 - Solicitud de revision por WhatsApp

Este workflow representa el ejemplo pedido por el docente:

```text
WhatsApp -> MS3 -> N8N -> sistema -> email -> WhatsApp
```

MS4 no recibe WhatsApp directamente. MS3 recibe el webhook publico de WhatsApp y dispara el endpoint interno de N8N:

```text
POST https://<host-ms4>/webhook/solicitud-revision
```

El workflow extrae el codigo del activo, consulta MS1, solicita a MS3 crear la orden de revision, verifica documentos en MS2, solicita a MS3 enviar el email de confirmacion y finalmente solicita a MS3 responder por WhatsApp.

La revision completa desde produccion esta documentada en `AUTOMATIZACION_MS3_MS4_PRODUCCION.md`.

## Produccion en Azure

El despliegue usa:

- Azure Container Registry para publicar la imagen.
- VM/host Azure con Docker Compose para persistir `/home/node/.n8n`.
- GitHub Actions independiente: `.github/workflows/ms4-azure-cd.yml`.

Variables minimas del `.env` en el host Azure:

```dotenv
MS4_IMAGE=<acr>.azurecr.io/ms4-n8n:<tag>
MS4_N8N_HOST=<host-ms4>
MS4_N8N_PROTOCOL=https
MS4_N8N_EDITOR_BASE_URL=https://<host-ms4>
MS4_WEBHOOK_URL=https://<host-ms4>
MS4_N8N_ENCRYPTION_KEY=<clave-fija-larga>
MS4_N8N_SECURE_COOKIE=true
MS4_N8N_BASIC_AUTH_USER=admin
MS4_N8N_BASIC_AUTH_PASSWORD=<password>
MS4_N8N_FORCE_IMPORT_WORKFLOWS=false
MS4_N8N_DIAGNOSTICS_ENABLED=false
MS4_N8N_VERSION_NOTIFICATIONS_ENABLED=false
MS4_N8N_TEMPLATES_ENABLED=false
MS4_N8N_PERSONALIZATION_ENABLED=false
MS4_MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS4_MS2_BASE_URL=https://<ms2-aws>/api
MS4_MS3_BASE_URL=https://<ms3-gcp>/api
RESPONSABLE_DEFAULT_EMAIL=<correo-para-demo>
```

Las variables `MS4_N8N_DIAGNOSTICS_ENABLED=false`, `MS4_N8N_VERSION_NOTIFICATIONS_ENABLED=false`, `MS4_N8N_TEMPLATES_ENABLED=false` y `MS4_N8N_PERSONALIZATION_ENABLED=false` evitan llamadas externas no necesarias desde el editor de N8N durante la demo. Si aparecen logs como `Error fetching feature flags ... PostHog: 401`, recrear el contenedor con esta configuracion.

Si la demo se expone temporalmente por HTTP sin TLS, configurar `MS4_N8N_PROTOCOL=http`, URLs `http://...` y `MS4_N8N_SECURE_COOKIE=false`; con HTTPS debe mantenerse en `true`.

El workflow usa `MS4_VM_HOST`, `MS4_VM_USER` y `MS4_VM_SSH_KEY`. Para cubrir el alcance del examen, esos secretos deben apuntar a una VM/host Azure propio de MS4; no se debe desplegar MS4 en la misma instancia usada por MS1.

Despues del despliegue de MS4, configurar MS3 con:

```dotenv
MS3_MS4_N8N_WEBHOOK_URL=https://<host-ms4>/webhook
```
