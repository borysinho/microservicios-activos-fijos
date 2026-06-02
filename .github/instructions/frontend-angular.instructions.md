---
applyTo: "frontend/**,**/frontend/**,**/angular/**,**/web/**"
description: "Instrucciones para el Frontend Web — Angular. Usar cuando se trabaje en la interfaz web que consume los tres microservicios del sistema de activos fijos."
---

# Frontend Web — Angular

**Tecnología**: Angular 21.x (requisito obligatorio de la cátedra)  
**Distribución**: CDN (sin ejecución local)  
**Interfaz única** que consume los 3 microservicios.

## Comunicación con Microservicios

| Microservicio            | Protocolo               | Observación                                     |
| ------------------------ | ----------------------- | ----------------------------------------------- |
| MS1 — Gestión de Activos | **GraphQL** (exclusivo) | Único endpoint GraphQL para queries y mutations |
| MS2 — Documentos e IA    | REST                    | Subida/descarga de documentos, predicciones ML  |
| MS3 — Automatización     | REST                    | Consulta de estado de flujos                    |

> **Regla crítica**: la comunicación con MS1 es **exclusivamente GraphQL**. Nunca usar REST hacia MS1.

## Módulos de la Aplicación

| Módulo                       | Descripción                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Gestión de Activos**       | Registrar, asignar, trasladar, dar de baja activos (GraphQL → MS1)                                        |
| **Gestión Documental**       | Subir, visualizar, descargar y auditar documentos (REST → MS2)                                            |
| **Business Intelligence**    | Dashboard con KPIs, depreciación por categoría, proyecciones y alertas (`dashboardBI` query → MS1)        |
| **Auditoría y Blockchain**   | Trazabilidad de transacciones inmutables registradas en blockchain (GraphQL → MS1)                        |
| **Machine Learning**         | Visualización de predicciones de vida útil (Random Forest) y clustering de activos (K-Means) (REST → MS2) |
| **Usuarios y Configuración** | Gestión de usuarios, roles y áreas (GraphQL → MS1)                                                        |

## Roles de Usuario

El frontend debe adaptar la UI según el rol del usuario autenticado:

- `ADMINISTRADOR` — acceso total
- `RESPONSABLE_AREA` — solo activos de su área
- `AUDITOR` — solo lectura y módulos de auditoría
- `SOLO_LECTURA` — consultas sin modificaciones

## Operaciones GraphQL Principales (MS1)

```graphql
# Queries
activos(filtro: FiltroActivo): [Activo!]!
activo(id: ID!): Activo
reporteDepreciacion(anio: Int!): ReporteDepreciacion!
dashboardBI: DashboardMetricas!

# Mutations
registrarActivo(input: ActivoInput!): Activo!
asignarActivo(activoId: ID!, responsableId: ID!): Asignacion!
trasladarActivo(activoId: ID!, areaDestinoId: ID!): Traslado!
darDeBajaActivo(activoId: ID!, motivo: String!): Baja!
```

## Operaciones REST Principales (MS2)

```
# Documentos
POST   /documentos/upload          — Subir archivo (multipart/form-data)
GET    /documentos/{id}/download   — Descargar archivo
GET    /documentos/{activoId}      — Listar documentos de un activo
GET    /auditoria/{documentoId}    — Historial de accesos

# Machine Learning
GET    /ml/prediccion-vida-util?categoriaId=<id>  — Random Forest por categoría
GET    /ml/clustering                              — Agrupación K-Means del inventario

# IA Diagnóstico
POST   /ia/diagnostico-imagen      — Diagnóstico CNN (multipart: imagen + activoId)
```

## Flujo Típico: Registro de Activo (Ejemplo 1)

1. Formulario en módulo Gestión de Activos
2. `mutation registrarActivo(input: {...})` → MS1
3. MS1 persiste en PostgreSQL + genera registro blockchain
4. Frontend recibe el activo creado y actualiza la lista

## Variables de Entorno (Angular environment)

```typescript
// environment.ts
export const environment = {
  ms1GraphqlUrl: "https://<ms1-azure>/graphql",
  ms2BaseUrl: "https://<ms2-aws>/api",
  ms3BaseUrl: "https://<ms3-gcp>/api",
};
```

No hardcodear URLs de microservicios en componentes; siempre usar `environment`.
