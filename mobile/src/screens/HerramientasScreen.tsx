import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { offlineCache } from "../services/offlineCache";
import { useSession } from "../hooks/useSession";
import {
  canMobile,
  getRoleHomeTitle,
  getRoleLabel,
} from "../auth/mobilePermissions";

type EstadoOffline = {
  activosCacheados: number;
  pendientes: number;
};

type AccionInicio = {
  color: string;
  emoji: string;
  titulo: string;
  detalle: string;
  onPress: () => void;
};

export default function HerramientasScreen() {
  const navigation = useNavigation<any>();
  const { usuario, clearSession } = useSession();
  const [estado, setEstado] = useState<EstadoOffline>({
    activosCacheados: 0,
    pendientes: 0,
  });
  const [refrescando, setRefrescando] = useState(false);

  const cargarEstado = useCallback(async () => {
    setRefrescando(true);
    try {
      const [activos, pendientes] = await Promise.all([
        offlineCache.loadActivos(),
        offlineCache.loadPendingOps(),
      ]);
      setEstado({
        activosCacheados: activos.length,
        pendientes: pendientes.length,
      });
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  const acciones = useMemo<AccionInicio[]>(() => {
    const role = usuario?.rol;
    const disponibles: AccionInicio[] = [
      {
        color: "#1565C0",
        emoji: "📋",
        titulo: "Revisar activos",
        detalle: "Inventario asignado, ficha tecnica y evidencia disponible",
        onPress: () => navigation.navigate("Activos"),
      },
    ];

    if (canMobile(role, "activos.diagnosticarIA")) {
      disponibles.push({
        color: "#1565C0",
        emoji: "🔍",
        titulo: "Verificacion IA",
        detalle: "Captura fotografica y diagnostico visual del activo",
        onPress: () => navigation.navigate("VerificacionIAInicio"),
      });
    }

    if (canMobile(role, "activos.registrarGPS")) {
      disponibles.push({
        color: "#1565C0",
        emoji: "📍",
        titulo: "Ubicacion GPS",
        detalle: "Registro de coordenadas desde la ficha del activo",
        onPress: () => navigation.navigate("UbicacionGPSInicio"),
      });
    }

    if (
      canMobile(role, "activos.reportarProblema") ||
      canMobile(role, "activos.solicitarMantenimiento")
    ) {
      disponibles.push({
        color: "#E65100",
        emoji: "🔧",
        titulo: "Incidencias",
        detalle: "Reportes y solicitudes de mantenimiento",
        onPress: () => navigation.navigate("Incidencias"),
      });
    }

    if (canMobile(role, "notificaciones.ver")) {
      disponibles.push({
        color: "#0288D1",
        emoji: "🔔",
        titulo: "Alertas",
        detalle: "Avisos de mantenimiento, garantia y automatizaciones",
        onPress: () => navigation.navigate("Notificaciones"),
      });
    }

    return disponibles;
  }, [navigation, usuario?.rol]);

  const cerrarSesion = useCallback(() => {
    Alert.alert("Cerrar sesion", "Se cerrara la sesion en este dispositivo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesion",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          navigation.getParent()?.replace("Login");
        },
      },
    ]);
  }, [clearSession, navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={cargarEstado}
          colors={["#1565C0"]}
        />
      }
    >
      <View style={styles.encabezado}>
        <View style={styles.perfilBadge}>
          <Text style={styles.perfilTexto}>{getRoleLabel(usuario?.rol)}</Text>
        </View>
        <Text style={styles.titulo}>{getRoleHomeTitle(usuario?.rol)}</Text>
        <Text style={styles.usuario}>{usuario?.nombre ?? "Usuario movil"}</Text>
      </View>

      <View style={[styles.tarjeta, styles.tarjetaEstado]}>
        <View style={styles.tarjetaHeader}>
          <View>
            <Text style={styles.codigo}>SINCRONIZACION</Text>
            <Text style={styles.nombre}>Datos disponibles en el dispositivo</Text>
          </View>
          <View
            style={[
              styles.estadoBadge,
              estado.pendientes > 0 && styles.estadoBadgePendiente,
            ]}
          >
            <Text style={styles.estadoBadgeTexto}>
              {estado.pendientes > 0 ? "PENDIENTE" : "OK"}
            </Text>
          </View>
        </View>
        <View style={styles.estadoGrid}>
          <View style={styles.estadoItem}>
            <Text style={styles.estadoNumero}>{estado.activosCacheados}</Text>
            <Text style={styles.estadoLabel}>Activos offline</Text>
          </View>
          <View style={styles.estadoItem}>
            <Text style={styles.estadoNumero}>{estado.pendientes}</Text>
            <Text style={styles.estadoLabel}>Pendientes</Text>
          </View>
        </View>
      </View>

      {acciones.map((accion) => (
        <AccionCampo key={accion.titulo} {...accion} />
      ))}

      <TouchableOpacity style={styles.btnCerrarSesion} onPress={cerrarSesion}>
        <Text style={styles.btnCerrarSesionTexto}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function AccionCampo({
  color,
  emoji,
  titulo,
  detalle,
  onPress,
}: AccionInicio) {
  return (
    <TouchableOpacity style={styles.tarjeta} onPress={onPress}>
      <Text style={styles.accionEmoji}>{emoji}</Text>
      <View style={styles.accionInfo}>
        <Text style={styles.nombre}>{titulo}</Text>
        <Text style={styles.accionDetalle}>{detalle}</Text>
      </View>
      <Text style={[styles.accionChevron, { color }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 12, paddingBottom: 32 },
  encabezado: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  perfilBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  perfilTexto: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  titulo: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  usuario: { color: "#BBDEFB", fontSize: 14, fontWeight: "600" },
  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tarjetaHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  codigo: {
    color: "#78909C",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  nombre: {
    color: "#212121",
    fontSize: 15,
    fontWeight: "800",
  },
  estadoBadge: {
    backgroundColor: "#43A047",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoBadgePendiente: { backgroundColor: "#FB8C00" },
  estadoBadgeTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  estadoGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  estadoItem: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  estadoNumero: { color: "#1565C0", fontSize: 26, fontWeight: "800" },
  estadoLabel: { color: "#546E7A", fontSize: 12, marginTop: 2 },
  accionEmoji: { fontSize: 28, marginRight: 14 },
  accionInfo: { flex: 1 },
  tarjetaEstado: { flexDirection: "column", alignItems: "stretch" },
  accionDetalle: {
    color: "#607D8B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  accionChevron: { fontSize: 26, fontWeight: "300", marginLeft: 8 },
  btnCerrarSesion: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C62828",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnCerrarSesionTexto: {
    color: "#C62828",
    fontWeight: "700",
    fontSize: 15,
  },
});
