# Reconstrucción de Clase – Arquitectura y Requerimientos del Proyecto

# Introducción

El docente indicó que cada grupo ya definió el tema sobre el cual trabajará.  
A partir de ahora, lo importante es especificar exactamente qué se va a desarrollar.

La idea general consiste en construir un sistema compuesto por múltiples módulos o subsistemas.  
Desde el punto de vista funcional, cada grupo definirá las funcionalidades específicas de su sistema.

Sin embargo, el docente estableció varios lineamientos obligatorios relacionados con:

- Arquitectura.
- Herramientas.
- Tecnologías.
- Infraestructura.
- Modelado.
- Inteligencia artificial.
- Automatización.
- Bases de datos.
- Aplicaciones móviles.

---

# Arquitectura basada en microservicios

El proyecto debe estar orientado obligatoriamente a una arquitectura basada en microservicios.

## Requisitos mínimos

- Deben existir como mínimo tres microservicios.
- Pueden existir más de tres, pero nunca menos.
- Cada microservicio debe desplegarse en instancias diferentes.
- No pueden ejecutarse todos en el mismo servidor o proveedor.

---

# Proveedores en la nube

Los microservicios deben desplegarse utilizando distintos proveedores cloud.

El docente mencionó específicamente:

- Microsoft Azure.
- Amazon Web Services (AWS).
- Google Cloud.

La idea es que la aplicación esté distribuida entre distintos proveedores.

---

# Lenguajes de programación obligatorios

Cada microservicio debe utilizar un lenguaje de programación distinto en el backend.

Por ejemplo:

- Un servicio puede utilizar Nest JS.
- Otro puede usar Spring Boot con Java.
- Otro puede utilizar Python con FastAPI.

El requisito mínimo es utilizar tres lenguajes diferentes.

---

# Frontend y aplicación móvil

## Frontend Web

El frontend web debe desarrollarse obligatoriamente con Angular.

El frontend puede ser único para todos los microservicios.

---

## Aplicación móvil

La aplicación móvil debe desarrollarse obligatoriamente con React Native.

El docente aclaró que la aplicación móvil no debe ser una simple réplica de la aplicación web.

La aplicación móvil debe:

- Ser ligera.
- Aprovechar recursos del dispositivo móvil.
- Tener funcionalidades específicas para móviles.

---

# Recursos que debe aprovechar la aplicación móvil

La aplicación móvil debe utilizar al menos tres recursos del dispositivo móvil.

Por ejemplo:

- Cámara.
- Sensores.
- GPS.
- Micrófono.
- Almacenamiento local.

Además, la aplicación móvil debe integrar algún servicio de inteligencia artificial.

El docente aclaró que no debe limitarse únicamente a un chatbot.

Debe existir alguna funcionalidad real basada en IA dentro de la aplicación móvil.

---

# Sistema de gestión empresarial

Uno de los módulos del proyecto debe implementar el concepto clásico de un sistema de gestión empresarial.

Por ejemplo:

- Veterinaria.
- Restaurante.
- Tienda.
- Clínica.
- Empresa de servicios.

El docente indicó que este módulo debe incluir:

- Interfaces.
- Procesos.
- Reportes.
- Persistencia de datos.

---

# Uso obligatorio de GraphQL

Toda la interacción entre el frontend y el backend del módulo de gestión empresarial debe realizarse utilizando GraphQL.

El docente explicó algunas diferencias entre GraphQL y las APIs REST:

## APIs REST

- Pueden requerir múltiples endpoints.
- Frecuentemente devuelven información innecesaria.

## GraphQL

- Utiliza un único endpoint.
- Permite solicitar únicamente los datos necesarios.

El uso obligatorio de GraphQL aplica específicamente al módulo de gestión empresarial.

En los demás módulos, los estudiantes pueden decidir si utilizan:

- GraphQL.
- APIs REST.
- Otro mecanismo de comunicación.

---

# Gestión documental

Algún módulo del sistema debe implementar un sistema de gestión documental.

Esto implica almacenar archivos como:

- PDFs.
- Word.
- Excel.
- Imágenes.
- Otros documentos digitales.

