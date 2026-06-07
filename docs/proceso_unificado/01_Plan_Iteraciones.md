# Plan de Iteraciones — Sistema de Gestión de Activos Fijos

**Metodología**: Proceso Unificado  
**Fecha de referencia**: Junio 2026

---

## Estado Actual de las Fases

| Fase             | Estado         | Evidencia                                                                                     |
| ---------------- | -------------- | --------------------------------------------------------------------------------------------- |
| **Inicio**       | ✅ Completada  | Propuesta aprobada, arquitectura C4 definida, actores y CUs identificados                     |
| **Elaboración**  | ✅ Completada  | MS1 esqueleto funcional (entidades, GraphQL, auth, dashboard), documentación técnica completa |
| **Construcción** | 🔄 En progreso | MS1 parcialmente implementado, frontend base creado                                           |
| **Transición**   | ⏳ Pendiente   | Despliegue en nube                                                                            |

---

## Resumen de Iteraciones de Construcción

| Iteración | Componente principal                       | CUs cubiertos                               | Estado         |
| --------- | ------------------------------------------ | ------------------------------------------- | -------------- |
| **IT-C1** | MS1 completo + Frontend Módulos 1-3        | CU-01 a CU-25, CU-46 a CU-53, CU-75 a CU-81 | 🔄 En progreso |
| **IT-C2** | MS2 Gestión Documental + Frontend Módulo 4 | CU-26 a CU-33                               | ✅ Completada  |
| **IT-C3** | MS2 IA/ML + Frontend Módulos 8-9           | CU-35, CU-36, CU-54 a CU-66                 | ✅ Completada  |
| **IT-C4** | App Móvil completa                         | CU-34, CU-37 a CU-45                        | ✅ Completada  |
| **IT-C5** | MS3 Automatización + Integración total     | CU-67 a CU-74                               | ⏳ Pendiente   |

---

## IT-C1 — MS1 Completo + Frontend Módulos 1-3 y 7

### Objetivo

Tener MS1 completamente funcional con todos los endpoints GraphQL del dominio de activos. El frontend debe permitir operar todos los módulos que dependen de MS1.

### Estado actual de MS1

Lo que ya existe:

- Entidades JPA: `Activo`, `CategoriaActivo`, `Asignacion`, `Traslado`, `Baja`, `Area`, `Responsable`, `Usuario`, `RegistroBlockchain`
- GraphQL schema completo en `schema.graphqls`
- `DashboardService` + `DashboardMetricasDTO`
- `DepreciacionService` con métodos LINEAL, ACELERADO, SUMA_DIGITOS
- `BlockchainService` + `BlockchainAdapter` (Ethereum Sepolia / Web3j)
- Auth JWT (`JwtUtil`, `JwtFilter`, `SecurityConfig`, `AuthController`)
- `DataInitializer` con datos de ejemplo

Lo que falta verificar/completar en MS1:

- [ ] `ActivoResolver` — todas las queries y mutations del schema
- [ ] `AsignacionResolver` — asignar, devolver, consultar
- [ ] `TrasladoResolver` — registrar, autorizar, confirmar recepción
- [ ] `BajaResolver` — registrar baja, autorizar
- [ ] `CategoriaResolver` — CRUD completo
- [ ] `AreaResolver` — CRUD completo
- [ ] `ResponsableResolver` — CRUD completo
- [ ] `UsuarioResolver` — CRUD completo + gestión de roles
- [ ] Integración Blockchain en cada mutación de estado del activo
- [ ] `ReporteResolver` — `reporteDepreciacion` + `historialBlockchain`

### CUs a completar en IT-C1

**Módulo 1 — Gestión de Activos** (MS1)

- [ ] CU-01: Registrar nuevo activo fijo
- [ ] CU-02: Editar datos del activo
- [ ] CU-03: Consultar catálogo de activos
- [ ] CU-04: Buscar activo por código, nombre o categoría
- [ ] CU-05: Cambiar estado del activo
- [ ] CU-06: Registrar categoría de activo
- [ ] CU-07: Editar categoría de activo
- [ ] CU-08: Consultar historial completo de movimientos del activo
- [ ] CU-09: Ver ficha detallada del activo con valor en libros actual

**Módulo 2 — Asignaciones y Traslados** (MS1)

