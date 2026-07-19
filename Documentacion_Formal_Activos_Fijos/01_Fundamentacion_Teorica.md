# 1. Fundamentacion Teorica

## 1.1 Definicion y Categoria del Software

Un sistema de gestion de activos fijos es una solucion informatica orientada a administrar bienes fisicos de valor economico y operativo durante todo su ciclo de vida. Comprende el registro inicial del activo, su clasificacion contable, la asignacion a responsables, los traslados entre areas, el seguimiento documental, el calculo de depreciacion, la administracion de mantenimientos, la baja definitiva y la obtencion de indicadores para la toma de decisiones.

Desde el punto de vista de la industria, este tipo de solucion se clasifica principalmente como **software de gestion empresarial**. En particular, corresponde a una plataforma especializada cercana a los modulos de activos fijos de un ERP, debido a que integra procesos administrativos, contables, operativos y de auditoria. Tambien incorpora caracteristicas de sistema distribuido empresarial, gestion documental, analitica de negocios y automatizacion de procesos.

La categoria seleccionada se justifica por las siguientes caracteristicas:

- Administra entidades empresariales persistentes: activos, categorias, responsables, areas, usuarios, documentos, incidencias y movimientos.
- Opera sobre procesos formales de negocio: adquisicion, asignacion, traslado, depreciacion, mantenimiento, auditoria y baja.
- Soporta roles organizacionales diferenciados: administrador, responsable de area, auditor y usuario de solo lectura.
- Integra reglas contables y operativas, como metodos de depreciacion, estados del activo y autorizaciones.
- Proporciona trazabilidad historica y evidencias verificables mediante auditoria documental y registros inmutables.
- Genera indicadores de gestion para control ejecutivo y toma de decisiones.
- Expone interfaces web, movil y de integracion entre servicios, lo que permite operar en diferentes contextos de uso.

## 1.2 Arquitectura del Software y Modelos de Interaccion

La arquitectura adoptada corresponde a una arquitectura distribuida basada en microservicios. En este enfoque, el sistema se descompone en servicios autonomos, cada uno responsable de un subconjunto cohesivo del dominio y desplegado de forma independiente. Esta division reduce el acoplamiento, permite escalar componentes segun demanda, facilita la seleccion de tecnologias especializadas y mejora la mantenibilidad del sistema.

El sistema se organiza en cuatro servicios principales:

| Microservicio | Responsabilidad | Tecnologia principal | Proveedor |
| --- | --- | --- | --- |
| MS1 Gestion de Activos | Gestion empresarial, GraphQL, depreciacion, BI y blockchain | Java / Spring Boot | Microsoft Azure |
| MS2 Documentos e IA | Gestion documental, auditoria, Deep Learning y Machine Learning | Python / FastAPI | Amazon AWS |
| MS3 Automatizacion | Orquestacion, webhooks, WhatsApp, email y notificaciones | Node.js / NestJS | Google Cloud |
| MS4 Motor N8N | Ejecucion de workflows automatizados | N8N | Microsoft Azure |

El modelo de interaccion combina varios estilos de comunicacion:

- **GraphQL:** utilizado por MS1 para exponer consultas y mutaciones del dominio empresarial. Permite al frontend solicitar exactamente los campos requeridos y reduce la sobrecarga de endpoints.
- **REST:** utilizado por MS2 y MS3 para operaciones documentales, IA, ML, notificaciones y webhooks.
- **Webhooks:** utilizados para disparar eventos asincronos entre MS1, MS3 y MS4.
- **Integracion indirecta con N8N:** MS4 no es consumido directamente por frontend, movil, MS1 ni MS2. MS3 actua como coordinador y unico punto autorizado de invocacion hacia el motor N8N.
- **Persistencia poliglota:** PostgreSQL para datos relacionales de negocio; DynamoDB para metadatos documentales y auditoria; Amazon S3 para archivos binarios.
- **Servicios externos:** WhatsApp Business API para recepcion de solicitudes, SendGrid para email, Firebase Cloud Messaging para notificaciones y Ethereum Sepolia para verificacion blockchain.

La separacion de responsabilidades se alinea con principios de cohesion, bajo acoplamiento, despliegue independiente, escalabilidad diferenciada y aislamiento de fallos.

## 1.3 Fundamentacion de Tecnologias Relevantes

### Java y Spring Boot

Java es un lenguaje orientado a objetos, fuertemente tipado y ampliamente utilizado en sistemas empresariales. Spring Boot proporciona un ecosistema productivo para construir aplicaciones backend con inversion de control, seguridad, validacion, persistencia, observabilidad y pruebas automatizadas. En sistemas de gestion, Spring Boot favorece una arquitectura por capas y un modelo robusto para transacciones de negocio.

Ventajas: madurez, ecosistema amplio, seguridad empresarial, soporte de JPA, integracion GraphQL y despliegue estable en contenedores.  
Desventajas: mayor verbosidad frente a lenguajes dinamicos y consumo de memoria superior en comparacion con servicios livianos.

### GraphQL

GraphQL es un lenguaje de consulta y runtime para APIs que permite a los clientes definir la forma exacta de los datos solicitados. Resulta adecuado para frontends ricos que consumen entidades relacionadas, como activos con asignaciones, traslados, bajas, documentos y registros historicos.

