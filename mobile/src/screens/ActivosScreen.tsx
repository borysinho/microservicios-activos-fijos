import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, Activo, EstadoActivo } from "../types/activo.types";
import { useOfflineActivos } from "../hooks/useOfflineActivos";
import { useSession } from "../hooks/useSession";
import { canMobile, getRoleLabel } from "../auth/mobilePermissions";

const ESTADO_COLORES: Record<string, string> = {
  ACTIVO: "#43A047",
  EN_MANTENIMIENTO: "#FB8C00",
  TRANSFERIDO: "#039BE5",
  DADO_DE_BAJA: "#E53935",
};

export default function ActivosScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useSession();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoActivo | "TODOS">(
    "TODOS",
  );

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
  const puedeDiagnosticar = canMobile(usuario?.rol, "activos.diagnosticarIA");

  const activosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return activos.filter((activo) => {
      const coincideEstado =
        filtroEstado === "TODOS" || activo.estado === filtroEstado;
      const coincideTexto =
        !texto ||
        activo.codigo.toLowerCase().includes(texto) ||
        activo.nombre.toLowerCase().includes(texto) ||
        activo.categoria?.nombre.toLowerCase().includes(texto) ||
        activo.area?.nombre.toLowerCase().includes(texto);
      return coincideEstado && coincideTexto;
    });
  }, [activos, busqueda, filtroEstado]);

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
          {puedeDiagnosticar && (
            <TouchableOpacity
              style={styles.btnDiagnostico}
              onPress={() =>
                navigation.navigate("DiagnosticoIA", { activoId: item.id })
              }
            >
              <Text style={styles.btnDiagnosticoTexto}>🔍 Verificación IA</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation, puedeDiagnosticar],
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

      <View style={styles.filtros}>
        <View style={styles.resumenHeader}>
          <View>
            <Text style={styles.resumenTitulo}>Inventario movil</Text>
            <Text style={styles.resumenSubtitulo}>
              {getRoleLabel(usuario?.rol)} · {activosFiltrados.length} de{" "}
              {activos.length} activos
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.buscarInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por codigo, nombre, categoria o area"
          placeholderTextColor="#90A4AE"
          autoCapitalize="none"
        />
        <View style={styles.chips}>
          {(["TODOS", "ACTIVO", "EN_MANTENIMIENTO", "TRANSFERIDO", "DADO_DE_BAJA"] as const).map(
            (estado) => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.chip,
                  filtroEstado === estado && styles.chipActivo,
                ]}
                onPress={() => setFiltroEstado(estado)}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    filtroEstado === estado && styles.chipTextoActivo,
                  ]}
                >
                  {estado === "TODOS" ? "Todos" : estado.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>

      <FlatList
        data={activosFiltrados}
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
                : activos.length === 0
                  ? "No tienes activos asignados."
                  : "No hay activos con esos filtros."}
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
  filtros: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#ECEFF1",
    padding: 12,
  },
  resumenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resumenTitulo: {
    color: "#212121",
    fontSize: 18,
    fontWeight: "800",
  },
  resumenSubtitulo: { color: "#607D8B", fontSize: 13, marginTop: 2 },
  buscarInput: {
    borderWidth: 1,
    borderColor: "#CFD8DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#212121",
    backgroundColor: "#FAFAFA",
    fontSize: 14,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#CFD8DC",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  chipActivo: { backgroundColor: "#1565C0", borderColor: "#1565C0" },
  chipTexto: { color: "#546E7A", fontSize: 12, fontWeight: "700" },
  chipTextoActivo: { color: "#FFFFFF" },
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
