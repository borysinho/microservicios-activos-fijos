# Presentación de Proyecto — Sistema de Gestión de Activos Fijos

**Materia**: Ingeniería de Software II  
**Metodología**: Proceso Unificado  
**Fecha de presentación**: Junio 2026

---

## 1. Tema del Proyecto

### Sistema de Gestión de Activos Fijos

El proyecto consiste en el desarrollo de una **plataforma distribuida para la gestión integral de activos fijos** de una organización. El sistema permite registrar, asignar, trasladar, depreciar y dar de baja bienes físicos, integrando inteligencia artificial para el diagnóstico del estado de los activos, gestión documental con auditoría completa, automatización de procesos operativos y analítica de negocios.

La plataforma está compuesta por **tres microservicios independientes** desplegados en distintos proveedores de nube, un frontend web desarrollado en Angular y una aplicación móvil en React Native orientada al trabajo de campo.

El dominio de aplicación es un sistema de gestión empresarial para el seguimiento del ciclo de vida completo de activos físicos: desde su adquisición hasta su baja, pasando por asignaciones, traslados, mantenimientos y depreciación contable.

El diagrama a continuación presenta la visión arquitectónica general del sistema, mostrando los actores principales, los contenedores que conforman la plataforma y las integraciones con sistemas externos:

![Diagrama de Contenedores — Sistema de Activos Fijos](diagramas/System%20Context%20Diagram.png)

_Figura 1. Diagrama de Contenedores (C4 Nivel 2) — Sistema de Gestión de Activos Fijos. Se ilustran los dos perfiles de usuario (Administrador/Auditor y Responsable de Área), los clientes web y móvil, los tres microservicios desplegados en distintos proveedores de nube (MS1 en Azure, MS2 en AWS, MS3 en Google Cloud) con sus respectivas bases de datos, y los sistemas externos integrados (Red Blockchain, WhatsApp API y SendGrid)._

---

## 2. Aplicación de los Requisitos Solicitados

A continuación se detalla de forma precisa en qué componente del sistema se implementa cada uno de los requisitos técnicos establecidos para el proyecto.

### 2.1 Arquitectura de Microservicios (mínimo tres)

El sistema se compone de exactamente tres microservicios con responsabilidades bien delimitadas:

| Microservicio | Responsabilidad principal                                                                  |
| ------------- | ------------------------------------------------------------------------------------------ |
| **MS1**       | Gestión de activos fijos, depreciación, asignaciones, Business Intelligence y blockchain   |
| **MS2**       | Gestión documental, auditoría e inteligencia artificial (Deep Learning y Machine Learning) |
| **MS3**       | Automatización de flujos y notificaciones mediante N8N                                     |

Cada microservicio opera de forma independiente y se comunica con los demás a través de APIs REST y webhooks.

### 2.2 Proveedores de Nube Distintos

Cada microservicio se despliega en un proveedor de nube diferente:

| Microservicio | Proveedor             | Servicio de despliegue |
| ------------- | --------------------- | ---------------------- |
| MS1           | Microsoft Azure       | Azure App Service      |
| MS2           | Amazon Web Services   | AWS Lambda / ECS       |
| MS3           | Google Cloud Platform | Cloud Run              |

Ningún componente se ejecuta en infraestructura local; el despliegue es completamente en la nube.

### 2.3 Lenguajes de Programación Distintos por Microservicio

Cada microservicio utiliza un lenguaje y framework de backend diferente:

| Microservicio | Lenguaje             | Framework   |
| ------------- | -------------------- | ----------- |
| MS1           | Java                 | Spring Boot |
| MS2           | Python               | FastAPI     |
| MS3           | TypeScript (Node.js) | NestJS      |

### 2.4 Frontend Web en Angular

Se desarrolla una **interfaz web única** en Angular que consume los tres microservicios. La comunicación con MS1 se realiza exclusivamente mediante GraphQL; con MS2 y MS3 se utiliza REST.

### 2.5 Aplicación Móvil en React Native

La aplicación móvil está orientada al trabajo de campo de los responsables de área. No es una réplica de la interfaz web; cuenta con funcionalidades propias que aprovechan los recursos del dispositivo.

**Recursos del dispositivo utilizados:**

