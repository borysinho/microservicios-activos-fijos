# App Móvil — Activos Fijos (React Native)

**Tecnología**: React Native 0.75.4  
**Plataformas**: Android (mín. API 24) + iOS (mín. 13.4)

## Recursos nativos implementados (≥3 requeridos)

| Recurso                 | Librería                                    | CU cubiertos               |
| ----------------------- | ------------------------------------------- | -------------------------- |
| 📷 Cámara               | `react-native-vision-camera`                | CU-34, CU-35, CU-36, CU-37 |
| 📍 GPS                  | `react-native-geolocation-service`          | CU-42                      |
| 💾 Almacenamiento local | `@react-native-async-storage/async-storage` | CU-40, CU-45               |

## Pantallas implementadas

| Pantalla                | Archivo                          | CUs                               |
| ----------------------- | -------------------------------- | --------------------------------- |
| Login                   | `LoginScreen.tsx`                | Autenticación JWT                 |
| Inicio por perfil       | `HerramientasScreen.tsx`         | Accesos por rol, offline, sesión  |
| Lista de activos        | `ActivosScreen.tsx`              | CU-40, CU-41, búsqueda y filtros  |
| Detalle de activo       | `ActivoDetalleScreen.tsx`        | CU-38, CU-39, CU-41, CU-42, CU-43 |
| Cámara / Verificación IA | `DiagnosticoIAScreen.tsx`        | CU-34, CU-35, CU-36               |
| Resultado verificación   | `ResultadoDiagnosticoScreen.tsx` | CU-37                             |
| Mapa GPS                | `MapaScreen.tsx`                 | CU-42                             |
| Notificaciones          | `NotificacionesScreen.tsx`       | CU-44                             |

## Experiencia por perfil

La app movil ya no expone todas las opciones a todos los usuarios. La navegación se arma desde la sesión guardada en `AsyncStorage` y la matriz de permisos de `src/auth/mobilePermissions.ts`.

| Rol | Opciones visibles | Acciones bloqueadas |
| --- | --- | --- |
| `ADMINISTRADOR` | Inicio de supervisión, activos, IA, GPS, incidencias, alertas, estado offline | Ninguna acción móvil operativa |
| `RESPONSABLE_AREA` | Inicio de trabajo de campo, activos asignados, IA, GPS, incidencias, alertas, estado offline | Funciones administrativas que pertenecen a la web |
| `AUDITOR` | Inicio de revisión, consulta de activos, evidencia IA, predicción ML, mapa registrado, alertas | Diagnóstico IA, registro GPS, mantenimiento y reportes operativos |
| `SOLO_LECTURA` | Inicio de consulta, activos, predicción ML, mapa registrado, alertas | Toda acción que cambie estado, GPS, reportes o mantenimiento |

La restricción se aplica en tres niveles:

- Menú principal: el panel de inicio solo muestra accesos permitidos para el rol.
- Listas y detalle: los botones de acción se ocultan cuando el perfil no puede usarlos.
- Pantallas directas: cámara IA, mapa e incidencias validan permisos antes de ejecutar acciones.

## Estructura funcional orientada al cliente final

El flujo principal queda organizado así:

1. **Inicio**: panel por perfil con estado de sincronización, accesos relevantes y cierre de sesión.
2. **Activos**: lista con búsqueda por código, nombre, categoría o área; filtros por estado; indicadores offline/sync.
3. **Detalle**: ficha del activo con información general, última evidencia IA, predicción de vida útil y ubicación registrada.
4. **Incidencias**: seguimiento de casos activos, pendientes por sincronizar y registro de nuevos reportes o solicitudes de mantenimiento.
5. **Acciones de campo**: IA, GPS e incidencias aparecen solo para administrador/responsable de área.
6. **Alertas**: notificaciones push y avisos generados por automatizaciones del sistema.

## Instalación

```bash
npm install
```

## Configuracion de servicios

La app usa `react-native-config` y selecciona el archivo de variables con `ENVFILE`.

