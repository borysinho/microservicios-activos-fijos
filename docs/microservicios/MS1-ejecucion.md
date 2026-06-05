# MS1 — Gestión de Activos Fijos: Guía de Ejecución

**Stack**: Java 21 · Spring Boot 4.0.6 · PostgreSQL · GraphQL · Web3j  
**Ruta del proyecto**: `ms1/`

---

## Requisitos Previos

| Herramienta               | Versión mínima     | Verificación             |
| ------------------------- | ------------------ | ------------------------ |
| JDK                       | 21                 | `java -version`          |
| Gradle (wrapper incluido) | 8.14+              | `./gradlew --version`    |
| Docker                    | 24+                | `docker --version`       |
| Docker Compose            | 2.x                | `docker compose version` |
| PostgreSQL                | 15+ (o vía Docker) | `psql --version`         |

---

## 1. Variables de Entorno

Todos los secretos se inyectan mediante variables de entorno. Crear el archivo `ms1/.env` (excluido del repositorio por `.gitignore`):

```dotenv
# ── Base de Datos ─────────────────────────────────────────────────────
# (ignorado por docker-compose: se sobreescribe con la URL interna del servicio)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/activos_db
SPRING_DATASOURCE_USERNAME=activos_user
SPRING_DATASOURCE_PASSWORD=activos_pass

# ── Seguridad ─────────────────────────────────────────────────────────
ADMIN_USER=admin
ADMIN_PASSWORD=changeme_en_produccion

# ── Blockchain (Ethereum Sepolia Testnet) ─────────────────────────────
BLOCKCHAIN_RPC_URL=https://rpc.ankr.com/eth_sepolia
BLOCKCHAIN_PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ── MS3 Webhook ───────────────────────────────────────────────────────
MS3_WEBHOOK_URL=http://localhost:3000/webhook/activos

# ── Puerto (host) ─────────────────────────────────────────────────────
# Define el puerto expuesto en el host. El contêiner siempre escucha en 8080 internamente.
PORT=8081
```

> **Nota de seguridad**: nunca subir el archivo `.env` al repositorio. La clave privada del wallet debe corresponder a una cuenta de testnet sin fondos reales.

---

## 2. Levantar la Base de Datos con Docker

La forma más rápida de tener PostgreSQL disponible es con Docker:

```bash
docker run -d \
  --name activos-postgres \
  -e POSTGRES_DB=activos_db \
  -e POSTGRES_USER=activos_user \
  -e POSTGRES_PASSWORD=activos_pass \
  -p 5432:5432 \
  postgres:16-alpine
```

Verificar que el contenedor esté activo:

```bash
docker ps --filter name=activos-postgres
```

Verificar conexión a la base de datos:

```bash
docker exec -it activos-postgres psql -U activos_user -d activos_db -c "\dt"
```

---

## 3. Ejecutar en Modo Desarrollo (sin Docker)

### 3.1 Clonar / posicionarse en el directorio

```bash
cd ms1/
```

### 3.2 Dar permisos al wrapper de Gradle (solo primera vez en Linux/macOS)

```bash
chmod +x gradlew
```

### 3.3 Compilar el proyecto

```bash
./gradlew build -x test
```

### 3.4 Iniciar el microservicio

Con las variables de entorno del archivo `.env`:

```bash
export $(grep -v '^#' .env | xargs) && ./gradlew bootRun
```

O pasando las variables directamente:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/activos_db \
SPRING_DATASOURCE_USERNAME=activos_user \
SPRING_DATASOURCE_PASSWORD=activos_pass \
./gradlew bootRun
```

El servicio quedará disponible en `http://localhost:8080` (modo desarrollo sin Docker; el puerto lo controla `server.port` fijo en `8080`).

### 3.5 Migraciones de base de datos

Flyway ejecuta las migraciones automáticamente al iniciar la aplicación. Los scripts se encuentran en:

```
ms1/src/main/resources/db/migration/
  └── V1__init_schema.sql   ← Esquema inicial (tablas, índices)
```

Para verificar el estado de las migraciones sin iniciar la app:

```bash
./gradlew flywayInfo
```

---

## 4. Ejecutar con Docker (imagen local)

### 4.1 Construir la imagen

```bash
cd ms1/
docker build -t ms1-activos:latest .
```

### 4.2 Ejecutar el contenedor

```bash
docker run -d \
  --name ms1-activos \
  --env-file .env \
  -p 8080:8080 \
  ms1-activos:latest
```

Ver los logs en tiempo real:

```bash
docker logs -f ms1-activos
```

---

## 5. Ejecutar con Docker Compose (recomendado para desarrollo)