- [ ] CU-10: Asignar activo a responsable de área
- [ ] CU-11: Devolver activo al inventario
- [ ] CU-12: Registrar traslado entre áreas
- [ ] CU-13: Autorizar traslado
- [ ] CU-14: Consultar activos asignados por área
- [ ] CU-15: Consultar historial de asignaciones
- [ ] CU-16: Consultar historial de traslados
- [ ] CU-17: Reporte de activos por responsable

**Módulo 3 — Depreciación y Bajas** (MS1)

- [ ] CU-18: Calcular depreciación del activo
- [ ] CU-19: Reporte de depreciación anual
- [ ] CU-20: Consultar valor en libros actual
- [ ] CU-21: Proyectar vida útil restante
- [ ] CU-22: Registrar baja de activo
- [ ] CU-23: Autorizar baja de activo
- [ ] CU-24: Historial de activos dados de baja
- [ ] CU-25: Generar acta de baja en PDF

**Módulo 7 — Gestión de Usuarios** (MS1)

- [ ] CU-46: Registrar nuevo usuario
- [ ] CU-47: Editar datos del usuario
- [ ] CU-48: Asignar o cambiar rol
- [ ] CU-49: Inactivar usuario
- [ ] CU-50: Restablecer contraseña
- [ ] CU-51: Registrar área organizacional
- [ ] CU-52: Asignar responsable a área
- [ ] CU-53: Buscar usuario

**Módulo 11 — Blockchain** (MS1 — automático en mutaciones)

- [ ] CU-75: Registro en Blockchain al registrar activo
- [ ] CU-76: Registro en Blockchain al asignar activo
- [ ] CU-77: Registro en Blockchain al trasladar activo
- [ ] CU-78: Registro en Blockchain al dar de baja
- [ ] CU-79: Registro en Blockchain al diagnóstico crítico de IA
- [ ] CU-80: Consultar historial Blockchain de un activo
- [ ] CU-81: Verificar integridad de registro Blockchain

### Frontend a completar en IT-C1

- [ ] Página: Catálogo de activos con filtros y búsqueda
- [ ] Formulario: Registro y edición de activo
- [ ] Ficha de activo: detalle + historial + valor en libros
- [ ] Página: Asignaciones (asignar, devolver)
- [ ] Página: Traslados (registrar, autorizar, confirmar)
- [ ] Página: Bajas (registrar, autorizar, historial)
- [ ] Página: Categorías de activo (CRUD)
- [ ] Página: Áreas y responsables (CRUD)
- [ ] Página: Gestión de usuarios con roles
- [ ] Página: Historial Blockchain de activo

### Criterios de éxito IT-C1

- [ ] Se puede registrar un activo completo y verlo en el catálogo
- [ ] Se puede asignar, trasladar y dar de baja un activo
- [ ] Cada mutación de estado genera un `RegistroBlockchain` verificable
- [ ] El reporte de depreciación muestra valores correctos por los 3 métodos
- [ ] El dashboard BI (`dashboardBI`) muestra datos reales de la BD
- [ ] Se puede gestionar usuarios con distintos roles y los permisos funcionan

---

## IT-C2 — MS2 Gestión Documental + Frontend Módulo 4

### Objetivo

Tener MS2 funcional para carga, descarga, versionamiento y auditoría de documentos. El frontend debe permitir gestionar documentos asociados a cada activo.

### Componentes a implementar

**MS2 — FastAPI (Python)**

- [x] Proyecto FastAPI en `/ms2/` con estructura de capas
- [x] `DocumentoController` — endpoints REST de documentos
- [x] `AuditoriaController` — endpoints de log de auditoría
- [x] `DocumentoService` — lógica de negocio
- [x] `AuditoriaService` — registro de eventos en DynamoDB
- [x] `S3Adapter` — upload/download/delete a Amazon S3
- [x] `DynamoDBAdapter` — CRUD de metadatos y auditoría
- [x] Middleware de autenticación JWT (validar token emitido por MS1)
- [x] Configuración CORS para Angular y React Native
- [x] Docker + `docker-compose.yml`

**Modelo DynamoDB — Tabla `documentos`**

```
PK: doc#{documentoId}
SK: v#{version}
activoId, nombre, tipo, s3Key, s3Url, version, subidoPor, fechaCreacion, activo
```

