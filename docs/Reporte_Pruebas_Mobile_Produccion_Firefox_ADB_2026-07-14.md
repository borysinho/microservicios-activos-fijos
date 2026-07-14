# Reporte de pruebas mobile en producción con Firefox MCP y ADB

Fecha de ejecución: 14 de julio de 2026  
Aplicación probada: `com.movilactivosfijos`  
Build observado: `versionName=1.0`, `versionCode=1`, `targetSdk=34`  
Usuario de la sesión móvil: `borys.quiroga` / rol `RESPONSABLE_AREA`  
Entorno: dispositivo Android físico `DIPN49MRBIFQJBQS`, app debug por USB apuntando a producción  
Herramientas: MCP Firefox DevTools, ADB, `run-as`, `logcat`, Jest

## Resumen ejecutivo

La aplicación móvil estaba autenticada y cargó correctamente el panel de trabajo de campo para el rol `RESPONSABLE_AREA`. La pantalla inicial mostró sincronización en estado `OK`, `19` activos disponibles offline y `0` operaciones pendientes. El paquete instalado corresponde a la app esperada (`com.movilactivosfijos`) y tiene concedidos los permisos nativos clave: cámara, ubicación fina/gruesa y notificaciones.

Las integraciones productivas usadas por mobile respondieron:

- MS1 GraphQL: `POST /graphql` con JWT móvil respondió `200` y devolvió 19 activos.
- MS2 IA: `GET /api/ia/diagnosticos?activoId=...` respondió `200` para un activo de muestra.
- MS3 notificaciones: `GET /api/notificaciones?usuarioId=...` respondió `200`.
- MS1 health: `GET /actuator/health` respondió `UP` desde Firefox.
- MS2 health y MS3 health: responden en `/health` desde Firefox.

Las pruebas automatizadas locales de `mobile/` pasaron completas: 6 suites, 16 tests.

## Hallazgos que requieren revisión

### 1. La automatización táctil por ADB quedó bloqueada por el dispositivo

Al intentar navegar la app con `adb shell input`, Android respondió:

`Injecting input events requires the caller ... INJECT_EVENTS permission`

Impacto:

- No se pudo ejecutar un recorrido táctil automatizado completo por las pantallas de Activos, IA, GPS, Incidencias y Alertas.
- La evidencia UI directa de esta corrida queda limitada a la pantalla inicial, árbol de accesibilidad, capturas, almacenamiento interno, permisos, logs y validación de endpoints.

Recomendación:

- En MIUI/Xiaomi, habilitar `USB debugging (Security settings)` además de `USB debugging`.
- Para aceptación repetible, agregar Detox/Appium o pruebas instrumentadas Android que no dependan de permisos de inyección manual.

### 2. La caché offline conserva estados desactualizados para 2 activos

La caché local `cache_activos_asignados` contiene los mismos 19 códigos que MS1, pero dos estados difieren frente a GraphQL productivo:

| Código | Estado en caché móvil | Estado actual en MS1 |
| --- | --- | --- |
| `EQ-2022-001` | `EN_MANTENIMIENTO` | `ACTIVO` |
| `EQ-2023-002` | `EN_MANTENIMIENTO` | `ACTIVO` |

Impacto:

- Un responsable en modo offline podría ver esos activos como en mantenimiento aunque producción ya los muestra activos.
- La pantalla inicial marca sincronización `OK`, pero ese indicador no evidencia frescura de estados por activo.

Recomendación:

- Registrar timestamp de última sincronización visible.
- Revalidar la política de refresco de `cache_activos_asignados` al abrir la app, al volver a primer plano y al entrar al listado.

### 3. Los health checks de MS2 y MS3 no están bajo `/api`

En Firefox:

- `https://...lambda-url.../api/health` devuelve `404`.
- `https://...lambda-url.../health` devuelve `{"status":"ok","service":"ms2-documentos-ia"}`.
- `https://...run.app/api/health` devuelve `404`.
- `https://...run.app/health` devuelve `{"status":"ok","service":"ms3-automatizacion","mode":"production"}`.