| Recurso                  | Aplicación en el sistema                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| **Cámara**               | Fotografiar activos para diagnóstico automático de estado mediante IA   |
| **GPS**                  | Geolocalizar activos físicamente y registrar ubicación en inspecciones  |
| **Almacenamiento local** | Caché offline de activos asignados para trabajo sin conexión a internet |

**Integración de IA en la app móvil:** la aplicación permite tomar una fotografía de un activo y recibir en tiempo real un diagnóstico generado por un modelo de redes neuronales convolucionales (CNN), indicando el estado físico del activo (bueno, deteriorado o requiere mantenimiento), junto con el nivel de confianza de la predicción y una recomendación automática.

### 2.6 Módulo de Gestión Empresarial con GraphQL

El **MS1** constituye el módulo de gestión empresarial del sistema. Incluye interfaces, procesos, reportes y persistencia de datos. La comunicación entre el frontend Angular y este módulo se realiza **exclusivamente mediante GraphQL**, a través de un único endpoint que permite consultar y mutar datos de activos, asignaciones, traslados, bajas y reportes.

### 2.7 Gestión Documental con Auditoría

Implementada en el **MS2**. Cada activo puede tener documentos asociados (facturas, contratos de garantía, fotografías de estado, informes de mantenimiento, actas de baja). El módulo registra de forma automática:

- Quién visualizó, modificó, descargó o eliminó cada documento
- La dirección IP desde la que se realizó la acción
- La versión anterior del documento en caso de modificación
- La marca de tiempo exacta de cada acceso

### 2.8 Deep Learning — Procesamiento de Imágenes

Implementado en el **MS2** mediante un modelo de **Red Neuronal Convolucional (CNN)**. El modelo recibe la fotografía de un activo tomada desde la app móvil o cargada desde el frontend y clasifica su estado físico como: bueno, deteriorado, requiere mantenimiento u oxidado, devolviendo además el nivel de confianza de la clasificación.

### 2.9 Machine Learning — Supervisado y No Supervisado

Ambos modelos residen en el **MS2** y son accesibles desde el frontend web:

- **Aprendizaje Supervisado — Random Forest**: predice la vida útil restante de un activo en meses, a partir de su edad, número de mantenimientos, resultados históricos de diagnósticos y categoría. Devuelve también la probabilidad de fallo en el corto plazo.
- **Aprendizaje No Supervisado — K-Means**: agrupa el inventario de activos por patrones de comportamiento (alta tasa de mantenimiento, comportamiento anómalo, rendimiento eficiente), permitiendo optimizar el presupuesto de mantenimiento preventivo.

### 2.10 Business Intelligence

Implementado en el **MS1**. El frontend Angular consume un endpoint GraphQL (`dashboardBI`) que provee indicadores clave, gráficas de depreciación acumulada por categoría, distribución del inventario por estado, proyección de vida útil y tendencia de adquisiciones por año.

### 2.11 Blockchain — Registro Inmutable

Implementado en el **MS1** mediante el adaptador **Web3j** conectado a una red blockchain (Hyperledger / Ethereum). Cada operación crítica sobre un activo genera un registro inmutable con su hash de transacción y número de bloque, permitiendo verificación externa en cualquier momento. Los eventos registrados son: adquisición, asignación, traslado, baja y diagnóstico crítico.

### 2.12 Automatización — N8N (mínimo tres pasos)

Implementada en el **MS3** mediante la herramienta N8N. El flujo principal consta de los siguientes pasos:

1. El **MS1 detecta** un evento (por ejemplo, garantía próxima a vencer) y dispara un webhook hacia el MS3.
2. El **N8N consulta al MS2** si la documentación del activo está completa.
3. Se **genera una orden de revisión** en el MS1.
4. Se **envía un correo electrónico** al responsable del activo mediante SendGrid.
5. Se **envía una notificación push** a la aplicación móvil del responsable.

### 2.13 Bases de Datos — Relacional y NoSQL

| Motor          | Microservicio | Uso                                                      |
| -------------- | ------------- | -------------------------------------------------------- |
| **PostgreSQL** | MS1           | Activos, asignaciones, traslados, depreciación, usuarios |
| **DynamoDB**   | MS2           | Metadatos de documentos y registros de auditoría         |

### 2.14 Almacenamiento de Archivos — Amazon S3

El **MS2** utiliza Amazon S3 para almacenar todos los archivos físicos (PDF, imágenes, contratos, facturas). DynamoDB almacena únicamente los metadatos y las URLs de acceso, reduciendo costos y mejorando los tiempos de acceso.

