# Especificaciones de Casos de Uso — App Móvil (React Native)

**Componente**: App Móvil — Campo y Diagnóstico IA  
**Tecnología**: React Native (Expo o CLI) / AsyncStorage / expo-camera / expo-location / FCM  
**Usuarios**: Responsable de Área  
**CUs**: CU-34, CU-37 a CU-45

---

## Estructura del Proyecto Mobile

```
mobile/
├── package.json
├── app.json / app.config.ts    # Expo config
├── tsconfig.json
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Stack + Tab navigation
│   │   └── AuthNavigator.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ActivosScreen.tsx
│   │   ├── ActivoDetailScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── DiagnosticoScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── ReportarScreen.tsx
│   │   └── NotificacionesScreen.tsx
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── ms1-graphql.service.ts   # Apollo Client o axios para GraphQL
│   │   ├── ms2.service.ts           # REST a MS2
│   │   ├── offline.service.ts       # AsyncStorage wrapper
│   │   └── sync.service.ts          # Sincronización offline → online
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useLocation.ts
│   │   └── useNetworkStatus.ts
│   ├── store/                       # Estado global (Zustand o Redux Toolkit)
│   │   ├── auth.store.ts
│   │   └── activos.store.ts
│   └── components/
│       ├── ActivoCard.tsx
│       ├── DiagnosticoResult.tsx
│       └── OfflineBanner.tsx
```

---

## Recursos Nativos del Dispositivo (Requisito del Docente)

| Recurso                     | Biblioteca                                  | CUs que lo usan            |
| --------------------------- | ------------------------------------------- | -------------------------- |
| **Cámara**                  | `expo-camera`                               | CU-34, CU-35 (diagnóstico) |
| **GPS / Geolocalización**   | `expo-location`                             | CU-42                      |
| **Almacenamiento local**    | `@react-native-async-storage/async-storage` | CU-40, CU-45               |
| **Push Notifications**      | `expo-notifications` + FCM                  | CU-44                      |
| **Red (detección offline)** | `@react-native-community/netinfo`           | CU-40, CU-45               |

> Esto cumple el requisito del docente: ≥ 3 recursos nativos (cámara + GPS + almacenamiento local)

---

## Módulo 5 — Diagnóstico IA en Campo

### CU-34: Fotografiar activo con cámara del dispositivo

**Actor**: Responsable de Área  
**Precondiciones**: El usuario está autenticado en la app. El activo fue seleccionado.  
**Postcondiciones**: La imagen es capturada y almacenada temporalmente en el dispositivo lista para enviar a MS2.

**Flujo principal**:

1. El responsable selecciona un activo y toca "Fotografiar para diagnóstico".
2. La app abre la cámara nativa usando `expo-camera`.
3. El responsable encuadra el activo y toma la foto.
4. La app muestra una previsualización con opción "Usar esta foto" o "Tomar otra".
5. Al confirmar, la imagen se almacena en caché local y la app navega a `DiagnosticoScreen`.

**Notas técnicas**:

- Permisos: `Camera.requestCameraPermissionsAsync()`
- Guardar imagen: `captureRef()` o resultado de `CameraView.takePictureAsync({ quality: 0.8, base64: false })`
- Formato: JPEG, resolución recomendada: 224×224 (o enviar original y redimensionar en MS2)
- La imagen se convierte a `FormData` para el upload a MS2

**Implementación `CameraScreen.tsx`**:

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";

