# Frontend Web — Sistema de Activos Fijos

Aplicación Angular para la gestión web del sistema de activos fijos. Consume MS1 por GraphQL y MS2/MS3 por REST mediante servicios centralizados de Angular.

## Secciones principales

| Ruta                | Propósito                                                             |
| ------------------- | --------------------------------------------------------------------- |
| `/dashboard`        | Indicadores BI de inventario, mantenimiento, depreciación y actividad |
| `/activos`          | Inventario, ficha de activo y acciones operativas permitidas por rol  |
| `/incidencias`      | Seguimiento de activos en mantenimiento, alertas y casos pendientes   |
| `/asignaciones`     | Responsables y asignaciones activas                                   |
| `/traslados`        | Movimientos entre áreas y recepción                                   |
| `/bajas`            | Retiro de activos y actas                                             |
| `/documentos`       | Expedientes, versiones y auditoría documental                         |
| `/auditoria`        | Trazabilidad documental                                               |
| `/machine-learning` | Predicción y clustering de activos                                    |
| `/blockchain`       | Historial inmutable de transacciones                                  |

## Incidencias

La sección `/incidencias` consolida información relevante para el negocio:

- activos actualmente en mantenimiento,
- alertas y avisos operativos recientes,
- filtros por estado, prioridad, área y activo,
- acceso directo a la ficha del activo relacionado,
- panel de gestión para `ADMINISTRADOR` y `RESPONSABLE_AREA`,
- registro de diagnóstico, acción ejecutada, responsable operativo, próxima acción y fecha compromiso,
- bitácora de seguimiento en la sesión de trabajo,
- cierre de incidencia contra las APIs existentes: cambio de estado del activo a `ACTIVO` en MS1 o marcado de notificación como leída en MS3.

La pantalla trabaja como caso de uso operativo sobre datos existentes de MS1 y MS3. Actualmente no existe una entidad persistente `Incidencia` en backend; por eso los datos propios de seguimiento se mantienen en memoria de la sesión web hasta que se implemente ese modelo dedicado.

La pantalla no expone nombres de microservicios ni detalles internos de automatización al usuario final.

## Desarrollo

```bash
npm install
npm start
```

Luego abrir `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Pruebas

```bash
npm test -- --watch=false
```

El proyecto no define script `lint` en `package.json`.