Ventajas: evita sobreconsulta y subconsulta, centraliza el contrato de API en un esquema tipado y facilita consultas compuestas.  
Desventajas: exige gobernanza del esquema, control de complejidad de consultas y politicas claras de autorizacion por campo o resolutor.

### PostgreSQL y Supabase

PostgreSQL es un motor relacional ACID con soporte avanzado para integridad referencial, indices, transacciones, consultas complejas y extensibilidad. Supabase agrega administracion cloud, conexion segura, copias de seguridad y servicios administrados sobre PostgreSQL.

Ventajas: consistencia fuerte para operaciones contables y administrativas, consultas analiticas y relaciones complejas.  
Desventajas: requiere diseno cuidadoso de indices y migraciones para mantener rendimiento en crecimiento.

### Python y FastAPI

Python es un lenguaje de alto nivel ampliamente usado en ciencia de datos, automatizacion e inteligencia artificial. FastAPI permite construir APIs REST tipadas y asincronas con validacion automatica mediante Pydantic.

Ventajas: productividad, integracion natural con bibliotecas de IA/ML, documentacion automatica OpenAPI y validacion de contratos.  
Desventajas: rendimiento bruto inferior a lenguajes compilados para cargas intensivas si no se escala adecuadamente.

### Amazon S3 y DynamoDB

Amazon S3 es un servicio de almacenamiento de objetos apropiado para documentos, imagenes y archivos binarios. DynamoDB es una base NoSQL administrada, orientada a clave-valor/documento, con escalabilidad horizontal y baja latencia.

Ventajas: separacion eficiente entre archivos binarios y metadatos, versionamiento documental, alta disponibilidad y escalabilidad administrada.  
Desventajas: DynamoDB requiere diseno previo de patrones de acceso; S3 exige politicas estrictas de permisos y ciclo de vida.

### TensorFlow, CNN y Deep Learning

El Deep Learning permite extraer patrones visuales complejos desde imagenes. Una CNN procesa imagenes mediante filtros convolucionales que detectan bordes, texturas, formas y estructuras. En el dominio de activos fijos se emplea como apoyo al diagnostico visual de evidencia fotografica.

Ventajas: capacidad de clasificacion visual, aprendizaje desde datos y aplicabilidad a inspecciones de campo.  
Desventajas: requiere datos representativos, control de sesgos, monitoreo de calidad de imagen y validacion humana para decisiones sensibles.

### scikit-learn, Random Forest y K-Means

Random Forest es un metodo supervisado basado en ensambles de arboles de decision. Permite regresion y clasificacion, por ejemplo estimar vida util restante o probabilidad de fallo. K-Means es un algoritmo no supervisado que agrupa registros por similitud, util para segmentar activos en perfiles operativos.

Ventajas: modelos interpretables en comparacion con redes profundas, buen rendimiento con datos tabulares y facilidad de entrenamiento.  
Desventajas: requieren calidad en variables de entrada; K-Means exige interpretar centroides y validar el numero de grupos.

### Node.js y NestJS

Node.js ejecuta JavaScript/TypeScript del lado servidor con un modelo orientado a eventos. NestJS aporta arquitectura modular, inyeccion de dependencias, controladores, servicios, validacion y pruebas, resultando adecuado para orquestacion de webhooks y notificaciones.

Ventajas: eficiencia en I/O, integracion natural con APIs externas y estructura empresarial mediante TypeScript.  
Desventajas: no es ideal para computo intensivo sin delegarlo a servicios especializados.

### N8N

N8N es una plataforma de automatizacion de flujos que permite integrar triggers, transformaciones y acciones sobre multiples servicios. En una arquitectura empresarial, funciona como motor de workflows versionables y separa reglas de automatizacion de la logica central de microservicios.

Ventajas: rapidez para construir flujos, integraciones disponibles y trazabilidad de ejecuciones.  
Desventajas: requiere control de seguridad, versionamiento y aislamiento para evitar exposicion directa a clientes no autorizados.

### Angular

Angular es un framework frontend para aplicaciones web de una sola pagina. Proporciona componentes, enrutamiento, formularios reactivos, servicios, inyeccion de dependencias y tooling integrado.

Ventajas: estructura consistente para aplicaciones empresariales, tipado con TypeScript, formularios robustos y escalabilidad de modulos.  
Desventajas: curva de aprendizaje mayor y bundles que deben optimizarse para produccion.

### React Native

React Native permite construir aplicaciones moviles nativas con JavaScript/TypeScript y componentes que se renderizan en Android e iOS. Resulta adecuado para operaciones de campo porque puede integrar camara, GPS, almacenamiento local, mapas y notificaciones.

Ventajas: reutilizacion de conocimientos frontend, acceso a recursos nativos y distribucion multiplataforma.  
Desventajas: integraciones nativas demandan configuracion especifica por plataforma y pruebas en dispositivos reales.

### Blockchain

Blockchain aporta un registro inmutable de transacciones mediante hashes encadenados y verificacion publica o semipublica. Para gestion de activos, permite fortalecer la trazabilidad de eventos criticos como adquisicion, asignacion, traslado, diagnostico critico y baja.

Ventajas: integridad verificable, no repudio y evidencia historica.  
Desventajas: costos operativos, latencia de confirmacion y necesidad de proteger llaves privadas.

