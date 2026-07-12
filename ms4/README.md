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
MS4_N8N_WEBHOOK_URL=https://<ms4-azure>/webhook
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
MS4_N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## Workflows

Los exports estan en `n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`

La imagen importa estos workflows al iniciar cuando `N8N_IMPORT_WORKFLOWS=true`.

## Produccion en Azure

El despliegue usa:

- Azure Container Registry para publicar la imagen.
- VM/host Azure con Docker Compose para persistir `/home/node/.n8n`.
- GitHub Actions independiente: `.github/workflows/ms4-azure-cd.yml`.

Variables minimas del `.env` en el host Azure:

```dotenv
MS4_IMAGE=<acr>.azurecr.io/ms4-n8n:<tag>
N8N_HOST=<host-ms4>
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://<host-ms4>
WEBHOOK_URL=https://<host-ms4>
N8N_ENCRYPTION_KEY=<clave-fija-larga>
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<password>
MS1_GRAPHQL_URL=https://<ms1-azure>/graphql
MS2_BASE_URL=https://<ms2-aws>/api
MS3_BASE_URL=https://<ms3-gcp>/api
```

El workflow usa `MS4_VM_HOST`, `MS4_VM_USER` y `MS4_VM_SSH_KEY`. Si no existen, usa como fallback `MS1_VM_HOST`, `MS1_VM_USER` y `MS1_VM_SSH_KEY`, permitiendo desplegar MS4 en la misma VM Azure usada por MS1.

Despues del despliegue de MS4, configurar MS3 con:

```dotenv
MS4_N8N_WEBHOOK_URL=https://<host-ms4>/webhook
```
