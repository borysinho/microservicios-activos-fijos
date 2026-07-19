# 3. Registro y Evidencia del Proceso en la Practica

## 3.1 Estado General del Producto

El sistema se presenta como producto integrado con frontend web productivo, servicios backend desplegados, aplicacion movil instalable, workflows N8N versionados, pruebas automatizadas y evidencias de ejecucion en produccion.

| Componente | Estado de producto | Evidencia principal |
| --- | --- | --- |
| Frontend Angular | Desplegado en Vercel | Navegacion productiva autenticada, consultas MS1/MS2/MS3 exitosas |
| MS1 Spring Boot | Desplegado en Azure | GraphQL, Auth, gestion de activos, BI y blockchain |
| MS2 FastAPI | Desplegado en AWS | REST documental, IA, ML, S3 y DynamoDB |
| MS3 NestJS | Desplegado en Google Cloud Run | Notificaciones, webhooks, coordinacion MS4 |
| MS4 N8N | Desplegado en Azure | Tres workflows exportados y versionados |
| App movil React Native | Build Android disponible | Camara, GPS, almacenamiento offline y notificaciones |

## 3.2 Plan de Iteraciones

| Iteracion | Alcance | Casos de uso cubiertos | Resultado |
| --- | --- | --- | --- |
| IT-C1 | MS1 completo y frontend de gestion empresarial | CU-01 a CU-25, CU-46 a CU-60, CU-75 a CU-81 | Gestion de activos, usuarios, depreciacion, BI y blockchain operativos |
| IT-C2 | MS2 documental y frontend de documentos | CU-26 a CU-33 | Carga, versionamiento, busqueda, auditoria y acceso documental |
| IT-C3 | MS2 IA/ML y vistas analiticas | CU-35, CU-36, CU-61 a CU-66 | Diagnostico visual, Random Forest, K-Means y recomendaciones |
| IT-C4 | Aplicacion movil de campo | CU-34, CU-37 a CU-45 | Camara, GPS, offline, sincronizacion y notificaciones |
| IT-C5 | Automatizacion e integracion total | CU-67 a CU-74 | Flujos WhatsApp, garantia y mantenimiento mediante MS3/MS4 |

## 3.3 Catalogo Funcional por Modulo

| Modulo | Funcionalidad |
| --- | --- |
| Gestion de activos | Registro, edicion, consulta, busqueda, ficha de activo y cambio de estado controlado. |
| Asignaciones y traslados | Asignacion a responsables, devolucion, traslado entre areas, autorizacion e historial. |
| Depreciacion y bajas | Calculo lineal, acelerado y suma de digitos; reportes; actas y baja definitiva. |
| Gestion documental | Upload, descarga con URL presignada, versionamiento, baja logica y auditoria. |
| Diagnostico por IA | Captura de imagen, validacion visual, confianza, historial y alerta operativa. |
| Trabajo de campo movil | Activos asignados offline, detalle en campo, GPS, WhatsApp y sincronizacion. |
| Usuarios y roles | Administracion de usuarios, areas, responsables y permisos por rol. |
| Inteligencia de negocio | KPIs, graficas, distribucion de estados, depreciacion y reportes. |
| Machine Learning | Prediccion de vida util, riesgo de fallo, clustering y recomendaciones. |
| Automatizacion | Solicitudes por WhatsApp, email, push, garantia y mantenimiento programado. |
| Blockchain y auditoria | Hashes de transacciones, trazabilidad historica y verificacion de integridad. |

## 3.4 Actores del Sistema

| Actor | Responsabilidad |
| --- | --- |
| Administrador | Gestion integral de activos, categorias, responsables, usuarios, depreciacion, bajas, reportes y configuracion. |
| Responsable de Area | Trabajo de campo, consulta de activos asignados, fotografia, GPS, reporte de incidencias y seguimiento. |
| Auditor | Consulta de movimientos, documentos, auditoria y registros blockchain sin modificar informacion sensible. |
| Solo Lectura | Visualizacion limitada del catalogo y registros autorizados. |
| Servicios externos | WhatsApp Business API, SendGrid, FCM, Ethereum Sepolia y servicios cloud administrados. |

## 3.5 Evidencia de Implementacion

### MS1 Gestion de Activos

