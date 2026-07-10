# CI/CD de MS1 en Azure VM con Docker Compose

Este documento deja MS1 con CI/CD: cada `pull_request` hacia `main` que modifique `ms1/**` ejecuta tests, y cada `push` a `main` construye una nueva imagen Docker, la publica en Azure Container Registry y actualiza una VM Linux por SSH con Docker Compose.

## Estrategia

- **Aplicacion**: Azure VM Linux `Standard_B1ms` con Docker Compose.
- **Imagen**: Azure Container Registry Basic.
- **Base de datos**: PostgreSQL 16 en contenedor, volumen persistente Docker.
- **CI/CD**: GitHub Actions en `.github/workflows/ms1-azure-cd.yml`.
- **Rama productiva**: `main`.
- **Environment de GitHub**: `production`.
- **CI en PR**: ejecuta `./gradlew test --no-daemon` sin desplegar.
- **Imagen productiva**: Docker target `runtime` de `ms1/Dockerfile`.

Para una licencia Azure for Students, mantener esta infraestructura pequena. La VM `Standard_B1ms` sirve para demo academica con MS1 + PostgreSQL en contenedores; si no se esta usando, detener o eliminar recursos para no consumir credito.

## Recursos creados para este proyecto

| Recurso | Valor |
| --- | --- |
| Resource Group | `rg-activos-fijos` |
| Azure Container Registry | `acracfijosbq20260710` |
| ACR login server | `acracfijosbq20260710.azurecr.io` |
| VM | `vm-ms1-activos` |
| VM size | `Standard_B1ms` |
| Usuario SSH | `azureuser` |
| IP publica | `13.82.148.244` |
| URL MS1 | `http://13.82.148.244` |
| Imagen | `ms1-activos` |

## 1. Confirmar sesion y elegir nombres

```bash
az login
az account show -o table

RG=rg-activos-fijos
LOC=eastus
ACR=acracfijosbq20260710
IMAGE=ms1-activos
VM=vm-ms1-activos
VM_USER=azureuser
```

> `ACR` debe ser un nombre unico globalmente. Si Azure responde que ya existe, cambia el sufijo.

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

Esto deja una imagen real en ACR antes de que GitHub Actions tome control.

```bash
az acr build \
  --registry "$ACR" \
  --image "$IMAGE:bootstrap" \
  ./ms1
```

## 4. Crear VM Linux para Docker Compose

```bash
ssh-keygen -t ed25519 -f /tmp/ms1_vm_key -N '' -C ms1-azure-vm
```

Crea `/tmp/ms1-cloud-init.yml` con Docker y Docker Compose para que la VM quede lista al arrancar:

```yaml
#cloud-config
package_update: true
packages:
  - ca-certificates
  - curl
  - gnupg
runcmd:
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - sh -c 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list'
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  - usermod -aG docker azureuser
  - mkdir -p /opt/ms1
  - chown -R azureuser:azureuser /opt/ms1
```

Luego crea la VM y abre el puerto HTTP:

```bash
az vm create \
  --resource-group "$RG" \
  --name "$VM" \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --admin-username "$VM_USER" \
  --ssh-key-values /tmp/ms1_vm_key.pub \
  --custom-data /tmp/ms1-cloud-init.yml \
  --public-ip-sku Standard \
  --storage-sku Standard_LRS \
  --os-disk-size-gb 30

az vm open-port \
  --resource-group "$RG" \
  --name "$VM" \
  --port 80 \
  --priority 1001
```

## 5. Configurar variables de produccion en la VM

El archivo `/opt/ms1/.env` vive solo en la VM y no se sube al repositorio.

```bash
scp -i /tmp/ms1_vm_key ms1/.env "$VM_USER@<IP_PUBLICA>:/opt/ms1/.env"
scp -i /tmp/ms1_vm_key ms1/docker-compose.prod.yml "$VM_USER@<IP_PUBLICA>:/opt/ms1/docker-compose.yml"
```

Para generar un JWT secret localmente:

```bash
openssl rand -base64 64
```

Variables minimas esperadas en `/opt/ms1/.env`:

```dotenv
POSTGRES_DB=activos_db
POSTGRES_USER=activos_user
POSTGRES_PASSWORD=<password-postgres>
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/activos_db
SPRING_DATASOURCE_USERNAME=activos_user
SPRING_DATASOURCE_PASSWORD=<password-postgres>
MS1_PORT=80
ADMIN_USER=admin
ADMIN_PASSWORD=<password-admin>
JWT_SECRET=<jwt-secret-largo>
BLOCKCHAIN_RPC_URL=<rpc-url>
BLOCKCHAIN_PRIVATE_KEY=<private-key>
MS3_WEBHOOK_URL=<url-ms3-o-placeholder>
CORS_ALLOWED_ORIGIN_PATTERNS=http://<IP_PUBLICA>,https://<IP_PUBLICA>
```

## 6. Configurar secrets de GitHub Actions

El workflow requiere estos secretos:

| Secreto | Valor |
| --- | --- |
| `ACR_LOGIN_SERVER` | Resultado de `$LOGIN_SERVER`, ejemplo `acracfijos123.azurecr.io` |
| `ACR_USERNAME` | Resultado de `$ACR_USER` |
| `ACR_PASSWORD` | Resultado de `$ACR_PASS` |
| `MS1_VM_HOST` | IP publica de la VM |
| `MS1_VM_USER` | Usuario SSH, por defecto `azureuser` |
| `MS1_VM_SSH_KEY` | Contenido de la llave privada `/tmp/ms1_vm_key` |

Con GitHub CLI:

```bash
gh secret set ACR_LOGIN_SERVER --body "$LOGIN_SERVER"
gh secret set ACR_USERNAME --body "$ACR_USER"
gh secret set ACR_PASSWORD --body "$ACR_PASS"
gh secret set MS1_VM_HOST --body "<IP_PUBLICA>"
gh secret set MS1_VM_USER --body "$VM_USER"
gh secret set MS1_VM_SSH_KEY < /tmp/ms1_vm_key

gh variable set MS1_IMAGE_NAME --body "$IMAGE"
```

Tambien puedes cargarlos desde GitHub: **Settings > Secrets and variables > Actions**.

## 7. Probar despliegue continuo

```bash
git add .github/workflows/ms1-azure-cd.yml
git add ms1/.gitignore ms1/.dockerignore ms1/Dockerfile ms1/build.gradle ms1/gradle.properties ms1/docker-compose.prod.yml
git add ms1/gradle/wrapper/gradle-wrapper.jar
git add docs/despliegue/MS1_CI_CD_Azure.md
git commit -m "ci(ms1): deploy to Azure VM"
git push origin main
```

Luego revisa:

```bash
gh run list --workflow "MS1 Azure CD"
gh run watch

curl "http://<IP_PUBLICA>/actuator/health"
```

Si el workflow termina bien, cada cambio futuro en `ms1/**` desplegara automaticamente a produccion.

El despliegue conjunto de los 3 microservicios esta documentado en `docs/despliegue/CI_CD_Produccion_3MS.md`.

## 8. Logs y diagnostico

```bash
ssh -i /tmp/ms1_vm_key "$VM_USER@<IP_PUBLICA>" \
  "cd /opt/ms1 && docker compose --env-file .env -f docker-compose.yml ps"

ssh -i /tmp/ms1_vm_key "$VM_USER@<IP_PUBLICA>" \
  "cd /opt/ms1 && docker compose --env-file .env -f docker-compose.yml logs --tail=120 ms1"
```

Errores comunes:

| Sintoma | Revision |
| --- | --- |
| `401` al hacer pull de imagen | Confirmar `ACR_USERNAME`, `ACR_PASSWORD` y `docker login` en la VM. |
| App no arranca | Revisar `JWT_SECRET`, `ADMIN_PASSWORD`, `SPRING_DATASOURCE_*` y logs de `ms1`. |
| Falla conexion a PostgreSQL | Confirmar que `postgres` esta healthy y que `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/activos_db`. |
| GitHub Action no dispara | Confirmar que el cambio toque `ms1/**` o ejecutar `workflow_dispatch`. |