### 2.15 Despliegue 100% en la Nube

El sistema no tiene componentes de ejecución local. Los tres microservicios están desplegados en Azure, AWS y Google Cloud respectivamente. El frontend se sirve desde CDN y la app móvil se distribuye a través de las tiendas de aplicaciones.

### 2.16 Metodología de Desarrollo

Se utiliza el **Proceso Unificado**, con sus fases de inicio, elaboración, construcción y transición, adaptadas al desarrollo incremental de los tres microservicios.

### 2.17 Modelado

| Enfoque       | Aplicación                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **Modelo C4** | Diagramas de contexto y contenedores para modelar la arquitectura del sistema                             |
| **UML**       | Diagramas de clases, componentes, casos de uso, secuencia, actividad y estados para el resto del modelado |

---

## 3. Funcionalidades del Sistema

### 3.1 MS1 — Gestión de Activos Fijos (Java / Spring Boot / Azure)

- **Registro y catalogación de activos**: alta de nuevos activos con código único, categoría, valor de adquisición, vida útil estimada y área de destino inicial.
- **Asignación de activos**: vinculación de un activo a un responsable de área con registro de fecha y observaciones.
- **Registro de traslados**: cambio de área de un activo con identificación del autorizador y motivo del traslado.
- **Cálculo automático de depreciación**: cálculo periódico según el método configurado por categoría (lineal, acelerado, suma de dígitos).
- **Baja de activos**: registro definitivo de activos fuera de uso, con motivo, valor residual y autorizador.
- **Gestión de usuarios y roles**: administración de accesos con roles (Administrador, Responsable de Área, Auditor, Solo Lectura).
- **Dashboard de Business Intelligence**: indicadores en tiempo real sobre el inventario, depreciación y proyecciones.
- **Registro blockchain**: generación automática de registro inmutable en cada transacción crítica.

### 3.2 MS2 — Gestión Documental e Inteligencia Artificial (Python / FastAPI / AWS)

- **Subida y descarga de documentos**: soporte para PDF, imágenes, archivos Word, Excel y contratos.
- **Versionado de documentos**: historial completo de versiones por documento con posibilidad de restauración.
- **Auditoría de accesos**: log inmutable de cada visualización, modificación, descarga o eliminación de documentos.
- **Diagnóstico de activos por imagen (Deep Learning)**: clasificación del estado físico de un activo a partir de una fotografía mediante CNN.
- **Predicción de vida útil (Machine Learning supervisado)**: estimación de meses restantes y probabilidad de fallo mediante Random Forest.
- **Agrupación por comportamiento (Machine Learning no supervisado)**: clustering de activos mediante K-Means para identificar patrones de mantenimiento y anomalías.

### 3.3 MS3 — Automatización y Notificaciones (NestJS / Google Cloud)

- **Orquestación de flujos con N8N**: diseño y ejecución de flujos automatizados de múltiples pasos sin intervención manual.
- **Recepción de solicitudes por WhatsApp**: integración con WhatsApp Business API para recibir reportes de campo desde responsables de área.
- **Generación automática de órdenes de revisión o mantenimiento**: creación de tickets en el sistema a partir de eventos detectados.
- **Notificaciones por correo electrónico**: envío automático de alertas mediante SendGrid.
- **Alertas por vencimiento**: detección y notificación anticipada de vencimientos de garantías y mantenimientos programados.

### 3.4 Frontend Web — Angular

- Módulo de gestión de activos (registrar, asignar, trasladar, dar de baja).
- Módulo de gestión documental (subir, visualizar, descargar, auditar).
- Dashboard de Business Intelligence con gráficas interactivas.
- Módulo de auditoría y trazabilidad blockchain.
- Módulo de resultados de Machine Learning (predicciones y clustering).
- Configuración de usuarios, roles y áreas.

### 3.5 Aplicación Móvil — React Native

- Consulta de activos asignados al usuario autenticado.
- Fotografiar un activo y recibir diagnóstico IA en tiempo real.
- Geolocalización del activo en mapa.
- Reporte de problemas o solicitud de revisión vía WhatsApp o formulario.
- Recepción de notificaciones y alertas.
- Modo offline con caché local de activos asignados.

---

## 4. Herramientas y Tecnologías

### 4.1 Lenguajes y Frameworks de Backend

