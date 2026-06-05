# Especificaciones de Casos de Uso — MS1 (Spring Boot)

**Microservicio**: MS1 — Gestión de Activos Fijos  
**Tecnología**: Spring Boot / Java / PostgreSQL / GraphQL  
**Cloud**: Microsoft Azure  
**CUs**: CU-01 a CU-25 · CU-46 a CU-53 · CU-54 a CU-60 · CU-75 a CU-81

---

## Módulo 1 — Gestión de Activos

### CU-01: Registrar nuevo activo fijo

**Actor**: Administrador  
**Precondiciones**: Usuario autenticado con rol ADMINISTRADOR. La categoría y el área existen en el sistema.  
**Postcondiciones**: El activo queda en estado ACTIVO con código único. Se genera un `RegistroBlockchain` de tipo ADQUISICION.

**Flujo principal**:

1. El administrador accede al formulario de registro de activo.
2. Ingresa: código (o solicita generación automática), nombre, descripción, fecha de adquisición, valor de adquisición, vida útil en años, categoría, área actual, ubicación física.
3. El sistema valida que el código no exista previamente.
4. El sistema persiste el activo con estado `ACTIVO`.
5. El sistema invoca `BlockchainService.registrarTransaccion(ADQUISICION, activoId)`.
6. El sistema retorna el activo creado con su ID.

**Alternativas**:

- 3a. Si el código ya existe: error "Código de activo duplicado".
- 2a. Si se solicita código automático: el sistema genera `ACT-{año}-{secuencia}`.

**Notas técnicas**:

- GraphQL Mutation: `registrarActivo(input: ActivoInput!): Activo!`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`
- Blockchain se registra de forma asíncrona (no bloquea la respuesta)
- El código puede tener formato personalizable por la organización

---

### CU-02: Editar datos del activo

**Actor**: Administrador  
**Precondiciones**: El activo existe y no está en estado DADO_DE_BAJA.  
**Postcondiciones**: Los datos del activo son actualizados en PostgreSQL.

**Flujo principal**:

1. El administrador selecciona un activo del catálogo.
2. Accede al formulario de edición.
3. Modifica los campos permitidos: nombre, descripción, ubicación, vida útil, valor.
4. El sistema valida y persiste los cambios.
5. El sistema retorna el activo actualizado.

**Alternativas**:

- 3a. No se puede cambiar código, fecha de adquisición ni categoría de un activo con movimientos registrados.
- 4a. Si el activo está en estado DADO_DE_BAJA: error "No se puede editar un activo dado de baja".

**Notas técnicas**:

- GraphQL Mutation: `actualizarActivo(id: ID!, input: ActivoInput!): Activo!`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-03: Consultar catálogo de activos

**Actor**: Administrador, Auditor, Solo Lectura  
**Precondiciones**: Usuario autenticado.  
**Postcondiciones**: Se retorna la lista de activos según filtros aplicados.

**Flujo principal**:

1. El usuario accede al catálogo de activos.
2. Opcionalmente aplica filtros: estado, categoría, área, rango de fechas.
3. El sistema retorna la lista paginada de activos con datos básicos.

**Notas técnicas**:

- GraphQL Query: `activos(filtro: FiltroActivoInput): [Activo!]!`
- Filtros: `estado`, `categoriaId`, `areaId`, `fechaDesde`, `fechaHasta`, `busqueda` (texto libre)
- Seguridad: `@PreAuthorize("isAuthenticated()")`
- Implementar `Specification` de Spring Data JPA para los filtros dinámicos

---

### CU-04: Buscar activo por código, nombre o categoría

**Actor**: Todos los roles  
**Precondiciones**: Usuario autenticado.  
**Postcondiciones**: Se retorna la lista de activos que coinciden con el criterio de búsqueda.

**Notas técnicas**:

- Incluido en el filtro de CU-03 mediante el campo `busqueda` (búsqueda por LIKE en código, nombre, descripción)
- GraphQL Query: `activos(filtro: FiltroActivoInput)` con campo `busqueda: String`

---

### CU-05: Cambiar estado del activo

**Actor**: Administrador  
**Precondiciones**: El activo existe. La transición de estado es válida según la máquina de estados.  
**Postcondiciones**: El estado del activo es actualizado. Se genera `RegistroBlockchain` si aplica.

**Transiciones válidas**:

- `ACTIVO → EN_MANTENIMIENTO`: `iniciarMantenimiento(activoId)`
- `EN_MANTENIMIENTO → ACTIVO`: `finalizarMantenimiento(activoId)`
- `ACTIVO → TRANSFERIDO`: se produce al confirmar traslado (CU-12)
- `TRANSFERIDO → ACTIVO`: se produce al confirmar recepción (CU-13)
- `ACTIVO/EN_MANTENIMIENTO → DADO_DE_BAJA`: se produce al ejecutar baja (CU-22)

**Notas técnicas**:

- GraphQL Mutation: `cambiarEstadoActivo(id: ID!, estado: EstadoActivo!, observacion: String): Activo!`
- La validación de transiciones se implementa en `ActivoService` con una tabla de transiciones permitidas
- Los cambios TRANSFERIDO y DADO_DE_BAJA no se cambian directamente; son derivados de CU-12 y CU-22

---

### CU-06: Registrar categoría de activo con método de depreciación

**Actor**: Administrador  
**Precondiciones**: Usuario autenticado con rol ADMINISTRADOR.  
**Postcondiciones**: La categoría queda registrada con su método y tasa de depreciación.

**Flujo principal**:

1. El administrador ingresa: nombre, descripción, método de depreciación (LINEAL / ACELERADO / SUMA_DIGITOS), tasa de depreciación (%).
2. El sistema persiste la categoría.

**Notas técnicas**:

- GraphQL Mutation: `registrarCategoria(input: CategoriaActivoInput!): CategoriaActivo!`
- GraphQL Query: `categorias: [CategoriaActivo!]!`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-07: Editar categoría de activo

**Actor**: Administrador  
**Precondiciones**: La categoría existe.  
**Postcondiciones**: La categoría es actualizada.

**Notas técnicas**:

- GraphQL Mutation: `actualizarCategoria(id: ID!, input: CategoriaActivoInput!): CategoriaActivo!`
- Si la categoría tiene activos, solo se puede cambiar el nombre/descripción, no el método de depreciación

---

### CU-08: Consultar historial completo de movimientos del activo

**Actor**: Todos los roles  
**Precondiciones**: El activo existe.  
**Postcondiciones**: Se retorna el historial de asignaciones, traslados y cambios de estado.

**Notas técnicas**:

- GraphQL Query: `activo(id: ID!)` con campos anidados `asignaciones`, `traslados`, `bajas`, campo `registrosBlockchain`
- El historial incluye: asignaciones, traslados, bajas, diagnósticos, registros blockchain
- Ordenado por fecha descendente

---

### CU-09: Ver ficha detallada del activo con valor en libros actual

**Actor**: Todos los roles  
**Precondiciones**: El activo existe.  
**Postcondiciones**: Se retorna la ficha completa con valor en libros calculado al día de la consulta.

**Flujo principal**:

1. El usuario consulta un activo por ID.
2. El sistema retorna todos los datos del activo.
3. El sistema calcula el valor en libros actual invocando `DepreciacionService.calcularValorLibros(activo, LocalDate.now())`.

**Notas técnicas**:

- GraphQL Query: `activo(id: ID!): Activo`
- El campo `valorLibros` es calculado (no persistido); se resuelve en el resolver
- Considerar añadir campo `valorLibros: BigDecimal` al tipo GraphQL `Activo`

---

## Módulo 2 — Gestión de Asignaciones y Traslados

### CU-10: Asignar activo a responsable de área

**Actor**: Administrador  
**Precondiciones**: El activo existe en estado ACTIVO (sin asignación activa). El responsable y el área existen.  
**Postcondiciones**: Se crea una `Asignacion` activa. El `areaActual` del activo se actualiza. Se genera `RegistroBlockchain` de tipo ASIGNACION.

**Flujo principal**:

1. El administrador selecciona el activo, el responsable y el área de destino.
2. Opcionalmente agrega observaciones.
3. El sistema verifica que el activo no tenga asignación activa.
4. El sistema crea la asignación con `activa = true` y fecha actual.
5. El sistema actualiza `areaActual` del activo.
6. El sistema registra en Blockchain.
7. El sistema retorna la asignación creada.

**Alternativas**:

- 3a. Si el activo ya tiene asignación activa: error "El activo ya está asignado. Devuélvalo primero".

**Notas técnicas**:

- GraphQL Mutation: `asignarActivo(activoId: ID!, responsableId: ID!, areaId: ID!, observaciones: String): Asignacion!`
- Blockchain: tipo `ASIGNACION`, payload: `{activoId, responsableId, areaId, fecha}`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-11: Devolver activo al inventario

**Actor**: Administrador  
**Precondiciones**: El activo tiene una asignación activa.  
**Postcondiciones**: La asignación queda con `activa = false` y fecha de devolución registrada. El activo queda sin asignación activa.

**Notas técnicas**:

- GraphQL Mutation: `devolverActivo(activoId: ID!, observaciones: String): Asignacion!`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-12: Registrar traslado de activo entre áreas

**Actor**: Administrador  
**Precondiciones**: El activo existe en estado ACTIVO o EN_MANTENIMIENTO. El área de destino existe.  
**Postcondiciones**: Se crea un `Traslado` con `recepcionConfirmada = false`. El estado del activo cambia a TRANSFERIDO. Se genera `RegistroBlockchain` de tipo TRASLADO.

**Flujo principal**:

1. El administrador selecciona el activo, el área de destino y el motivo del traslado.
2. El sistema registra el traslado con `recepcionConfirmada = false`.
3. El sistema cambia el estado del activo a TRANSFERIDO.
4. El sistema registra en Blockchain.

**Notas técnicas**:

- GraphQL Mutation: `registrarTraslado(activoId: ID!, areaDestinoId: ID!, motivoTraslado: String!): Traslado!`
- Blockchain: tipo `TRASLADO`, payload: `{activoId, areaOrigenId, areaDestinoId, fecha, motivo}`

---

### CU-13: Autorizar/confirmar recepción de traslado

**Actor**: Administrador  
**Precondiciones**: El traslado existe con `recepcionConfirmada = false`.  
**Postcondiciones**: El traslado queda con `recepcionConfirmada = true`. El `areaActual` del activo se actualiza al área de destino. El estado del activo regresa a ACTIVO.

**Notas técnicas**:

- GraphQL Mutation: `confirmarRecepcionTraslado(trasladoId: ID!): Traslado!`
- Blockchain: tipo `ASIGNACION` (registro de nueva asignación de área)
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-14: Consultar activos asignados por área

**Actor**: Todos los roles  
**Precondiciones**: El área existe.  
**Postcondiciones**: Se retorna la lista de activos con asignación activa en el área.

**Notas técnicas**:

- GraphQL Query: `activosPorArea(areaId: ID!): [Activo!]!`
- O mediante filtro: `activos(filtro: { areaId: "..." })`

---

### CU-15: Consultar historial de asignaciones de un activo

**Notas técnicas**:

- Campo anidado en `activo(id) { asignaciones { ... } }`
- Ordenado por `fechaAsignacion` descendente

---

### CU-16: Consultar historial de traslados de un activo

**Notas técnicas**:

- Campo anidado en `activo(id) { traslados { ... } }`
- Incluir `areaOrigen`, `areaDestino`, `autorizadoPor`, `recepcionConfirmada`

---

### CU-17: Generar reporte de activos por responsable

**Actor**: Administrador, Auditor  
**Notas técnicas**:

- GraphQL Query: `activosPorResponsable(responsableId: ID!): [Activo!]!`
- Retorna activos con asignación activa para el responsable dado

---

## Módulo 3 — Gestión de Depreciación y Bajas

### CU-18: Calcular depreciación del activo

**Actor**: Administrador, Auditor  
**Precondiciones**: El activo existe, tiene `valorAdquisicion`, `vidaUtilAnios` y `fechaAdquisicion`.  
**Postcondiciones**: Se retorna la depreciación calculada según el método de la categoría.

**Métodos de depreciación**:

| Método       | Fórmula                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| LINEAL       | `depAnual = (valorAdq - valorResidual) / vidaUtil`                          |
| ACELERADO    | `depAnual = 2 / vidaUtil * valorLibros`                                     |
| SUMA_DIGITOS | `depAnio = (vidaUtil - año + 1) / sumaDigitos * (valorAdq - valorResidual)` |

**Notas técnicas**:

- El cálculo se hace en `DepreciacionService.calcularDepreciacionActivo(activo, aniosTranscurridos)`
- GraphQL Query: `activo(id) { valorLibros }` — campo calculado
- El `valorResidual` por defecto es 0

---

### CU-19: Generar reporte de depreciación anual por categoría

**Actor**: Administrador, Auditor  
**Precondiciones**: Existen activos en el sistema.  
**Postcondiciones**: Se retorna un reporte con la depreciación de cada activo para el año indicado.

**Notas técnicas**:

- GraphQL Query: `reporteDepreciacion(anio: Int!): ReporteDepreciacionDTO!`
- `ReporteDepreciacionDTO` contiene: `anio`, `totalDepreciacionAnio`, `totalValorLibros`, `detalles[]`
- Cada detalle: `activoCodigo`, `activoNombre`, `metodoDepreciacion`, `valorAdquisicion`, `depreciacionAcumulada`, `depreciacionAnio`, `valorLibros`

---

### CU-20: Consultar valor en libros actual de un activo

**Notas técnicas**:

- Campo `valorLibros` calculado en tiempo real en el resolver de `Activo`
- Fórmula: `valorLibros = valorAdquisicion - depreciacionAcumuladaHastaHoy`
- No se persiste; se recalcula en cada consulta

---

### CU-21: Proyectar vida útil restante de un activo

**Notas técnicas**:

- Campo `vidaUtilRestanteAnios` calculado: `vidaUtil - (hoy - fechaAdquisicion).years`
- Valor mínimo: 0 (no puede ser negativo)
- Se expone como campo en el tipo GraphQL `Activo`

---

### CU-22: Registrar baja de activo

**Actor**: Administrador  
**Precondiciones**: El activo existe en estado ACTIVO o EN_MANTENIMIENTO. No tiene asignación activa.  
**Postcondiciones**: Se crea un registro `Baja`. El activo cambia a estado DADO_DE_BAJA (irreversible). Se genera `RegistroBlockchain` de tipo BAJA.

**Flujo principal**:

1. El administrador selecciona el activo.
2. Ingresa: motivo de baja, valor residual, observaciones.
3. El sistema verifica que el activo no tenga asignación activa (si la tiene, primero devolver).
4. El sistema crea el registro `Baja`.
5. El sistema cambia el estado del activo a `DADO_DE_BAJA`.
6. El sistema registra en Blockchain.

**Alternativas**:

- 3a. Si el activo tiene asignación activa: error "Devuelva el activo antes de darlo de baja".

**Notas técnicas**:

- GraphQL Mutation: `darDeBajaActivo(activoId: ID!, motivo: String!, valorResidual: BigDecimal, observaciones: String): Baja!`
- Blockchain: tipo `BAJA`, payload: `{activoId, motivo, valorResidual, fecha}`
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-23: Autorizar baja de activo

**Nota**: Si el flujo requiere aprobación en dos pasos, se puede implementar como:

- Paso 1: `solicitarBaja(activoId)` → estado intermedio `PENDIENTE_BAJA`
- Paso 2: `autorizarBaja(bajaId)` → ejecuta la baja definitiva

**Notas técnicas**:

- Por simplicidad del alcance académico, CU-22 y CU-23 pueden fusionarse en una sola operación con una confirmación en el frontend.
- Si se quiere separar: `solicitarBaja` (rol cualquiera) + `confirmarBaja` (solo ADMINISTRADOR)

---

### CU-24: Historial de activos dados de baja en un período

**Notas técnicas**:

- GraphQL Query: `activosDadaDeBaja(desde: Date, hasta: Date): [Activo!]!`
- O mediante filtro: `activos(filtro: { estado: DADO_DE_BAJA, fechaDesde, fechaHasta })`

---

### CU-25: Generar acta de baja en PDF

**Actor**: Administrador  
**Postcondiciones**: Se genera un PDF descargable con los datos de la baja.

**Notas técnicas**:

- **Opción A** (backend): endpoint REST `GET /api/bajas/{id}/acta-pdf` que usa una librería PDF (Apache PDFBox o JasperReports) y retorna el archivo
- **Opción B** (frontend): el frontend renderiza los datos del activo y usa `window.print()` o una librería como `jsPDF`
- Recomendado: Opción B para simplificar — el frontend obtiene los datos de la baja vía GraphQL y genera el PDF en el cliente

---

## Módulo 7 — Gestión de Usuarios y Roles

### CU-46: Registrar nuevo usuario

**Actor**: Administrador  
**Precondiciones**: El username y email no existen en el sistema.  
**Postcondiciones**: El usuario queda registrado con su rol asignado y contraseña hasheada con BCrypt.

**Notas técnicas**:

- GraphQL Mutation: `registrarUsuario(input: UsuarioInput!): Usuario!`
- `UsuarioInput`: `{ username, email, password, rol, nombre }`
- La contraseña se hashea con `BCryptPasswordEncoder` antes de persistir
- Seguridad: `@PreAuthorize("hasRole('ADMINISTRADOR')")`

---

### CU-47: Editar datos del usuario

**Notas técnicas**:

- GraphQL Mutation: `actualizarUsuario(id: ID!, input: UsuarioUpdateInput!): Usuario!`
- `UsuarioUpdateInput` no incluye `password` (cambio de contraseña es CU-50)

---

### CU-48: Asignar o cambiar rol del usuario

**Notas técnicas**:

- GraphQL Mutation: `cambiarRolUsuario(id: ID!, rol: RolUsuario!): Usuario!`
- Seguridad: solo ADMINISTRADOR puede cambiar roles

---

### CU-49: Inactivar usuario

**Notas técnicas**:

- GraphQL Mutation: `inactivarUsuario(id: ID!): Usuario!`
- Cambia el campo `activo = false`; el usuario ya no puede autenticarse
- `JwtFilter` debe verificar que el usuario esté activo en cada request

---

### CU-50: Restablecer contraseña

**Notas técnicas**:

- GraphQL Mutation: `restablecerPassword(id: ID!, nuevaPassword: String!): Boolean!`
- Seguridad: ADMINISTRADOR puede restablecer cualquier contraseña; un usuario puede cambiar la suya propia
- Validar que la nueva contraseña cumpla criterios mínimos (longitud ≥ 8)

---

### CU-51: Registrar área organizacional

**Notas técnicas**:

- GraphQL Mutation: `registrarArea(input: AreaInput!): Area!`
- `AreaInput`: `{ codigo, nombre, descripcion }`
- GraphQL Query: `areas: [Area!]!`

---

### CU-52: Asignar responsable principal a un área

**Notas técnicas**:

- GraphQL Mutation: `asignarResponsableArea(areaId: ID!, responsableId: ID!): Area!`
- Un área puede tener un responsable principal; relación 1:1

---

### CU-53: Buscar usuario por nombre, email o rol

**Notas técnicas**:

- GraphQL Query: `usuarios(filtro: FiltroUsuarioInput): [Usuario!]!`
- Filtros: `rol`, `activo`, `busqueda` (texto en username/email/nombre)

---

## Módulo 8 — Inteligencia de Negocio

### CU-54: Visualizar dashboard ejecutivo con KPIs

**Actor**: Administrador, Auditor, Solo Lectura  
**Notas técnicas**:

- GraphQL Query: `dashboardBI: DashboardMetricasDTO!` — ya implementado en MS1
- El frontend Angular renderiza los datos con Chart.js
- Seguridad: `@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'AUDITOR')")`

