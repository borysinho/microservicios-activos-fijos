import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type {
  RootStackParamList,
  Activo,
  DiagnosticoIA,
  PrediccionVidaUtil,
} from "../types/activo.types";
import { ms1Service } from "../services/ms1Service";
import { ms2Service } from "../services/ms2Service";
import { ms3Service } from "../services/ms3Service";
import { offlineCache } from "../services/offlineCache";
import { useGPS } from "../hooks/useGPS";
import { useSession } from "../hooks/useSession";
import { canMobile } from "../auth/mobilePermissions";

type Props = NativeStackScreenProps<RootStackParamList, "ActivoDetalle">;

const ESTADO_FISICO_COLOR: Record<string, string> = {
  bueno: "#43A047",
  deteriorado: "#E53935",
  requiere_mantenimiento: "#FB8C00",
  oxidado: "#8D6E63",
  evidencia_validada: "#2E7D32",
  requiere_revision: "#F57C00",
  foto_no_confiable: "#6D4C41",
  posible_inconsistencia: "#C62828",
};

async function cargarActivoDesdeCache(activoId: string): Promise<Activo | null> {
  const activos = await offlineCache.loadActivos();
  return activos.find((item) => item.id === activoId) ?? null;
}

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

async function guardarReportePendiente(params: {
  activoId: string;
  activoCodigo: string;
  descripcion: string;
  latitud?: number;
  longitud?: number;
}): Promise<void> {
  await offlineCache.enqueuePendingOp({
    tipo: "reportar_problema",
    payload: params,
  });
}

