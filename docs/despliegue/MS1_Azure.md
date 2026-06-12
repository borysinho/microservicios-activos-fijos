# Despliegue de MS1 en Microsoft Azure con PostgreSQL en Supabase

**Microservicio**: MS1 - Gestion de Activos Fijos  
**Stack**: Java 21, Spring Boot, GraphQL, PostgreSQL, Docker  
**Cloud de aplicacion**: Microsoft Azure  
**Base de datos PostgreSQL**: Supabase  
**Checklist relacionado**: `docs/proceso_unificado/06_Checklist_Implementacion.md`

---

## 1. Objetivo del despliegue

MS1 se despliega como contenedor Docker en Azure App Service, mientras que PostgreSQL se consume desde Supabase.

Con la actualizacion del proyecto, el punto de base de datos relacional se valida demostrando que MS1 esta conectado a una instancia PostgreSQL administrada en Supabase, no a una base local.

El despliegue debe cubrir:

- Proyecto Supabase creado con PostgreSQL activo.
- Azure App Service configurado con variables de entorno.
- Imagen Docker de MS1 publicada en Azure Container Registry.
- MS1 expone GraphQL en `/graphql`.
- MS1 expone GraphiQL en `/graphiql`.
- MS1 se conecta a PostgreSQL en Supabase.
- Variables sensibles fuera del codigo fuente.
- Despliegue continuo documentado en [`MS1_CI_CD_Azure.md`](MS1_CI_CD_Azure.md) para actualizar produccion con cada `push` a `main`.

La arquitectura esperada para MS1 queda asi:

```text
Docker local / CI
      |
      v
Azure Container Registry
      |
      v
Azure App Service for Containers
      |
      v
Supabase PostgreSQL
```

---

## 2. Requisitos previos

Instalar y verificar:

```bash
az --version
docker --version
```

Iniciar sesion en Azure:

```bash
az login
```

Ubicarse en la raiz del proyecto:

```bash
cd /home/bquiroga/Documentos/dev/sw2/parcial-2
```

Tambien se requiere acceso al dashboard de Supabase para obtener:

- Host de PostgreSQL.
- Puerto.
- Nombre de base de datos.
- Usuario.
- Password.
- Cadena de conexion directa o mediante pooler.

---

## 3. Definir nombres de recursos

Estos nombres pueden ajustarse, pero deben mantenerse consistentes en todos los comandos.

```bash
RG=rg-activos-fijos
LOC=eastus
ACR=acracfijos$RANDOM
APP=ms1-activos-fijos
PLAN=asp-ms1-activos
```

> Nota: el nombre de `ACR` debe ser unico globalmente y solo puede usar letras y numeros.

---

## 4. Crear el grupo de recursos en Azure

```bash
az group create \
  --name $RG \
  --location $LOC
```

---

## 5. Crear Azure Container Registry

```bash
az acr create \
  --resource-group $RG \
  --name $ACR \
  --sku Basic
```

Habilitar usuario administrador para que App Service pueda descargar la imagen:

```bash
az acr update \
  --name $ACR \
  --admin-enabled true
```

Obtener el servidor de login del registry:

```bash
LOGIN_SERVER=$(az acr show \
  --name $ACR \
  --query loginServer \
  -o tsv)
```

---

## 6. Preparar PostgreSQL en Supabase

En Supabase:

1. Crear o seleccionar el proyecto del sistema de activos fijos.
2. Ir a **Project Settings > Database**.
3. Copiar la cadena de conexion PostgreSQL.
4. Confirmar que la base de datos este disponible y que el password sea el correcto.

La aplicacion Spring Boot necesita una URL JDBC. El formato directo suele ser:

```text
jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

Variables recomendadas para documentar localmente:

```bash
SUPABASE_DB_HOST=db.<PROJECT_REF>.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD="<PASSWORD_SUPABASE>"
```

Si la conexion directa falla por restricciones de red o IPv6, usar la cadena del **Supabase Connection Pooler**. El formato JDBC queda asi:

```text
jdbc:postgresql://<POOLER_HOST>:6543/postgres?sslmode=require
```

En el pooler, el usuario normalmente tiene este formato:

```text
postgres.<PROJECT_REF>
```

> Para App Service suele ser mas practico usar el pooler de Supabase si la conexion directa no responde desde Azure.

---

## 7. Construir la imagen Docker de MS1

Entrar al directorio del microservicio:

```bash
cd ms1
```

Iniciar sesion en Azure Container Registry:

```bash
az acr login --name $ACR
```

Construir la imagen:

```bash
docker build -t $LOGIN_SERVER/ms1-activos:1.0.0 .
```

Publicar la imagen:

```bash
docker push $LOGIN_SERVER/ms1-activos:1.0.0
```

Con esto se cumple el punto del checklist:

```text
[x] Imagen Docker de MS1 en Azure Container Registry
```

---

## 8. Crear Azure App Service

Crear el plan Linux:

```bash
az appservice plan create \
  --resource-group $RG \
  --name $PLAN \
  --is-linux \
  --sku B1
```

Obtener credenciales del registry:

```bash
ACR_USER=$(az acr credential show \
  --name $ACR \
  --query username \
  -o tsv)

ACR_PASS=$(az acr credential show \
  --name $ACR \
  --query "passwords[0].value" \
  -o tsv)
```

Crear la aplicacion web usando la imagen:

```bash
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $APP \
  --deployment-container-image-name $LOGIN_SERVER/ms1-activos:1.0.0
```

Configurar el contenedor:

```bash
az webapp config container set \
  --resource-group $RG \
  --name $APP \
  --docker-custom-image-name $LOGIN_SERVER/ms1-activos:1.0.0 \
  --docker-registry-server-url https://$LOGIN_SERVER \
  --docker-registry-server-user $ACR_USER \
  --docker-registry-server-password $ACR_PASS
```

---

## 9. Configurar variables de entorno

MS1 usa `application.yml` con variables obligatorias para base de datos, JWT, usuario administrador y blockchain.

### Opcion A: conexion directa a Supabase

```bash
az webapp config appsettings set \
  --resource-group $RG \
  --name $APP \
  --settings \
  WEBSITES_PORT=8080 \
  SPRING_DATASOURCE_URL="jdbc:postgresql://db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require" \
  SPRING_DATASOURCE_USERNAME="postgres" \
  SPRING_DATASOURCE_PASSWORD="<PASSWORD_SUPABASE>" \
  ADMIN_USER="admin" \
  ADMIN_PASSWORD="<PASSWORD_ADMIN>" \
  JWT_SECRET="<JWT_SECRET_LARGO>" \
  BLOCKCHAIN_RPC_URL="https://rpc.ankr.com/eth_sepolia" \
  BLOCKCHAIN_PRIVATE_KEY="<PRIVATE_KEY_SEPOLIA>" \
  MS3_WEBHOOK_URL="https://<url-ms3-gcp>/webhook/activos"
```

### Opcion B: conexion mediante Supabase Pooler

Usar esta opcion si la conexion directa no responde desde Azure App Service.

```bash
az webapp config appsettings set \
  --resource-group $RG \
  --name $APP \
  --settings \
  WEBSITES_PORT=8080 \
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

Variables importantes:

| Variable | Descripcion |
| --- | --- |
| `WEBSITES_PORT` | Debe ser `8080` porque el contenedor de MS1 escucha en ese puerto. |
| `SPRING_DATASOURCE_URL` | URL JDBC hacia PostgreSQL en Supabase. |
| `SPRING_DATASOURCE_USERNAME` | Usuario de Supabase PostgreSQL o del pooler. |
| `SPRING_DATASOURCE_PASSWORD` | Password de la base de datos en Supabase. |
| `DB_PREPARE_THRESHOLD` | Usar `0` con Supabase Transaction Pooler. |
| `FLYWAY_CONNECT_RETRIES` | Reintentos de Flyway mientras Supabase acepta conexiones. |
| `ADMIN_USER` | Usuario basico inicial para demo. |
| `ADMIN_PASSWORD` | Password del usuario inicial. |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | Origenes permitidos separados por coma para Angular, movil y MS1. |
| `JWT_SECRET` | Secreto usado para emitir y validar JWT. |
| `BLOCKCHAIN_RPC_URL` | RPC de Ethereum Sepolia. |
| `BLOCKCHAIN_PRIVATE_KEY` | Clave privada de wallet de testnet. |
| `MS3_WEBHOOK_URL` | URL publica de MS3 desplegado en GCP. |