**Modelo DynamoDB — Tabla `auditoria`**

```
PK: evt#{eventoId}
SK: {timestamp}
documentoId, activoId, accion, usuario, ipOrigen, detalles
```

**CUs a implementar en IT-C2**

- [x] CU-26: Cargar documento (upload a S3 + metadata en DynamoDB)
- [x] CU-27: Descargar documento (URL presignada de S3)
- [x] CU-28: Actualizar versión de documento
- [x] CU-29: Consultar historial de versiones
- [x] CU-30: Eliminar documento (soft delete + auditoría)
- [x] CU-31: Consultar log de auditoría de documento
- [x] CU-32: Buscar documentos por tipo, activo o fecha
- [x] CU-33: Listar todos los documentos de un activo

**Frontend — Módulo 4**

- [x] Componente: Lista de documentos por activo
- [x] Componente: Upload de documento con drag & drop
- [x] Componente: Historial de versiones
- [x] Componente: Log de auditoría (solo Auditor/Admin)
- [x] Servicio: `ms2.service.ts` con métodos para todos los CU-26 a CU-33

### Criterios de éxito IT-C2

- [x] Se puede subir un PDF a un activo y descargarlo
- [x] Al subir una nueva versión, la anterior queda en el historial
- [x] Cada acción (visualización, descarga, modificación) queda en DynamoDB
- [x] Solo el Auditor y Admin pueden ver el log de auditoría
- [x] Los documentos eliminados no son visibles pero el log persiste

---

## IT-C3 — MS2 IA/ML + Frontend Módulos 8 y 9

### Objetivo

Implementar los modelos de Deep Learning (CNN) y Machine Learning (Random Forest, K-Means) en MS2. Completar el dashboard BI y las visualizaciones ML en el frontend.

### Componentes a implementar

**MS2 — Módulo IA**

- [x] `IAController` — endpoint `POST /diagnostico/imagen`
- [x] `DiagnosticoIAService` — orquesta el proceso CNN
- [x] `ModelLoader` — carga y gestiona los modelos entrenados
- [x] `CNN_EstadoActivo` — modelo TensorFlow/Keras para clasificar estado
  - Clases: `BUENO`, `DETERIORADO`, `REQUIERE_MANTENIMIENTO`
  - Input: imagen 224×224 RGB
  - Output: `{ estado, confianza, detalle }`
- [x] Persistencia del diagnóstico en DynamoDB + imagen en S3

**MS2 — Módulo ML**

- [x] `MLController` — endpoints `GET /ml/prediccion-vida-util` y `GET /ml/clustering`
- [x] `MLService` — orquesta los modelos
- [x] `RandomForest_VidaUtil` — modelo scikit-learn
  - Features: edad, n_mantenimientos, categoria_encoded, diagnosticos_historicos
  - Target: meses_restantes (regresión) + riesgo_fallo (clasificación)
- [x] `KMeans_Clustering` — modelo scikit-learn
  - Features: frecuencia_mantenimiento, vida_util_pct, n_fallas, categoria
  - Output: grupo (Alto riesgo / Normal / Eficiente) + centroide

**CUs a implementar en IT-C3**

- [x] CU-35: Enviar imagen al MS2 para diagnóstico CNN (endpoint)
- [x] CU-36: Procesar imagen con CNN y retornar diagnóstico
- [x] CU-54: Dashboard BI con KPIs completo (ya parcialmente en MS1)
- [x] CU-55: Total de activos y valor total en libros (MS1 GraphQL)
- [x] CU-56: Depreciación acumulada por categoría y área
- [x] CU-57: Distribución de activos por estado
- [x] CU-58: Tendencia de adquisiciones por año
- [x] CU-59: Proyección de vida útil de activos críticos
- [x] CU-60: Exportar reporte BI en PDF
- [x] CU-61: Predicción de vida útil restante (Random Forest regresión)
- [x] CU-62: Probabilidad de fallo próximo (Random Forest clasificación)
- [x] CU-63: Clustering de activos por patrones (K-Means)
- [x] CU-64: Consultar resultado de predicción en ficha del activo
- [x] CU-65: Recomendación de mantenimiento preventivo
- [x] CU-66: Visualizar grupos de clustering con etiquetas

