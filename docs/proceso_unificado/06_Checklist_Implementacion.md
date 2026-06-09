# Checklist Maestro de Implementación — Sistema de Activos Fijos

**Metodología**: Proceso Unificado  
**Referencia**: Requisitos del docente + 81 casos de uso

> Marcar con `[x]` cuando se complete cada ítem. La meta es `[x]` en todos antes del examen.

---

## PARTE A — Requisitos Obligatorios del Docente

| #   | Requisito                       | Componente          | Criterio de cumplimiento                      | ✅  |
| --- | ------------------------------- | ------------------- | --------------------------------------------- | --- |
| R01 | ≥ 3 microservicios              | MS1, MS2, MS3       | 3 servicios corriendo en URLs distintas       | [ ] |
| R02 | Multi-cloud                     | Azure/AWS/GCP       | URLs con dominios de cada proveedor           | [ ] |
| R03 | Multi-lenguaje                  | Java/Python/Node.js | Cada MS en su lenguaje correspondiente        | [ ] |
| R04 | Frontend Angular                | `frontend/`         | App Angular compilada y desplegada            | [ ] |
| R05 | App Móvil React Native          | `mobile/`           | APK/demo con ≥ 3 recursos nativos             | [x] |
| R06 | ≥ 3 recursos nativos            | Mobile              | Cámara + GPS + AsyncStorage demostrados       | [x] |
| R07 | IA integrada en móvil           | Mobile + MS2        | Demo foto → diagnóstico CNN en app            | [x] |
| R08 | GraphQL obligatorio             | MS1                 | Playground GraphQL accesible en MS1           | [ ] |
| R09 | Gestión documental + auditoría  | MS2                 | Demo upload → log en DynamoDB                 | [x] |
| R10 | Deep Learning (CNN)             | MS2                 | Endpoint `/ia/diagnostico` funcional          | [ ] |
| R11 | ML Supervisado (Random Forest)  | MS2                 | Endpoint `/ml/prediccion-vida-util` funcional | [ ] |
| R12 | ML No Supervisado (K-Means)     | MS2                 | Endpoint `/ml/clustering` funcional           | [ ] |
| R13 | Blockchain                      | MS1                 | Hash verificable en Etherscan Sepolia         | [ ] |
| R14 | N8N ≥ 3 pasos                   | MS3                 | Demo flujo WhatsApp → sistema → email         | [ ] |
| R15 | BD Relacional (PostgreSQL)      | MS1                 | MS1 conectado a PostgreSQL en Azure           | [ ] |
| R16 | BD NoSQL (DynamoDB)             | MS2                 | MS2 conectado a DynamoDB en AWS               | [ ] |
| R17 | Almacenamiento de archivos (S3) | MS2                 | Documentos almacenados y descargables         | [ ] |
| R18 | BI con dashboards               | MS1 + Frontend      | Dashboard con KPIs y gráficas funcionales     | [ ] |
| R19 | Despliegue 100% cloud           | Todos               | Sin servicios locales en producción           | [ ] |

---

## PARTE B — Tracker de Casos de Uso

### MS1 — Módulo 1: Gestión de Activos (CU-01 a CU-09)

- [x] CU-01: Registrar nuevo activo fijo → `registrarActivo` mutation en MS1
- [x] CU-02: Editar datos del activo → `actualizarActivo` mutation en MS1
- [x] CU-03: Consultar catálogo de activos → `activos(filtro)` query en MS1
- [x] CU-04: Buscar activo por código/nombre/categoría → campo `busqueda` en filtro
- [x] CU-05: Cambiar estado del activo → `cambiarEstadoActivo` mutation en MS1
- [x] CU-06: Registrar categoría de activo → `registrarCategoria` mutation en MS1
- [x] CU-07: Editar categoría de activo → `actualizarCategoria` mutation en MS1
- [x] CU-08: Consultar historial de movimientos → campos anidados en `activo(id)` query
- [x] CU-09: Ver ficha detallada con valor en libros → campo `valorLibros` calculado

### MS1 — Módulo 2: Asignaciones y Traslados (CU-10 a CU-17)