MS1 contiene entidades JPA para Activo, CategoriaActivo, Asignacion, Traslado, Baja, Area, Responsable, Usuario, Incidencia y RegistroBlockchain. La capa GraphQL expone resolvers para activos, asignaciones, traslados, bajas, catalogos, reportes e incidencias. La capa de servicios implementa depreciacion, dashboard, blockchain, traslados, asignaciones y bajas. La infraestructura integra PostgreSQL, Web3j y webhooks hacia MS3.

### MS2 Documentos e IA

MS2 contiene controladores para documentos, auditoria e IA. Sus servicios gestionan S3, DynamoDB, diagnostico visual y modelos ML. Los modelos incluyen CNN para estado visual, Random Forest para vida util y K-Means para agrupacion de activos. La seguridad se apoya en JWT emitido por MS1.

### MS3 Automatizacion

MS3 contiene modulos de webhooks, WhatsApp, notificaciones, clientes MS1/MS2, flujos y health checks. Su responsabilidad es coordinar eventos y proteger la regla arquitectonica de que MS4 solo sea invocado por MS3.

### MS4 N8N

MS4 contiene tres workflows versionados:

- Solicitud de revision por WhatsApp.
- Alerta por vencimiento de garantia.
- Alerta de mantenimiento programado.

Cada flujo supera el minimo de tres pasos, integra servicios internos y produce notificaciones externas.

### Frontend Angular

El frontend contiene rutas para login, dashboard, activos, incidencias, asignaciones, traslados, bajas, depreciacion, documentos, auditoria, machine learning, blockchain, categorias, areas y usuarios. Consume MS1 por GraphQL y MS2/MS3 por REST, sin invocar directamente a MS4.

### Aplicacion Movil React Native

La aplicacion movil contiene pantallas de login, activos, detalle, diagnostico IA, resultado, mapa, incidencias, herramientas y notificaciones. Integra camara, GPS, almacenamiento offline, deteccion de red y mensajeria push.

## 3.6 Evidencia de Pruebas

| Ambito | Resultado |
| --- | --- |
| Frontend local | 10 pruebas automatizadas y build Angular correctos. |
| Frontend produccion | Login productivo, navegacion principal y consultas a MS1/MS2/MS3 con respuestas exitosas. |
| MS1 | Pruebas de servicios para activos, asignaciones, bajas, dashboard, depreciacion y traslados. |
| MS2 | Pruebas de controladores, servicios documentales, auditoria, diagnostico IA, ML y wrappers de modelos. |
| MS3 | Pruebas de configuracion, flujos, contratos N8N, webhooks, WhatsApp y notificaciones. |
| Movil | 6 suites y 16 tests correctos; permisos nativos y cache offline verificados en dispositivo Android. |

## 3.7 Hallazgos Controlados

Durante validaciones productivas se registraron hallazgos no bloqueantes que deben atenderse en mantenimiento:

- Alinear credenciales demostrativas de administrador.
- Revisar validacion visual de integridad blockchain para registros semilla.
- Mostrar valor numerico de tasa de depreciacion en categorias.
- Confirmar exportacion PDF del dashboard en navegador real.
- Mejorar frescura visible de cache offline movil.
- Documentar alias de health checks de MS2/MS3 o exponer `/api/health`.

## 3.8 Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigacion aplicada |
| --- | --- | --- |
| Exposicion directa de N8N | Alto | MS4 solo es consumido por MS3; clientes no acceden a N8N. |
| Inconsistencia entre datos offline y produccion | Medio | Cache local, sincronizacion y recomendacion de timestamp visible. |
| Fallo de integracion multi-cloud | Alto | Health checks, CI/CD independiente y endpoints productivos verificados. |
| Seguridad documental | Alto | S3 con URL presignada, DynamoDB para auditoria y JWT compartido. |
| IA no concluyente por calidad de imagen | Medio | Resultado conservador, confianza, reglas de calidad y revision humana. |
| Blockchain con datos semilla no verificables visualmente | Medio | Revision de algoritmo de hash y separacion entre trazabilidad cargada y validacion criptografica. |

## 3.9 Modelado UML 2.5

Los diagramas fueron especificados en PlantUML y cubren las vistas recomendadas para el Proceso Unificado:

- Casos de uso general.
- Dominio empresarial.
- Clases de analisis.
- Componentes.
- Despliegue cloud.
- Secuencia de registro de activo.
- Secuencia de diagnostico IA movil.
- Estados del activo.
- Actividad del flujo WhatsApp a email.

