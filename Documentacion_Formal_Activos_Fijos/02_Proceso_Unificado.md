# 2. Proceso de Desarrollo Utilizado

## 2.1 Marco Metodologico

El proyecto se desarrollo bajo el **Proceso Unificado de Desarrollo de Software**. Este proceso es adecuado para sistemas empresariales distribuidos porque proporciona disciplina metodologica, trazabilidad entre requisitos y pruebas, modelado formal mediante UML, arquitectura temprana y construccion incremental.

El Proceso Unificado se sustenta en tres principios:

1. **Dirigido por casos de uso:** los requisitos funcionales se capturan como objetivos observables de los actores y guian analisis, diseno, implementacion y pruebas.
2. **Centrado en la arquitectura:** las decisiones estructurales se establecen tempranamente para mitigar riesgos de integracion, despliegue, seguridad, persistencia y rendimiento.
3. **Iterativo e incremental:** el producto se construye mediante incrementos ejecutables, cada uno con alcance, riesgos, pruebas y evaluacion.

## 2.2 Fases del Ciclo de Vida

| Fase | Objetivo | Hito |
| --- | --- | --- |
| Inicio | Definir vision, alcance, actores, casos de uso principales, riesgos y arquitectura candidata. | Objetivos del ciclo de vida (LCO) |
| Elaboracion | Estabilizar requisitos criticos, establecer linea base arquitectonica y resolver riesgos significativos. | Arquitectura del ciclo de vida (LCA) |
| Construccion | Implementar incrementalmente la funcionalidad completa, integrar componentes y ejecutar pruebas. | Capacidad operativa inicial (IOC) |
| Transicion | Llevar el producto a usuarios, estabilizar produccion, documentar uso y preparar soporte. | Liberacion del producto (PR) |

## 2.3 Flujos de Trabajo Aplicados

### Captura de Requisitos

Se identificaron actores, modulos, casos de uso, precondiciones, flujos principales, alternativas, excepciones y requisitos especiales. Los casos de uso se organizaron por dominios funcionales: activos, asignaciones, traslados, depreciacion, documentos, IA, trabajo de campo, usuarios, BI, ML, automatizacion, blockchain y despliegue.

### Analisis

El analisis separo responsabilidades conceptuales mediante clases de frontera, control y entidad. Las entidades principales fueron Activo, CategoriaActivo, Asignacion, Traslado, Baja, Area, Responsable, Usuario, Incidencia, Documento, AuditoriaDocumento, DiagnosticoIA y RegistroBlockchain.

### Diseno

El diseno transformo el analisis en componentes implementables. Se definieron capas por microservicio:

- Controladores o resolvers para contratos de entrada.
- Servicios para reglas de negocio.
- Repositorios o adaptadores para persistencia e infraestructura.
- Clientes HTTP y webhooks para integracion entre servicios.
- Componentes UI y servicios frontend/movil para interaccion de usuario.

### Implementacion

La implementacion se realizo por incrementos, manteniendo separacion por microservicios. MS1 se implemento con Spring Boot, GraphQL, JPA, seguridad JWT, PostgreSQL y Web3j. MS2 se implemento con FastAPI, S3, DynamoDB, TensorFlow y scikit-learn. MS3 se implemento con NestJS, controladores de webhooks, WhatsApp, notificaciones y clientes hacia MS1/MS2/MS4. MS4 contiene workflows N8N versionados.

### Pruebas

La verificacion incluyo pruebas unitarias, pruebas de servicios, pruebas de frontend, pruebas moviles, validacion de endpoints productivos y recorridos funcionales no destructivos en produccion. La estrategia priorizo trazabilidad entre casos de uso y casos de prueba, verificando tanto flujos principales como restricciones tecnicas criticas.

## 2.4 Roles del Proceso

