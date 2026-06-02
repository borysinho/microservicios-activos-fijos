---
name: plantuml-diagrams
description: >
  Generate consistent PlantUML diagrams for the Sistema de Activos Fijos project.
  Use this skill when the user asks to create or update architecture diagrams, UML diagrams,
  or any PlantUML content. Covers C4 (context, containers), UML class, sequence, state,
  component, activity, and deployment diagrams following project conventions.
  Use when: creating diagrams, updating C4 models, drawing class diagrams, modeling
  sequences between microservices, documenting state machines.
---

# PlantUML Diagrams — Sistema de Activos Fijos

This skill guides generation of PlantUML diagrams that are consistent with the
project's established conventions and stored in `docs/diagramas/`.

## Diagram Types and When to Use Each

| Type                 | When to Use                                                   |
| -------------------- | ------------------------------------------------------------- |
| **C4 Context**       | System overview: actors, system, external systems             |
| **C4 Container**     | Architecture: MS1/MS2/MS3 + frontend + mobile + databases     |
| **Class (UML)**      | Domain model per microservice                                 |
| **Component (UML)**  | Internal structure of a microservice (layers)                 |
| **Sequence (UML)**   | Inter-service flows (e.g., Ejemplo 1–5 from the presentation) |
| **State (UML)**      | Asset lifecycle, document state                               |
| **Activity (UML)**   | Business processes, automation flows                          |
| **Deployment (UML)** | Cloud infrastructure layout                                   |

## C4 Diagrams

Always include the C4-PlantUML library:

```plantuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
```

or `C4_Container.puml` for container diagrams.

### Persons (actors)

```plantuml
Person(admin, "Administrador", "Gestiona activos, reportes y configuración")
Person(responsable, "Responsable de Área", "Recibe y gestiona activos asignados")
Person(auditor, "Auditor", "Revisa registros, documentos y trazabilidad")
```

### System Boundaries

- **MS1** → `azure` color `#lightblue` — Azure App Service
- **MS2** → `aws` color `#orange` — AWS Lambda / ECS
- **MS3** → `gcp` color `#lightgreen` — GCP Cloud Run

### External Systems

```plantuml
System_Ext(email, "SendGrid", "Envío de notificaciones por email")
System_Ext(whatsapp, "WhatsApp Business API", "Recepción de solicitudes móviles")
System_Ext(blockchain_ext, "Red Blockchain\n(Ethereum / Hyperledger)", "Registro inmutable")
```

## UML Class Diagrams — Domain Model

### Key naming conventions

- All IDs: `+id: UUID`
- Enums defined as `enum` blocks
- Relationships use multiplicities: `"1"`, `"0..*"`, `"0..1"`
- No getter/setter in the diagram — only meaningful methods

### Core entities for MS1 (reference)

```plantuml
class Activo {
    +id: UUID
    +codigo: String
    +nombre: String
    +valorAdquisicion: BigDecimal
    +vidaUtilAnios: Integer
    +estado: EstadoActivo
    +categoria: CategoriaActivo
    +calcularDepreciacion(): BigDecimal
    +calcularValorLibros(): BigDecimal
}

enum EstadoActivo { ACTIVO | EN_MANTENIMIENTO | TRANSFERIDO | DADO_DE_BAJA }
enum MetodoDepreciacion { LINEAL | ACELERADO | SUMA_DIGITOS }
enum RolUsuario { ADMINISTRADOR | RESPONSABLE_AREA | AUDITOR | SOLO_LECTURA }
```

## UML State Diagrams

Asset lifecycle — always include the blockchain note:

```plantuml
note right of ACTIVO
  Cada transición genera
  un RegistroBlockchain
end note

note right of DADO_DE_BAJA
  Estado final irreversible.
  Se conserva historial.
end note
```

## UML Sequence Diagrams

### Participants to use for inter-service flows

```plantuml
actor "Administrador" as admin
participant "Frontend Angular" as fe
participant "MS1 Spring Boot" as ms1
participant "MS2 FastAPI" as ms2
participant "MS3 NestJS / N8N" as ms3
participant "PostgreSQL" as pg
participant "DynamoDB" as dynamo
participant "Amazon S3" as s3
database "Blockchain" as bc
```

### Communication protocols to annotate

- Frontend → MS1: `GraphQL` (mutations and queries)
- Frontend → MS2: `REST`
- Frontend → MS3: `REST`
- App Móvil → MS2: `REST (multipart/form-data)`
- MS1 → MS3: `Webhook (POST)`
- MS3 → MS2: `REST`
- MS3 → SendGrid: `REST`

## UML Component Diagrams

Layer structure per microservice:

**MS1 (Spring Boot)**:

```
API Layer (GraphQL Resolvers) → Service Layer → Repository Layer → Infrastructure
```

**MS2 (FastAPI)**:

```
Controllers (REST) → Services → Infrastructure (S3 + DynamoDB) + Modelos IA
```

**MS3 (NestJS)**:

```
Webhooks Controller → Webhook Service → Notificaciones Service → N8N
```

## Deployment Diagram

Cloud nodes and services:

```plantuml
node "Microsoft Azure" as azure #lightblue {
    node "Azure App Service" { artifact "MS1: Spring Boot" }
    database "Azure PostgreSQL Flexible Server"
}
node "Amazon Web Services (AWS)" as aws #orange {
    node "AWS Lambda / ECS" { artifact "MS2: FastAPI" }
    database "DynamoDB"
    storage "Amazon S3"
}
node "Google Cloud Platform" as gcp #lightgreen {
    node "Cloud Run" { artifact "MS3: NestJS + N8N" }
}
node "Cliente" {
    artifact "Frontend Web (Angular)"
    artifact "App Móvil (React Native)"
}
```

## Output Format

- Output the diagram wrapped in a fenced ` ```plantuml ` block.
- Add `title` to every diagram.
- Add `LAYOUT_WITH_LEGEND()` to all C4 diagrams.
- Save path suggestion: `docs/diagramas/<nombre-descriptivo>.puml`
