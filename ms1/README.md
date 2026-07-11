# MS1 - Gestion de Activos Fijos

Microservicio principal del sistema. Gestiona activos fijos, categorias, areas, responsables, asignaciones, traslados, bajas, depreciacion, dashboard BI y registros blockchain de transacciones.

## Stack

- Java 21
- Spring Boot 4
- GraphQL
- PostgreSQL / Supabase
- Flyway
- Web3j
- Docker
- Azure App Service for Containers en produccion

## Endpoints principales

- `GET /actuator/health`: health check.
- `GET /graphiql`: consola interactiva GraphQL.
- `POST /graphql`: API GraphQL usada por Angular y React Native.
- `POST /auth/login`: autenticacion.
- `GET /api/blockchain/**`: endpoints auxiliares de blockchain.

## Variables principales

Para desarrollo usa la plantilla:

```bash
cp .env.example .env
```

Variables clave:

- `MS1_PORT`: puerto publicado en el host para Docker Compose.
- `MS1_DB_PORT`: puerto PostgreSQL publicado en el host; por defecto `15432`.
- `ADMIN_USER`, `ADMIN_PASSWORD`: credenciales administrativas.
- `JWT_SECRET`: secreto JWT compartido con MS2.
- `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`: wallet Sepolia/testnet.
- `MS3_WEBHOOK_URL`: webhook publico o local de MS3.

En produccion se usa Supabase PostgreSQL:

```bash
cp .env.production.example .env.production
```

Variables productivas obligatorias:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `MS3_WEBHOOK_URL`

## Arranque en desarrollo con Docker

Este es el modo recomendado. Levanta MS1 y PostgreSQL local.

```bash
cd ms1
cp .env.example .env
docker compose up --build
```

Equivalente explicito:

```bash
docker compose -f docker-compose.dev.yml up --build
```

URLs locales:

```text
http://localhost:8081/actuator/health
http://localhost:8081/graphiql
http://localhost:8081/graphql
```

Detener:

```bash
docker compose down
```

Eliminar tambien la base local:

```bash
docker compose down -v
```

## Arranque en desarrollo sin Docker

Requiere PostgreSQL local disponible en `localhost:5432`.

```bash
cd ms1
set -a
source .env
set +a
./gradlew bootRun
```

URL local sin Docker:

```text
http://localhost:8080
```

## Arranque en produccion con Docker

Este modo construye el target Docker `runtime` y espera una base PostgreSQL externa, normalmente Supabase.

```bash
cd ms1
cp .env.production.example .env.production
# Editar .env.production con valores reales.
set -a
source .env.production
set +a
docker compose -f docker-compose.prod.yml up --build -d
```

Logs:

```bash
docker logs -f ms1-activos-prod
```

Construir solo la imagen productiva:

```bash
docker build --target runtime -t ms1-activos:prod .
```

## Despliegue en produccion con GitHub Actions

Workflow:

```text
.github/workflows/ms1-azure-cd.yml
```

El workflow se ejecuta al hacer `push` a `main` con cambios en `ms1/**` o manualmente desde GitHub Actions. Ejecuta tests, construye la imagen Docker `runtime`, la publica en Azure Container Registry y despliega en Azure App Service.

Secretos requeridos:

- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `AZURE_WEBAPP_PUBLISH_PROFILE`

Variables opcionales:

- `AZURE_WEBAPP_NAME`
- `MS1_IMAGE_NAME`

Las variables de runtime de MS1 se configuran en Azure App Service, incluyendo `WEBSITES_PORT=8080` y las credenciales Supabase.

## Pruebas

```bash
cd ms1
./gradlew test --no-daemon
```

## Verificacion rapida

```bash
curl http://localhost:8081/actuator/health
```

Consulta GraphQL de ejemplo:

```graphql
query {
  activos {
    id
    codigo
    nombre
    estado
  }
}
```
