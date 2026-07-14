import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
} from "react-native";
import { Camera } from "react-native-vision-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/activo.types";
import { useCamera } from "../hooks/useCamera";
import { useGPS } from "../hooks/useGPS";
import { ms2Service } from "../services/ms2Service";
import { useSession } from "../hooks/useSession";
import { canMobile } from "../auth/mobilePermissions";

type Props = NativeStackScreenProps<RootStackParamList, "DiagnosticoIA">;

/**
 * CU-34: Fotografiar activo con cámara del dispositivo
 * CU-35: Enviar imagen para verificación visual IA
 * CU-36: Procesar imagen y retornar evidencia/alerta auditable
 * CU-37: Guardar imagen y verificación en historial del activo
 */
export default function DiagnosticoIAScreen({ route, navigation }: Props) {
  const { activoId } = route.params;
  const { usuario, cargandoSesion } = useSession();
  const {
    cameraRef,
    device,
    hasPermission,
    requestPermission,
    takePhoto,
    isTakingPhoto,
  } = useCamera();
  const { obtenerUbicacion } = useGPS();
  const [enviando, setEnviando] = useState(false);
  const [solicitandoPermiso, setSolicitandoPermiso] = useState(!hasPermission);
  const procesando = enviando || isTakingPhoto;
  const puedeDiagnosticar = canMobile(usuario?.rol, "activos.diagnosticarIA");

  const solicitarPermisoCamara = useCallback(async () => {
    setSolicitandoPermiso(true);
    try {
      return await requestPermission();
    } finally {
      setSolicitandoPermiso(false);
    }
  }, [requestPermission]);

  useEffect(() => {
    if (!cargandoSesion && puedeDiagnosticar && !hasPermission) {
      solicitarPermisoCamara().catch(() => setSolicitandoPermiso(false));
    }
  }, [
    cargandoSesion,
    hasPermission,
    puedeDiagnosticar,
    solicitarPermisoCamara,
  ]);

  const handleCapturar = async () => {
    if (!puedeDiagnosticar) {
      Alert.alert(
        "Acceso restringido",
        "Tu perfil no puede ejecutar verificacion IA.",
      );
      navigation.goBack();
      return;
    }

    if (!hasPermission) {
      const granted = await solicitarPermisoCamara();
      if (!granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el permiso de cámara en Configuración para usar esta función.",
        );
        return;
      }
    }

    try {
      // 1. Capturar foto (CU-34)
      const photo = await takePhoto();

      setEnviando(true);

      // 2. Obtener coordenadas GPS (CU-42)
      let latitud = 0;
      let longitud = 0;
      try {
        const coords = await obtenerUbicacion();
        latitud = coords.latitud;
        longitud = coords.longitud;
      } catch {
        // GPS opcional — continuar sin coordenadas
      }

      // 3. Enviar para verificación visual IA (CU-35, CU-36)
      const resultado = await ms2Service.diagnosticarImagen({
        imagePath: photo.path,
        activoId,
        latitud,
        longitud,
      });

      // 4. Navegar a pantalla de resultado (CU-37)
      navigation.replace("ResultadoDiagnostico", { resultado });
    } catch (err: any) {
      Alert.alert(
        "Error en verificación",
        err.message ?? "Ocurrió un error al procesar la imagen.",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoSesion) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color="#FFFFFF" />
        <Text style={styles.textoError}>Preparando verificacion...</Text>
      </View>
    );
  }

  if (!puedeDiagnosticar) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.tituloPermiso}>Acceso restringido</Text>
        <Text style={styles.textoError}>
          Tu perfil no puede ejecutar verificacion IA.
        </Text>
        <TouchableOpacity
          style={styles.btnPermisoPrimario}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnPermisoPrimarioTexto}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>
          Cámara no disponible en este dispositivo.
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centrado}>
        <StatusBar barStyle="light-content" backgroundColor="#212121" />
        <Text style={styles.tituloPermiso}>Permiso de cámara requerido</Text>
        <Text style={styles.textoError}>
          Para verificar el activo con IA, la aplicación necesita acceder a la
          cámara del dispositivo.
        </Text>

        {solicitandoPermiso ? (
          <View style={styles.permisoCargando}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.textoPermiso}>Solicitando permiso…</Text>
          </View>
        ) : (
          <View style={styles.permisoAcciones}>
            <TouchableOpacity
              style={styles.btnPermisoPrimario}
              onPress={solicitarPermisoCamara}
            >
              <Text style={styles.btnPermisoPrimarioTexto}>
                Permitir cámara
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPermisoSecundario}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.btnPermisoSecundarioTexto}>
                Abrir configuración
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPermisoSecundario}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.btnPermisoSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Vista de cámara */}
      <Camera
        ref={cameraRef}
        style={styles.camara}
        device={device}
        isActive={!enviando}
        photo
      />

      {/* Overlay de instrucciones */}
      <View style={styles.overlay}>
        <View style={styles.visor} />
        <Text style={styles.instruccion}>
          Encuadra el activo y su etiqueta dentro del recuadro
        </Text>
      </View>

      {/* Controles */}
      <View style={styles.controles}>
        <TouchableOpacity
          style={styles.btnVolver}
          onPress={() => navigation.goBack()}
          disabled={procesando}
        >
          <Text style={styles.btnVolverTexto}>✕ Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnCaptura, procesando && styles.btnDeshabilitado]}
          onPress={handleCapturar}
          disabled={procesando}
        >
          {procesando ? (
            <View style={styles.capturandoContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.capturandoTexto}>
                {isTakingPhoto ? "Capturando..." : "Analizando..."}
              </Text>
            </View>
          ) : (
            <View style={styles.botonCaptura} />
          )}
        </TouchableOpacity>

        <View style={styles.espaciador} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  centrado: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#212121",
  },
  textoError: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    padding: 24,
  },
  tituloPermiso: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  permisoCargando: {
    alignItems: "center",
    gap: 12,
  },
  textoPermiso: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  permisoAcciones: {
    width: "100%",
    paddingHorizontal: 32,
    gap: 12,
  },
  btnPermisoPrimario: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#1565C0",
    justifyContent: "center",
    alignItems: "center",
  },
  btnPermisoPrimarioTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnPermisoSecundario: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  btnPermisoSecundarioTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  camara: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  visor: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    opacity: 0.7,
  },
  instruccion: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controles: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  btnVolver: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnVolverTexto: { color: "#FFFFFF", fontSize: 16 },
  btnCaptura: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  btnDeshabilitado: { opacity: 0.5 },
  botonCaptura: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
  },
  capturandoContainer: { alignItems: "center" },
  capturandoTexto: { color: "#FFFFFF", fontSize: 11, marginTop: 4 },
  espaciador: { width: 70 },
});