Impacto:

- No afecta directamente al flujo mobile actual de MS2 porque `ms2Service.ts` calcula el health quitando `/api`.
- Puede confundir monitoreo operativo o pruebas manuales si se asume que todos los endpoints productivos viven bajo `/api`.

Recomendación:

- Documentar explícitamente los health checks productivos.
- Opcionalmente exponer aliases `/api/health` para MS2 y MS3.

### 4. Caché de Vision Camera contiene capturas válidas y archivos temporales vacíos

En `cache/` se observaron archivos `mrousavy*.jpg` de 1.6-1.7 MB y también varios `mrousavy*.jpg` de `0` bytes.

Impacto:

- Confirma uso de cámara nativa en la app debug.
- Los archivos de `0` bytes podrían ser capturas canceladas o fallidas; si se acumulan, pueden ensuciar diagnósticos y almacenamiento temporal.

Recomendación:

- Limpiar archivos temporales inválidos después de errores/cancelaciones.
- Validar tamaño de imagen antes de enviar a MS2.

## Resultado por funcionalidad

| Funcionalidad | Evidencia observada | Estado |
| --- | --- | --- |
| Sesión móvil | `auth_usuario` guardado con rol `RESPONSABLE_AREA`; pantalla inicial muestra `borys.quiroga`. | Correcto |
| Inicio por perfil | UI muestra `Trabajo de campo`, accesos a revisar activos, verificación IA, ubicación GPS, incidencias y alertas. | Correcto |
| Offline/local storage | `AsyncStorage` contiene `auth_token`, `auth_usuario` y `cache_activos_asignados`; 19 activos cacheados; 0 pendientes en UI. | Correcto con hallazgo de frescura |
| Activos asignados | MS1 GraphQL productivo respondió `200`; 19 activos: 16 `ACTIVO`, 2 `EN_MANTENIMIENTO`, 1 `TRANSFERIDO`. | Correcto |
| IA/historial | MS2 productivo respondió `200` para historial de diagnósticos del activo de muestra; lista vacía. | Correcto |
| Cámara | Permiso `CAMERA` concedido; existen capturas temporales Vision Camera en caché. | Correcto con observación |
| GPS/mapa | Permisos `ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION` concedidos; existe `map_cache.canary`. | Correcto |
| Notificaciones | Permiso `POST_NOTIFICATIONS` concedido; MS3 productivo respondió `200` para notificaciones del usuario; lista vacía. | Correcto |
| Logs de app | `logcat` filtrado por PID de la app no mostró crash ni errores React Native recientes. | Correcto |
| Automatización UI | ADB bloqueó eventos táctiles por permiso `INJECT_EVENTS`. | Bloqueado por dispositivo |

## Verificaciones ejecutadas

```bash
adb devices
adb exec-out screencap -p
adb shell uiautomator dump /sdcard/window.xml
adb shell dumpsys package com.movilactivosfijos
adb shell run-as com.movilactivosfijos ls -R .
adb exec-out run-as com.movilactivosfijos cat databases/RKStorage
adb logcat -d --pid=<pid_app>
npm test -- --runInBand
```

También se usó Firefox MCP para abrir y capturar respuestas JSON productivas de health checks de MS1, MS2 y MS3.

## Alcance y límites de la prueba

No se ejecutaron acciones persistentes en producción: reportar incidencia, actualizar GPS, registrar diagnóstico IA, marcar notificaciones como leídas o crear operaciones pendientes. La corrida evitó modificar datos productivos.

La navegación funcional táctil completa queda pendiente hasta habilitar la inyección de eventos en el dispositivo o incorporar una herramienta de pruebas instrumentadas. Aun así, la sesión instalada, permisos nativos, caché offline, endpoints productivos, logs del proceso y pruebas Jest quedaron verificados.
