# Reporte de pruebas frontend con Firefox

Fecha de ejecución: 14 de julio de 2026  
URL probada: `http://localhost:4200`  
Usuario usado: `supervisor` / rol `ADMINISTRADOR`  
Herramienta: MCP Firefox DevTools

## Resumen ejecutivo

El frontend Angular carga correctamente y permite navegar por todas las secciones principales con el rol administrador. Las consultas GraphQL hacia MS1 responden `200` en los módulos de inventario, dashboard, incidencias, asignaciones, traslados, bajas, depreciación, auditoría, blockchain, categorías, áreas y usuarios. MS2 también respondió correctamente en el flujo probado de clustering (`GET http://localhost:8002/api/ml/clustering`, `200 OK`).

Las verificaciones automáticas del frontend pasaron:

- `npm test -- --watch=false`: 4 archivos de prueba, 10 tests OK.
- `npm run build`: build Angular OK.

Se detectó un problema transversal que conviene corregir antes de una demo: la integración de notificaciones con MS3 queda bloqueada por CORS en Firefox.

## Hallazgos que requieren ajuste

### 1. CORS en MS3 para notificaciones

En todas las rutas autenticadas el layout intenta consultar:

`GET http://localhost:3000/api/notificaciones?usuarioId=<uuid>`

Firefox bloquea la respuesta con:

`CORS header 'Access-Control-Allow-Origin' missing`

La preflight `OPTIONS` devuelve `204 No Content`, pero sin los headers CORS requeridos para que el navegador permita leer la respuesta desde `http://localhost:4200`. El request GET queda como `pending` o falla para el frontend.

Impacto:

- La campana de notificaciones no puede poblarse correctamente.
- La consola queda con errores en cada navegación autenticada.
- En `/incidencias` se observaron dos intentos de consulta a notificaciones, por lo que el error se duplica.

Recomendación:

- Configurar CORS en MS3 para permitir el origen del frontend local y de producción.
- Verificar que `OPTIONS` y `GET` devuelvan al menos `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` y `Access-Control-Allow-Headers`.
- Revisar si `/incidencias` dispara dos consultas de notificaciones innecesarias.

### 2. Verificación parcial de selectores dependientes de cambio

En las pruebas con MCP, al intentar seleccionar un activo en `/documentos`, `/auditoria` y `/blockchain`, el control no disparó una consulta de detalle observable. La pantalla inicial carga bien y los catálogos de activos se muestran, pero no quedó confirmada la carga de expediente, auditoría de documento o trazabilidad por activo desde la interacción programática.

Impacto:

- No se puede concluir desde esta corrida que los flujos dependientes de selección estén completamente correctos.
- Puede ser una limitación del método de llenado del MCP sobre elementos `select`, pero conviene validarlo manualmente o con pruebas E2E.

Recomendación:

- Agregar pruebas E2E con Playwright/Cypress para selección de activo en:
  - `/documentos`: listar documentos por activo y filtrar tipo.
  - `/auditoria`: consultar historial de activo y accesos documentales.
  - `/blockchain`: listar registros por activo.
- Confirmar manualmente que el evento `change` de los `select` dispara la carga esperada.

## Resultado por módulo

| Ruta | Resultado observado | Estado |
| --- | --- | --- |
| `/login` | Login inválido muestra "Credenciales incorrectas"; `supervisor/super123` ingresa correctamente. | Correcto |
| `/dashboard` | Métricas BI, gráficos y activos críticos renderizan; MS1 GraphQL y MS2 clustering responden 200. | Correcto con alerta CORS MS3 |
| `/activos` | Lista 20 activos, filtros, cambio de estado y acciones por rol visibles. | Correcto con alerta CORS MS3 |
| `/incidencias` | Muestra 4 casos abiertos, filtros y panel "Gestionar" con campos de seguimiento. | Correcto con alerta CORS MS3 duplicada |
| `/asignaciones` | Carga activos, responsables y áreas; modal de asignación disponible. | Correcto con alerta CORS MS3 |
| `/traslados` | Carga activos y abre modal de movimiento con activo, área destino, autorizador, fecha y motivo. | Correcto con alerta CORS MS3 |
| `/bajas` | Lista 1 baja autorizada, acción de acta y modal de solicitud disponible. | Correcto con alerta CORS MS3 |
| `/depreciacion` | Reporte 2026 con 19 activos, totales y tabla de depreciación. | Correcto con alerta CORS MS3 |
| `/documentos` | UI de expediente y carga de archivo disponible; no se confirmó carga por activo desde MCP. | Parcial |
| `/auditoria` | Tabs de historial/accesos y selector de activo renderizan; no se confirmó consulta de detalle desde MCP. | Parcial |
| `/machine-learning` | Vista de riesgo carga; clustering ejecuta `GET /api/ml/clustering` y muestra 3 segmentos. | Correcto |
| `/blockchain` | Selector de activos y estado inicial renderizan; no se confirmó consulta por activo desde MCP. | Parcial |
| `/categorias` | Lista 5 categorías; modal de nueva categoría disponible. | Correcto con alerta CORS MS3 |
| `/areas` | Lista 5 áreas y 7 responsables; modal de nueva área disponible. | Correcto con alerta CORS MS3 |
| `/usuarios` | Lista 10 usuarios; modal de nuevo usuario disponible. | Correcto con alerta CORS MS3 |

## Alcance y límites de la prueba

No se ejecutaron mutaciones destructivas o persistentes desde la UI, como crear activos, registrar bajas, trasladar activos, desactivar usuarios o eliminar áreas. Se validó que los formularios y acciones estén disponibles, que las pantallas rendericen datos reales y que las consultas base respondan correctamente.

Para cerrar la validación completa de funcionalidades, conviene complementar esta corrida con pruebas E2E que creen datos temporales y luego los limpien o usen una base de pruebas aislada.