| Componente | Lenguaje             | Framework / Entorno | Versión referencial |
| ---------- | -------------------- | ------------------- | ------------------- |
| MS1        | Java                 | Spring Boot         | 4.x                 |
| MS2        | Python               | FastAPI             | 0.130+              |
| MS3        | TypeScript (Node.js) | NestJS              | 11.x                |

### 4.2 Frontend y Móvil

| Componente       | Tecnología   | Versión referencial | Justificación                                                    |
| ---------------- | ------------ | ------------------- | ---------------------------------------------------------------- |
| Frontend web     | Angular      | 21.x                | Requisito obligatorio de la cátedra                              |
| Aplicación móvil | React Native | 0.85.x              | Requisito obligatorio; acceso a recursos nativos del dispositivo |

### 4.3 Comunicación entre Servicios

| Protocolo | Uso                                         |
| --------- | ------------------------------------------- |
| GraphQL   | Comunicación exclusiva entre frontend y MS1 |
| REST      | Comunicación entre frontend y MS2 / MS3     |
| Webhooks  | Notificación de eventos de MS1 hacia MS3    |

### 4.4 Bases de Datos y Almacenamiento

| Motor      | Tipo       | Proveedor | Uso principal                               |
| ---------- | ---------- | --------- | ------------------------------------------- |
| PostgreSQL | Relacional | Azure     | Datos de activos, asignaciones, usuarios    |
| DynamoDB   | NoSQL      | AWS       | Metadatos de documentos y auditoría         |
| Amazon S3  | Objetos    | AWS       | Archivos físicos (PDF, imágenes, contratos) |

### 4.5 Inteligencia Artificial y Machine Learning

| Modelo / Biblioteca          | Tipo              | Aplicación                                         |
| ---------------------------- | ----------------- | -------------------------------------------------- |
| CNN (TensorFlow / Keras)     | Deep Learning     | Diagnóstico de estado físico de activos por imagen |
| Random Forest (scikit-learn) | ML Supervisado    | Predicción de vida útil restante                   |
| K-Means (scikit-learn)       | ML No Supervisado | Agrupación de activos por patrones de uso          |

### 4.6 Infraestructura y Despliegue

| Componente | Proveedor             | Servicio          |
| ---------- | --------------------- | ----------------- |
| MS1        | Microsoft Azure       | Azure App Service |
| MS2        | Amazon Web Services   | AWS Lambda / ECS  |
| MS3        | Google Cloud Platform | Cloud Run         |

### 4.7 Herramientas de Automatización e Integración

| Herramienta             | Uso                                                 |
| ----------------------- | --------------------------------------------------- |
| N8N                     | Orquestación de flujos automatizados                |
| SendGrid                | Envío de notificaciones por correo electrónico      |
| WhatsApp Business API   | Recepción de solicitudes desde dispositivos móviles |
| Web3j / Hyperledger SDK | Integración con red blockchain                      |

### 4.8 Modelado y Metodología

| Herramienta / Enfoque | Uso                                                              |
| --------------------- | ---------------------------------------------------------------- |
| Modelo C4             | Diagramas de contexto y contenedores                             |
| UML                   | Clases, componentes, casos de uso, secuencia, actividad, estados |
| Proceso Unificado     | Metodología de desarrollo iterativa e incremental                |

---

## 5. Ejemplos de Funcionamiento del Sistema

A continuación se presentan cinco escenarios concretos que ilustran el funcionamiento integrado del sistema.

---

### Ejemplo 1: Registro y asignación de un activo nuevo

**Contexto**: El administrador incorpora una nueva computadora portátil al inventario y la asigna al jefe del área de contabilidad.

**Flujo de operación:**

1. El administrador accede al **frontend web Angular** e ingresa al módulo de gestión de activos.
2. Completa el formulario de registro (código: `LAP-2026-045`, descripción: "Laptop Dell Inspiron 15", valor de adquisición: Bs. 8.500, vida útil: 5 años, categoría: Equipo de Cómputo) y envía la solicitud mediante una **mutación GraphQL** al MS1.
3. El **MS1 persiste el activo en PostgreSQL**, calcula la tasa de depreciación mensual (Bs. 141,67) y genera un **registro blockchain** con el hash de la transacción de adquisición.
4. El administrador selecciona el activo recién creado y ejecuta la acción de asignación, indicando responsable y área destino.
5. El MS1 registra la asignación, genera un nuevo **registro blockchain** (tipo: ASIGNACION) y envía un **webhook al MS3**.
6. El **MS3 / N8N** detecta el evento y envía automáticamente un **correo electrónico de notificación** al responsable del área informando la asignación.
7. El responsable recibe la notificación en su bandeja de entrada y puede consultar el activo desde la **aplicación móvil React Native**.

