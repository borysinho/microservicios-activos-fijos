import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/activo.types";
import { ms1Service } from "../services/ms1Service";
import { offlineCache } from "../services/offlineCache";
import { pushNotificationService } from "../services/pushNotificationService";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa tu usuario y contraseña.");
      return;
    }

    setCargando(true);
    try {
      const response = await ms1Service.login({
        username: username.trim(),
        password,
      });
      await offlineCache.saveSession(response.token, response.usuario);
      pushNotificationService.registerDeviceToken().catch(() => undefined);
      navigation.replace("Main");
    } catch (err: any) {
      const mensaje =
        err?.response?.status === 401
          ? "Credenciales incorrectas"
          : "Error de conexión. Verifica tu red.";
      Alert.alert("Error de inicio de sesión", mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Activos Fijos</Text>
        <Text style={styles.subtitulo}>Sistema de Gestión</Text>

        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#90A4AE"
          value={username}
          onChangeText={setUsername}
          keyboardType="default"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          editable={!cargando}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#90A4AE"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          editable={!cargando}
        />

        <TouchableOpacity
          style={[styles.boton, cargando && styles.botonDeshabilitado]}
          onPress={handleLogin}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botonTexto}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1565C0",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1565C0",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: "#78909C",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#212121",
    marginBottom: 16,
    backgroundColor: "#FAFAFA",
  },
  boton: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  botonDeshabilitado: {
    backgroundColor: "#90A4AE",
  },
  botonTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