**Frontend — Módulos 8 y 9**

- [x] Página: Dashboard BI completo con gráficas Chart.js
  - Donut: distribución por estado
  - Barras: activos por categoría y por área
  - Línea: tendencia de adquisiciones
  - KPI cards: total activos, valor libros, depreciación, alertas
- [x] Página: Análisis predictivo ML
  - Predicción individual por activo
  - Visualización de clustering (scatter plot o tabla de grupos)
  - Recomendaciones automáticas

### Criterios de éxito IT-C3

- [x] El endpoint `/diagnostico/imagen` recibe una imagen y retorna estado + confianza
- [x] El endpoint `/ml/prediccion-vida-util` retorna meses restantes y riesgo
- [x] El endpoint `/ml/clustering` retorna activos agrupados con etiquetas
- [x] El dashboard BI muestra gráficas con datos reales del sistema
- [x] La exportación a PDF genera un reporte descargable

---

## IT-C4 — App Móvil React Native

### Objetivo

Implementar la aplicación móvil completa para el Responsable de Área, con cámara, GPS, modo offline y diagnóstico IA.

### Componentes a implementar

**React Native (Expo o CLI)**

- [x] Proyecto en `/mobile/` (React Native 0.75.4 CLI)
- [x] Navegación con React Navigation (Stack + Bottom Tabs)
- [x] Autenticación JWT con AsyncStorage
- [x] HTTP client configurado (Axios)

**Pantallas**

- [x] `LoginScreen` — autenticación contra MS1
- [x] `ActivosScreen` — lista de activos asignados (offline-first, integra HomeScreen)
- [x] `ActivoDetalleScreen` — detalle de activo con historial y acciones
- [x] `DiagnosticoIAScreen` — cámara para capturar foto + envío a MS2
- [x] `ResultadoDiagnosticoScreen` — resultado del diagnóstico CNN
- [x] `MapaScreen` — geolocalización del activo con GPS
- [x] `NotificacionesScreen` — alertas y notificaciones push
- [x] Reporte WhatsApp integrado en `ActivoDetalleScreen` (CU-43)

**Servicios nativos**

- [x] Cámara: `react-native-vision-camera`
- [x] GPS: `react-native-geolocation-service`
- [x] Almacenamiento offline: `AsyncStorage` + sincronización automática
- [x] Notificaciones push: Firebase Cloud Messaging (FCM) — `@react-native-firebase/messaging`

**CUs a implementar en IT-C4**

- [x] CU-34: Fotografiar activo con cámara del dispositivo
- [x] CU-37: Guardar imagen y diagnóstico en historial del activo
- [x] CU-38: Consultar historial de diagnósticos anteriores
- [x] CU-39: Solicitar orden de mantenimiento desde el diagnóstico
- [x] CU-40: Consultar activos asignados al área (modo offline)
- [x] CU-41: Ver detalle de activo en campo
- [x] CU-42: Geolocalizar activo y registrar coordenadas GPS
- [x] CU-43: Reportar problema o solicitar revisión (WhatsApp)
- [x] CU-44: Recibir notificación push de alerta de mantenimiento
- [x] CU-45: Sincronizar datos offline al recuperar conexión

### Criterios de éxito IT-C4

- [x] El responsable puede ver sus activos asignados sin conexión
- [x] La cámara captura una foto y la envía a MS2, mostrando el diagnóstico
- [x] El GPS registra la ubicación del activo en la ficha
- [x] El botón de reporte abre WhatsApp con mensaje preformateado
- [x] Al recuperar conexión, los datos locales se sincronizan con MS1

---

## IT-C5 — MS3 Automatización + Integración Total

### Objetivo

Implementar MS3 (NestJS + N8N) con los flujos de automatización completos. Verificar la integración de todos los microservicios. Preparar el despliegue cloud.

### Componentes a implementar

**MS3 — NestJS (Node.js)**

- [ ] Proyecto NestJS en `/ms3/`
- [ ] `WebhookController` — recibe eventos de MS1 (vencimiento de garantía, mantenimiento programado)
- [ ] `WhatsAppController` — recibe mensajes entrantes de WhatsApp Business API
- [ ] `NotificacionService` — orquesta el envío por SendGrid
- [ ] `MS1Client` — HTTP client para consultar/actualizar en MS1
- [ ] `MS2Client` — HTTP client para verificar documentación en MS2
- [ ] Docker + `docker-compose.yml`