**Resultado**: El activo queda registrado, asignado y con trazabilidad inmutable en blockchain; el responsable es notificado automáticamente.

---

### Ejemplo 2: Diagnóstico de estado de un activo por fotografía (IA en app móvil)

**Contexto**: El responsable del área de almacén detecta que un montacargas tiene aspecto deteriorado y desea registrar su estado en el sistema.

**Flujo de operación:**

1. El responsable abre la **aplicación móvil React Native** y selecciona el activo `MONT-2022-003` desde su lista de activos asignados.
2. Pulsa la opción "Diagnosticar con IA" y la app activa la **cámara del dispositivo**.
3. El responsable fotografía el montacargas. La app comprime la imagen, registra las **coordenadas GPS** actuales del dispositivo y envía la solicitud al **MS2 mediante REST**.
4. El **MS2** almacena la imagen en **Amazon S3**, obtiene su URL y la procesa con el **modelo CNN de Deep Learning**.
5. El modelo clasifica la imagen y devuelve: `estado: "deteriorado"`, `confianza: 92%`, `detalle: "Oxidación detectada en estructura lateral"`.
6. El MS2 guarda el resultado del diagnóstico en **DynamoDB** con el ID del activo, la URL de la imagen, el resultado y la ubicación GPS.
7. La app muestra al responsable: **"Estado: Deteriorado — Confianza: 92% — Recomendación: Programar mantenimiento preventivo de inmediato"**.
8. El MS2 notifica al **MS3**, el cual genera automáticamente una **orden de mantenimiento** en el MS1 y envía un correo al administrador.

**Resultado**: El diagnóstico queda registrado con evidencia fotográfica, geolocalización y trazabilidad completa, sin intervención manual adicional.

---

### Ejemplo 3: Flujo de automatización por vencimiento de garantía

**Contexto**: El sistema detecta que la garantía de un servidor rack vence en 15 días.

**Flujo de operación:**

1. Un proceso programado en el **MS1** identifica que el activo `SRV-2024-007` tiene garantía con vencimiento en 15 días.
2. El MS1 dispara un **webhook hacia el MS3**.
3. El **N8N** recibe el evento e inicia el flujo automatizado:
   - **Paso 1**: Consulta al **MS2** si el contrato de garantía está cargado y vigente en el sistema documental.
   - **Paso 2**: El MS2 confirma que el documento existe y está actualizado; N8N marca la revisión como "Lista para ejecutar".
   - **Paso 3**: N8N genera una **orden de revisión de garantía** en el MS1 asignada al responsable del activo.
   - **Paso 4**: N8N envía un **correo electrónico** al responsable vía SendGrid: _"El activo SRV-2024-007 tiene garantía por vencer el 16/06/2026. Se ha generado la orden de revisión #ORD-2026-089"_.
   - **Paso 5**: N8N envía una **notificación push** a la app móvil del responsable.

**Resultado**: El proceso se ejecuta completamente de forma automática, sin intervención del administrador, garantizando que los vencimientos nunca sean ignorados.

---

### Ejemplo 4: Consulta de predicción de vida útil (Machine Learning)

**Contexto**: El administrador desea conocer el estado proyectado del inventario de equipos de aire acondicionado para planificar el presupuesto de mantenimiento del siguiente año.

**Flujo de operación:**

1. El administrador accede al **frontend Angular**, módulo de Machine Learning, y selecciona la categoría "Climatización".
2. El frontend envía una solicitud **REST al MS2**: `GET /ml/prediccion-vida-util?categoriaId=CLI`.
3. El **MS2** recopila el historial de cada activo de la categoría (edad, número de mantenimientos, resultados de diagnósticos IA previos) desde DynamoDB.
4. El modelo **Random Forest** predice para cada activo los meses de vida útil restante y la probabilidad de fallo en los próximos 6 meses.
5. Paralelamente, el modelo **K-Means** agrupa los activos en tres clústeres: "Alta criticidad", "Mantenimiento regular" y "Rendimiento eficiente".
6. El frontend renderiza los resultados: una tabla con la predicción individual y un gráfico de dispersión con los tres grupos identificados.
7. El administrador identifica los 4 activos en el clúster "Alta criticidad" y programa mantenimiento preventivo prioritario para ellos.