- [x] CU-10: Asignar activo a responsable → `asignarActivo` mutation + Blockchain
- [x] CU-11: Devolver activo al inventario → `devolverActivo` mutation
- [x] CU-12: Registrar traslado entre áreas → `registrarTraslado` mutation + Blockchain
- [x] CU-13: Confirmar recepción de traslado → `confirmarRecepcionTraslado` mutation
- [x] CU-14: Consultar activos asignados por área → `activosPorArea(areaId)` query
- [x] CU-15: Historial de asignaciones del activo → campo `asignaciones` en `activo(id)`
- [x] CU-16: Historial de traslados del activo → campo `traslados` en `activo(id)`
- [x] CU-17: Reporte activos por responsable → `activosPorResponsable(responsableId)` query

### MS1 — Módulo 3: Depreciación y Bajas (CU-18 a CU-25)

- [x] CU-18: Calcular depreciación → `DepreciacionService` en MS1 (LINEAL/ACELERADO/SUMA_DIGITOS)
- [x] CU-19: Reporte depreciación anual → `reporteDepreciacion(anio)` query en MS1
- [x] CU-20: Consultar valor en libros actual → campo calculado `valorLibros` en `Activo`
- [x] CU-21: Proyectar vida útil restante → campo calculado `vidaUtilRestanteAnios`
- [x] CU-22: Registrar baja de activo → `darDeBajaActivo` mutation + Blockchain
- [ ] CU-23: Autorizar baja → implementar como confirmación en frontend o segunda mutation
- [x] CU-24: Historial activos dados de baja → filtro `estado: DADO_DE_BAJA` en `activos(filtro)`
- [ ] CU-25: Generar acta de baja en PDF → jsPDF en frontend

### MS1 — Módulo 7: Gestión de Usuarios (CU-46 a CU-53)

- [x] CU-46: Registrar usuario → `registrarUsuario` mutation en MS1
- [x] CU-47: Editar datos de usuario → `actualizarUsuario` mutation
- [x] CU-48: Asignar/cambiar rol → `cambiarRolUsuario` mutation
- [x] CU-49: Inactivar usuario → `inactivarUsuario` mutation
- [x] CU-50: Restablecer contraseña → `restablecerPassword` mutation
- [x] CU-51: Registrar área → `registrarArea` mutation
- [x] CU-52: Asignar responsable a área → `asignarResponsableArea` mutation
- [x] CU-53: Buscar usuario → `usuarios(filtro)` query

### MS1 — Módulo 8: Business Intelligence (CU-54 a CU-60)

- [x] CU-54: Dashboard ejecutivo con KPIs → `dashboardBI` query (ya parcialmente implementado)
- [x] CU-55: Total activos y valor en libros → campo en `DashboardMetricasDTO`
- [x] CU-56: Depreciación acumulada por categoría → campo `depreciacionPorCategoria[]`
- [x] CU-57: Distribución por estado → campo `activosPorEstado[]` o similar
- [x] CU-58: Tendencia de adquisiciones por año → campo `adquisicionesPorAnio[]`
- [ ] CU-59: Proyección vida útil activos críticos → campo `activosCriticos[]`
- [ ] CU-60: Exportar reporte BI en PDF → jsPDF + html2canvas en frontend Angular

### MS1 — Módulo 11: Blockchain (CU-75 a CU-81)

- [x] CU-75: Blockchain al registrar activo → `BlockchainService` llamado en `registrarActivo`
- [x] CU-76: Blockchain al asignar activo → llamado en `asignarActivo`
- [x] CU-77: Blockchain al trasladar activo → llamado en `registrarTraslado`
- [x] CU-78: Blockchain al dar de baja → llamado en `darDeBajaActivo`
- [ ] CU-79: Blockchain al diagnóstico crítico → MS1 recibe webhook de MS3/MS2 y registra
- [x] CU-80: Consultar historial Blockchain → `historialBlockchain(activoId)` query
- [x] CU-81: Verificar integridad en Etherscan → link en frontend a `sepolia.etherscan.io`

### MS2 — Módulo 4: Gestión Documental (CU-26 a CU-33)

- [x] CU-26: Cargar documento → `POST /api/documentos/upload` + S3 + DynamoDB
- [x] CU-27: Descargar documento → `GET /api/documentos/{id}/url` (URL presignada S3)
- [x] CU-28: Actualizar versión → `PUT /api/documentos/{id}/version`
- [x] CU-29: Historial de versiones → `GET /api/documentos/{id}/versiones`
- [x] CU-30: Eliminar documento (soft delete) → `DELETE /api/documentos/{id}`
- [x] CU-31: Log de auditoría → `GET /api/documentos/{id}/auditoria`
- [x] CU-32: Buscar documentos por filtros → `GET /api/documentos?activoId=...&tipo=...`
- [x] CU-33: Listar documentos de activo → `GET /api/documentos?activoId={id}`

