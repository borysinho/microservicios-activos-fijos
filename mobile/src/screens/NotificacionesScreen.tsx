import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { ms3Service } from "../services/ms3Service";
import { offlineCache } from "../services/offlineCache";
import type { Notificacion } from "../types/activo.types";

const TIPO_CONFIG = {
  mantenimiento: { emoji: "🔧", color: "#FB8C00", bg: "#FFF3E0" },
  alerta: { emoji: "🚨", color: "#E53935", bg: "#FFEBEE" },
  info: { emoji: "ℹ️", color: "#0288D1", bg: "#E1F5FE" },
  baja: { emoji: "📤", color: "#546E7A", bg: "#ECEFF1" },
};

/** CU-44: Recibir y mostrar notificaciones push de alerta de mantenimiento */
export default function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const session = await offlineCache.loadSession();
      if (session) {
        const data = await ms3Service.getNotificaciones(session.usuario.id);
        setNotificaciones(data);
      }
    } catch {
      // Sin conexión: mostrar vacío
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const renderItem = ({ item }: { item: Notificacion }) => {
    const config = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.info;
    return (
      <View
        style={[
          styles.tarjeta,
          { borderLeftColor: config.color, backgroundColor: config.bg },
        ]}
      >
        <View style={styles.tarjetaHeader}>
          <Text style={styles.tarjetaEmoji}>{config.emoji}</Text>
          <View style={styles.tarjetaInfo}>
            <Text style={[styles.titulo, { color: config.color }]}>
              {item.titulo}
            </Text>
            <Text style={styles.fecha}>
              {new Date(item.fechaCreacion).toLocaleString("es-BO")}
            </Text>
          </View>
          {!item.leida && <View style={styles.puntoBadge} />}
        </View>
        <Text style={styles.mensaje}>{item.mensaje}</Text>
        {item.activoId && (
          <Text style={styles.activoRef}>Activo ID: {item.activoId}</Text>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={notificaciones}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.lista}
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={cargar}
          colors={["#1565C0"]}
        />
      }
      ListEmptyComponent={
        <View style={styles.centrado}>
          <Text style={styles.textoVacio}>🔔 Sin notificaciones</Text>
          <Text style={styles.textoSubtitulo}>
            Las alertas de mantenimiento y garantía aparecerán aquí.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  lista: { padding: 12, paddingBottom: 32 },
  centrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  textoVacio: { fontSize: 20, color: "#78909C", marginBottom: 8 },
  textoSubtitulo: { fontSize: 14, color: "#90A4AE", textAlign: "center" },
  tarjeta: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tarjetaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tarjetaEmoji: { fontSize: 24, marginRight: 12 },
  tarjetaInfo: { flex: 1 },
  titulo: { fontSize: 15, fontWeight: "700" },
  fecha: { fontSize: 12, color: "#78909C", marginTop: 2 },
  puntoBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E53935",
    marginTop: 4,
  },
  mensaje: { fontSize: 14, color: "#37474F", lineHeight: 20 },
  activoRef: {
    fontSize: 12,
    color: "#78909C",
    marginTop: 6,
    fontFamily: "monospace",
  },
});