| Rol metodologico | Responsabilidad aplicada |
| --- | --- |
| Analista del sistema | Identificacion de actores, casos de uso, reglas de negocio y restricciones. |
| Arquitecto de software | Definicion de microservicios, integraciones, persistencia, despliegue multi-cloud y seguridad. |
| Ingeniero de casos de uso | Especificacion de flujos y realizaciones para funcionalidades clave. |
| Ingeniero de componentes | Implementacion de servicios, controladores, modelos, adaptadores y componentes UI. |
| Integrador del sistema | Conexion entre microservicios, frontend, movil, workflows, servicios externos y CI/CD. |
| Ingeniero de pruebas | Diseno y ejecucion de pruebas unitarias, integracion, sistema y aceptacion. |

## 2.5 Artefactos Generados

| Artefacto | Contenido |
| --- | --- |
| Vision del producto | Alcance empresarial, restricciones obligatorias y objetivos de calidad. |
| Modelo de casos de uso | Actores, modulos y catalogo de casos de uso. |
| Modelo de dominio | Entidades principales y relaciones del negocio. |
| Modelo de analisis | Clases boundary/control/entity y realizacion de casos de uso clave. |
| Modelo de diseno | Paquetes, componentes, clases de diseno, interfaces y decisiones tecnologicas. |
| Modelo de datos | Estructuras relacionales y NoSQL. |
| Modelo de despliegue | Nodos cloud, protocolos y asignacion de componentes. |
| Modelo de pruebas | Estrategia, niveles, casos de prueba y evidencias. |
| Manuales y recursos | Manual de uso, enlaces de instalacion, recursos QR y soporte contextual. |

## 2.6 Aplicacion por Fases al Sistema

### Inicio

En esta fase se delimito el sistema como plataforma distribuida de gestion de activos fijos. Se identificaron los actores principales, se definio el alcance multi-cloud, se seleccionaron tecnologias obligatorias y se establecio una arquitectura candidata de cuatro microservicios. Los riesgos iniciales fueron integracion multi-cloud, interoperabilidad GraphQL/REST, uso de IA sobre imagenes, seguridad de documentos, exposicion de N8N y despliegue movil.

### Elaboracion

La elaboracion consolido la linea base arquitectonica. Se definieron contratos GraphQL y REST, entidades persistentes, seguridad JWT, modelos de IA/ML, adaptadores cloud, estrategia de auditoria documental, reglas blockchain, workflows N8N y despliegue por proveedor. En esta fase se resolvieron los riesgos mas relevantes mediante prototipos ejecutables y pruebas de comunicacion.

### Construccion

La construccion produjo incrementos funcionales por microservicio y por modulo. Se completaron las funcionalidades empresariales de MS1, gestion documental e IA/ML en MS2, aplicacion movil de campo, frontend Angular, automatizacion con MS3/MS4 y pipelines CI/CD. Cada incremento integro pruebas automatizadas y validaciones sobre datos reales o controlados.

### Transicion

La transicion llevo el producto a produccion mediante despliegues en Vercel, Azure, AWS, Google Cloud y Azure para N8N. Se ejecutaron pruebas en entorno productivo, se documentaron hallazgos, se prepararon enlaces de acceso, se genero instalacion movil por releases y se formalizaron recursos de aprendizaje.

## 2.7 Trazabilidad Metodologica

La trazabilidad se establece mediante la siguiente cadena:

**Actor -> Caso de uso -> Entidad o servicio -> Componente implementado -> Endpoint/API -> Caso de prueba -> Evidencia de despliegue**

Ejemplo representativo:

| Elemento | Trazabilidad |
| --- | --- |
| Actor | Responsable de Area |
| Caso de uso | Fotografiar activo y solicitar diagnostico IA |
| Entidades | Activo, DiagnosticoIA, Documento, Auditoria |
| Componentes | App movil, MS2 IAController, DiagnosticoIAService, S3Adapter, DynamoDBAdapter |
| Endpoint | POST `/api/ia/diagnostico` |
| Prueba | Validacion mobile, pruebas MS2 y endpoints productivos |
| Evidencia | Permiso de camara, captura temporal, respuesta MS2 y almacenamiento auditable |

