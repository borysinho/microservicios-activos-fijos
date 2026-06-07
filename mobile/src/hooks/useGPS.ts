import { useState, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import Geolocation from "react-native-geolocation-service";

export interface Coordenadas {
  latitud: number;
  longitud: number;
  precision?: number;
}

interface UseGPSReturn {
  coords: Coordenadas | null;
  cargando: boolean;
  error: string | null;
  obtenerUbicacion: () => Promise<Coordenadas>;
}

/** Solicitar permiso de ubicación en Android (en iOS se gestiona via Info.plist) */
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const resultado = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Permiso de ubicación",
        message:
          "La app necesita acceder a tu ubicación para registrar la posición del activo.",
        buttonPositive: "Permitir",
        buttonNegative: "Denegar",
      },
    );
    return resultado === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS: permisos declarados en Info.plist
}

/** Hook de GPS para obtener ubicación del activo (CU-42) */
export function useGPS(): UseGPSReturn {
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerUbicacion = useCallback((): Promise<Coordenadas> => {
    return new Promise(async (resolve, reject) => {
      setCargando(true);
      setError(null);

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        const msg = "Permiso de ubicación denegado";
        setError(msg);
        setCargando(false);
        reject(new Error(msg));
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const resultado: Coordenadas = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
          };
          setCoords(resultado);
          setCargando(false);
          resolve(resultado);
        },
        (err) => {
          const msg = `Error GPS: ${err.message}`;
          setError(msg);
          setCargando(false);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    });
  }, []);

  return { coords, cargando, error, obtenerUbicacion };
}
