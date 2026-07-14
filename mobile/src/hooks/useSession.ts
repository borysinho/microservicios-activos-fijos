import { useCallback, useEffect, useState } from "react";
import { offlineCache } from "../services/offlineCache";
import type { Usuario } from "../types/activo.types";

type SessionState = {
  token: string;
  usuario: Usuario;
};

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const reloadSession = useCallback(async () => {
    setCargandoSesion(true);
    try {
      const stored = await offlineCache.loadSession();
      setSession(stored);
      return stored;
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  useEffect(() => {
    reloadSession();
  }, [reloadSession]);

  const clearSession = useCallback(async () => {
    await offlineCache.clearSession();
    setSession(null);
  }, []);

  return {
    session,
    usuario: session?.usuario ?? null,
    cargandoSesion,
    reloadSession,
    clearSession,
  };
}