No subir estos valores reales al repositorio.

---

## 10. Reiniciar la aplicacion

```bash
az webapp restart \
  --resource-group $RG \
  --name $APP
```

Ver logs si la aplicacion no inicia:

```bash
az webapp log config \
  --resource-group $RG \
  --name $APP \
  --docker-container-logging filesystem

az webapp log tail \
  --resource-group $RG \
  --name $APP
```

---

## 11. Verificar despliegue

Health check:

```bash
curl https://$APP.azurewebsites.net/actuator/health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

GraphiQL en navegador:

```text
https://ms1-activos-fijos.azurewebsites.net/graphiql
```

Endpoint GraphQL:

```text
https://ms1-activos-fijos.azurewebsites.net/graphql
```

Consulta GraphQL de prueba:

```bash
curl -sS https://$APP.azurewebsites.net/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(printf 'admin:<PASSWORD_ADMIN>' | base64 -w0)" \
  -d '{"query":"query { activos { id codigo nombre estado } }"}'
```

Consulta BI de prueba:

```bash
curl -sS https://$APP.azurewebsites.net/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(printf 'admin:<PASSWORD_ADMIN>' | base64 -w0)" \
  -d '{"query":"query { dashboardBI { totalActivos activosActivos valorTotalInventario depreciacionAcumuladaTotal } }"}'
```

Verificar en Supabase:

1. Entrar al proyecto Supabase.
2. Abrir **Table Editor** o **SQL Editor**.
3. Confirmar que Flyway/Spring haya creado las tablas de MS1.
4. Ejecutar una consulta simple, por ejemplo:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

---

## 12. Evidencias para el checklist

Capturar pantallas de:

- Proyecto Supabase con PostgreSQL activo.
- Configuracion de conexion PostgreSQL en Supabase, ocultando passwords.
- Azure Container Registry con la imagen `ms1-activos:1.0.0`.
- Azure App Service corriendo.
- Variables de entorno configuradas en App Service, ocultando secretos.
- `/actuator/health` con estado `UP`.
- `/graphiql` abierto en navegador.
- Query GraphQL ejecutada correctamente.
- Tablas de MS1 visibles en Supabase.

Marcar en el checklist:

```text
[x] PostgreSQL administrado creado en Supabase
[x] Azure App Service configurado con las variables de entorno
[x] Imagen Docker de MS1 en Azure Container Registry
[x] Variables de entorno configuradas: SPRING_DATASOURCE_URL, JWT_SECRET, BLOCKCHAIN_PRIVATE_KEY
[x] MS1 expone GraphQL en /graphql accesible desde Angular y React Native
[x] MS1 conectado a PostgreSQL en Supabase
```

> Decision tecnica vigente: MS1 se despliega en Azure, pero la base PostgreSQL administrada corre en Supabase.

---

## 13. Problemas frecuentes

| Problema | Causa probable | Solucion |
| --- | --- | --- |
| App Service muestra error de arranque | Falta una variable obligatoria | Revisar `az webapp log tail` y confirmar `JWT_SECRET`, `ADMIN_PASSWORD`, `SPRING_DATASOURCE_*`. |
| No responde `/actuator/health` | Puerto incorrecto | Confirmar `WEBSITES_PORT=8080`. |
| Error de conexion a PostgreSQL | URL JDBC, password o SSL incorrectos | Confirmar la cadena de Supabase y usar `sslmode=require`. |
| Azure no conecta al host directo de Supabase | Restriccion de red o problema con conexion directa | Probar con Supabase Connection Pooler en puerto `6543`. |
| Error `401 Unauthorized` en GraphQL | Credenciales incorrectas | Confirmar `ADMIN_USER` y `ADMIN_PASSWORD`. |
| Error blockchain | RPC o private key invalidos | Usar wallet de Sepolia y RPC valido. |

---

## 14. URL final esperada

Cuando el despliegue este completo, MS1 debe quedar disponible en:

```text
https://ms1-activos-fijos.azurewebsites.net
```

Endpoints principales:

```text
GET  /actuator/health
GET  /graphiql
POST /graphql
```
