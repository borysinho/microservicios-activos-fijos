import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { offlineCache } from "../services/offlineCache";

type EstadoOffline = {
  activosCacheados: number;
  pendientes: number;
  usuario: string;
};

export default function HerramientasScreen() {
  const navigation = useNavigation<any>();
  const [estado, setEstado] = useState<EstadoOffline>({
    activosCacheados: 0,
    pendientes: 0,
    usuario: "Sin sesion",
  });
  const [refrescando, setRefrescando] = useState(false);

  const cargarEstado = useCallback(async () => {
    setRefrescando(true);
    try {
      const [activos, pendientes, session] = await Promise.all([
        offlineCache.loadActivos(),
        offlineCache.loadPendingOps(),
        offlineCache.loadSession(),
      ]);
      setEstado({
        activosCacheados: activos.length,
        pendientes: pendientes.length,
        usuario: session?.usuario.nombre ?? "Sin sesion",
      });
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

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
      <View style={[styles.tarjeta, styles.tarjetaEstado]}>
        <View style={styles.tarjetaHeader}>
          <View>
            <Text style={styles.codigo}>ESTADO DE SINCRONIZACIÓN</Text>
            <Text style={styles.nombre}>{estado.usuario}</Text>
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
            <Text style={styles.estadoLabel}>Pendientes sync</Text>
          </View>
        </View>
      </View>

      <AccionCampo
        color="#1565C0"
        emoji="📋"
        titulo="Mis activos asignados"
        detalle="Lista, cache local, detalle y acciones por activo"
        onPress={() => navigation.navigate("Activos")}
      />
      <AccionCampo
        color="#6A1B9A"
        emoji="🔍"
        titulo="Verificación IA por cámara"
        detalle="Valida evidencia visual de un activo"
        onPress={() => navigation.navigate("Activos")}
      />
      <AccionCampo
        color="#2E7D32"
        emoji="📍"
        titulo="Mapa y GPS"
        detalle="Ver ubicación actual o registrar coordenadas de un activo"
        onPress={() => navigation.navigate("Mapa", {})}
      />
      <AccionCampo
        color="#E65100"
        emoji="🔧"
        titulo="Reportes y mantenimiento"
        detalle="Formulario MS3, WhatsApp/N8N y solicitud a MS1"
        onPress={() => navigation.navigate("Activos")}
      />
      <AccionCampo
        color="#0288D1"
        emoji="🔔"
        titulo="Notificaciones"
        detalle="Alertas push y avisos generados por MS3"
        onPress={() => navigation.navigate("Notificaciones")}
      />
    </ScrollView>
  );
}

function AccionCampo({
  color,
  emoji,
  titulo,
  detalle,
  onPress,
}: {
  color: string;
  emoji: string;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
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
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 12, paddingBottom: 32 },
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
});
