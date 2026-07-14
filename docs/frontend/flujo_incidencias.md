# Flujo de incidencias

## Objetivo

La pantalla `/incidencias` implementa el caso de uso completo de seguimiento operativo de problemas sobre activos fijos. La incidencia ya no es un estado temporal del frontend: se persiste en MS1 mediante la entidad `Incidencia` y se gestiona desde la web con operaciones GraphQL.

## Componentes involucrados

| Componente | Responsabilidad |
| --- | --- |
| Frontend Angular `/incidencias` | Lista, filtra, sincroniza fuentes, permite editar seguimiento y cerrar incidencias. |
| MS1 Spring Boot | Persiste la entidad `Incidencia`, valida el ciclo de vida y expone GraphQL. |
| MS3 NestJS | Entrega notificaciones operativas; para alertas cerradas, la web marca la notificación como leída. |
| MS1 `Activo` | Fuente de incidencias cuando un activo está en `EN_MANTENIMIENTO`. |

## Dónde se crean

Las incidencias se crean en MS1 con la mutation GraphQL `sincronizarIncidencia(input: IncidenciaInput!)`.

El frontend llama esta mutation al cargar `/incidencias`, solo para roles con permiso de gestión (`ADMINISTRADOR` y `RESPONSABLE_AREA`), tomando dos fuentes:

1. Activos de MS1 con estado `EN_MANTENIMIENTO`.
2. Notificaciones de MS3 de tipo `mantenimiento`, `alerta` o `baja`.

MS1 evita duplicados:

- Si la incidencia viene de una notificación, busca por `notificacionId`.
- Si viene de un activo en mantenimiento, busca la última incidencia abierta del `activoId`.
- Si encuentra una incidencia abierta, actualiza datos de fuente como título, área, prioridad y detalle.
- Si no existe, crea un nuevo registro en la tabla `incidencias`.

## Dónde se editan

Las incidencias se editan desde el panel de gestión de `/incidencias`, al presionar **Gestionar** sobre un caso.

La web envía los cambios a MS1 con:

```graphql
mutation ActualizarIncidencia($id: ID!, $input: IncidenciaGestionInput!) {
  actualizarIncidencia(id: $id, input: $input) {
    id
    estado
  }
}
```

Campos editables:

- `estado`: `ABIERTA`, `EN_PROCESO` o `REVISADA`.
- `responsableOperativo`.
- `diagnostico`.
- `accionEjecutada`.
- `proximaAccion`.
- `fechaCompromiso`.
- `usuarioId`, usado para trazabilidad de creación/cierre cuando corresponde.

## Dónde se cierran

El cierre se realiza desde el mismo panel de gestión con **Cerrar incidencia**.

La web llama a MS1:

```graphql
mutation CerrarIncidencia($id: ID!, $input: IncidenciaGestionInput!) {
  cerrarIncidencia(id: $id, input: $input) {
    id
    estado
    fechaCierre
  }
}
```

MS1 ejecuta estas acciones:

1. Guarda el diagnóstico, acción ejecutada, responsable, próxima acción y fecha compromiso.
2. Cambia la incidencia a `REVISADA`.
3. Registra `fechaCierre`.
4. Registra `cerradoPor` si se envió `usuarioId`.
5. Si la incidencia está asociada a un activo en `EN_MANTENIMIENTO`, cambia el activo a `ACTIVO` usando `ActivoService.cambiarEstado`.

Para incidencias originadas en notificaciones, después de que MS1 cierra correctamente la incidencia, el frontend intenta marcar la notificación en MS3 como leída. Si MS3 falla, la incidencia permanece correctamente cerrada en MS1.

## Dónde se borran

Actualmente las incidencias no se borran físicamente.

La implementación no expone `eliminarIncidencia` porque una incidencia forma parte del historial operativo y debe conservarse para auditoría. El cierre lógico se representa con:

- `estado = REVISADA`
- `fechaCierre`
- `cerradoPor`
- datos de diagnóstico y acción ejecutada

Si en el futuro se requiere anulación, se recomienda agregar un estado como `ANULADA` y conservar el registro, en lugar de eliminar filas de la base de datos.

## Ciclo de vida

```text
Fuente detectada
  ├─ Activo EN_MANTENIMIENTO
  └─ Notificación MS3
        ↓
sincronizarIncidencia
        ↓
NUEVA o ABIERTA
        ↓
EN_PROCESO
        ↓
REVISADA
```

Estados:

| Estado | Significado |
| --- | --- |
| `NUEVA` | Incidencia creada desde alerta o notificación sin revisión operativa. |
| `ABIERTA` | Incidencia aceptada para seguimiento; típico de activos en mantenimiento. |
| `EN_PROCESO` | Hay responsable, diagnóstico o acción en curso. |
| `REVISADA` | Caso cerrado. No se elimina; queda para auditoría. |

## Contrato técnico principal

Backend MS1:

- Entidad: `com.activos.ms1.entity.Incidencia`
- Service: `com.activos.ms1.service.IncidenciaService`
- Resolver: `com.activos.ms1.resolver.IncidenciaResolver`
- Repository: `com.activos.ms1.repository.IncidenciaRepository`
- Migración: `ms1/src/main/resources/db/migration/V4__incidencias.sql`
- Schema: `ms1/src/main/resources/graphql/schema.graphqls`

Frontend:

- Pantalla: `frontend/src/app/features/incidencias/incidencias.component.ts`
- GraphQL: `frontend/src/app/core/graphql/queries.ts`
- Service Angular: `frontend/src/app/core/services/activos-gql.service.ts`
- Modelos: `frontend/src/app/core/models/models.ts`

## Reglas importantes

- La web no gestiona incidencias en memoria como fuente final; siempre persiste en MS1.
- MS3 no almacena la incidencia; solo aporta notificaciones.
- Solo `ADMINISTRADOR` y `RESPONSABLE_AREA` pueden sincronizar, editar o cerrar.
- `AUDITOR` y `SOLO_LECTURA` consultan las incidencias ya persistidas.
- El borrado físico no está permitido en el flujo actual.
