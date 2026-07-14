import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "../config/env";

const BASE_URL = env.MS3_BASE_URL;

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** CU-43: Enviar reporte de problema para notificación por WhatsApp/email */
async function reportarProblema(params: {
  activoId: string;
  activoCodigo: string;
  descripcion: string;
  latitud?: number;
  longitud?: number;
}): Promise<{ ticketId: string; mensaje: string }> {
  const { data } = await http.post("/webhook/reportar-problema", params);
  return data;
}

/** CU-44: Registrar token FCM para notificaciones push */
async function registrarTokenPush(
  usuarioId: string,
  token: string,
  plataforma?: "android" | "ios" | "web",
): Promise<void> {
  await http.post("/notificaciones/registrar-token", {
    usuarioId,
    token,
    plataforma,
  });
}

/** CU-44: Consultar notificaciones del usuario */
async function getNotificaciones(usuarioId: string): Promise<any[]> {
  const { data } = await http.get("/notificaciones", {
    params: { usuarioId },
  });
  return data;
}

async function marcarNotificacionLeida(
  usuarioId: string,
  notificacionId: string,
): Promise<void> {
  await http.patch(`/notificaciones/${notificacionId}/leida`, {}, {
    params: { usuarioId },
  });
}

export const ms3Service = {
  reportarProblema,
  registrarTokenPush,
  getNotificaciones,
  marcarNotificacionLeida,
};