### MS2 — Módulo 5: Diagnóstico IA (CU-35, CU-36)

- [x] CU-35: Enviar imagen para diagnóstico → `POST /ia/diagnostico` en `ia_controller.py`
- [x] CU-36: Procesar con CNN → `DiagnosticoIAService` + `CNN_EstadoActivo` + guardar en DynamoDB

### MS2 — Módulo 9: Machine Learning (CU-61 a CU-66)

- [x] CU-61: Predicción vida útil (RF) → `GET /ml/prediccion-vida-util` en `ia_controller.py`
- [x] CU-62: Probabilidad de fallo (RF clasificación) → campo `riesgo_fallo` en respuesta RF
- [x] CU-63: Clustering K-Means → `GET /ml/clustering` en `ia_controller.py`
- [x] CU-64: Ver predicción en ficha del activo → integrado en frontend Angular y app móvil
- [x] CU-65: Recomendaciones de mantenimiento → campo `recomendaciones[]` en respuesta ML
- [x] CU-66: Visualizar clustering con etiquetas → componente en frontend Angular

### MS3 — Módulo 10: Automatización N8N (CU-67 a CU-74)

- [ ] CU-67: Recibir mensaje WhatsApp → `POST /whatsapp/webhook` en NestJS
- [ ] CU-68: Identificar activo en mensaje → Nodo N8N + MS1 GraphQL
- [ ] CU-69: Crear ticket de revisión → Nodo N8N + MS1 REST
- [ ] CU-70: Verificar documentación en MS2 → Nodo N8N + MS2 REST
- [ ] CU-71: Enviar email (SendGrid) → Nodo N8N SendGrid
- [ ] CU-72: Responder a WhatsApp → Nodo N8N + WhatsApp Business API
- [ ] CU-73: Alerta vencimiento de garantía → Flujo 2 N8N + webhook MS1
- [ ] CU-74: Alerta mantenimiento programado → Flujo 3 N8N + webhook MS1

### App Móvil — Módulos 5 y 6 (CU-34, CU-37 a CU-45)

- [x] CU-34: Fotografiar activo con cámara → `react-native-vision-camera` en `DiagnosticoIAScreen.tsx`
- [x] CU-37: Enviar imagen a MS2 y ver diagnóstico → `DiagnosticoIAScreen` + `ms2Service.ts` + `ResultadoDiagnosticoScreen`
- [x] CU-38: Historial de diagnósticos → `ms2Service.getHistorialDiagnosticos(activoId)` en `ActivoDetalleScreen`
- [x] CU-39: Solicitar orden de mantenimiento → modal en `ActivoDetalleScreen` + `ms1Service.solicitarMantenimiento()`
- [x] CU-40: Activos asignados en modo offline → `offlineCache.ts` (AsyncStorage) + `useOfflineActivos.ts`
- [x] CU-41: Ver detalle de activo en campo → `ActivoDetalleScreen.tsx` con carga fresca + fallback caché
- [x] CU-42: Geolocalizar activo con GPS → `useGPS.ts` (`react-native-geolocation-service`) + `MapaScreen.tsx` + mutation MS1
- [x] CU-43: Reportar problema vía WhatsApp → `Linking.openURL(whatsapp://...)` en `ActivoDetalleScreen.tsx`
- [x] CU-44: Recibir/consultar alertas push → `pushNotificationService.ts` registra token FCM, escucha foreground/background + `NotificacionesScreen`
- [x] CU-45: Sincronizar offline al reconectar → `useOfflineActivos.ts` con `NetInfo` + `offlineCache.loadPendingOps()`

---

## PARTE C — Checklist Técnico por Componente

### MS1 — Spring Boot

#### Entidades JPA

