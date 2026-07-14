import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSession } from "../hooks/useSession";
import {
  offlineCache,
  type PendingOperation,
} from "../services/offlineCache";
import { ms1Service } from "../services/ms1Service";
import { ms3Service } from "../services/ms3Service";

type Props = NativeStackScreenProps<RootStackParamList, "Incidencias">;
type TipoIncidencia = "reporte" | "mantenimiento";

const ESTADOS_DIAGNOSTICO_CRITICO = new Set([
  "deteriorado",
  "requiere_mantenimiento",
  "oxidado",
  "requiere_revision",
  "posible_inconsistencia",
]);

function esOperacionIncidencia(op: PendingOperation): boolean {
  return op.tipo === "reportar_problema" || op.tipo === "solicitar_mantenimiento";
}

function descripcionOperacion(op: PendingOperation): string {
  const descripcion = op.payload.descripcion;
  return typeof descripcion === "string" && descripcion.trim()
    ? descripcion
    : "Sin descripcion registrada";
}

export default function IncidenciasScreen({ navigation }: Props) {
  const { usuario, cargandoSesion } = useSession();
  const [activos, setActivos] = useState<Activo[]>([]);
  const [pendientes, setPendientes] = useState<PendingOperation[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activoSeleccionadoId, setActivoSeleccionadoId] = useState("");
  const [tipo, setTipo] = useState<TipoIncidencia>("reporte");
  const [descripcion, setDescripcion] = useState("");

  const puedeReportar = canMobile(usuario?.rol, "activos.reportarProblema");
  const puedeSolicitarMantenimiento = canMobile(
    usuario?.rol,
    "activos.solicitarMantenimiento",
  );
  const puedeGestionarIncidencias = puedeReportar || puedeSolicitarMantenimiento;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [session, ops] = await Promise.all([
        offlineCache.loadSession(),
        offlineCache.loadPendingOps(),
      ]);
      setPendientes(ops.filter(esOperacionIncidencia));

      const cached = await offlineCache.loadActivos();
      setActivos(cached);

      if (session?.usuario.id) {
        const data = await ms1Service
          .getActivosAsignados(session.usuario.id)
          .catch(() => null);
        if (data) {
          setActivos(data);
          await offlineCache.saveActivos(data);
        }
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!puedeReportar && puedeSolicitarMantenimiento) {
      setTipo("mantenimiento");
    }
  }, [puedeReportar, puedeSolicitarMantenimiento]);

  const activosConIncidencia = useMemo(
    () =>
      activos.filter((activo) => {
        const estadoDiagnostico = activo.ultimoDiagnostico?.estado;
        return (
          activo.estado === "EN_MANTENIMIENTO" ||
          (estadoDiagnostico
            ? ESTADOS_DIAGNOSTICO_CRITICO.has(estadoDiagnostico)
            : false)
        );
      }),
    [activos],
  );

  const activosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const result = activos.filter((activo) => {
      if (!texto) {
        return true;
      }
      return (
        activo.codigo.toLowerCase().includes(texto) ||
        activo.nombre.toLowerCase().includes(texto) ||
        activo.area?.nombre.toLowerCase().includes(texto)
      );
    });
    return result.slice(0, 6);
  }, [activos, busqueda]);

  const activoSeleccionado = activos.find(
    (activo) => activo.id === activoSeleccionadoId,
  );

  const registrarIncidencia = async () => {
    if (!puedeGestionarIncidencias) {
      Alert.alert("Acceso restringido", "Tu perfil no registra incidencias.");
      return;
    }

    if (!activoSeleccionado) {
      Alert.alert("Activo requerido", "Selecciona el activo afectado.");
      return;
    }

    if (!descripcion.trim()) {
      Alert.alert("Descripcion requerida", "Describe lo observado en campo.");
      return;
    }

    setEnviando(true);
    try {
      if (tipo === "mantenimiento") {
        await ms1Service.solicitarMantenimiento(
          activoSeleccionado.id,
          descripcion.trim(),
        );
      } else {
        await ms3Service.reportarProblema({
          activoId: activoSeleccionado.id,
          activoCodigo: activoSeleccionado.codigo,
          descripcion: descripcion.trim(),
          latitud: activoSeleccionado.latitud,
          longitud: activoSeleccionado.longitud,
        });
      }

      Alert.alert(
        "Incidencia registrada",
        "El seguimiento fue enviado al equipo correspondiente.",
      );
    } catch {
      await offlineCache.enqueuePendingOp({
        tipo:
          tipo === "mantenimiento"
            ? "solicitar_mantenimiento"
            : "reportar_problema",
        payload:
          tipo === "mantenimiento"
            ? {
                activoId: activoSeleccionado.id,
                descripcion: descripcion.trim(),
              }
            : {
                activoId: activoSeleccionado.id,
                activoCodigo: activoSeleccionado.codigo,
                descripcion: descripcion.trim(),
                latitud: activoSeleccionado.latitud,
                longitud: activoSeleccionado.longitud,
              },
      });
      Alert.alert(
        "Sin conexion",
        "La incidencia se sincronizara cuando vuelva la conexion.",
      );
    } finally {
      setDescripcion("");
      setActivoSeleccionadoId("");
      setBusqueda("");
      setEnviando(false);
      cargar();
    }
  };

  if (cargandoSesion || (cargando && activos.length === 0)) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!puedeGestionarIncidencias) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.tituloVacio}>Acceso restringido</Text>
        <Text style={styles.textoVacio}>
          Tu perfil puede consultar activos y alertas, pero no registrar
          incidencias desde la app movil.
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
          onRefresh={cargar}
          colors={["#1565C0"]}
        />
      }
    >
      <View style={styles.resumen}>
        <Text style={styles.resumenTitulo}>Seguimiento de incidencias</Text>
        <Text style={styles.resumenTexto}>
          {activosConIncidencia.length} activas · {pendientes.length} pendientes
        </Text>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Nueva incidencia</Text>
        <View style={styles.segmentos}>
          {puedeReportar && (
            <TouchableOpacity
              style={[styles.segmento, tipo === "reporte" && styles.segmentoActivo]}
              onPress={() => setTipo("reporte")}
            >
              <Text
                style={[
                  styles.segmentoTexto,
                  tipo === "reporte" && styles.segmentoTextoActivo,
                ]}
              >
                Reporte
              </Text>
            </TouchableOpacity>
          )}
          {puedeSolicitarMantenimiento && (
            <TouchableOpacity
              style={[
                styles.segmento,
                tipo === "mantenimiento" && styles.segmentoActivo,
              ]}
              onPress={() => setTipo("mantenimiento")}
            >
              <Text
                style={[
                  styles.segmentoTexto,
                  tipo === "mantenimiento" && styles.segmentoTextoActivo,
                ]}
              >
                Mantenimiento
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar activo por codigo, nombre o area"
          placeholderTextColor="#90A4AE"
        />

        <View style={styles.activosSelector}>
          {activosFiltrados.map((activo) => {
            const seleccionado = activo.id === activoSeleccionadoId;
            return (
              <TouchableOpacity
                key={activo.id}
                style={[
                  styles.activoOpcion,
                  seleccionado && styles.activoOpcionSeleccionada,
                ]}
                onPress={() => setActivoSeleccionadoId(activo.id)}
              >
                <View style={styles.activoOpcionTexto}>
                  <Text
                    style={[
                      styles.activoCodigo,
                      seleccionado && styles.activoTextoSeleccionado,
                    ]}
                  >
                    {activo.codigo}
                  </Text>
                  <Text
                    style={[
                      styles.activoNombre,
                      seleccionado && styles.activoTextoSeleccionado,
                    ]}
                  >
                    {activo.nombre}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activoArea,
                    seleccionado && styles.activoTextoSeleccionado,
                  ]}
                >
                  {activo.area?.nombre ?? "Sin area"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={[styles.input, styles.descripcionInput]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe la incidencia observada"
          placeholderTextColor="#90A4AE"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.btnPrimario, enviando && styles.btnDeshabilitado]}
          onPress={registrarIncidencia}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnPrimarioTexto}>Registrar incidencia</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Activas</Text>
        {activosConIncidencia.length === 0 ? (
          <Text style={styles.textoVacio}>No hay incidencias activas.</Text>
        ) : (
          activosConIncidencia.map((activo) => (
            <TouchableOpacity
              key={activo.id}
              style={styles.incidenciaCard}
              onPress={() =>
                navigation.navigate("ActivoDetalle", { activoId: activo.id })
              }
            >
              <Text style={styles.activoCodigo}>{activo.codigo}</Text>
              <Text style={styles.activoNombre}>{activo.nombre}</Text>
              <Text style={styles.incidenciaDetalle}>
                {activo.estado === "EN_MANTENIMIENTO"
                  ? "En mantenimiento"
                  : activo.ultimoDiagnostico?.recomendacion ??
                    "Requiere revision"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Pendientes por sincronizar</Text>
        {pendientes.length === 0 ? (
          <Text style={styles.textoVacio}>
            No hay incidencias pendientes de envio.
          </Text>
        ) : (
          pendientes.map((op) => (
            <View key={op.id} style={styles.pendienteCard}>
              <Text style={styles.pendienteTipo}>
                {op.tipo === "reportar_problema"
                  ? "Reporte"
                  : "Mantenimiento"}
              </Text>
              <Text style={styles.incidenciaDetalle}>
                {descripcionOperacion(op)}
              </Text>
              <Text style={styles.fechaPendiente}>
                {new Date(op.timestamp).toLocaleString("es-BO")}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  resumen: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  resumenTitulo: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  resumenTexto: { color: "#BBDEFB", fontSize: 14, marginTop: 4 },
  seccion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tituloSeccion: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  segmentos: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  segmento: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CFD8DC",
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentoActivo: { backgroundColor: "#1565C0", borderColor: "#1565C0" },
  segmentoTexto: { color: "#546E7A", fontWeight: "800", fontSize: 13 },
  segmentoTextoActivo: { color: "#FFFFFF" },
  input: {
    borderWidth: 1,
    borderColor: "#CFD8DC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#212121",
    backgroundColor: "#FAFAFA",
    fontSize: 14,
    marginBottom: 10,
  },
  descripcionInput: { minHeight: 96 },
  activosSelector: { gap: 8, marginBottom: 10 },
  activoOpcion: {
    borderWidth: 1,
    borderColor: "#ECEFF1",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  activoOpcionSeleccionada: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },
  activoOpcionTexto: { flex: 1 },
  activoCodigo: { color: "#78909C", fontSize: 12, fontWeight: "800" },
  activoNombre: {
    color: "#212121",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  activoArea: {
    color: "#607D8B",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "35%",
    textAlign: "right",
  },
  activoTextoSeleccionado: { color: "#0D47A1" },
  btnPrimario: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDeshabilitado: { backgroundColor: "#90A4AE" },
  btnPrimarioTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  incidenciaCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#E65100",
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  incidenciaDetalle: {
    color: "#546E7A",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  pendienteCard: {
    backgroundColor: "#ECEFF1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  pendienteTipo: { color: "#37474F", fontSize: 13, fontWeight: "800" },
  fechaPendiente: { color: "#78909C", fontSize: 12, marginTop: 6 },
  tituloVacio: {
    color: "#212121",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  textoVacio: { color: "#78909C", fontSize: 14, lineHeight: 20 },
});
