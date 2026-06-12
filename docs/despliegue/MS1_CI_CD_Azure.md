# CI/CD de MS1 en Azure App Service

Este documento deja MS1 con despliegue continuo: cada `push` a `main` que modifique `ms1/**` construye una nueva imagen Docker, la publica en Azure Container Registry y actualiza el contenedor en Azure App Service.

## Estrategia

- **Aplicacion**: Azure App Service for Containers.
- **Imagen**: Azure Container Registry Basic.
- **Base de datos**: Supabase PostgreSQL administrado para MS1.
- **CI/CD**: GitHub Actions en `.github/workflows/ms1-azure-cd.yml`.
- **Rama productiva**: `main`.

Para una licencia Azure for Students, mantener esta infraestructura pequena. El plan `B1` sirve para demo academica con contenedor; si no se esta usando, detener o eliminar recursos para no consumir credito.

## 1. Confirmar sesion y elegir nombres

```bash
az login
az account show -o table

RG=rg-activos-fijos
LOC=eastus
ACR=acracfijos$(date +%H%M%S)
PLAN=asp-ms1-activos
APP=ms1-activos-fijos
IMAGE=ms1-activos
```

> `ACR` y `APP` deben ser nombres unicos globalmente. Si Azure responde que ya existen, cambia el sufijo.

## 2. Crear recursos base

```bash
az group create \
  --name "$RG" \
  --location "$LOC"

az acr create \
  --resource-group "$RG" \
  --name "$ACR" \
  --sku Basic

az acr update \
  --name "$ACR" \
  --admin-enabled true

LOGIN_SERVER=$(az acr show \
  --name "$ACR" \
  --query loginServer \
  -o tsv)

ACR_USER=$(az acr credential show \
  --name "$ACR" \
  --query username \
  -o tsv)

ACR_PASS=$(az acr credential show \
  --name "$ACR" \
  --query "passwords[0].value" \
  -o tsv)
```

## 3. Publicar una imagen inicial

Esto permite crear el App Service apuntando a una imagen real antes de que GitHub Actions tome control.

```bash
az acr build \
  --registry "$ACR" \
  --image "$IMAGE:bootstrap" \
  ./ms1
```

## 4. Crear App Service para contenedor

```bash
az appservice plan create \
  --resource-group "$RG" \
  --name "$PLAN" \
  --is-linux \
  --sku B1

az webapp create \
  --resource-group "$RG" \
  --plan "$PLAN" \
  --name "$APP" \
  --deployment-container-image-name "$LOGIN_SERVER/$IMAGE:bootstrap"

az webapp config container set \
  --resource-group "$RG" \
  --name "$APP" \
  --container-image-name "$LOGIN_SERVER/$IMAGE:bootstrap" \
  --container-registry-url "https://$LOGIN_SERVER" \
  --container-registry-user "$ACR_USER" \
  --container-registry-password "$ACR_PASS"
```

## 5. Configurar variables de produccion

Usa valores reales, pero no los subas al repositorio.

```bash
az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings \
  WEBSITES_PORT=8080 \
  WEBSITE_WEBDEPLOY_USE_SCM=true \
  SPRING_DATASOURCE_URL="jdbc:postgresql://<POOLER_HOST>:6543/postgres?sslmode=require" \
  SPRING_DATASOURCE_USERNAME="postgres.<PROJECT_REF>" \
  SPRING_DATASOURCE_PASSWORD="<PASSWORD_SUPABASE>" \
  DB_PREPARE_THRESHOLD=0 \
  FLYWAY_CONNECT_RETRIES=10 \
  FLYWAY_CONNECT_RETRIES_INTERVAL=5s \
  ADMIN_USER="admin" \
  ADMIN_PASSWORD="<PASSWORD_ADMIN>" \
  CORS_ALLOWED_ORIGIN_PATTERNS="https://<frontend-angular>,https://$APP.azurewebsites.net" \
  JWT_SECRET="<JWT_SECRET_LARGO>" \
  BLOCKCHAIN_RPC_URL="https://rpc.ankr.com/eth_sepolia" \
  BLOCKCHAIN_PRIVATE_KEY="<PRIVATE_KEY_SEPOLIA>" \
  MS3_WEBHOOK_URL="https://<url-ms3-gcp>/webhook/activos"
```

Para generar un JWT secret localmente:

```bash
openssl rand -base64 64
```

## 6. Habilitar publish profile

El workflow usa el publish profile del App Service para actualizar el contenedor. Si Azure no permite descargarlo, habilita las credenciales basicas de publicacion para `scm`:

```bash
az resource update \
  --resource-group "$RG" \
  --namespace Microsoft.Web \
  --resource-type basicPublishingCredentialsPolicies \
  --parent "sites/$APP" \
  --name scm \
  --set properties.allow=true
```

## 7. Crear secretos en GitHub

El workflow requiere estos secretos:

| Secreto | Valor |
| --- | --- |
| `ACR_LOGIN_SERVER` | Resultado de `$LOGIN_SERVER`, ejemplo `acracfijos123.azurecr.io` |
| `ACR_USERNAME` | Resultado de `$ACR_USER` |
| `ACR_PASSWORD` | Resultado de `$ACR_PASS` |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | XML del publish profile del App Service |

Con GitHub CLI:

```bash
az webapp deployment list-publishing-profiles \
  --resource-group "$RG" \
  --name "$APP" \
  --xml > /tmp/ms1-publish-profile.xml

gh secret set ACR_LOGIN_SERVER --body "$LOGIN_SERVER"
gh secret set ACR_USERNAME --body "$ACR_USER"
gh secret set ACR_PASSWORD --body "$ACR_PASS"
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE < /tmp/ms1-publish-profile.xml

gh variable set AZURE_WEBAPP_NAME --body "$APP"
gh variable set MS1_IMAGE_NAME --body "$IMAGE"
```

Tambien puedes cargarlos desde GitHub: **Settings > Secrets and variables > Actions**.

## 8. Probar despliegue continuo

```bash
git add .github/workflows/ms1-azure-cd.yml ms1/.dockerignore
git add -f docs/despliegue/MS1_CI_CD_Azure.md docs/despliegue/MS1_Azure.md
git commit -m "ci(ms1): deploy to Azure App Service"
git push origin main
```

Luego revisa:

```bash
gh run list --workflow "MS1 Azure CD"
gh run watch

curl "https://$APP.azurewebsites.net/actuator/health"
```

Si el workflow termina bien, cada cambio futuro en `ms1/**` desplegara automaticamente a produccion.

## 9. Logs y diagnostico

```bash
az webapp log config \
  --resource-group "$RG" \
  --name "$APP" \
  --docker-container-logging filesystem

az webapp log tail \
  --resource-group "$RG" \
  --name "$APP"
```

Errores comunes:

| Sintoma | Revision |
| --- | --- |
| `401` al hacer pull de imagen | Confirmar `ACR_USERNAME` y `ACR_PASSWORD`, y que el App Service tenga registry configurado. |
| App no arranca | Revisar `JWT_SECRET`, `ADMIN_PASSWORD`, `SPRING_DATASOURCE_*` y `WEBSITES_PORT=8080`. |
| Falla conexion a PostgreSQL | Usar pooler de Supabase con `sslmode=require`, `DB_PREPARE_THRESHOLD=0` y confirmar que Flyway aplico `CREATE EXTENSION IF NOT EXISTS pgcrypto`. |
| GitHub Action no dispara | Confirmar que el cambio toque `ms1/**` o ejecutar `workflow_dispatch`. |