| Modo | Archivo | Uso |
| --- | --- | --- |
| Debug LAN | `.env.development` | Dispositivo fisico o emulador apuntando a la IP LAN del servidor local |
| Debug con USB/reverse | `.env.reverse` | Emulador/dispositivo conectado por USB con `adb reverse` |
| Release produccion | `.env.production` | Build release apuntando a URLs publicas de MS1, MS2 y MS3 |

### Desarrollo por IP LAN

Edita `.env.development` con la IP LAN del equipo/servidor donde estan corriendo los microservicios:

```dotenv
MS1_BASE_URL=http://10.109.210.250:8081
MS2_BASE_URL=http://10.109.210.250:8002/api
MS3_BASE_URL=http://10.109.210.250:3000/api
```

MS1 debe exponer `8081`, MS2 `8002` y MS3 `3000` en esa maquina. El dispositivo movil debe estar en la misma red LAN y poder alcanzar esa IP.

### Produccion

Edita `.env.production` con las URLs publicas reales de cada microservicio:

```dotenv
MS1_BASE_URL=https://ms1-activos-fijos-031456.azurewebsites.net
MS2_BASE_URL=https://<ms2-aws>/api
MS3_BASE_URL=https://<ms3-gcp>/api
```

MS1 no lleva `/graphql` en la variable porque el servicio `ms1Service.ts` agrega ese path internamente. MS2 y MS3 si deben incluir `/api`.

### Llave Google/Firebase

La app Android esta registrada en Firebase dentro del proyecto `activos-fijos-uagrm-2026` con el paquete `com.movilactivosfijos`. La llave de Google/Firebase no se versiona. Debe vivir en `mobile/.env`:

```dotenv
GOOGLE_API_KEY=<nueva_llave_google>
```

El build genera `android/app/google-services.json` desde `android/app/google-services.json.example`; ese archivo generado queda ignorado por Git. Si se rota la llave en Firebase, actualiza `GOOGLE_API_KEY` en los `.env` locales y vuelve a ejecutar `./gradlew :app:generateGoogleServicesJson` desde `mobile/android`.

Para que `react-native-maps` pueda cargar los tiles de Google Maps en debug, la API key debe tener habilitada la API **Maps SDK for Android** y permitir esta aplicacion Android:

```text
Package name: com.movilactivosfijos
SHA-1 debug: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Si Google Cloud Console rechaza la llave, el mapa se monta pero queda en blanco o beige con el logo de Google y `logcat` muestra `Google Android Maps SDK: Authorization failure`.

## Ejecutar en debug contra servicios LAN

Con el emulador o dispositivo conectado, ejecuta desde `mobile/`:

```bash
npm run start:debug
npm run android:debug:lan
```

Atajos equivalentes:

```bash
npm run android
npm run android:debug
```

Para iOS:

```bash
npm run ios:debug:lan
```

## Ejecutar debug con adb reverse

Este modo es alternativo al LAN. Usa `127.0.0.1` dentro del dispositivo y reenvia puertos por USB:

```bash
npm run start:debug
npm run android:debug:reverse
```

Puertos reenviados:

- Metro: `8088`
- MS1: `8081`
- MS2: `8002`
- MS3: `3000`

## Ejecutar release contra produccion

Para instalar y abrir un build release en Android apuntando a `.env.production`:

```bash
npm run android:release:prod
```

Para solo generar el APK release:

```bash
npm run android:build:release
```

Para iOS release:

```bash
npm run ios:release:prod
```

## Flujo principal — Verificación IA

1. El administrador o responsable selecciona un activo de su lista (CU-40, CU-41)
2. Pulsa **"Verificación IA"** → se activa la cámara (CU-34)
3. Toma la fotografía → la app obtiene coordenadas GPS (CU-42)
4. La imagen se envía a MS2 vía `multipart/form-data` (CU-35)
5. MS2 valida calidad, evidencia visual y posible similitud con imagen histórica (CU-36)
6. El resultado se muestra y queda guardado en el historial como evidencia auditable (CU-37)

## Modo offline (CU-40, CU-45)

- Al iniciar sesión online → los activos se guardan en `AsyncStorage`
- Si no hay conexión → se muestran los datos en caché con banner indicador
- Las operaciones realizadas sin conexión se encolan y sincronizan automáticamente al recuperar la red