---

### CU-55 a CU-57: KPIs de activos, valor y distribución

**Notas técnicas**:

- Todos retornados por `dashboardBI`:
  - `totalActivos`, `activosActivos`, `activosEnMantenimiento`, `activosTransferidos`, `activosDadoDeBaja`
  - `valorTotalInventario`, `depreciacionAcumuladaTotal`
  - `activosPorCategoria[{ categoria, cantidad }]`
  - `activosPorArea[{ area, cantidad }]`

---

### CU-58: Tendencia de adquisiciones por año

**Notas técnicas**:

- Agregar al `DashboardMetricasDTO`: `adquisicionesPorAnio[{ anio, cantidad }]`
- Query SQL: `SELECT YEAR(fechaAdquisicion), COUNT(*) FROM activos GROUP BY YEAR(fechaAdquisicion)`
- Agregar al schema: `adquisicionesPorAnio: [ParAnioConteo!]!`

---

### CU-59: Proyección de vida útil de activos críticos

**Notas técnicas**:

- Agregar al `DashboardMetricasDTO`: `activosCriticos[{ activoId, codigo, nombre, mesesRestantes }]`
- Criterio: activos con vida útil restante ≤ 12 meses
- Query: calcular en Java iterando los activos y filtrando los críticos

---

### CU-60: Exportar reporte BI en PDF

