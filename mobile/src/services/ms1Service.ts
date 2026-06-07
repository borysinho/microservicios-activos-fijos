import axios, { AxiosInstance } from "axios";
import Config from "react-native-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Activo,
  LoginRequest,
  LoginResponse,
  PrediccionVidaUtil,
} from "../types/activo.types";

const BASE_URL = Config.MS1_BASE_URL ?? "http://10.0.2.2:8080/api";

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Adjuntar token JWT en cada petición
http.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ms1Service = {
  /** CU-34, CU-40: Autenticarse con credenciales */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>("/auth/login", credentials);
    return data;
  },

  /** CU-40, CU-41: Obtener activos asignados al área del responsable */
  async getActivosAsignados(usuarioId: string): Promise<Activo[]> {
    const { data } = await http.get<Activo[]>(
      `/activos/asignados?responsableId=${usuarioId}`,
    );
    return data;
  },

  /** CU-41: Obtener detalle completo de un activo */
  async getActivoById(activoId: string): Promise<Activo> {
    const { data } = await http.get<Activo>(`/activos/${activoId}`);
    return data;
  },

  /** CU-42: Actualizar coordenadas GPS del activo */
  async actualizarUbicacion(
    activoId: string,
    latitud: number,
    longitud: number,
  ): Promise<void> {
    await http.patch(`/activos/${activoId}/ubicacion`, { latitud, longitud });
  },

  /** CU-37: Guardar diagnóstico IA en el historial del activo */
  async registrarDiagnostico(
    activoId: string,
    diagnosticoId: string,
  ): Promise<void> {
    await http.post(`/activos/${activoId}/diagnosticos`, { diagnosticoId });
  },

  /** CU-38: Consultar historial de diagnósticos anteriores */
  async getDiagnosticosHistorial(activoId: string): Promise<any[]> {
    const { data } = await http.get(`/activos/${activoId}/diagnosticos`);
    return data;
  },

  /** CU-39: Solicitar orden de mantenimiento */
  async solicitarMantenimiento(
    activoId: string,
    descripcion: string,
  ): Promise<void> {
    await http.post(`/activos/${activoId}/mantenimiento`, { descripcion });
  },

  /** Predicción de vida útil para la ficha del activo (CU-64 desde móvil) */
  async getPrediccionVidaUtil(activoId: string): Promise<PrediccionVidaUtil> {
    const { data } = await http.get<PrediccionVidaUtil>(
      `/activos/${activoId}/prediccion-vida-util`,
    );
    return data;
  },
};
