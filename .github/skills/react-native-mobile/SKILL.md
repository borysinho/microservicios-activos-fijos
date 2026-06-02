---
name: react-native-mobile
description: >
  Implement React Native screens, navigation, camera, GPS, offline mode, and AI
  integration for the app móvil of the Sistema de Activos Fijos. Use this skill when
  working on the mobile app: building screens for field workers, implementing camera
  capture for AI diagnosis, GPS geolocation, offline asset cache, push notifications,
  or integrating with MS1/MS2/MS3 REST APIs.
  Use when: creating React Native screens, implementing camera access, GPS tracking,
  offline mode with AsyncStorage, IA diagnosis flow, push notifications, or any
  mobile-specific feature for the Responsable de Área.
---

# React Native Mobile App — Sistema de Activos Fijos

This skill guides implementation of the field worker mobile app built with
React Native 0.85.x. It is **not** a replica of the web frontend — it targets
Responsables de Área doing field work.

## Mandatory Native Resources (professor requirement: ≥3)

| Resource          | Library                                     | Use                                |
| ----------------- | ------------------------------------------- | ---------------------------------- |
| **Camera**        | `react-native-vision-camera`                | Photograph assets for AI diagnosis |
| **GPS**           | `react-native-geolocation-service`          | Record asset physical location     |
| **Local Storage** | `@react-native-async-storage/async-storage` | Offline cache of assigned assets   |

All three must be implemented. Do not omit any.

## App Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── ActivosScreen.tsx          # List of assigned assets (offline-capable)
│   │   ├── ActivoDetalleScreen.tsx    # Asset detail + actions
│   │   ├── DiagnosticoIAScreen.tsx    # Camera → AI diagnosis flow
│   │   ├── MapaScreen.tsx             # GPS + asset location
│   │   └── NotificacionesScreen.tsx
│   ├── services/
│   │   ├── ms1Service.ts              # REST calls to MS1
│   │   ├── ms2Service.ts              # REST calls to MS2 (IA diagnosis)
│   │   ├── ms3Service.ts              # REST calls to MS3
│   │   └── offlineCache.ts            # AsyncStorage wrapper
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useGPS.ts
│   │   └── useOfflineActivos.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx           # React Navigation stack
│   └── types/
│       └── activo.types.ts
├── android/
├── ios/
└── package.json
```

## AI Diagnosis Flow (Example 2 — core feature)

```typescript
// screens/DiagnosticoIAScreen.tsx
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import { ms2Service } from '../services/ms2Service';

export function DiagnosticoIAScreen({ route }) {
  const { activoId } = route.params;
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);

  const handleDiagnostico = async () => {
    // 1. Capture photo
    const photo = await camera.current.takePhoto({ quality: 0.8 });

    // 2. Get GPS coordinates
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      Geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );

    // 3. Send to MS2
    const resultado = await ms2Service.diagnosticarImagen({
      imagePath: photo.path,
      activoId,
      latitud: position.coords.latitude,
      longitud: position.coords.longitude,
    });

    // 4. Navigate to result screen
    navigation.navigate('ResultadoDiagnostico', { resultado });
  };

  return (
    <Camera ref={camera} device={device} isActive style={StyleSheet.absoluteFill} photo />
  );
}
```

## MS2 Service — IA Diagnosis

```typescript
// services/ms2Service.ts
const MS2_BASE_URL = process.env.MS2_BASE_URL;

export const ms2Service = {
  async diagnosticarImagen(params: {
    imagePath: string;
    activoId: string;
    latitud: number;
    longitud: number;
  }) {
    const formData = new FormData();
    formData.append("imagen", {
      uri: `file://${params.imagePath}`,
      type: "image/jpeg",
      name: "diagnostico.jpg",
    } as any);
    formData.append("activoId", params.activoId);
    formData.append("latitud", String(params.latitud));
    formData.append("longitud", String(params.longitud));

    const res = await fetch(`${MS2_BASE_URL}/ia/diagnostico-imagen`, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!res.ok) throw new Error("Error en diagnóstico IA");
    return res.json() as Promise<DiagnosticoResponse>;
  },
};

interface DiagnosticoResponse {
  estado: "bueno" | "deteriorado" | "requiere_mantenimiento" | "oxidado";
  confianza: number;
  detalle: string;
  recomendacion: string;
}
```

## Offline Mode — AsyncStorage Cache

```typescript
// services/offlineCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "activos_asignados";

export const offlineCache = {
  async save(activos: Activo[]): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(activos));
  },

  async load(): Promise<Activo[]> {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};
```

```typescript
// hooks/useOfflineActivos.ts
import NetInfo from "@react-native-community/netinfo";

export function useOfflineActivos(usuarioId: string) {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const cargar = async () => {
      if (isOffline) {
        setActivos(await offlineCache.load());
      } else {
        try {
          const data = await ms1Service.getActivosAsignados(usuarioId);
          setActivos(data);
          await offlineCache.save(data); // Update cache when online
        } catch {
          setActivos(await offlineCache.load()); // Fallback to cache
        }
      }
    };
    cargar();
  }, [isOffline, usuarioId]);

  return { activos, isOffline };
}
```

## GPS — Asset Geolocation

```typescript
// hooks/useGPS.ts
import Geolocation from "react-native-geolocation-service";
import { PermissionsAndroid, Platform } from "react-native";

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS handled via Info.plist
}

export function useGPS() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const obtenerUbicacion = () => {
    Geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return { coords, obtenerUbicacion };
}
```

## Navigation Structure

```typescript
// navigation/AppNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Activos" component={ActivosScreen} />
      <Stack.Screen name="ActivoDetalle" component={ActivoDetalleScreen} />
      <Stack.Screen name="DiagnosticoIA" component={DiagnosticoIAScreen} />
      <Stack.Screen name="Mapa" component={MapaScreen} />
      <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
    </Stack.Navigator>
  );
}
```

## Key Rules

- The app communicates with **MS1, MS2, MS3 via REST only** — no GraphQL.
- **Never** send AI diagnosis without network — show clear offline warning.
- Request camera and GPS permissions at first use, not on app startup.
- Cache the asset list to AsyncStorage every time it's fetched while online.
- Display `isOffline` indicator prominently in `ActivosScreen` when using cached data.

## Environment Variables (.env)

```
MS1_BASE_URL=https://ms1.azurewebsites.net/api
MS2_BASE_URL=https://ms2.aws.example.com/api
MS3_BASE_URL=https://ms3-gcp.a.run.app/api
```

Use `react-native-config` to access `.env` values in the app.