export default function ActivoDetalleScreen({ route, navigation }: Props) {
  const { activoId } = route.params;
  const { obtenerUbicacion, cargando: gpsLoading } = useGPS();
  const { usuario } = useSession();
  const [activo, setActivo] = useState<Activo | null>(null);
  const [historialDiagnosticos, setHistorialDiagnosticos] = useState<
    DiagnosticoIA[]
  >([]);
  const [prediccionVidaUtil, setPrediccionVidaUtil] =
    useState<PrediccionVidaUtil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);
  const [modalMantenimiento, setModalMantenimiento] = useState(false);
  const [descripcionMantenimiento, setDescripcionMantenimiento] = useState("");
  const [modalProblema, setModalProblema] = useState(false);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const puedeDiagnosticar = canMobile(usuario?.rol, "activos.diagnosticarIA");
  const puedeRegistrarGps = canMobile(usuario?.rol, "activos.registrarGPS");
  const puedeSolicitarMantenimiento = canMobile(
    usuario?.rol,
    "activos.solicitarMantenimiento",
  );
  const puedeReportarProblema = canMobile(
    usuario?.rol,
    "activos.reportarProblema",
  );

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await ms1Service.getActivoById(activoId);
        const historial = await ms2Service
          .getHistorialDiagnosticos(activoId)
          .catch(() => []);
        const prediccion = await ms1Service
          .getPrediccionVidaUtil(activoId)
          .catch(() => null);
        setActivo(data);
        setHistorialDiagnosticos(historial);
        setPrediccionVidaUtil(prediccion);
      } catch {
        const cached = await cargarActivoDesdeCache(activoId);
        if (cached) {
          setActivo(cached);
          setHistorialDiagnosticos(
            cached.ultimoDiagnostico ? [cached.ultimoDiagnostico] : [],
          );
          Alert.alert(
            "Modo offline",
            "Mostrando la ficha del activo desde la caché local.",
          );
        } else {
          Alert.alert("Error", "No se pudo cargar el detalle del activo.");
        }
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [activoId]);

  /** CU-42, CU-45: Registrar ubicación GPS y encolar si falla la red */
  const handleRegistrarUbicacion = async () => {
    if (!puedeRegistrarGps) {
      Alert.alert("Acceso restringido", "Tu perfil no puede registrar GPS.");
      return;
    }

    setGuardandoUbicacion(true);
    try {
      const coords = await obtenerUbicacion();
      const session = await offlineCache.loadSession();
      const actualizarEstadoLocal = () => {
        setActivo((prev) =>
          prev
            ? { ...prev, latitud: coords.latitud, longitud: coords.longitud }
            : prev,
        );
      };

      if (session) {
        try {
          await ms1Service.actualizarUbicacion(
            activoId,
            coords.latitud,
            coords.longitud,
          );
          actualizarEstadoLocal();
          Alert.alert(
            "Ubicación registrada",
            "Las coordenadas GPS se guardaron correctamente.",
          );
          return;
        } catch {
          await guardarUbicacionPendiente(
            activoId,
            coords.latitud,
            coords.longitud,
          );
        }
      } else {
        await guardarUbicacionPendiente(
          activoId,
          coords.latitud,
          coords.longitud,
        );
      }

      actualizarEstadoLocal();
      Alert.alert(
        "Sin conexión",
        "La ubicación se sincronizará al recuperar la conexión.",
      );
    } catch (err: any) {
      Alert.alert("Error GPS", err.message);
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  /** CU-43: Reportar problema vía MS3 para disparar el flujo N8N */
  const handleReportarProblema = () => {
    if (!puedeReportarProblema) {
      Alert.alert(
        "Acceso restringido",
        "Tu perfil no puede reportar problemas desde la app movil.",
      );
      return;
    }

    setDescripcionProblema("");
    setModalProblema(true);
  };

  const enviarReporteProblema = async (descripcion: string) => {
    if (!activo) {
      return;
    }

    setEnviandoReporte(true);
    const payload = {
      activoId,
      activoCodigo: activo.codigo,
      descripcion,
      latitud: activo.latitud,
      longitud: activo.longitud,
    };

    try {
      const respuesta = await ms3Service.reportarProblema(payload);
      Alert.alert(
        "Reporte enviado",
        respuesta.mensaje ??
          "MS3 recibio el reporte y activara el flujo WhatsApp/N8N/email.",
      );
    } catch {
      await guardarReportePendiente(payload);
      Alert.alert(
        "Sin conexión",
        "El reporte se sincronizara con MS3 al recuperar la conexion.",
      );
    } finally {
      setEnviandoReporte(false);
    }
  };

  /** CU-39: Solicitar orden de mantenimiento */
  const handleSolicitarMantenimiento = async () => {
    if (!puedeSolicitarMantenimiento) {
      Alert.alert(
        "Acceso restringido",
        "Tu perfil no puede solicitar mantenimiento.",
      );
      return;
    }

    if (Platform.OS === "ios") {
      Alert.prompt(
        "Solicitar mantenimiento",
        "Describe el problema o motivo del mantenimiento:",
        async (descripcion) => {
          if (!descripcion?.trim()) {
            return;
          }
          await enviarSolicitudMantenimiento(descripcion);
        },
      );
    } else {
      setDescripcionMantenimiento("");
      setModalMantenimiento(true);
    }
  };

  const enviarSolicitudMantenimiento = async (descripcion: string) => {
    try {
      await ms1Service.solicitarMantenimiento(activoId, descripcion);
      Alert.alert(
        "Solicitud enviada",
        "La orden de mantenimiento fue registrada.",
      );
    } catch {
      await offlineCache.enqueuePendingOp({
        tipo: "solicitar_mantenimiento",
        payload: { activoId, descripcion },
      });
      Alert.alert(
        "Sin conexión",
        "La solicitud se enviará al recuperar la conexión.",
      );
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!activo) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>
          No se pudo cargar este activo. Sincroniza la lista e intenta de nuevo.
        </Text>
      </View>
    );
  }

  const ultimoDiag = historialDiagnosticos[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Modal
        visible={modalMantenimiento}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMantenimiento(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Solicitar mantenimiento</Text>
            <Text style={styles.modalSubtitulo}>
              Describe el problema o motivo:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={descripcionMantenimiento}
              onChangeText={setDescripcionMantenimiento}
              placeholder="Ej: Oxidación en la base del equipo..."
              placeholderTextColor="#90A4AE"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalMantenimiento(false)}
              >
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnEnviar}
                onPress={async () => {
                  if (!descripcionMantenimiento.trim()) {
                    return;
                  }
                  setModalMantenimiento(false);
                  await enviarSolicitudMantenimiento(descripcionMantenimiento);
                }}
              >
                <Text style={styles.modalBtnEnviarTexto}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalProblema}
        transparent
        animationType="fade"
        onRequestClose={() => setModalProblema(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Reportar problema</Text>
            <Text style={styles.modalSubtitulo}>
              Describe lo observado en campo:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={descripcionProblema}
              onChangeText={setDescripcionProblema}
              placeholder="Ej: Ruido anormal, golpe visible, pieza suelta..."
              placeholderTextColor="#90A4AE"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalProblema(false)}
                disabled={enviandoReporte}
              >
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnEnviar,
                  enviandoReporte && styles.btnDeshabilitado,
                ]}
                onPress={async () => {
                  if (!descripcionProblema.trim()) {
                    return;
                  }
                  setModalProblema(false);
                  await enviarReporteProblema(descripcionProblema);
                }}
                disabled={enviandoReporte}
              >
                <Text style={styles.modalBtnEnviarTexto}>Enviar a MS3</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.encabezado}>
        <Text style={styles.codigo}>{activo.codigo}</Text>
        <Text style={styles.nombre}>{activo.nombre}</Text>
        {activo.descripcion && (
          <Text style={styles.descripcion}>{activo.descripcion}</Text>
        )}
      </View>

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Información General</Text>
        <InfoFila label="Categoría" valor={activo.categoria?.nombre} />
        <InfoFila label="Área" valor={activo.area?.nombre} />
        <InfoFila label="Estado" valor={activo.estado} />
        <InfoFila
          label="Valor de adquisición"
          valor={`$${activo.valorAdquisicion.toLocaleString("es-BO")}`}
        />
        <InfoFila
          label="Valor en libros"
          valor={`$${activo.valorLibros.toLocaleString("es-BO")}`}
        />
        <InfoFila
          label="Fecha de adquisición"
          valor={new Date(activo.fechaAdquisicion).toLocaleDateString("es-BO")}
        />
        <InfoFila label="Vida útil" valor={`${activo.vidaUtilAnios} años`} />
      </View>

      {ultimoDiag && (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Última Verificación IA</Text>
          <View
            style={[
              styles.diagBadge,
              {
                backgroundColor:
                  ESTADO_FISICO_COLOR[ultimoDiag.estado] ?? "#78909C",
              },
            ]}
          >
            <Text style={styles.diagEstado}>
              {ultimoDiag.estado.toUpperCase()}
            </Text>
            <Text style={styles.diagConfianza}>
              Confianza: {(ultimoDiag.confianza * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.diagDetalle}>{ultimoDiag.detalle}</Text>
          <Text style={styles.diagRecomendacion}>
            💡 {ultimoDiag.recomendacion}
          </Text>
          <Text style={styles.diagFecha}>
            {new Date(ultimoDiag.fechaDiagnostico).toLocaleString("es-BO")}
          </Text>
        </View>
      )}

      {prediccionVidaUtil && (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Predicción de Vida Útil</Text>
          <View style={styles.prediccionBar}>
            <View
              style={[
                styles.prediccionRelleno,
                {
                  width: `${Math.min(
                    prediccionVidaUtil.porcentajeDepreciado,
                    100,
                  ).toFixed(0)}%` as any,
                },
              ]}
            />
          </View>
          <InfoFila
            label="Depreciación"
            valor={`${prediccionVidaUtil.porcentajeDepreciado.toFixed(1)}%`}
          />
          <InfoFila
            label="Vida restante"
            valor={`${prediccionVidaUtil.aniosRestantes} años / ${prediccionVidaUtil.mesesRestantes} meses`}
          />
          <InfoFila
            label="Estado ML"
            valor={
              prediccionVidaUtil.estaDepreciadoCompletamente
                ? "Depreciado completamente"
                : "Con vida útil disponible"
            }
          />
        </View>
      )}

      <View style={styles.seccion}>
        <Text style={styles.tituloSeccion}>Ubicación GPS</Text>
        {activo.latitud && activo.longitud ? (
          <>
            <InfoFila label="Latitud" valor={activo.latitud.toFixed(6)} />
            <InfoFila label="Longitud" valor={activo.longitud.toFixed(6)} />
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() =>
                navigation.navigate("Mapa", {
                  activoId,
                  latitud: activo.latitud,
                  longitud: activo.longitud,
                })
              }
            >
              <Text style={styles.btnSecundarioTexto}>🗺 Ver en mapa</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.sinDatos}>Sin ubicación registrada</Text>
        )}
        {puedeRegistrarGps && (
          <TouchableOpacity
            style={[
              styles.btnPrimario,
              guardandoUbicacion && styles.btnDeshabilitado,
            ]}
            onPress={handleRegistrarUbicacion}
            disabled={guardandoUbicacion || gpsLoading}
          >
            {guardandoUbicacion ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnPrimarioTexto}>
                📍 Actualizar ubicación GPS
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {(puedeDiagnosticar ||
        puedeSolicitarMantenimiento ||
        puedeReportarProblema) && (
        <View style={styles.acciones}>
          {puedeDiagnosticar && (
            <TouchableOpacity
              style={styles.btnAccion}
              onPress={() => navigation.navigate("DiagnosticoIA", { activoId })}
            >
              <Text style={styles.btnAccionTexto}>🔍 Verificar con IA</Text>
            </TouchableOpacity>
          )}
          {puedeSolicitarMantenimiento && (
            <TouchableOpacity
              style={[styles.btnAccion, styles.btnAccionNaranja]}
              onPress={handleSolicitarMantenimiento}
            >
              <Text style={styles.btnAccionTexto}>
                🔧 Solicitar mantenimiento
              </Text>
            </TouchableOpacity>
          )}
          {puedeReportarProblema && (
            <TouchableOpacity
              style={[styles.btnAccion, styles.btnAccionVerde]}
              onPress={handleReportarProblema}
            >
              <Text style={styles.btnAccionTexto}>📲 Reportar problema MS3</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function InfoFila({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) {
    return null;
  }
  return (
    <View style={styles.infoFila}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, paddingBottom: 32 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  textoError: {
    color: "#546E7A",
    fontSize: 15,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  encabezado: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  codigo: {
    fontSize: 12,
    color: "#90CAF9",
    fontWeight: "600",
    marginBottom: 4,
  },
  nombre: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  descripcion: { fontSize: 14, color: "#BBDEFB" },
  seccion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tituloSeccion: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1565C0",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  infoLabel: { fontSize: 14, color: "#78909C" },
  infoValor: {
    fontSize: 14,
    color: "#212121",
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  diagBadge: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  diagEstado: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  diagConfianza: { color: "#FFFFFF", fontSize: 13, marginTop: 2 },
  diagDetalle: { fontSize: 14, color: "#37474F", marginBottom: 8 },
  diagRecomendacion: {
    fontSize: 14,
    color: "#1565C0",
    fontStyle: "italic",
    marginBottom: 4,
  },
  diagFecha: { fontSize: 12, color: "#90A4AE" },
  prediccionBar: {
    width: "100%",
    height: 10,
    backgroundColor: "#ECEFF1",
    borderRadius: 5,
    marginBottom: 10,
    overflow: "hidden",
  },
  prediccionRelleno: {
    height: 10,
    backgroundColor: "#1565C0",
    borderRadius: 5,
  },
  sinDatos: { fontSize: 14, color: "#90A4AE", fontStyle: "italic" },
  btnPrimario: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  btnPrimarioTexto: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  btnDeshabilitado: { backgroundColor: "#90A4AE" },
  btnSecundario: {
    borderWidth: 1,
    borderColor: "#1565C0",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnSecundarioTexto: { color: "#1565C0", fontWeight: "600", fontSize: 14 },
  acciones: { gap: 10 },
  btnAccion: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnAccionNaranja: { backgroundColor: "#E65100" },
  btnAccionVerde: { backgroundColor: "#2E7D32" },
  btnAccionTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  modalSubtitulo: { fontSize: 14, color: "#78909C", marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#212121",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtnCancelar: { paddingHorizontal: 16, paddingVertical: 10 },
  modalBtnCancelarTexto: { color: "#78909C", fontSize: 15, fontWeight: "600" },
  modalBtnEnviar: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBtnEnviarTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
