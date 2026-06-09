import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Activo, Usuario } from "../types/activo.types";

const KEYS = {
  ACTIVOS: "cache_activos_asignados",
  USUARIO: "auth_usuario",
  TOKEN: "auth_token",
  PENDING_OPS: "pending_operations",
} as const;

export interface PendingOperation {
  id: string;
  tipo:
    | "actualizar_ubicacion"
    | "registrar_diagnostico"
    | "solicitar_mantenimiento"
    | "reportar_problema";
  payload: Record<string, unknown>;
  timestamp: string;
}

export const offlineCache = {
  // ── Activos asignados (CU-40: modo offline) ──────────────────────────────

  /** Guardar lista de activos en caché local */
  async saveActivos(activos: Activo[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVOS, JSON.stringify(activos));
  },

  /** Cargar activos desde caché local */
  async loadActivos(): Promise<Activo[]> {
    const data = await AsyncStorage.getItem(KEYS.ACTIVOS);
    return data ? (JSON.parse(data) as Activo[]) : [];
  },

  /** Borrar caché de activos */
  async clearActivos(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.ACTIVOS);
  },

  // ── Sesión de usuario ───────────────────────────────────────────────────

  async saveSession(token: string, usuario: Usuario): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.TOKEN, token],
      [KEYS.USUARIO, JSON.stringify(usuario)],
    ]);
  },

  async loadSession(): Promise<{ token: string; usuario: Usuario } | null> {
    const [[, token], [, usuarioJson]] = await AsyncStorage.multiGet([
      KEYS.TOKEN,
      KEYS.USUARIO,
    ]);
    if (!token || !usuarioJson) {
      return null;
    }
    return { token, usuario: JSON.parse(usuarioJson) as Usuario };
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USUARIO]);
  },

  // ── Operaciones pendientes de sincronización (CU-45) ──────────────────

  /** Encolar operación para sincronizar al recuperar conexión */
  async enqueuePendingOp(
    op: Omit<PendingOperation, "id" | "timestamp">,
  ): Promise<void> {
    const existing = await offlineCache.loadPendingOps();
    const newOp: PendingOperation = {
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      KEYS.PENDING_OPS,
      JSON.stringify([...existing, newOp]),
    );
  },

  /** Cargar operaciones pendientes */
  async loadPendingOps(): Promise<PendingOperation[]> {
    const data = await AsyncStorage.getItem(KEYS.PENDING_OPS);
    return data ? (JSON.parse(data) as PendingOperation[]) : [];
  },

  /** Limpiar operaciones pendientes (tras sincronización exitosa) */
  async clearPendingOps(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PENDING_OPS);
  },
};
