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
| Lista de activos        | `ActivosScreen.tsx`              | CU-40, CU-41                      |
| Detalle de activo       | `ActivoDetalleScreen.tsx`        | CU-38, CU-39, CU-41, CU-42, CU-43 |
| Cámara / Diagnóstico IA | `DiagnosticoIAScreen.tsx`        | CU-34, CU-35, CU-36               |
| Resultado diagnóstico   | `ResultadoDiagnosticoScreen.tsx` | CU-37                             |
| Mapa GPS                | `MapaScreen.tsx`                 | CU-42                             |
| Herramientas de campo   | `HerramientasScreen.tsx`         | Acceso a cámara, GPS, offline, MS3 |
| Notificaciones          | `NotificacionesScreen.tsx`       | CU-44                             |

## Instalación

```bash
npm install
# Android
npx react-native run-android
# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

## Ejecutar en emulador Android

Con el emulador abierto, ejecuta estos dos comandos desde `mobile/`, en dos terminales:

```bash
npm run start
npm run android
```

El primer comando levanta Metro en el puerto `8088`; el segundo instala y abre la app en el emulador.
Para ahorrar espacio en el AVD, `npm run android` instala solo la arquitectura activa del emulador; las funcionalidades JS de la app se cargan completas desde Metro.

## Variables de entorno

Copia `.env.example` a `.env` y configura las URLs de los microservicios:

```
MS1_BASE_URL=https://ms1.azurewebsites.net
MS2_BASE_URL=https://ms2.aws.example.com/api
MS3_BASE_URL=https://ms3-gcp.a.run.app/api
```

Para el MS1 desplegado actualmente en Azure:

```
MS1_BASE_URL=https://ms1-activos-fijos-031456.azurewebsites.net
```

## Flujo principal — Diagnóstico IA

1. El responsable selecciona un activo de su lista (CU-40, CU-41)
2. Pulsa **"Diagnóstico IA"** → se activa la cámara (CU-34)
3. Toma la fotografía → la app obtiene coordenadas GPS (CU-42)
4. La imagen se envía a MS2 vía `multipart/form-data` (CU-35)
5. MS2 procesa con CNN y retorna estado + confianza (CU-36)
6. El resultado se muestra y queda guardado en el historial (CU-37)

## Modo offline (CU-40, CU-45)

- Al iniciar sesión online → los activos se guardan en `AsyncStorage`
- Si no hay conexión → se muestran los datos en caché con banner indicador
- Las operaciones realizadas sin conexión se encolan y sincronizan automáticamente al recuperar la red