**Notas técnicas**:

- Implementar en el frontend: el componente del dashboard tiene un botón "Exportar PDF"
- Usar `jsPDF` + `html2canvas` para capturar el dashboard completo
- O implementar endpoint MS1 `GET /api/reportes/bi/pdf` con JasperReports

---

## Módulo 11 — Registro Blockchain y Auditoría

### CU-75 a CU-79: Registros automáticos en Blockchain

**Actor**: Sistema (automático al ejecutar mutaciones)  
**Precondiciones**: El activo ejecutó una operación crítica (crear, asignar, trasladar, dar de baja, diagnóstico crítico).  
**Postcondiciones**: `RegistroBlockchain` persiste en PostgreSQL con `hash`, `bloqueId`, `timestamp`.

**Notas técnicas**:

- `BlockchainService.registrarTransaccion(tipo, payload)` invoca `BlockchainAdapter`
- `BlockchainAdapter` usa Web3j para enviar la transacción a Ethereum Sepolia
- Si Blockchain no responde (timeout): guardar en BD con `estado = PENDIENTE_BLOCKCHAIN` y reintentar con @Scheduled
- Tipos: `ADQUISICION` (CU-75), `ASIGNACION` (CU-76), `TRASLADO` (CU-77), `BAJA` (CU-78), `DIAGNOSTICO_CRITICO` (CU-79)

---

### CU-80: Consultar historial Blockchain de un activo

**Actor**: Administrador, Auditor  
**Notas técnicas**:

- GraphQL Query: `historialBlockchain(activoId: ID!): [RegistroBlockchain!]!`
- Retorna todos los registros de la tabla `registro_blockchain` para el activo dado
- Los datos provienen de PostgreSQL (MS1 guarda la copia local del hash)
- Seguridad: `@PreAuthorize("isAuthenticated()")`

---

### CU-81: Verificar integridad de registro Blockchain externamente

**Actor**: Auditor  
**Notas técnicas**:

- El hash del `RegistroBlockchain` es verificable en Etherscan (Sepolia): `https://sepolia.etherscan.io/tx/{hash}`
- El frontend puede mostrar un enlace directo a Etherscan para cada registro
- No se implementa un endpoint de verificación en MS1; la verificación es externa vía Etherscan