- [ ] `Activo` con todos los campos: código, nombre, descripción, fechaAdquisicion, valorAdquisicion, vidaUtilAnios, estado, latitud, longitud, categoría, areaActual, responsableActual
- [ ] `CategoriaActivo` con: nombre, descripción, metodoDepreciacion, tasaDepreciacion
- [ ] `Asignacion` con: activo, responsable, area, fechaAsignacion, fechaDevolucion, activa, observaciones
- [ ] `Traslado` con: activo, areaOrigen, areaDestino, fechaTraslado, motivoTraslado, recepcionConfirmada, autorizadoPor
- [ ] `Baja` con: activo, motivo, valorResidual, fechaBaja, autorizadoPor, observaciones
- [ ] `Area` con: codigo, nombre, descripcion, responsablePrincipal
- [ ] `Responsable` con: nombre, email, telefono, whatsapp, area
- [ ] `Usuario` con: username, email, password (BCrypt), rol, activo, fcmToken
- [ ] `RegistroBlockchain` con: activo, tipoTransaccion, payload, hash, bloqueId, timestamp, estado

#### GraphQL Schema (`schema.graphqls`)

- [ ] Tipos: `Activo`, `CategoriaActivo`, `Asignacion`, `Traslado`, `Baja`, `Area`, `Responsable`, `Usuario`, `RegistroBlockchain`
- [ ] Tipos DTO: `DashboardMetricasDTO`, `ReporteDepreciacionDTO`, `AuthPayload`
- [ ] Queries: `activos`, `activo`, `categorias`, `areas`, `responsables`, `usuarios`, `dashboardBI`, `reporteDepreciacion`, `historialBlockchain`, `activosPorArea`, `activosPorResponsable`
- [ ] Mutations: `registrarActivo`, `actualizarActivo`, `cambiarEstadoActivo`, `registrarCategoria`, `actualizarCategoria`, `asignarActivo`, `devolverActivo`, `registrarTraslado`, `confirmarRecepcionTraslado`, `darDeBajaActivo`, `registrarUsuario`, `actualizarUsuario`, `cambiarRolUsuario`, `inactivarUsuario`, `restablecerPassword`, `registrarArea`, `asignarResponsableArea`, `actualizarUbicacionActivo`
- [ ] Enums: `EstadoActivo`, `MetodoDepreciacion`, `RolUsuario`, `TipoTransaccionBlockchain`
- [ ] Input types: `ActivoInput`, `CategoriaActivoInput`, `AsignacionInput`, `FiltroActivoInput`, `UsuarioInput`

#### Services

- [ ] `ActivoService` — CRUD + cambios de estado + validación de transiciones
- [ ] `AsignacionService` — asignar, devolver
- [ ] `TrasladoService` — registrar, confirmar
- [ ] `BajaService` — registrar baja
- [ ] `CategoriaService` — CRUD
- [ ] `AreaService` — CRUD
- [ ] `ResponsableService` — CRUD
- [ ] `UsuarioService` — CRUD + password management
- [ ] `DepreciacionService` — LINEAL, ACELERADO, SUMA_DIGITOS + valor en libros
- [ ] `DashboardService` — métricas completas incluyendo tendencia y activos críticos
- [ ] `BlockchainService` — registrarTransaccion + manejo de errores/reintentos
- [ ] `ReporteService` — reporteDepreciacion, historialBlockchain

#### Resolvers

- [ ] `ActivoResolver` — todas las queries y mutations de activos
- [ ] `AsignacionResolver` — asignar, devolver, consultar
- [ ] `TrasladoResolver` — registrar, confirmar, consultar
- [ ] `BajaResolver` — registrar baja, consultar historial
- [ ] `CategoriaResolver` — CRUD
- [ ] `AreaResolver` — CRUD
- [ ] `UsuarioResolver` — CRUD + roles
- [ ] `ReporteResolver` — dashboardBI, reporteDepreciacion, historialBlockchain

#### Otros

- [ ] `AuthController` — endpoints REST `/auth/login`, `/auth/refresh`
- [ ] `SecurityConfig` — configuración Spring Security + JWT filter
- [ ] `JwtUtil` — generación y validación de tokens
- [ ] `DataInitializer` — datos de ejemplo para demo
- [ ] `application.yml` con datasource PostgreSQL y configuración GraphQL
- [ ] `docker-compose.yml` con MS1 + PostgreSQL

### MS2 — FastAPI

#### Proyecto base

- [ ] `main.py` con creación de la app FastAPI y registro de routers
- [ ] `requirements.txt` con: fastapi, uvicorn, boto3, pyjwt, python-multipart, tensorflow, scikit-learn, joblib, pandas, numpy, Pillow
- [ ] `config.py` con variables de entorno (boto3, JWT secret, MS3 URL)
- [ ] `Dockerfile` y `docker-compose.yml`

#### Adapters

