import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, Activo } from "../types/activo.types";
import { useOfflineActivos } from "../hooks/useOfflineActivos";
import { offlineCache } from "../services/offlineCache";

const ESTADO_COLORES: Record<string, string> = {
  ACTIVO: "#43A047",
  EN_MANTENIMIENTO: "#FB8C00",
  TRANSFERIDO: "#039BE5",
  DADO_DE_BAJA: "#E53935",
};

export default function ActivosScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [usuarioId, setUsuarioId] = useState("");

  useEffect(() => {
    offlineCache.loadSession().then((session) => {
      if (session) {
        setUsuarioId(session.usuario.id);
      }
    });
  }, []);

  const {
    activos,
    isOffline,
    cargando,
    error,
    refrescar,
    pendientesSincronizacion,
  } = useOfflineActivos(usuarioId);

  const renderActivo = useCallback(
    ({ item }: { item: Activo }) => (
      <TouchableOpacity
        style={styles.tarjeta}
        onPress={() =>
          navigation.navigate("ActivoDetalle", { activoId: item.id })
        }
      >
        <View style={styles.tarjetaHeader}>
          <Text style={styles.codigo}>{item.codigo}</Text>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: ESTADO_COLORES[item.estado] ?? "#78909C" },
            ]}
          >
            <Text style={styles.estadoTexto}>{item.estado}</Text>
          </View>
        </View>
        <Text style={styles.nombre}>{item.nombre}</Text>
        {item.categoria && (
          <Text style={styles.categoria}>{item.categoria.nombre}</Text>
        )}
        {item.area && <Text style={styles.area}>📍 {item.area.nombre}</Text>}
        <View style={styles.tarjetaFooter}>
          <Text style={styles.valor}>
            Valor: ${item.valorLibros.toLocaleString("es-BO")}
          </Text>
          <TouchableOpacity
            style={styles.btnDiagnostico}
            onPress={() =>
              navigation.navigate("DiagnosticoIA", { activoId: item.id })
            }
          >
            <Text style={styles.btnDiagnosticoTexto}>🔍 Diagnóstico IA</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [navigation],
  );

  if (cargando && activos.length === 0) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.textoEstado}>Cargando activos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Banner offline */}
      {isOffline && (
        <View style={styles.bannerOffline}>
          <Text style={styles.bannerTexto}>
            📵 Sin conexión — mostrando datos en caché
          </Text>
        </View>
      )}

      {/* Badge de operaciones pendientes (CU-45) */}
      {pendientesSincronizacion > 0 && !isOffline && (
        <View style={styles.bannerSync}>
          <Text style={styles.bannerTexto}>
            🔄 Sincronizando {pendientesSincronizacion} operación(es)
            pendiente(s)…
          </Text>
        </View>
      )}

      {/* Error */}
      {error && !isOffline && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerTexto}>⚠️ {error}</Text>
        </View>
      )}

      <FlatList
        data={activos}
        keyExtractor={(item) => item.id}
        renderItem={renderActivo}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={refrescar}
            colors={["#1565C0"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Text style={styles.textoVacio}>
              {isOffline
                ? "Sin datos en caché. Conéctate a internet para sincronizar."
                : "No tienes activos asignados."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  centrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  textoEstado: { marginTop: 12, color: "#78909C", fontSize: 16 },
  textoVacio: { color: "#78909C", fontSize: 15, textAlign: "center" },
  lista: { padding: 12 },
  bannerOffline: {
    backgroundColor: "#EF6C00",
    padding: 10,
    alignItems: "center",
  },
  bannerSync: {
    backgroundColor: "#0288D1",
    padding: 10,
    alignItems: "center",
  },
  bannerError: {
    backgroundColor: "#C62828",
    padding: 10,
    alignItems: "center",
  },
  bannerTexto: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
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
  },
  tarjetaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  codigo: { fontSize: 12, color: "#78909C", fontWeight: "600" },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  estadoTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  nombre: {
    fontSize: 17,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  categoria: { fontSize: 13, color: "#546E7A", marginBottom: 2 },
  area: { fontSize: 13, color: "#546E7A", marginBottom: 8 },
  tarjetaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  valor: { fontSize: 13, color: "#37474F", fontWeight: "600" },
  btnDiagnostico: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnDiagnosticoTexto: { color: "#1565C0", fontSize: 13, fontWeight: "600" },
});