export function CameraScreen({ navigation, route }) {
  const { activoId } = route.params;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const tomarFoto = async () => {
    const foto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    navigation.navigate("Diagnostico", { activoId, imagenUri: foto.uri });
  };

  if (!permission?.granted) {
    return <PermissionsRequest onRequest={requestPermission} />;
  }

  return (
    <CameraView ref={cameraRef} style={{ flex: 1 }}>
      <ShutterButton onPress={tomarFoto} />
    </CameraView>
  );
}
```

---

### CU-37: Enviar imagen a MS2 y mostrar resultado del diagnóstico

**Actor**: Responsable de Área  
**Precondiciones**: La imagen fue capturada (CU-34). El dispositivo tiene conexión.  
**Postcondiciones**: El diagnóstico CNN es recibido y mostrado en pantalla. El resultado se guarda en el historial.

**Flujo principal**:

1. La app muestra `DiagnosticoScreen` con la imagen previa y el estado "Analizando...".
2. La app sube la imagen a MS2: `POST /api/ia/diagnostico` con `FormData: { imagen, activoId }`.
3. MS2 ejecuta el modelo CNN y retorna `{ estado, confianza, detalle }`.
4. La app muestra el resultado:
   - Estado: `BUENO` (verde) / `REQUIERE_MANTENIMIENTO` (amarillo) / `DETERIORADO` (rojo)
   - Porcentaje de confianza
   - Detalles de probabilidad por clase
5. Si el estado es `DETERIORADO` con alta confianza: mostrar banner de alerta y botón "Solicitar mantenimiento".
6. La app guarda el resultado en `AsyncStorage` (historial local).

**Alternativas**:

- 2a. Sin conexión: mostrar error "Sin conexión. El diagnóstico requiere internet".
- 2b. Error de MS2: mostrar "No se pudo procesar la imagen. Intente nuevamente".

**Notas técnicas**:

- `ms2.service.ts`: `diagnoscarActivo(activoId: string, imagenUri: string): Promise<DiagnosticoResult>`
- Usar `FormData` con `fetch` o `axios`:
  ```ts
  const formData = new FormData();
  formData.append("activoId", activoId);
  formData.append("imagen", {
    uri: imagenUri,
    type: "image/jpeg",
    name: "foto.jpg",
  } as any);
  const response = await axios.post(`${MS2_URL}/ia/diagnostico`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
  ```

---

### CU-38: Consultar historial de diagnósticos de un activo

**Actor**: Responsable de Área  
**Notas técnicas**:

- REST: `GET /api/documentos?activoId={id}&tipo=DIAGNOSTICO` en MS2
- O: consulta a DynamoDB vía MS2: `GET /api/ia/diagnosticos?activoId={id}`
- También mostrar diagnósticos guardados en `AsyncStorage` (incluye diagnósticos offline)
- Ordenar por fecha descendente

---

### CU-39: Solicitar orden de mantenimiento desde el diagnóstico

**Actor**: Responsable de Área  
**Precondiciones**: El diagnóstico indica estado `DETERIORADO` o `REQUIERE_MANTENIMIENTO`.  
**Postcondiciones**: Se crea una solicitud de mantenimiento en MS1. El administrador recibe notificación.

**Flujo principal**:

1. El responsable toca "Solicitar mantenimiento" en `DiagnosticoScreen`.
2. La app abre un formulario con observaciones precompletadas con el resultado del diagnóstico.
3. El responsable confirma.
4. La app llama a MS1 (GraphQL Mutation): `iniciarMantenimiento(activoId, observaciones)`.
5. MS1 cambia el estado del activo a `EN_MANTENIMIENTO` y emite webhook a MS3.
6. MS3 notifica al administrador por email.

**Notas técnicas**:

- `ms1-graphql.service.ts`: `iniciarMantenimiento(activoId: string, obs: string)`
- Mutation: `mutation { cambiarEstadoActivo(id: "{id}", estado: EN_MANTENIMIENTO, observacion: "{obs}") { id estado } }`
- Si sin conexión: guardar la solicitud en `AsyncStorage` con `pendingSync: true`

---

## Módulo 6 — Gestión en Campo

### CU-40: Consultar activos asignados al área en modo offline

**Actor**: Responsable de Área  
**Precondiciones**: El responsable tiene activos en caché local (sincronizados previamente).  
**Postcondiciones**: Se muestran los activos del área del responsable, incluso sin conexión.

**Flujo principal**:

1. La app detecta el estado de red con `NetInfo`.
2. **Si hay conexión**: La app llama a MS1 GraphQL: `activosPorArea(areaId)` y actualiza el caché.
3. **Si no hay conexión**: La app lee los activos de `AsyncStorage` con la clave `activos_area_{areaId}`.
4. Se muestra el banner "Modo offline — datos actualizados al {fechaUltimaSync}".

**Notas técnicas**:

- `offline.service.ts`:
  ```ts
  export async function getActivosLocal(areaId: string): Promise<Activo[]> {
    const json = await AsyncStorage.getItem(`activos_area_${areaId}`);
    return json ? JSON.parse(json) : [];
  }
  export async function saveActivosLocal(
    areaId: string,
    activos: Activo[],
  ): Promise<void> {
    await AsyncStorage.setItem(
      `activos_area_${areaId}`,
      JSON.stringify(activos),
    );
    await AsyncStorage.setItem(
      `sync_timestamp_${areaId}`,
      new Date().toISOString(),
    );
  }
  ```

---

### CU-41: Ver detalle de activo en campo

**Actor**: Responsable de Área  
**Notas técnicas**:

- `ActivoDetailScreen` muestra: código, nombre, estado, área, valor en libros, último diagnóstico, documentos
- Si hay conexión: carga datos frescos de MS1 GraphQL: `activo(id)`
- Si no hay conexión: muestra datos del caché local
- Botones: "Fotografiar para diagnóstico" (→ CU-34), "Solicitar mantenimiento" (→ CU-39), "Ver en mapa" (→ CU-42)

---

### CU-42: Geolocalizar activo y registrar coordenadas GPS

**Actor**: Responsable de Área  
**Precondiciones**: El responsable concedió permiso de ubicación. El dispositivo tiene GPS activo.  
**Postcondiciones**: Las coordenadas del activo (latitud, longitud) se guardan en MS1.

**Flujo principal**:

1. El responsable toca "Registrar ubicación" en la ficha del activo.
2. La app solicita permiso de ubicación si no fue concedido.
3. La app obtiene la ubicación actual con `expo-location`.
4. La app muestra un mapa (react-native-maps o similar) con un pin en la ubicación.
5. El responsable confirma la ubicación.
6. La app llama a MS1 GraphQL Mutation para guardar las coordenadas.

**Notas técnicas**:

- `useLocation.ts`:
  ```ts
  export async function obtenerUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Permiso de ubicación denegado");
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  }
  ```
- GraphQL Mutation: `actualizarUbicacionActivo(id: ID!, latitud: Float!, longitud: Float!): Activo!`
- Agregar campos `latitud` y `longitud` a la entidad `Activo` en MS1

---

### CU-43: Reportar problema o solicitar revisión vía WhatsApp

**Actor**: Responsable de Área  
**Notas técnicas**:

- La app abre WhatsApp con un mensaje preformateado usando deep link:
  ```ts
  const mensaje = encodeURIComponent(
    `🔧 Solicitud de revisión\nActivo: ${codigo} — ${nombre}\nEstado: ${estado}\nUbicación: ${area}\nObservación: ${observacion}`,
  );
  const url = `whatsapp://send?phone=${WHATSAPP_EMPRESARIAL}&text=${mensaje}`;
  await Linking.openURL(url);
  ```
- `WHATSAPP_EMPRESARIAL`: número configurado en `environment.ts` de la app
- Este CU no requiere conexión con MS3; abre directamente WhatsApp del dispositivo
- El mensaje llega a MS3 como un mensaje entrante normal (CU-67 se activa en MS3)

---

### CU-44: Recibir notificación push de alerta de mantenimiento

**Actor**: Responsable de Área  
**Precondiciones**: La app está instalada y los permisos de notificación fueron concedidos. El FCM token del dispositivo está registrado en MS1.  
**Postcondiciones**: El responsable recibe una notificación push visible en la barra de notificaciones.

**Flujo principal**:

1. Al iniciar sesión, la app registra el FCM token del dispositivo en MS1.
2. MS3 envía la notificación push vía FCM al token del dispositivo.
3. La app recibe la notificación y la muestra.
4. Al tocar la notificación, la app navega al activo correspondiente.

**Notas técnicas**:

- `expo-notifications`:
  ```ts
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Enviar token a MS1: mutation registrarFCMToken(userId, token)
  ```
- `app.json` / `app.config.ts`: configurar `android.googleServicesFile` y `ios.googleServicesFile`
- Handler de notificaciones: `Notifications.addNotificationResponseReceivedListener`

---

### CU-45: Sincronizar datos offline con el servidor al recuperar conexión

**Actor**: Sistema (automático al detectar conectividad)  
**Precondiciones**: Hay operaciones pendientes en `AsyncStorage` con `pendingSync: true`. La conexión se restableció.  
**Postcondiciones**: Las operaciones pendientes son enviadas a MS1. El caché local se actualiza.

**Flujo principal**:

1. `sync.service.ts` monitorea el estado de red con `NetInfo.addEventListener`.
2. Al detectar que la conexión se restableció (`isConnected = true`):
   a. Carga las operaciones pendientes de `AsyncStorage`.
   b. Para cada operación: la envía a MS1 (GraphQL Mutation correspondiente).
   c. Si tiene éxito: elimina la operación de la cola local.
   d. Si falla: mantiene en cola y reintenta en la próxima reconexión.
3. Descarga los activos actualizados del servidor y actualiza el caché.
4. Muestra notificación: "Sincronización completada — {n} operaciones enviadas".

**Notas técnicas**:

```ts
// sync.service.ts
export async function sincronizar(areaId: string, token: string) {
  const pendientes = await getPendingOperations();
  for (const op of pendientes) {
    try {
      await ejecutarOperacion(op, token);
      await removePendingOperation(op.id);
    } catch (e) {
      console.warn(`No se pudo sincronizar operación ${op.id}:`, e);
    }
  }
  const activos = await ms1GraphqlService.getActivosPorArea(areaId, token);
  await saveActivosLocal(areaId, activos);
}
```