- [ ] `s3_adapter.py` — upload_file, download_url, move_to_archive, delete
- [ ] `dynamodb_adapter.py` — put_item, get_item, query, update_item para las 3 tablas

#### Controllers + Services

- [ ] `documento_controller.py` + `documento_service.py` — upload, download URL, versión, eliminar, listar
- [ ] `auditoria_controller.py` + `auditoria_service.py` — registrar evento, consultar log
- [ ] `ia_controller.py` + `diagnostico_service.py` — recibir imagen, ejecutar CNN, guardar resultado
- [ ] `ml_controller.py` + `ml_service.py` — predicción RF, clustering KMeans

#### Modelos IA/ML

- [ ] `cnn_estado_activo.py` — clase CNN con `predecir(imagen_bytes)`, modelo `.h5`
- [ ] `rf_vida_util.py` — clase RF con `predecir(activo_data)`, modelo `.pkl`
- [ ] `kmeans_clustering.py` — clase KMeans con `predecir_todos(activos)`, modelo `.pkl`
- [ ] `scripts/train_cnn.py` — script de entrenamiento del modelo CNN (offline)
- [ ] `scripts/train_ml.py` — script de entrenamiento RF y KMeans (offline)
- [ ] Archivos de modelo guardados: `modelos/cnn_activo.h5`, `modelos/rf_vida_util.pkl`, `modelos/kmeans.pkl`

#### JWT Middleware

- [ ] `jwt_middleware.py` — verificar JWT emitido por MS1 (mismo secreto)
- [ ] Aplicar middleware a todos los endpoints que requieren autenticación

### MS3 — NestJS + N8N

#### Proyecto base

- [ ] `package.json` con: `@nestjs/core`, `@nestjs/common`, `axios`, `@sendgrid/mail`, crypto
- [ ] `app.module.ts` importando todos los módulos
- [ ] `Dockerfile` + `docker-compose.yml` (NestJS + N8N)

#### NestJS Endpoints

- [ ] `webhooks.controller.ts` — `POST /webhooks/vencimiento-garantia`, `POST /webhooks/mantenimiento-programado`, `POST /webhooks/diagnostico-critico`
- [ ] `whatsapp.controller.ts` — `GET /whatsapp/webhook` (verificación), `POST /whatsapp/webhook` (mensajes)
- [ ] `whatsapp.service.ts` — validar firma HMAC, enviar mensajes
- [ ] `notificaciones.service.ts` — email SendGrid, push FCM
- [ ] `ms1-client.service.ts` — método de autenticación como servicio + llamadas GraphQL
- [ ] `ms2-client.service.ts` — llamadas REST a MS2

#### N8N Workflows (JSON exportados)

- [ ] `flujo_01_solicitud_revision.json` — Flujo 1 (6 nodos): WhatsApp → identificar activo → crear ticket → verificar docs → email → responder WhatsApp
- [ ] `flujo_02_alerta_garantia.json` — Flujo 2 (5 nodos): Webhook MS1 → datos activo → docs → email → push
- [ ] `flujo_03_alerta_mantenimiento.json` — Flujo 3 (4 nodos): Webhook MS1 → datos activo → email → WhatsApp
- [ ] Variables de N8N configuradas: `MS1_URL`, `MS2_URL`, `SENDGRID_API_KEY`, `WHATSAPP_TOKEN`, `FCM_KEY`

### Frontend — Angular

#### Módulos/Páginas

- [ ] `login` — formulario de autenticación
- [ ] `activos` — catálogo con filtros, ficha de activo completa
- [ ] `asignaciones` — asignar, devolver, historial
- [ ] `traslados` — registrar, confirmar, historial
- [ ] `bajas` — registrar, autorizar, historial
- [ ] `categorias` — CRUD de categorías
- [ ] `areas` — CRUD de áreas y responsables
- [ ] `usuarios` — gestión de usuarios con roles
- [ ] `documentos` — upload, historial, versiones, log auditoría
- [ ] `diagnostico-ia` — visualizar resultados CNN desde MS2
- [ ] `ml-predicciones` — predicción RF y clustering KMeans
- [ ] `dashboard-bi` — KPIs, gráficas Chart.js, exportar PDF
- [ ] `blockchain` — historial de transacciones, link a Etherscan

#### Core

