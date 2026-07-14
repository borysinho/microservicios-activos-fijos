import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Activo, RootStackParamList } from "../types/activo.types";
import { canMobile } from "../auth/mobilePermissions";
import { useGPS } from "../hooks/useGPS";
import { useOfflineActivos } from "../hooks/useOfflineActivos";
import { useSession } from "../hooks/useSession";

type Props = NativeStackScreenProps<RootStackParamList, "UbicacionGPSInicio">;

function tieneUbicacion(activo: Activo): boolean {
  return activo.latitud != null && activo.longitud != null;
}

export default function UbicacionGPSInicioScreen({ navigation }: Props) {
  const { usuario, cargandoSesion } = useSession();
  const [busqueda, setBusqueda] = useState("");
  const { coords, cargando: gpsLoading, error: gpsError, obtenerUbicacion } = useGPS();

  const handleSessionExpired = useCallback(() => {
    navigation.replace("Login");
  }, [navigation]);

  const {
    activos,
    isOffline,
    cargando,
    error,
    refrescar,
    pendientesSincronizacion,
  } = useOfflineActivos(usuario?.id ?? "", {
    onSessionExpired: handleSessionExpired,
  });

  const puedeRegistrarGps = canMobile(usuario?.rol, "activos.registrarGPS");

  const metricas = useMemo(() => {
    const registrados = activos.filter(tieneUbicacion).length;
    return {
      total: activos.length,
      registrados,
      pendientes: activos.length - registrados,
    };
  }, [activos]);

  const activosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return activos
      .filter((activo) => {
        if (!texto) {
          return true;
        }
        return (
          activo.codigo.toLowerCase().includes(texto) ||
          activo.nombre.toLowerCase().includes(texto) ||
          activo.area?.nombre.toLowerCase().includes(texto) ||
          activo.ubicacion?.toLowerCase().includes(texto)
        );
      })
      .slice()
      .sort((a, b) => Number(tieneUbicacion(a)) - Number(tieneUbicacion(b)));
  }, [activos, busqueda]);

  const localizar = async () => {
    try {
      await obtenerUbicacion();
    } catch (err: any) {
      Alert.alert("GPS no disponible", err.message ?? "No se pudo obtener GPS.");
    }
  };

  if (cargandoSesion || (cargando && activos.length === 0)) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!puedeRegistrarGps) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.tituloVacio}>Acceso restringido</Text>
        <Text style={styles.textoVacio}>
          Tu perfil puede consultar activos, pero no registrar coordenadas GPS
          desde la app movil.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={refrescar}
          colors={["#1565C0"]}
        />
      }
    >
      {isOffline && (
        <View style={styles.bannerOffline}>
          <Text style={styles.bannerTexto}>
            📵 Sin conexion - los cambios GPS se guardaran para sincronizar
          </Text>
        </View>
      )}

      {pendientesSincronizacion > 0 && !isOffline && (
        <View style={styles.bannerSync}>
          <Text style={styles.bannerTexto}>
            🔄 {pendientesSincronizacion} operacion(es) pendiente(s)
          </Text>
        </View>
      )}

      {(error || gpsError) && !isOffline && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerTexto}>⚠️ {error ?? gpsError}</Text>
        </View>
      )}

      <View style={styles.resumen}>
        <Text style={styles.resumenEtiqueta}>GPS DE CAMPO</Text>
        <Text style={styles.resumenTitulo}>Ubicacion GPS</Text>
        <Text style={styles.resumenTexto}>
          Registra coordenadas del activo, confirma el marcador en mapa y deja
          la actualizacion lista para sincronizar.
        </Text>
        <View style={styles.metricas}>
          <Metrica valor={metricas.registrados} label="Con GPS" />
          <Metrica valor={metricas.pendientes} label="Pendientes" />
          <Metrica valor={metricas.total} label="Activos" />
        </View>
      </View>

      <View style={styles.gpsPanel}>
        <View style={styles.gpsPanelInfo}>
          <Text style={styles.gpsTitulo}>Posicion del dispositivo</Text>
          <Text style={styles.gpsTexto}>
            {coords
              ? `${coords.latitud.toFixed(6)}, ${coords.longitud.toFixed(6)}`
              : "Todavia no se obtuvo una lectura GPS."}
          </Text>
          {coords?.precision && (
            <Text style={styles.gpsPrecision}>
              Precision aproximada: ±{coords.precision.toFixed(0)}m
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.btnLocalizar, gpsLoading && styles.btnDeshabilitado]}
          onPress={localizar}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnLocalizarTexto}>Obtener GPS</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
          <Text style={styles.tituloSeccion}>Activos para geolocalizar</Text>
          <TouchableOpacity
            style={styles.btnMapaGeneral}
            onPress={() => navigation.navigate("Mapa", {})}
          >
            <Text style={styles.btnMapaGeneralTexto}>Mapa</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por codigo, nombre, area o ubicacion"
          placeholderTextColor="#90A4AE"
          autoCapitalize="none"
        />

        {activosFiltrados.length === 0 ? (
          <Text style={styles.textoVacio}>No hay activos para geolocalizar.</Text>
        ) : (
          activosFiltrados.map((activo) => (
            <ActivoGPSCard
              key={activo.id}
              activo={activo}
              onMapa={() =>
                navigation.navigate("Mapa", {
                  activoId: activo.id,
                  latitud: activo.latitud,
                  longitud: activo.longitud,
                })
              }
              onDetalle={() =>
                navigation.navigate("ActivoDetalle", { activoId: activo.id })
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Metrica({ valor, label }: { valor: number; label: string }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaValor}>{valor}</Text>
      <Text style={styles.metricaLabel}>{label}</Text>
    </View>
  );
}

function ActivoGPSCard({
  activo,
  onMapa,
  onDetalle,
}: {
  activo: Activo;
  onMapa: () => void;
  onDetalle: () => void;
}) {
  const registrado = tieneUbicacion(activo);

  return (
    <View style={[styles.activoCard, !registrado && styles.activoCardPendiente]}>
      <View style={styles.activoHeader}>
        <View style={styles.activoTexto}>
          <Text style={styles.activoCodigo}>{activo.codigo}</Text>
          <Text style={styles.activoNombre}>{activo.nombre}</Text>
        </View>
        <View
          style={[
            styles.estadoBadge,
            registrado ? styles.estadoRegistrado : styles.estadoPendiente,
          ]}
        >
          <Text
            style={[
              styles.estadoTexto,
              registrado ? styles.estadoTextoRegistrado : styles.estadoTextoPendiente,
            ]}
          >
            {registrado ? "GPS OK" : "SIN GPS"}
          </Text>
        </View>
      </View>

      <Text style={styles.activoMeta}>
        {activo.area?.nombre ?? "Sin area"} ·{" "}
        {activo.ubicacion ?? "Ubicacion descriptiva no registrada"}
      </Text>

      <View style={styles.coordenadas}>
        <Text style={styles.coordenadasLabel}>Coordenadas registradas</Text>
        <Text style={styles.coordenadasValor}>
          {registrado
            ? `${activo.latitud?.toFixed(6)}, ${activo.longitud?.toFixed(6)}`
            : "Pendiente de registro"}
        </Text>
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.btnSecundario} onPress={onDetalle}>
          <Text style={styles.btnSecundarioTexto}>Ver ficha</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimario} onPress={onMapa}>
          <Text style={styles.btnPrimarioTexto}>
            {registrado ? "Ver / actualizar GPS" : "Registrar GPS"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 12, paddingBottom: 32 },
  centrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F5F7FA",
  },
  bannerOffline: {
    backgroundColor: "#EF6C00",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  bannerSync: {
    backgroundColor: "#0288D1",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  bannerError: {
    backgroundColor: "#C62828",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  bannerTexto: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  resumen: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  resumenEtiqueta: {
    color: "#BBDEFB",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  resumenTitulo: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  resumenTexto: {
    color: "#E3F2FD",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  metricas: { flexDirection: "row", gap: 8, marginTop: 14 },
  metrica: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    padding: 10,
  },
  metricaValor: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  metricaLabel: { color: "#E3F2FD", fontSize: 11, fontWeight: "700" },
  gpsPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gpsPanelInfo: { flex: 1 },
  gpsTitulo: { color: "#263238", fontSize: 15, fontWeight: "900" },
  gpsTexto: { color: "#546E7A", fontSize: 13, marginTop: 4 },
  gpsPrecision: { color: "#78909C", fontSize: 12, marginTop: 2 },
  btnLocalizar: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    minHeight: 44,
    minWidth: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLocalizarTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  btnDeshabilitado: { backgroundColor: "#90A4AE" },
  seccion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  seccionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  tituloSeccion: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    flex: 1,
  },
  btnMapaGeneral: {
    borderWidth: 1,
    borderColor: "#90CAF9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnMapaGeneralTexto: { color: "#1565C0", fontSize: 12, fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#CFD8DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#212121",
    backgroundColor: "#FAFAFA",
    fontSize: 14,
    marginBottom: 12,
  },
  activoCard: {
    borderWidth: 1,
    borderColor: "#ECEFF1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  activoCardPendiente: { borderColor: "#90CAF9", backgroundColor: "#E3F2FD" },
  activoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  activoTexto: { flex: 1 },
  activoCodigo: { color: "#78909C", fontSize: 12, fontWeight: "900" },
  activoNombre: {
    color: "#212121",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  activoMeta: { color: "#607D8B", fontSize: 13, marginTop: 8 },
  estadoBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  estadoRegistrado: { backgroundColor: "#E8F5E9" },
  estadoPendiente: { backgroundColor: "#FFF3E0" },
  estadoTexto: { fontSize: 10, fontWeight: "900" },
  estadoTextoRegistrado: { color: "#1B5E20" },
  estadoTextoPendiente: { color: "#E65100" },
  coordenadas: {
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  coordenadasLabel: { color: "#78909C", fontSize: 11, fontWeight: "800" },
  coordenadasValor: {
    color: "#263238",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  acciones: { flexDirection: "row", gap: 8, marginTop: 10 },
  btnSecundario: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#90CAF9",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecundarioTexto: { color: "#1565C0", fontSize: 13, fontWeight: "900" },
  btnPrimario: {
    flex: 1.35,
    backgroundColor: "#1565C0",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  btnPrimarioTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  tituloVacio: {
    color: "#212121",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  textoVacio: { color: "#78909C", fontSize: 14, lineHeight: 20 },
});
