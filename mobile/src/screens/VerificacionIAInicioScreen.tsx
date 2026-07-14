import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useOfflineActivos } from "../hooks/useOfflineActivos";
import { useSession } from "../hooks/useSession";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "VerificacionIAInicio"
>;

const ESTADOS_CRITICOS = new Set([
  "deteriorado",
  "requiere_mantenimiento",
  "oxidado",
  "requiere_revision",
  "posible_inconsistencia",
]);

function fechaDiagnostico(activo: Activo): string {
  const fecha = activo.ultimoDiagnostico?.fechaDiagnostico;
  return fecha ? new Date(fecha).toLocaleDateString("es-BO") : "Sin evidencia";
}

export default function VerificacionIAInicioScreen({
  navigation,
}: Props) {
  const { usuario, cargandoSesion } = useSession();
  const [busqueda, setBusqueda] = useState("");

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

  const metricas = useMemo(() => {
    const verificados = activos.filter((activo) => activo.ultimoDiagnostico);
    const criticos = verificados.filter((activo) =>
      ESTADOS_CRITICOS.has(activo.ultimoDiagnostico?.estado ?? ""),
    );
    return {
      total: activos.length,
      sinEvidencia: activos.length - verificados.length,
      criticos: criticos.length,
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
          activo.categoria?.nombre.toLowerCase().includes(texto) ||
          activo.area?.nombre.toLowerCase().includes(texto)
        );
      })
      .slice()
      .sort((a, b) => {
        const prioridadA = a.ultimoDiagnostico ? 1 : 0;
        const prioridadB = b.ultimoDiagnostico ? 1 : 0;
        return prioridadA - prioridadB;
      });
  }, [activos, busqueda]);

  if (cargandoSesion || (cargando && activos.length === 0)) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!puedeDiagnosticar) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.tituloVacio}>Acceso restringido</Text>
        <Text style={styles.textoVacio}>
          Tu perfil puede consultar activos, pero no ejecutar verificacion IA
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
            📵 Sin conexion - usando activos guardados
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

      {error && !isOffline && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerTexto}>⚠️ {error}</Text>
        </View>
      )}

      <View style={styles.resumen}>
        <Text style={styles.resumenEtiqueta}>CAMARA + IA</Text>
        <Text style={styles.resumenTitulo}>Verificacion IA</Text>
        <Text style={styles.resumenTexto}>
          Captura evidencia fotografica, adjunta ubicacion y registra el
          diagnostico visual del activo.
        </Text>
        <View style={styles.metricas}>
          <Metrica valor={metricas.total} label="Activos" />
          <Metrica valor={metricas.sinEvidencia} label="Sin evidencia" />
          <Metrica valor={metricas.criticos} label="Criticos" />
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Seleccion de activo</Text>
        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por codigo, nombre, categoria o area"
          placeholderTextColor="#90A4AE"
          autoCapitalize="none"
        />

        {activosFiltrados.length === 0 ? (
          <Text style={styles.textoVacio}>No hay activos para verificar.</Text>
        ) : (
          activosFiltrados.map((activo) => (
            <ActivoVerificacionCard
              key={activo.id}
              activo={activo}
              onVerificar={() =>
                navigation.navigate("DiagnosticoIA", { activoId: activo.id })
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

function ActivoVerificacionCard({
  activo,
  onVerificar,
  onDetalle,
}: {
  activo: Activo;
  onVerificar: () => void;
  onDetalle: () => void;
}) {
  const diagnostico = activo.ultimoDiagnostico;
  const esCritico = diagnostico
    ? ESTADOS_CRITICOS.has(diagnostico.estado)
    : false;

  return (
    <View style={[styles.activoCard, esCritico && styles.activoCardCritico]}>
      <View style={styles.activoHeader}>
        <View>
          <Text style={styles.activoCodigo}>{activo.codigo}</Text>
          <Text style={styles.activoNombre}>{activo.nombre}</Text>
        </View>
        <View
          style={[
            styles.estadoBadge,
            diagnostico ? styles.estadoConDiag : styles.estadoSinDiag,
            esCritico && styles.estadoCritico,
          ]}
        >
          <Text
            style={[
              styles.estadoTexto,
              esCritico && styles.estadoTextoCritico,
            ]}
          >
            {diagnostico
              ? diagnostico.estado.replace(/_/g, " ").toUpperCase()
              : "SIN IA"}
          </Text>
        </View>
      </View>

      <Text style={styles.activoMeta}>
        {activo.categoria?.nombre ?? "Sin categoria"} ·{" "}
        {activo.area?.nombre ?? "Sin area"}
      </Text>

      <View style={styles.diagnosticoResumen}>
        <Text style={styles.diagnosticoLabel}>Ultima verificacion</Text>
        <Text style={styles.diagnosticoValor}>
          {diagnostico
            ? `${fechaDiagnostico(activo)} · ${(diagnostico.confianza * 100).toFixed(1)}%`
            : "Pendiente de captura"}
        </Text>
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.btnSecundario} onPress={onDetalle}>
          <Text style={styles.btnSecundarioTexto}>Ver ficha</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimario} onPress={onVerificar}>
          <Text style={styles.btnPrimarioTexto}>Iniciar verificacion IA</Text>
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
  tituloSeccion: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 12,
    textTransform: "uppercase",
  },
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
  activoCardCritico: { borderColor: "#EF6C00", backgroundColor: "#FFF8E1" },
  activoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
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
  estadoConDiag: { backgroundColor: "#E8F5E9" },
  estadoSinDiag: { backgroundColor: "#E3F2FD" },
  estadoCritico: { backgroundColor: "#F57C00" },
  estadoTexto: { color: "#0D47A1", fontSize: 10, fontWeight: "900" },
  estadoTextoCritico: { color: "#FFFFFF" },
  diagnosticoResumen: {
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  diagnosticoLabel: { color: "#78909C", fontSize: 11, fontWeight: "800" },
  diagnosticoValor: {
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