- [ ] `auth.service.ts` — login, logout, isAuthenticated() con validación JWT exp
- [ ] `auth.guard.ts` — proteger rutas privadas
- [ ] `activos-gql.service.ts` — todas las queries/mutations de MS1
- [ ] `ms2.service.ts` — llamadas REST a MS2 (documentos + IA + ML)
- [ ] `ms3.service.ts` — llamadas REST a MS3 si aplica (opcional)
- [ ] Apollo Client configurado con authLink y httpLink
- [ ] HTTP Interceptor para añadir token a requests a MS2/MS3

### App Móvil — React Native

#### Pantallas

- [x] `LoginScreen.tsx` — autenticación JWT contra MS1 con AsyncStorage
- [x] `ActivosScreen.tsx` — lista de activos asignados (offline-first), integra funcionalidad de HomeScreen
- [x] `ActivoDetalleScreen.tsx` — ficha completa con historial diagnósticos, GPS, WhatsApp y orden de mantenimiento
- [x] `DiagnosticoIAScreen.tsx` — captura de foto con `react-native-vision-camera` + envío a MS2 (CU-34, CU-35, CU-36, CU-37)
- [x] `ResultadoDiagnosticoScreen.tsx` — visualización del resultado CNN con confianza y recomendación
- [x] `MapaScreen.tsx` — mapa interactivo con `react-native-maps` + registro GPS (CU-42)
- [x] `NotificacionesScreen.tsx` — historial de alertas push desde MS3 (CU-44)

#### Hooks nativos

- [x] `useCamera.ts` — abstracción de `react-native-vision-camera` con permisos y captura
- [x] `useGPS.ts` — abstracción de `react-native-geolocation-service` con permisos
- [x] `useOfflineActivos.ts` — hook principal offline/online con `NetInfo` + sincronización automática (CU-40, CU-45)

#### Servicios

- [x] `ms1Service.ts` — queries/mutations GraphQL a MS1, login JWT, actualizarUbicacion, solicitarMantenimiento
- [x] `ms2Service.ts` — diagnóstico CNN e historial de diagnósticos para la app móvil
- [x] `ms3Service.ts` — reportarProblema, registrarTokenPush (FCM), getNotificaciones
- [x] `pushNotificationService.ts` — permisos, token FCM, refresh de token y listeners foreground/background
- [x] `offlineCache.ts` — AsyncStorage wrapper: activos, sesión, operaciones pendientes (CU-40, CU-45)

#### Navegación y configuración

- [x] `AppNavigator.tsx` — Stack Navigator + Bottom Tab Navigator (React Navigation)
- [x] `activo.types.ts` — tipos TypeScript para Activo, Usuario, DiagnosticoIA, Notificacion, RootStackParamList
- [x] `env.ts` — URLs configurables para MS1 GraphQL, MS2 REST y MS3 REST
- [x] `@react-native-firebase/messaging` — declarado en `package.json` para FCM (CU-44)
- [x] `android/app/build.gradle` + `google-services.json` — integración Android con Firebase/Google Services
- [x] `android/app/build/outputs/apk/debug/app-debug.apk` — APK demo generado para validación local

---

## PARTE D — Checklist de Integración

### Comunicación entre servicios

- [ ] MS1 expone GraphQL en `/graphql` accesible desde Angular y React Native
- [ ] MS1 expone REST en `/api/**` para MS3 (webhooks)
- [ ] MS2 expone REST en `/api/**` accesible desde Angular, React Native y N8N
- [ ] MS3 expone webhooks accesibles desde WhatsApp Business API y MS1
- [ ] JWT emitido por MS1 es válido en MS2 (mismo secreto compartido)
- [ ] FCM token del dispositivo guardado en MS1 (campo `fcmToken` en `Usuario`)

### CORS

- [ ] MS1: CORS habilitado para el dominio del frontend Angular y app móvil (o `*` en dev)
- [ ] MS2: CORS habilitado para Angular y React Native
- [ ] MS3: CORS habilitado para Angular

### Seguridad

- [ ] Todas las rutas de MS1 (excepto `/auth/login`) requieren JWT
- [ ] MS2 valida JWT en todos los endpoints (excepto el webhook de N8N con token de servicio)
- [ ] MS3 valida firma HMAC en el webhook de WhatsApp
- [ ] Contraseñas hasheadas con BCrypt
- [ ] Variables sensibles solo en variables de entorno (no en código)

---

## PARTE E — Checklist de Despliegue Cloud

### MS1 — Microsoft Azure

