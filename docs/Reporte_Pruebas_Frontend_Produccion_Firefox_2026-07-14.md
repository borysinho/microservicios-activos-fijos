# Reporte de pruebas frontend en producción con Firefox

Fecha de ejecución: 14 de julio de 2026  
URL probada: `https://microservicios-activos-fijos.vercel.app/`  
Usuario usado para la corrida principal: `supervisor` / rol `ADMINISTRADOR`  
Herramienta: MCP Firefox DevTools

## Resumen ejecutivo

El frontend productivo de Vercel carga correctamente, permite iniciar sesión con `supervisor/super123`, navegar por todas las secciones principales y cerrar sesión. La consola de Firefox quedó sin errores al finalizar la corrida principal y no se observaron respuestas `4xx/5xx` durante el recorrido autenticado.

Las integraciones productivas observadas respondieron correctamente:

- MS1 GraphQL: múltiples `POST /graphql` con `200`.
- MS1 Auth: `POST /auth/login` con `200` para `supervisor/super123`.
- MS2 REST: documentos, predicción de vida útil y clustering con `200`.
- MS3 REST: notificaciones con `OPTIONS 204` y `GET 200/304`.
- MS4/N8N: no se observaron requests directos desde el frontend hacia `:5678`, por lo que se mantiene la regla de integración indirecta vía MS3 en la sesión probada.

El problema CORS de MS3 observado en desarrollo no se reprodujo en producción. La campana de notificaciones consultó MS3 correctamente.

## Hallazgos que requieren revisión

### 1. Credencial demo documentada `admin/admin123` falla en producción

La guía de pruebas documenta `admin/admin123` como usuario demo administrador. En producción, el intento de login con esa credencial respondió `403` desde:

`POST https://ms1-activos-fijos-bq20260710.eastus.cloudapp.azure.com/auth/login`

La UI mostró `Credenciales incorrectas.`. Luego se pudo continuar con `supervisor/super123`, también con rol `ADMINISTRADOR`.

Impacto:

- Puede bloquear una demo si se usa la credencial documentada.
- La pantalla lista luego al usuario `admin` como activo, pero su contraseña esperada no coincide.

Recomendación:

- Alinear datos semilla, contraseña productiva o documentación de credenciales demo.

### 2. Validación de integridad blockchain muestra estado negativo

En `/blockchain`, al seleccionar `EQ-2022-001`, la pantalla cargó 2 movimientos con trazabilidad (`ASIGNACION` y `REGISTRO`). Al presionar `Validar firma` en ambos registros, la UI mostró `❌`.

Impacto:

- La trazabilidad carga, pero la validación visual de integridad no queda aprobada.
- Para una demo de blockchain, este resultado contradice la promesa de registro inmutable verificable.

Recomendación:

- Revisar el cálculo/comparación de hash usado por el frontend y los datos retornados por MS1.
- Confirmar si el estado `❌` significa hash inválido real o si falta adaptar la validación a los registros semilla.

### 3. Categorías no muestran el valor numérico de tasa

En `/categorias`, las tarjetas muestran `Tasa:` seguido solo de `anual`; no se ve el porcentaje o valor numérico. El modal de nueva categoría sí muestra un campo de tasa con valor por defecto `0.2`.

Impacto:

- La información contable de depreciación queda incompleta en la vista de categorías.

Recomendación:

- Mostrar tasa formateada, por ejemplo `20% anual`, en las tarjetas y vistas equivalentes.

### 4. Exportación PDF del dashboard no quedó confirmada

En `/dashboard`, el botón `Exportar reporte PDF` dejó la llamada del MCP esperando hasta timeout. La UI siguió visible, no se registraron errores de consola, pero fue necesario reiniciar Firefox para continuar la automatización.

Impacto:

- No queda confirmado desde esta corrida que la exportación PDF funcione en producción.

Recomendación:

- Validar manualmente la descarga/diálogo de impresión en navegador real.
- Agregar una prueba E2E específica para exportación que controle descargas.

## Resultado por módulo

| Ruta | Resultado observado | Estado |
| --- | --- | --- |
| `/login` | La pantalla carga. `admin/admin123` falla con `403`; `supervisor/super123` ingresa correctamente. Logout retorna al login. | Correcto con hallazgo de credencial |
| `/dashboard` | KPIs, gráficos, activos críticos y notificaciones cargan. MS3 notificaciones responde sin CORS. Exportación PDF no confirmada por timeout del MCP. | Parcial |
| `/activos` | Lista 20 activos, filtros visibles, detalle de activo carga con datos contables, riesgo, asignaciones, traslados y trazabilidad. Modal de alta disponible. | Correcto |
| `/incidencias` | Muestra 2 casos abiertos. Filtros disponibles. `Ver ficha` navega al detalle del activo. `Gestionar` abre panel con estado, diagnóstico, acción, seguimiento y cierre. | Correcto |
| `/asignaciones` | Carga selector de activo y buscador. Modal de asignación disponible con activo, responsable, área, fecha y observaciones. | Correcto |
| `/traslados` | Carga selector de activo y buscador. Modal de traslado disponible con activo, área destino, autorizador, fecha y motivo. | Correcto |
| `/bajas` | Lista 1 baja autorizada. Modal de solicitud disponible. Acción de acta PDF visible, no ejecutada para evitar repetir bloqueo de descarga. | Correcto con límite |
| `/depreciacion` | Reporte 2026 carga 19 activos, depreciación del año, valor en libros total, búsqueda y barras de avance. | Correcto |
| `/documentos` | Selector de activo funciona. Para `EQ-2022-001`, MS2 responde `200` y la UI indica que no tiene documentos. Carga y análisis de imagen están disponibles; no se subieron archivos a producción. | Correcto con límite |
| `/auditoria` | Historial por activo carga registros `ASIGNACION` y `REGISTRO` con firma. Pestaña de accesos documentales cambia al formulario activo + documento. | Correcto |
| `/machine-learning` | Predicción de vida útil responde con meses restantes, probabilidad de fallo, grupo, confianza y recomendación. Clustering responde con 3 segmentos y 19 activos. | Correcto |
| `/blockchain` | Selector carga registros y enlaces a Etherscan Sepolia. `Validar firma` muestra `❌` en los 2 registros probados. | Con hallazgo |
| `/categorias` | Lista 5 categorías y modal de nueva categoría. Falta valor numérico visible en tasa. | Correcto con hallazgo visual |
| `/areas` | Lista 5 áreas y 7 responsables. Modal de nueva área disponible; edición/eliminación visibles pero no ejecutadas. | Correcto |
| `/usuarios` | Lista 10 usuarios activos. Modal de nuevo usuario disponible. Pestañas de usuarios, áreas, responsables y categorías cargan sus conteos. | Correcto |

## Alcance y límites de la prueba

No se ejecutaron mutaciones persistentes o destructivas en producción: crear activos, asignar, trasladar, dar de baja, cerrar incidencias, crear usuarios, restablecer contraseñas, desactivar usuarios, eliminar áreas o subir documentos. Se validó que las pantallas, formularios, selectores, navegación y consultas base funcionen con datos productivos reales.

Para cerrar una aceptación funcional completa de extremo a extremo, conviene ejecutar una corrida controlada con datos temporales de prueba en producción o en un entorno productivo aislado, incluyendo creación y limpieza de registros.
