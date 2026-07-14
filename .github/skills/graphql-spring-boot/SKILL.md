---
name: graphql-spring-boot
description: >
  Implement GraphQL resolvers, schema, and services for MS1 (Spring Boot / Java) of the
  Sistema de Activos Fijos. Use this skill when working on MS1: creating GraphQL queries
  and mutations, defining schema.graphqls, implementing resolvers with @QueryMapping /
  @MutationMapping, integrating blockchain on state transitions, calculating depreciation,
  or implementing BI dashboard endpoints.
  Use when: adding new GraphQL operations, creating JPA entities, implementing business
  logic for assets, depreciation, assignments, transfers, or blockchain registration.
---

# GraphQL + Spring Boot — MS1 Gestión de Activos Fijos

This skill guides implementation of MS1: the core asset management microservice built
with Spring Boot, Spring GraphQL, JPA/PostgreSQL, and blockchain integration.

## Delivery Rule

At the end of every interaction that modifies files, run the relevant validation
available for the touched area, review `git status`, and create a Git commit with
the completed changes. Stage only files related to the requested work unless the
user explicitly asks to commit all pending changes.

## Project Structure

```
ms1-activos/
├── src/main/java/com/activos/ms1/
│   ├── resolver/        # @QueryMapping / @MutationMapping (Spring GraphQL)
│   ├── service/         # Business logic
│   ├── repository/      # Spring Data JPA repositories
│   ├── entity/          # JPA entities with UUID IDs
│   ├── dto/             # Input DTOs (for mutations) and output records
│   └── infrastructure/
│       ├── blockchain/  # BlockchainAdapter (Web3j / Hyperledger SDK)
│       └── ms3/         # MS3WebhookClient (RestTemplate / WebClient)
├── src/main/resources/
│   ├── graphql/
│   │   └── schema.graphqls
│   └── application.yml
```

## GraphQL Schema Rules

- File: `src/main/resources/graphql/schema.graphqls`
- All IDs use `ID!` (mapped to UUID in Java)
- Input types suffixed with `Input` (e.g., `ActivoInput`, `AsignacionInput`)
- Non-null fields marked with `!`
- Enums defined in schema and mirrored exactly as Java enums

### Schema reference (core types)

```graphql
type Activo {
  id: ID!
  codigo: String!
  nombre: String!
  descripcion: String
  fechaAdquisicion: String!
  valorAdquisicion: Float!
  valorLibros: Float!
  vidaUtilAnios: Int!
  estado: EstadoActivo!
  categoria: CategoriaActivo!
  asignacionActual: Asignacion
  historialTraslados: [Traslado!]!
}

enum EstadoActivo {
  ACTIVO
  EN_MANTENIMIENTO
  TRANSFERIDO
  DADO_DE_BAJA
}
enum MetodoDepreciacion {
  LINEAL
  ACELERADO
  SUMA_DIGITOS
}
enum RolUsuario {
  ADMINISTRADOR
  RESPONSABLE_AREA
  AUDITOR
  SOLO_LECTURA
}

type Query {
  activos(filtro: FiltroActivo): [Activo!]!
  activo(id: ID!): Activo
  reporteDepreciacion(anio: Int!): ReporteDepreciacion!
  dashboardBI: DashboardMetricas!
}

type Mutation {
  registrarActivo(input: ActivoInput!): Activo!
  asignarActivo(activoId: ID!, responsableId: ID!, areaId: ID!): Asignacion!
  trasladarActivo(activoId: ID!, areaDestinoId: ID!, motivo: String!): Traslado!
  darDeBajaActivo(activoId: ID!, motivo: String!, valorResidual: Float): Baja!
  iniciarMantenimiento(activoId: ID!): Activo!
  finalizarMantenimiento(activoId: ID!): Activo!
}
```

## Resolver Pattern

Always use `@Controller` (not `@RestController`) for GraphQL resolvers:

```java
@Controller
public class ActivoResolver {

    private final ActivoService activoService;

    public ActivoResolver(ActivoService activoService) {
        this.activoService = activoService;
    }

    @QueryMapping
    public List<Activo> activos(@Argument FiltroActivo filtro) {
        return activoService.buscar(filtro);
    }

    @QueryMapping
    public Activo activo(@Argument UUID id) {
        return activoService.findById(id);
    }

    @MutationMapping
    public Activo registrarActivo(@Argument ActivoInput input) {
        return activoService.registrar(input);
    }

    @MutationMapping
    public Traslado trasladarActivo(
            @Argument UUID activoId,
            @Argument UUID areaDestinoId,
            @Argument String motivo) {
        return activoService.trasladar(activoId, areaDestinoId, motivo);
    }
}
```

## Entity Pattern

```java
@Entity
@Table(name = "activos")
public class Activo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoActivo estado = EstadoActivo.ACTIVO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaActivo categoria;
}
```

## Blockchain Integration — CRITICAL RULE

**Every state transition must generate a `RegistroBlockchain`.**

```java
// In ActivoService, after every mutation that changes estado:
@Transactional
public Traslado trasladar(UUID activoId, UUID areaDestinoId, String motivo) {
    Activo activo = findById(activoId);
    // ... business logic ...
    activo.setEstado(EstadoActivo.TRANSFERIDO);
    activoRepository.save(activo);

    // MANDATORY: register on blockchain
    blockchainService.registrar(activo, "TRASLADO", buildPayload(traslado));

    // Notify MS3
    ms3WebhookClient.notificarEvento("TRASLADO", activo, responsableEmail);

    return traslado;
}
```

State transitions that require blockchain registration:

- `registrarActivo` → tipo: `ADQUISICION`
- `asignarActivo` → tipo: `ASIGNACION`
- `trasladarActivo` → tipo: `TRASLADO`
- `darDeBajaActivo` → tipo: `BAJA`
- CNN diagnosis with critical result → tipo: `DIAGNOSTICO_CRITICO`

## Depreciation Methods

Implement all three in `DepreciacionService`:

```java
// LINEAL
BigDecimal cuotaAnual = (valorAdquisicion - valorResidual) / vidaUtil;

// ACELERADO (doble tasa)
BigDecimal tasa = (2.0 / vidaUtil);
BigDecimal valorLibros = valorAdquisicion * Math.pow(1 - tasa, aniosTranscurridos);

// SUMA DE DÍGITOS
int sumaDigitos = vidaUtil * (vidaUtil + 1) / 2;
BigDecimal factor = (vidaUtil - anioActual + 1) / sumaDigitos;
BigDecimal cuota = (valorAdquisicion - valorResidual) * factor;
```

## MS3 Webhook Client

```java
@Component
public class MS3WebhookClient {

    private final RestTemplate restTemplate;

    @Value("${ms3.webhook.url}")
    private String webhookUrl;

    public void notificarEvento(String tipo, Activo activo, String responsableEmail) {
        Map<String, Object> body = Map.of(
            "tipo", tipo,
            "activoId", activo.getId().toString(),
            "responsableEmail", responsableEmail
        );
        restTemplate.postForEntity(webhookUrl + "/webhooks/evento-activo", body, Void.class);
    }
}
```

## BI Dashboard — `dashboardBI` Query

The `DashboardMetricas` type should include:

- Total de activos por estado (`ACTIVO`, `EN_MANTENIMIENTO`, `DADO_DE_BAJA`)
- Depreciación acumulada por categoría
- Proyección de vida útil promedio restante
- Top 5 activos con mayor desgaste
- Tendencia de adquisiciones por año

## application.yml (reference)

```yaml
spring:
  datasource:
    url: ${POSTGRESQL_URL}
    username: ${POSTGRESQL_USER}
    password: ${POSTGRESQL_PASSWORD}
  graphql:
    graphiql:
      enabled: true # dev only
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

blockchain:
  network-url: ${BLOCKCHAIN_NETWORK_URL}
  private-key: ${BLOCKCHAIN_PRIVATE_KEY}

ms3:
  webhook:
    url: ${MS3_WEBHOOK_URL}
```

## Security Notes

- Never hardcode credentials; always use environment variables.
- Validate `@Argument` inputs with Jakarta Bean Validation (`@NotNull`, `@Size`).
- Use `@PreAuthorize` (Spring Security) to restrict mutations to `ADMINISTRADOR` role.