- [ ] Azure PostgreSQL Flexible Server creado
- [ ] Azure App Service (Java 21) configurado con las variables de entorno
- [ ] Imagen Docker de MS1 en Azure Container Registry
- [ ] Variables de entorno configuradas: `SPRING_DATASOURCE_URL`, `JWT_SECRET`, `BLOCKCHAIN_PRIVATE_KEY`

### MS2 — Amazon AWS

- [ ] AWS S3 bucket creado: `activos-fijos-docs-prod`
- [ ] DynamoDB tablas creadas: `documentos`, `auditoria`, `diagnosticos_ia`
- [ ] AWS ECR con imagen Docker de MS2
- [ ] AWS ECS (Fargate) o App Runner con la imagen de MS2
- [ ] IAM Role con permisos de S3 y DynamoDB para el contenedor
- [ ] Variables de entorno: `AWS_REGION`, `S3_BUCKET`, `DYNAMODB_*`, `JWT_SECRET`

### MS3 — Google Cloud Platform

- [ ] Google Cloud Run con imagen Docker de MS3 (NestJS)
- [ ] Cloud Run o VM para N8N con datos persistentes (Cloud SQL o bucket para sqlite)
- [ ] Variables de entorno: `MS1_URL`, `MS2_URL`, `WHATSAPP_*`, `SENDGRID_API_KEY`, `FCM_*`
- [ ] Firebase proyecto creado para FCM

### Frontend — Angular

- [ ] `environment.prod.ts` con URLs reales de los 3 microservicios
- [ ] `ng build --configuration production`
- [ ] Desplegado en: Azure Static Web Apps / Firebase Hosting / Vercel
- [ ] HTTPS configurado

### App Móvil — React Native

- [ ] `app.config.ts` con URLs de producción
- [ ] APK generado con `eas build --profile production`
- [ ] APK compartible para demo en el examen

---

## PARTE F — Preparación para el Examen

### Demo Script (guión de demostración)

**Bloque 1 — MS1 + Frontend (10 min)**

1. [ ] Login como ADMINISTRADOR
2. [ ] Registrar un nuevo activo (categoría: Equipos Informáticos, área: Sistemas)
3. [ ] Mostrar que se generó el hash en Etherscan (CU-75, R13)
4. [ ] Asignar el activo a un responsable (CU-10)
5. [ ] Registrar traslado y confirmarlo (CU-12, CU-13)
6. [ ] Ver dashboard BI con KPIs y gráficas (CU-54, R18)
7. [ ] Mostrar reporte de depreciación (CU-19)

**Bloque 2 — MS2 Gestión Documental (5 min)** 8. [ ] Subir un PDF (factura) al activo creado (CU-26, R09, R17) 9. [ ] Mostrar URL presignada de descarga desde S3 (CU-27) 10. [ ] Mostrar log de auditoría en DynamoDB (CU-31, R16)

**Bloque 3 — MS2 IA y ML (5 min)** 11. [ ] Enviar imagen al endpoint CNN y mostrar diagnóstico (CU-35, CU-36, R10) 12. [ ] Mostrar predicción Random Forest de vida útil (CU-61, R11) 13. [ ] Mostrar clustering K-Means con grupos etiquetados (CU-63, R12)

**Bloque 4 — App Móvil (5 min)** 14. [ ] Abrir app, mostrar lista de activos en modo offline (CU-40, R06) 15. [ ] Fotografiar activo con cámara y enviar a diagnóstico CNN (CU-34, R06, R07) 16. [ ] Registrar ubicación GPS del activo (CU-42, R06) 17. [ ] Mostrar notificación push recibida (CU-44)

**Bloque 5 — MS3 Automatización (5 min)** 18. [ ] Enviar mensaje de WhatsApp con código de activo (CU-67) 19. [ ] Mostrar en N8N que el flujo se ejecutó (6 pasos) (R14) 20. [ ] Mostrar el email recibido en SendGrid (CU-71) 21. [ ] Mostrar respuesta de WhatsApp recibida (CU-72)

**Bloque 6 — Arquitectura y Nube (5 min)** 22. [ ] Mostrar URLs de producción de los 3 microservicios (R01, R02) 23. [ ] Mostrar panel de Azure con MS1 corriendo 24. [ ] Mostrar panel de AWS con S3 y DynamoDB 25. [ ] Mostrar panel de GCP con Cloud Run o N8N corriendo