**Resultado**: La toma de decisiones sobre mantenimiento se basa en predicciones cuantitativas, reduciendo el riesgo de fallos inesperados y optimizando el presupuesto.

---

### Ejemplo 5: Solicitud de revisión por WhatsApp

**Contexto**: Un responsable de área detecta un problema en una fotocopiadora y lo reporta desde su teléfono sin acceder a ninguna aplicación.

**Flujo de operación:**

1. El responsable envía un mensaje por **WhatsApp** al número del sistema: _"Activo COD-123 requiere revisión urgente"_.
2. La **WhatsApp Business API** recibe el mensaje y lo reenvía al **MS3 / N8N**.
3. El N8N interpreta el código del activo mediante procesamiento de texto y consulta al **MS1**: `GET /activos/COD-123`.
4. El MS1 confirma que el activo existe y está activo; devuelve sus datos al N8N.
5. El N8N crea automáticamente un **ticket de revisión** en el MS1 vinculado al activo COD-123 y al responsable identificado.
6. El N8N envía un **correo electrónico de confirmación** al responsable: _"Solicitud recibida para el activo COD-123. Número de ticket: TKT-2026-412"_.
7. El N8N responde al **WhatsApp** del responsable: _"Su solicitud ha sido registrada. Número de ticket: TKT-2026-412. El equipo de mantenimiento será notificado."_

**Resultado**: El responsable reporta el problema en segundos desde WhatsApp; el sistema registra el ticket, notifica por correo y confirma la recepción automáticamente, sin que ningún operador humano intervenga.

---

## Resumen de Cumplimiento de Requisitos

| Requisito                              | Implementación en el proyecto                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Mínimo tres microservicios             | MS1 (Activos), MS2 (Documentos / IA), MS3 (Automatización)                                                                     |
| Tres lenguajes distintos               | Java (MS1), Python (MS2), TypeScript/NestJS (MS3)                                                                              |
| Tres proveedores cloud distintos       | Azure (MS1), AWS (MS2), Google Cloud Platform (MS3)                                                                            |
| Frontend web en Angular                | Interfaz web única que consume los tres microservicios                                                                         |
| Aplicación móvil en React Native       | App de campo para responsables de área                                                                                         |
| Tres recursos del dispositivo móvil    | Cámara, GPS, almacenamiento local (modo offline)                                                                               |
| IA en la aplicación móvil              | Diagnóstico de estado de activos por fotografía mediante CNN                                                                   |
| Módulo de gestión empresarial          | MS1: sistema completo de gestión de activos fijos                                                                              |
| GraphQL obligatorio                    | Comunicación exclusiva entre frontend Angular y MS1                                                                            |
| Gestión documental con auditoría       | MS2 con Amazon S3, DynamoDB y log de accesos detallado                                                                         |
| Deep Learning en imágenes              | CNN para clasificación del estado físico de activos                                                                            |
| ML supervisado                         | Random Forest: predicción de vida útil restante                                                                                |
| ML no supervisado                      | K-Means: agrupación de activos por patrones de comportamiento                                                                  |
| Business Intelligence                  | Dashboard con KPIs, depreciación por categoría, tendencias y alertas                                                           |
| Blockchain                             | Registro inmutable de transacciones críticas del ciclo de vida                                                                 |
| Automatización N8N (mínimo tres pasos) | Flujo: detección de evento → verificación de documentación → generación de orden → notificación por correo → notificación push |
| Base de datos relacional (PostgreSQL)  | MS1: datos principales del inventario                                                                                          |
| Base de datos NoSQL (DynamoDB)         | MS2: metadatos de documentos y registros de auditoría                                                                          |
| Almacenamiento de archivos (Amazon S3) | MS2: archivos físicos del sistema documental                                                                                   |
| Despliegue 100% en la nube             | Azure + AWS + Google Cloud; sin ejecución local                                                                                |
| Metodología: Proceso Unificado         | Fases de inicio, elaboración, construcción y transición                                                                        |
| Modelado C4                            | Diagramas de contexto y contenedores para la arquitectura                                                                      |
| Modelado UML                           | Clases, componentes, casos de uso, secuencia, actividad y estados                                                              |
