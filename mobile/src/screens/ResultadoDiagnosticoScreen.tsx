import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/activo.types";

type Props = NativeStackScreenProps<RootStackParamList, "ResultadoDiagnostico">;

const ESTADO_CONFIG = {
  bueno: { emoji: "✅", color: "#43A047", label: "BUENO" },
  deteriorado: { emoji: "❌", color: "#E53935", label: "DETERIORADO" },
  requiere_mantenimiento: {
    emoji: "⚠️",
    color: "#FB8C00",
    label: "REQUIERE MANTENIMIENTO",
  },
  oxidado: { emoji: "🔴", color: "#8D6E63", label: "OXIDADO" },
  evidencia_validada: {
    emoji: "✅",
    color: "#2E7D32",
    label: "EVIDENCIA VALIDADA",
  },
  requiere_revision: {
    emoji: "⚠️",
    color: "#F57C00",
    label: "REQUIERE REVISIÓN",
  },
  foto_no_confiable: {
    emoji: "📷",
    color: "#6D4C41",
    label: "FOTO NO CONFIABLE",
  },
  posible_inconsistencia: {
    emoji: "🔎",
    color: "#C62828",
    label: "POSIBLE INCONSISTENCIA",
  },
} as const;

/** CU-37: Pantalla de resultado de verificación visual IA */
export default function ResultadoDiagnosticoScreen({
  route,
  navigation,
}: Props) {
  const { resultado } = route.params;
  const config = ESTADO_CONFIG[resultado.estado] ?? {
    emoji: "❓",
    color: "#78909C",
    label: resultado.estado.toUpperCase(),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Estado principal */}
      <View style={[styles.estadoCard, { backgroundColor: config.color }]}>
        <Text style={styles.estadoEmoji}>{config.emoji}</Text>
        <Text style={styles.estadoLabel}>{config.label}</Text>
        <View style={styles.confianzaBar}>
          <View
            style={[
              styles.confianzaRelleno,
              { width: `${(resultado.confianza * 100).toFixed(0)}%` as any },
            ]}
          />
        </View>
        <Text style={styles.confianzaTexto}>
          Confianza: {(resultado.confianza * 100).toFixed(1)}%
        </Text>
      </View>

      {/* Detalle */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Verificación visual</Text>
        <Text style={styles.detalle}>{resultado.detalle}</Text>
      </View>

      {/* Recomendación */}
      <View style={[styles.seccion, styles.recomendacionCard]}>
        <Text style={styles.tituloSeccion}>💡 Recomendación</Text>
        <Text style={styles.recomendacion}>{resultado.recomendacion}</Text>
      </View>

      {/* Metadatos */}
      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Detalles de la verificación</Text>
        <View style={styles.metaFila}>
          <Text style={styles.metaLabel}>Activo ID</Text>
          <Text style={styles.metaValor}>{resultado.activoId}</Text>
        </View>
        {resultado.latitud !== 0 && (
          <View style={styles.metaFila}>
            <Text style={styles.metaLabel}>Ubicación GPS</Text>
            <Text style={styles.metaValor}>
              {resultado.latitud?.toFixed(5)}, {resultado.longitud?.toFixed(5)}
            </Text>
          </View>
        )}
        <View style={styles.metaFila}>
          <Text style={styles.metaLabel}>Fecha</Text>
          <Text style={styles.metaValor}>
            {new Date(resultado.fechaDiagnostico).toLocaleString("es-BO")}
          </Text>
        </View>
      </View>

      {/* Acciones */}
      <TouchableOpacity
        style={styles.btnPrimario}
        onPress={() => navigation.pop(2)}
      >
        <Text style={styles.btnTexto}>← Volver al activo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, paddingBottom: 32 },
  estadoCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  estadoEmoji: { fontSize: 52, marginBottom: 8 },
  estadoLabel: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  confianzaBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginBottom: 6,
  },
  confianzaRelleno: {
    height: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  confianzaTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  seccion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  recomendacionCard: { borderLeftWidth: 4, borderLeftColor: "#1565C0" },
  tituloSeccion: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1565C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detalle: { fontSize: 15, color: "#37474F", lineHeight: 22 },
  recomendacion: {
    fontSize: 15,
    color: "#37474F",
    lineHeight: 22,
    fontStyle: "italic",
  },
  metaFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  metaLabel: { fontSize: 13, color: "#78909C" },
  metaValor: {
    fontSize: 13,
    color: "#212121",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  btnPrimario: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
