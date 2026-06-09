# Preflight de Supabase para MS1

Usa esta lista antes de disparar el despliegue de MS1 en Azure App Service.

## 1. Conexion recomendada

Para Azure App Service usa el **Supabase Transaction Pooler** cuando sea posible:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://<POOLER_HOST>:6543/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<PROJECT_REF>
SPRING_DATASOURCE_PASSWORD=<PASSWORD_SUPABASE>
DB_PREPARE_THRESHOLD=0
DB_SCHEMA=public
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
```

`DB_PREPARE_THRESHOLD=0` evita problemas del driver PostgreSQL con prepared statements al pasar por el pooler transaccional.

## 2. SQL de verificacion

Ejecuta esto en Supabase SQL Editor si quieres confirmar que la base esta lista:

```sql
select current_database(), current_schema();
select extname from pg_extension where extname = 'pgcrypto';
select version, description, success
from flyway_schema_history
order by installed_rank;
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

La migracion `V1__init_schema.sql` habilita `pgcrypto` automaticamente con:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## 3. Primer arranque esperado

Al iniciar MS1:

1. Flyway aplica `V1`, `V2` y `V3`.
2. Hibernate valida el esquema con `ddl-auto=validate`.
3. `DataInitializer` crea datos demo si las tablas estan vacias.
4. `/actuator/health` debe responder `UP`.

## 4. Variables obligatorias en Azure

```text
WEBSITES_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://<POOLER_HOST>:6543/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<PROJECT_REF>
SPRING_DATASOURCE_PASSWORD=<PASSWORD_SUPABASE>
DB_PREPARE_THRESHOLD=0
JWT_SECRET=<openssl rand -base64 64>
ADMIN_PASSWORD=<password-demo>
BLOCKCHAIN_RPC_URL=https://rpc.ankr.com/eth_sepolia
BLOCKCHAIN_PRIVATE_KEY=<private-key-sepolia-o-dummy>
MS3_WEBHOOK_URL=https://<ms3-gcp>/webhook/activos
CORS_ALLOWED_ORIGIN_PATTERNS=https://<frontend-angular>,https://<ms1>.azurewebsites.net
```

## 5. Si falla el despliegue

| Sintoma | Revision |
| --- | --- |
| `function gen_random_uuid() does not exist` | Confirmar que `pgcrypto` se creo y que Flyway ejecuto `V1`. |
| `relation flyway_schema_history does not exist` | La app todavia no corrio Flyway o no pudo conectar a Supabase. |
| `prepared statement already exists` | Confirmar `DB_PREPARE_THRESHOLD=0` usando Transaction Pooler. |
| Hibernate falla en `validate` | Comparar tablas con migraciones; no crear tablas manualmente con nombres distintos. |
| CORS bloquea Angular | Agregar el dominio real en `CORS_ALLOWED_ORIGIN_PATTERNS`. |