El docente explicó que este módulo debe permitir:

- Auditoría.
- Registro de accesos.
- Historial de modificaciones.
- Registro de quién visualizó o editó archivos.

---

# Deep Learning y procesamiento de imágenes

En alguna funcionalidad del proyecto debe aplicarse Deep Learning.

El docente indicó que, preferentemente, debe utilizarse en:

- Procesamiento de imágenes.
- Procesamiento de video.

---

# Machine Learning

También deben implementarse funcionalidades de Machine Learning utilizando al menos dos categorías:

## Aprendizaje supervisado

Por ejemplo:

- Random Forest.
- Clasificadores.

## Aprendizaje no supervisado

Por ejemplo:

- Clustering.
- K-Means.

---

# Inteligencia de negocios

El proyecto debe incluir algún componente relacionado con inteligencia de negocios.

Esto debe reflejarse en:

- Indicadores.
- Reportes.
- Métricas.
- Dashboards.

---

# Blockchain

El sistema debe implementar blockchain al menos a nivel de registro.

Por ejemplo:

- Registro de facturas.
- Validación de documentos.
- Registro de transacciones.

---

# Automatización

El proyecto debe incluir automatización basada en un flujo mínimo de tres pasos.

El docente puso como ejemplo el uso de N8N.

## Ejemplo explicado por el docente

1. El cliente envía un mensaje por WhatsApp.
2. El sistema recibe automáticamente el pedido.
3. El sistema genera órdenes.
4. Finalmente se envía un correo electrónico de confirmación.

En este ejemplo interactúan tres herramientas:

- WhatsApp.
- El sistema desarrollado.
- Un servicio de e-mail.

La idea es integrar múltiples plataformas automáticamente.

---

# Bases de datos

El proyecto debe utilizar dos tipos de bases de datos:

## Base de datos relacional

El docente recomendó PostgreSQL.

---

## Base de datos NoSQL

Debe utilizarse DynamoDB.

El docente indicó que esto permitirá trabajar con infraestructura de AWS.

También recomendó tener cuidado con los límites gratuitos para evitar costos adicionales.

---

# Almacenamiento de archivos

La gestión documental debe almacenar grandes cantidades de archivos.

Para optimizar almacenamiento y acceso, el docente indicó que debe utilizarse Amazon S3.

Esto permitirá:

- Reducir costos.
- Mejorar tiempos de acceso.
- Escalar almacenamiento.

---

# Despliegue

El sistema debe estar completamente desplegado en la nube.

El docente indicó que nada debe ejecutarse únicamente de forma local.

---

# Metodología de desarrollo

El proyecto utilizará el Proceso Unificado como metodología de desarrollo.

---

# Modelado

El modelado se dividirá en dos enfoques:

## Modelo C4

Se utilizará exclusivamente para modelar arquitectura.

---

## UML

Se utilizará para el resto del modelado del sistema.

---

# Preguntas realizadas durante la clase

## Sobre la base de datos NoSQL

Un estudiante preguntó si la base de datos NoSQL podía utilizarse en cualquiera de los servicios.

El docente respondió que sí, y que cada grupo puede decidir en qué funcionalidad implementarla.

---

## Sobre los microservicios

Otro estudiante preguntó si el backend principal cuenta como uno de los microservicios.

El docente respondió que sí.

Por ejemplo:

- Un servicio puede ser Spring Boot.
- Otro Python.
- Otro Node.js.

---

# Fechas importantes

El docente indicó que el segundo examen parcial será el jueves 11 de julio.

También recordó que:

- El proyecto debe entregarse dos semanas antes del último día de clases.
- Después del 15 de julio se trabajará principalmente en el proyecto final.

---

# Entrega solicitada para el jueves

Cada grupo debe llevar documentado:

- El tema del proyecto.
- Dónde se aplicará cada uno de los requisitos solicitados.
- Qué funcionalidades tendrá el sistema.
- Qué herramientas y tecnologías utilizarán.
- Ejemplos de funcionamiento del sistema.

El docente pidió que el documento sea:

- Impreso.
- Formal.
- A doble cara.
