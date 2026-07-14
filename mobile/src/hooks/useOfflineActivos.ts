import { useState, useEffect, useCallback } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { ms1Service } from "../services/ms1Service";
import { ms3Service } from "../services/ms3Service";
import { offlineCache } from "../services/offlineCache";
import type { Activo } from "../types/activo.types";

interface UseOfflineActivosReturn {
  activos: Activo[];
  isOffline: boolean;
  cargando: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
  pendientesSincronizacion: number;
}

type UseOfflineActivosOptions = {
  onSessionExpired?: () => void;
};

function isAuthError(err: unknown): boolean {
  const maybeHttpError = err as {
    response?: { status?: number };
    message?: string;
  };
  const status = maybeHttpError.response?.status;
  const message = maybeHttpError.message ?? "";

  return (
    status === 401 ||
    status === 403 ||
    /unauthorized|forbidden|access denied/i.test(message)
  );
}

/**
 * Hook principal de la app móvil (CU-40, CU-45):
 * - Online: descarga activos de MS1 y actualiza caché
 * - Offline: carga activos desde AsyncStorage
 * - Detecta recuperación de conexión para sincronizar
 */
export function useOfflineActivos(
  usuarioId: string,
  options: UseOfflineActivosOptions = {},
): UseOfflineActivosReturn {
  const { onSessionExpired } = options;
  const [activos, setActivos] = useState<Activo[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientesSincronizacion, setPendientesSincronizacion] = useState(0);

  const cargarActivos = useCallback(
    async (offline: boolean) => {
      setCargando(true);
      setError(null);
      try {
        if (!usuarioId) {
          const cached = await offlineCache.loadActivos();
          setActivos(cached);
          return;
        }

        if (offline) {
          // Modo offline: cargar desde caché
          const cached = await offlineCache.loadActivos();
          setActivos(cached);
        } else {
          // Modo online: descargar de MS1 y actualizar caché
          const data = await ms1Service.getActivosAsignados(usuarioId);
          setActivos(data);
          await offlineCache.saveActivos(data);
        }
      } catch (err) {
        // Fallback a caché si falla la red
        const cached = await offlineCache.loadActivos();
        setActivos(cached);
        if (isAuthError(err)) {
          await offlineCache.clearSession();
          setError("Sesión expirada — vuelve a iniciar sesión");
          onSessionExpired?.();
        } else {
          setError(
            offline
              ? "Sin conexión — usando datos en caché"
              : "No se pudo conectar con MS1 — mostrando datos en caché",
          );
        }
      } finally {
        setCargando(false);
      }
    },
    [onSessionExpired, usuarioId],
  );

  const sincronizarPendientes = useCallback(async () => {
    const ops = await offlineCache.loadPendingOps();
    if (ops.length === 0) {
      return;
    }

    let sincronizadas = 0;
    for (const op of ops) {
      try {
        switch (op.tipo) {
          case "actualizar_ubicacion":
            await ms1Service.actualizarUbicacion(
              op.payload.activoId as string,
              op.payload.latitud as number,
              op.payload.longitud as number,
            );
            break;
          case "solicitar_mantenimiento":
            await ms1Service.solicitarMantenimiento(
              op.payload.activoId as string,
              op.payload.descripcion as string,
            );
            break;
          case "reportar_problema":
            await ms3Service.reportarProblema({
              activoId: op.payload.activoId as string,
              activoCodigo: op.payload.activoCodigo as string,
              descripcion: op.payload.descripcion as string,
              latitud: op.payload.latitud as number | undefined,
              longitud: op.payload.longitud as number | undefined,
            });
            break;
        }
        sincronizadas++;
      } catch {
        // Continuar con las demás operaciones
      }
    }

    if (sincronizadas === ops.length) {
      await offlineCache.clearPendingOps();
      setPendientesSincronizacion(0);
    }
  }, []);

  // Escuchar cambios de conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected;
      setIsOffline(offline);

      if (!offline) {
        // Al recuperar conexión: sincronizar y refrescar (CU-45)
        sincronizarPendientes().then(() => cargarActivos(false));
      }
    });
    return unsubscribe;
  }, [cargarActivos, sincronizarPendientes]);

  // Carga inicial
  useEffect(() => {
    NetInfo.fetch().then((state: NetInfoState) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      cargarActivos(offline);
    });
  }, [cargarActivos]);

  // Actualizar contador de pendientes
  useEffect(() => {
    offlineCache
      .loadPendingOps()
      .then((ops) => setPendientesSincronizacion(ops.length));
  }, []);

  const refrescar = useCallback(async () => {
    await cargarActivos(isOffline);
    const ops = await offlineCache.loadPendingOps();
    setPendientesSincronizacion(ops.length);
  }, [cargarActivos, isOffline]);

  return {
    activos,
    isOffline,
    cargando,
    error,
    refrescar,
    pendientesSincronizacion,
  };
}