**N8N — Flujos de automatización**

- [ ] Flujo 1: "Solicitud de Revisión por WhatsApp"
  - Trigger: mensaje WhatsApp → identificar activo (MS1) → crear ticket → verificar docs (MS2) → email (SendGrid) → responder WhatsApp
- [ ] Flujo 2: "Alerta de Vencimiento de Garantía"
  - Trigger: webhook de MS1 (scheduler diario) → verificar docs → email al responsable + push a móvil
- [ ] Flujo 3: "Alerta de Mantenimiento Programado"
  - Trigger: webhook de MS1 → notificar responsable por email + WhatsApp

**CUs a implementar en IT-C5**

- [ ] CU-67: Recibir mensaje WhatsApp del responsable
- [ ] CU-68: Identificar activo por código en el mensaje
- [ ] CU-69: Crear ticket de revisión en MS1
- [ ] CU-70: Verificar documentación del activo en MS2
- [ ] CU-71: Enviar email de confirmación (SendGrid)
- [ ] CU-72: Responder WhatsApp con estado de la solicitud
- [ ] CU-73: Enviar alerta por vencimiento de garantía
- [ ] CU-74: Enviar alerta de mantenimiento programado

**Integración y despliegue**

- [ ] Variables de entorno y secrets configurados
- [ ] MS1 → Azure App Service configurado
- [ ] MS2 → AWS ECS/Lambda configurado
- [ ] MS3 → Google Cloud Run configurado
- [ ] Frontend → hosting estático (Azure Static Web Apps / S3 + CloudFront)
- [ ] Mobile → APK/IPA generado y distribuido

### Criterios de éxito IT-C5

- [ ] Un mensaje de WhatsApp genera el flujo completo de 3+ pasos y llega el email
- [ ] MS1 emite webhook al vencer garantía y el responsable recibe email
- [ ] Los 3 flujos N8N están exportados como JSON y funcionan en el entorno de prueba
- [ ] Todos los microservicios se comunican entre sí correctamente
- [ ] El sistema está desplegado en la nube (aunque sea entorno de prueba)

---

## Criterios de Éxito Globales (Hito IOC)

Al finalizar IT-C5, el sistema debe cumplir al 100% todos los requisitos del docente:

| Requisito                      | Evidencia requerida                                  |
| ------------------------------ | ---------------------------------------------------- |
| ≥ 3 microservicios distintos   | MS1 (Azure), MS2 (AWS), MS3 (GCP) desplegados        |
| Multi-cloud                    | URLs públicas de los 3 proveedores                   |
| Multi-lenguaje                 | Java (MS1), Python (MS2), Node.js (MS3)              |
| Frontend Angular               | URL de la aplicación web funcionando                 |
| App Móvil React Native         | APK instalable o demo en dispositivo                 |
| ≥ 3 recursos nativos           | Demo: cámara, GPS, almacenamiento offline            |
| IA en móvil                    | Demo: foto → diagnóstico CNN en tiempo real          |
| GraphQL obligatorio            | Playground GraphQL de MS1 accesible                  |
| Gestión documental + auditoría | Demo: subir doc → ver log en DynamoDB                |
| Deep Learning (CNN)            | Demo: imagen de activo → clasificación con confianza |
| ML Supervisado (Random Forest) | Demo: predicción de vida útil con datos reales       |
| ML No Supervisado (K-Means)    | Demo: clustering visual con etiquetas                |
| Blockchain                     | Hash verificable en Etherscan (Sepolia)              |
| N8N ≥ 3 pasos                  | Demo del flujo WhatsApp → sistema → email            |
| BD Relacional (PostgreSQL)     | MS1 conectado a PostgreSQL en Azure                  |
| BD NoSQL (DynamoDB)            | MS2 conectado a DynamoDB en AWS                      |
| Amazon S3                      | Documentos almacenados y descargables desde S3       |
| BI con dashboards              | Dashboard con KPIs, gráficas y exportación PDF       |
| Despliegue 100% cloud          | Sin servicios locales en producción                  |
