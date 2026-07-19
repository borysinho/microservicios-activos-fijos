# 4. Recursos de Aprendizaje y Mecanismos de Capacitacion

## 4.1 Estrategia de Adopcion

La adopcion del sistema se plantea mediante recursos digitales de acceso directo, orientados a disminuir la curva de aprendizaje de los usuarios y facilitar la evaluacion del producto. Los recursos cubren tres necesidades principales: ingreso a la aplicacion web, consulta del manual de uso e instalacion de la aplicacion movil.

| Publico objetivo | Necesidad | Recurso |
| --- | --- | --- |
| Administrador | Operar catalogo, asignaciones, bajas, reportes, usuarios y BI. | Aplicacion web y manual de uso. |
| Responsable de Area | Usar funciones de campo: activos asignados, camara, GPS, incidencias y notificaciones. | Aplicacion movil y manual de uso. |
| Auditor | Revisar trazabilidad documental, blockchain e historica. | Aplicacion web y seccion de auditoria del manual. |
| Evaluador | Acceder rapidamente al producto y recursos. | Codigos QR, repositorio, endpoints y manual. |

## 4.2 Manual de Uso

El manual de uso se publica como recurso web navegable:

**https://microservicios-activos-fijos.vercel.app/manual**

El manual debe cubrir:

- Inicio de sesion y cierre de sesion.
- Navegacion por dashboard ejecutivo.
- Gestion de activos, categorias, areas y responsables.
- Asignaciones, traslados, devoluciones y bajas.
- Gestion documental y auditoria.
- Consulta de predicciones y clustering.
- Revision de trazabilidad blockchain.
- Uso de la aplicacion movil para fotografia, GPS, incidencias y notificaciones.
- Recomendaciones para operar sin conexion y sincronizar posteriormente.

## 4.3 Instalacion de Aplicacion Movil

La instalacion de la aplicacion movil se distribuye mediante releases del repositorio oficial:

**https://github.com/borysinho/microservicios-activos-fijos/releases/**

El recurso debe permitir descargar el paquete Android disponible para pruebas o demostracion. La aplicacion movil requiere permisos de camara, ubicacion y notificaciones para ejecutar sus funcionalidades de campo.

## 4.4 Soporte Inteligente Contextual

Como mecanismo de soporte inteligente, el sistema contempla un asistente contextual de ayuda integrado al flujo de trabajo. Su funcion es observar pasivamente el contexto de navegacion del usuario y responder consultas directas con informacion especifica del modulo activo.

### Arquitectura Conceptual

| Componente | Responsabilidad |
| --- | --- |
| Capturador de contexto | Registra modulo actual, rol del usuario, entidad seleccionada y accion en curso. |
| Normalizador de eventos | Convierte interacciones UI en senales estructuradas. |
| Modelo de contexto | Mantiene estado temporal de la sesion sin almacenar informacion sensible innecesaria. |
| Motor de respuestas | Genera orientacion segun rol, modulo, permisos y reglas de negocio. |
| Panel de ayuda | Presenta respuestas breves y accionables dentro de la aplicacion. |

### Ejemplos de Respuestas Esperadas

| Contexto | Consulta del usuario | Respuesta esperada |
| --- | --- | --- |
| Modulo Bajas | "Por que no puedo editar este activo?" | "El activo se encuentra dado de baja o vinculado a una solicitud irreversible. Solo puede consultar su historial." |
| Modulo Documentos | "Que pasa al subir una nueva version?" | "La version anterior se conserva para auditoria y la nueva version queda activa para descarga." |
| App movil offline | "Por que no puedo enviar el diagnostico?" | "El diagnostico IA requiere conexion. La foto puede conservarse temporalmente y enviarse cuando vuelva la red." |

El asistente no reemplaza permisos, validaciones ni auditoria; opera como ayuda contextual para reducir errores de uso.

## 4.5 Codigos QR de Acceso Directo

Los codigos QR se incluyen como imagenes SVG nitidas para facilitar acceso desde dispositivos moviles.

| Recurso | QR | URL |
| --- | --- | --- |
| Repositorio oficial | ![QR repositorio](recursos_qr/qr_repositorio.svg) | https://github.com/borysinho/microservicios-activos-fijos |
| Aplicacion web | ![QR frontend](recursos_qr/qr_frontend.svg) | https://microservicios-activos-fijos.vercel.app/ |
| Manual de uso | ![QR manual](recursos_qr/qr_manual.svg) | https://microservicios-activos-fijos.vercel.app/manual |
| Instalacion movil | ![QR mobile](recursos_qr/qr_mobile_releases.svg) | https://github.com/borysinho/microservicios-activos-fijos/releases/ |
| Endpoint principal de APIs | ![QR endpoints](recursos_qr/qr_endpoints.svg) | https://ms1-activos-fijos-bq20260710.eastus.cloudapp.azure.com/graphql |

## 4.6 Recomendacion de Uso en Presentacion

Para la demostracion formal se recomienda la siguiente secuencia:

1. Escanear el QR de la aplicacion web e iniciar sesion con un usuario habilitado.
2. Presentar dashboard, activos, depreciacion, documentos, IA/ML y blockchain.
3. Escanear el QR del manual para evidenciar recurso de aprendizaje.
4. Escanear el QR de instalacion movil y mostrar el APK o release.
5. En dispositivo movil, demostrar camara, GPS, cache offline y notificaciones.
6. Presentar la regla de automatizacion: WhatsApp ingresa por MS3, MS3 coordina MS4/N8N y el flujo finaliza con email o respuesta WhatsApp.
