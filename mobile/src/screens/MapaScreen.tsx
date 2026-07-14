import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/activo.types";
import { useGPS } from "../hooks/useGPS";
import { ms1Service } from "../services/ms1Service";
import { offlineCache } from "../services/offlineCache";
import { useSession } from "../hooks/useSession";
import { canMobile } from "../auth/mobilePermissions";

type Props = NativeStackScreenProps<RootStackParamList, "Mapa">;

async function guardarUbicacionPendiente(
  activoId: string,
  latitud: number,
  longitud: number,
): Promise<void> {
  await offlineCache.enqueuePendingOp({
    tipo: "actualizar_ubicacion",
    payload: { activoId, latitud, longitud },
  });
}

/**
 * CU-42: Geolocalizar activo y registrar coordenadas GPS
 * Muestra el mapa con la posición actual y la ubicación registrada del activo
 */
export default function MapaScreen({ route, navigation: _navigation }: Props) {
  const {
    activoId,
    latitud: latitudInicial,
    longitud: longitudInicial,
  } = route.params ?? {};
  const mapRef = useRef<MapView>(null);
  const { coords, cargando: gpsLoading, obtenerUbicacion } = useGPS();
  const { usuario, cargandoSesion } = useSession();
  const [guardando, setGuardando] = useState(false);
  const [ubicacionActivo, setUbicacionActivo] = useState<{
    lat: number;
    lng: number;
  } | null>(
    latitudInicial != null && longitudInicial != null
      ? { lat: latitudInicial, lng: longitudInicial }
      : null,
  );

  const puedeRegistrarGps = canMobile(usuario?.rol, "activos.registrarGPS");

  useEffect(() => {
    if (!cargandoSesion && puedeRegistrarGps) {
      obtenerUbicacion().catch(() => undefined);
    }
  }, [cargandoSesion, obtenerUbicacion, puedeRegistrarGps]);

  useEffect(() => {
    // Centrar el mapa en la ubicación del activo si existe
    if (ubicacionActivo && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: ubicacionActivo.lat,
        longitude: ubicacionActivo.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [ubicacionActivo]);

  useEffect(() => {
    if (!ubicacionActivo && coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitud,
        longitude: coords.longitud,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    }
  }, [coords, ubicacionActivo]);

  const handleRegistrarUbicacion = async () => {
    if (!puedeRegistrarGps) {
      Alert.alert("Acceso restringido", "Tu perfil no puede registrar GPS.");
      return;
    }

    setGuardando(true);
    try {
      const coordenadas = await obtenerUbicacion();
      const session = await offlineCache.loadSession();

      if (!activoId) {
        mapRef.current?.animateToRegion({
          latitude: coordenadas.latitud,
          longitude: coordenadas.longitud,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
        Alert.alert(
          "Ubicación actual",
          "Selecciona un activo para registrar estas coordenadas en MS1.",
        );
        return;
      }

      const actualizarMarcador = () => {
        setUbicacionActivo({
          lat: coordenadas.latitud,
          lng: coordenadas.longitud,
        });

        mapRef.current?.animateToRegion({
          latitude: coordenadas.latitud,
          longitude: coordenadas.longitud,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        });
      };

      if (session) {
        try {
          await ms1Service.actualizarUbicacion(
            activoId,
            coordenadas.latitud,
            coordenadas.longitud,
          );
          actualizarMarcador();
          Alert.alert("Éxito", "Ubicación GPS registrada correctamente.");
          return;
        } catch {
          await guardarUbicacionPendiente(
            activoId,
            coordenadas.latitud,
            coordenadas.longitud,
          );
        }
      } else {
        await guardarUbicacionPendiente(
          activoId,
          coordenadas.latitud,
          coordenadas.longitud,
        );
      }

      actualizarMarcador();
      Alert.alert(
        "Sin conexión",
        "La ubicación se sincronizará al recuperar la conexión.",
      );
    } catch (err: any) {
      Alert.alert("Error GPS", err.message);
    } finally {
      setGuardando(false);
    }
  };

  const initialRegion = ubicacionActivo
    ? {
        latitude: ubicacionActivo.lat,
        longitude: ubicacionActivo.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : coords
      ? {
          latitude: coords.latitud,
          longitude: coords.longitud,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }
    : {
        latitude: -17.7833, // Santa Cruz de la Sierra (fallback)
        longitude: -63.1821,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marcador de posición registrada del activo */}
        {ubicacionActivo && (
          <Marker
            coordinate={{
              latitude: ubicacionActivo.lat,
              longitude: ubicacionActivo.lng,
            }}
            title="Activo"
            description="Ubicación registrada del activo"
            pinColor="#1565C0"
          />
        )}

        {/* Marcador de posición GPS actual */}
        {coords && (
          <Marker
            coordinate={{
              latitude: coords.latitud,
              longitude: coords.longitud,
            }}
            title="Mi ubicación"
            description="Posición GPS actual"
            pinColor="#43A047"
          />
        )}
      </MapView>

      {/* Panel inferior */}
      <View style={styles.panel}>
        {ubicacionActivo && (
          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>📍 Ubicación registrada</Text>
            <Text style={styles.coordsValor}>
              {ubicacionActivo.lat.toFixed(6)}, {ubicacionActivo.lng.toFixed(6)}
            </Text>
          </View>
        )}

        {coords && (
          <View style={[styles.coordsCard, { backgroundColor: "#E8F5E9" }]}>
            <Text style={[styles.coordsLabel, { color: "#2E7D32" }]}>
              🟢 Mi ubicación actual
            </Text>
            <Text style={[styles.coordsValor, { color: "#2E7D32" }]}>
              {coords.latitud.toFixed(6)}, {coords.longitud.toFixed(6)}
            </Text>
            {coords.precision && (
              <Text style={styles.precision}>
                Precisión: ±{coords.precision.toFixed(0)}m
              </Text>
            )}
          </View>
        )}

        {puedeRegistrarGps && (
          <TouchableOpacity
            style={[styles.btnRegistrar, guardando && styles.btnDeshabilitado]}
            onPress={handleRegistrarUbicacion}
            disabled={guardando || gpsLoading}
          >
            {guardando || gpsLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnTexto}>
                {activoId
                  ? "📍 Registrar ubicación GPS del activo"
                  : "📍 Obtener mi ubicación GPS"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapa: { flex: 1 },
  panel: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  coordsCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  coordsLabel: { fontSize: 12, color: "#1565C0", fontWeight: "600" },
  coordsValor: {
    fontSize: 14,
    color: "#0D47A1",
    fontWeight: "700",
    marginTop: 2,
  },
  precision: { fontSize: 11, color: "#546E7A", marginTop: 2 },
  btnRegistrar: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnDeshabilitado: { backgroundColor: "#90A4AE" },
  btnTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
