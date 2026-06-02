---
applyTo: "ms1/**,**/ms1/**,**/activos/**,**/spring*/**"
description: "Instrucciones para MS1 — Gestión de Activos Fijos con Spring Boot, GraphQL, PostgreSQL y Blockchain. Usar cuando se trabaje en el microservicio Java/Azure."
---

# MS1 — Gestión de Activos Fijos (Spring Boot / Java)

**Cloud**: Microsoft Azure — Azure App Service  
**BD**: Azure PostgreSQL Flexible Server  
**API**: GraphQL (hacia el frontend Angular)

## Stack Técnico

- Java 17+ con Spring Boot 4.x
- Spring Data JPA + Hibernate (PostgreSQL)
- Spring GraphQL (`spring-boot-starter-graphql`)
- Web3j o Hyperledger Fabric SDK para blockchain
- Gradle o Maven

## Estructura de Paquetes

```
ms1-activos/
├── src/main/java/
│   ├── resolver/        # GraphQL resolvers (Query/Mutation)
│   ├── service/         # Lógica de negocio
│   ├── repository/      # Spring Data JPA repositories
│   ├── entity/          # Entidades JPA
│   ├── dto/             # Input/Output DTOs para GraphQL
│   └── infrastructure/
│       ├── blockchain/  # BlockchainAdapter (Web3j)
│       └── ms3/         # MS3WebhookClient
├── src/main/resources/
│   ├── graphql/
│   │   └── schema.graphqls   # Definición del esquema GraphQL
│   └── application.yml
```

## Entidades JPA Principales

Todas las entidades usan `UUID` como ID (`@GeneratedValue(strategy = GenerationType.UUID)`).

| Entidad              | Tabla                  | Notas                                                                 |
| -------------------- | ---------------------- | --------------------------------------------------------------------- |
| `Activo`             | `activos`              | Estado: `EstadoActivo` enum                                           |
| `CategoriaActivo`    | `categorias_activo`    | Método depreciación: `MetodoDepreciacion`                             |
| `Asignacion`         | `asignaciones`         | FK → Activo, Responsable, Area                                        |
| `Traslado`           | `traslados`            | areaOrigen, areaDestino (FK → Area)                                   |
| `Baja`               | `bajas`                | Estado final irreversible                                             |
| `RegistroBlockchain` | `registros_blockchain` | hash, tipoTransaccion, payload, bloqueId                              |
| `Area`               | `areas`                |                                                                       |
| `Responsable`        | `responsables`         |                                                                       |
| `Usuario`            | `usuarios`             | Roles: `ADMINISTRADOR`, `RESPONSABLE_AREA`, `AUDITOR`, `SOLO_LECTURA` |

## Métodos de Depreciación

```java
// Soportar los 3 métodos en DepreciacionService
enum MetodoDepreciacion { LINEAL, ACELERADO, SUMA_DIGITOS }
```

## Ciclo de Vida del Activo (Máquina de Estados)

```
ACTIVO → EN_MANTENIMIENTO → ACTIVO
ACTIVO → TRANSFERIDO → ACTIVO (confirmarRecepcion)
ACTIVO → DADO_DE_BAJA (irreversible)
EN_MANTENIMIENTO → DADO_DE_BAJA
```

**Regla clave**: Toda transición de estado debe generar un `RegistroBlockchain` mediante `BlockchainService`.

## Esquema GraphQL (fragmento de referencia)

Ver esquema completo en [`docs/Propuesta - Sistema de Activos Fijos.md`](../../docs/Propuesta%20-%20Sistema%20de%20Activos%20Fijos.md).

```graphql
type Query {
  activos(filtro: FiltroActivo): [Activo!]!
  activo(id: ID!): Activo
  reporteDepreciacion(anio: Int!): ReporteDepreciacion!
  dashboardBI: DashboardMetricas!
}

type Mutation {
  registrarActivo(input: ActivoInput!): Activo!
  asignarActivo(activoId: ID!, responsableId: ID!): Asignacion!
  trasladarActivo(activoId: ID!, areaDestinoId: ID!): Traslado!
  darDeBajaActivo(activoId: ID!, motivo: String!): Baja!
}
```

## Integración con MS3

Al producirse un evento en un activo (asignación, traslado, baja), `MS3WebhookClient` notifica a MS3 vía REST/Webhook para disparar flujos de automatización en N8N.

## Despliegue (Azure)

- Imagen Docker → Azure Container Registry → Azure App Service
- Variables de entorno: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `BLOCKCHAIN_RPC_URL`
- No hardcodear credenciales; usar Azure Key Vault o variables de entorno