Crear el archivo `ms1/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: activos-postgres
    environment:
      POSTGRES_DB: activos_db
      POSTGRES_USER: activos_user
      POSTGRES_PASSWORD: activos_pass
    ports:
      - "5432:5432"
    volumes:
      - activos_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U activos_user -d activos_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  ms1:
    build: .
    container_name: ms1-activos
    env_file:
      - .env
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/activos_db
    ports:
      # HOST:CONTAINER — el contêiner siempre escucha en 8080 (server.port fijo).
      # PORT en .env controla el puerto expuesto en el host (default: 8081).
      - "${PORT:-8081}:8080"
    depends_on:
      postgres:
        condition: service_healthy
    restart: on-failure

volumes:
  activos_pgdata:
```

Levantar todo el stack:

```bash
docker compose up --build
```

Detener y eliminar los contenedores:

```bash
docker compose down
```

---

## 6. Ejecutar los Tests

```bash
# Todos los tests
./gradlew test

# Con reporte HTML en build/reports/tests/test/index.html
./gradlew test --info
```

Los tests utilizan H2 en memoria con el perfil `test` (`src/test/resources/application-test.yml`), por lo que no requieren PostgreSQL activo.

---

## 7. Verificar que el Servicio está Corriendo

### Health check (Actuator)

```bash
# Con Docker Compose (puerto host 8081)
curl http://localhost:8081/actuator/health

# En modo desarrollo local sin Docker (puerto 8080)
curl http://localhost:8080/actuator/health
```

Respuesta esperada:

```json
{ "groups": ["liveness", "readiness"], "status": "UP" }
```

### Métricas e información

```bash
curl http://localhost:8081/actuator/info
curl http://localhost:8081/actuator/metrics
```

---

## 8. Acceder a la API GraphQL

### GraphiQL (explorador interactivo en el navegador)

```
http://localhost:8081/graphiql
```

### Endpoint GraphQL (para clientes o herramientas como Postman/Insomnia)

```
POST http://localhost:8081/graphql
Content-Type: application/json
Authorization: Basic YWRtaW46Y2hhbmdlbWU=   ← Base64 de admin:changeme
```

### Ejemplo: consultar todos los activos

```graphql
query {
  activos {
    id
    codigo
    nombre
    estado
    valorAdquisicion
    categoria {
      nombre
      metodoDepreciacion
    }
    areaActual {
      nombre
    }
  }
}
```

### Ejemplo: registrar un activo

```graphql
mutation {
  registrarActivo(
    input: {
      codigo: "ACT-001"
      nombre: "Laptop Dell XPS 15"
      fechaAdquisicion: "2024-01-15"
      valorAdquisicion: 2500.00
      vidaUtilAnios: 5
      categoriaId: "uuid-de-la-categoria"
      ubicacion: "Oficina Central"
    }
  ) {
    id
    codigo
    estado
  }
}
```

### Ejemplo: dashboard BI

```graphql
query {
  dashboardBI {
    totalActivos
    activosActivos
    valorTotalInventario
    depreciacionAcumuladaTotal
    activosPorCategoria {
      categoria
      cantidad
    }
  }
}
```

---

## 9. Solución de Problemas Frecuentes

| Síntoma                                     | Causa probable             | Solución                                                                                      |
| ------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `Connection refused` al iniciar             | PostgreSQL no disponible   | Verificar que el contenedor de PostgreSQL esté corriendo con `docker ps`                      |
| `FlywayException: Schema validation failed` | Esquema desincronizado     | Ejecutar `./gradlew flywayRepair` y reiniciar                                                 |
| `401 Unauthorized` en GraphQL               | Credenciales incorrectas   | Verificar `ADMIN_USER` y `ADMIN_PASSWORD` en `.env`                                           |
| Puerto `8081` ocupado (host)                | Otro proceso en el puerto  | Cambiar `PORT=8082` (o cualquier libre) en `.env`; el contêiner siempre usa 8080 internamente |
| Error Web3j al arrancar                     | RPC blockchain inaccesible | El servicio inicia de todos modos; la integración blockchain tiene fallback local             |
| `gradlew: Permission denied`                | Sin permisos de ejecución  | `chmod +x gradlew`                                                                            |

---

## 10. Despliegue en Azure App Service (Producción)

1. **Construir y etiquetar la imagen**:

   ```bash
   docker build -t <acr-name>.azurecr.io/ms1-activos:1.0.0 .
   ```

2. **Publicar en Azure Container Registry**:

   ```bash
   az acr login --name <acr-name>
   docker push <acr-name>.azurecr.io/ms1-activos:1.0.0
   ```

3. **Configurar variables de entorno en App Service** (Azure Portal → App Service → Configuración → Variables de aplicación):
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `BLOCKCHAIN_RPC_URL`
   - `BLOCKCHAIN_PRIVATE_KEY`
   - `MS3_WEBHOOK_URL`

4. **La base de datos** debe estar en **Azure PostgreSQL Flexible Server** con acceso de red configurado hacia el App Service.
