import axios, { AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "../config/env";
import type {
  Activo,
  LoginRequest,
  LoginResponse,
  RolUsuario,
  PrediccionVidaUtil,
} from "../types/activo.types";

const BASE_URL = env.MS1_BASE_URL;

type BackendLoginResponse = {
  token: string;
  id: string;
  username: string;
  email: string;
  rol: RolUsuario;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type BackendActivo = Omit<Activo, "area"> & {
  areaActual?: Activo["area"];
  ubicacion?: string | null;
  valorAdquisicion: number | string;
  valorLibros: number | string | null;
};

type BackendPrediccionVidaUtil = Omit<
  PrediccionVidaUtil,
  "valorLibros" | "porcentajeDepreciado"
> & {
  valorLibros: number | string;
  porcentajeDepreciado: number | string;
};

type RegistroBlockchainMobile = {
  id: string;
  hash: string;
  tipoTransaccion:
    | "REGISTRO"
    | "ASIGNACION"
    | "TRASLADO"
    | "MANTENIMIENTO"
    | "BAJA";
  payload: string;
  bloqueId?: string | null;
  timestamp: string;
};

const ACTIVO_FIELDS = `
  id
  codigo
  nombre
  descripcion
  fechaAdquisicion
  valorAdquisicion
  valorLibros
  vidaUtilAnios
  estado
  ubicacion
  categoria {
    id
    nombre
    descripcion
    tasaDepreciacion
    metodoDepreciacion
  }
  areaActual {
    id
    nombre
    descripcion
  }
`;

function parseUbicacionGps(
  ubicacion?: string | null,
): Pick<Activo, "latitud" | "longitud"> {
  if (!ubicacion) {
    return {};
  }

  const match = ubicacion.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  if (!match) {
    return {};
  }

  return {
    latitud: Number(match[1]),
    longitud: Number(match[2]),
  };
}

function mapActivo(activo: BackendActivo): Activo {
  return {
    ...activo,
    valorAdquisicion: Number(activo.valorAdquisicion),
    valorLibros: Number(activo.valorLibros ?? activo.valorAdquisicion),
    area: activo.areaActual,
    ...parseUbicacionGps(activo.ubicacion),
  };
}

function mapPrediccionVidaUtil(
  prediccion: BackendPrediccionVidaUtil,
): PrediccionVidaUtil {
  return {
    ...prediccion,
    valorLibros: Number(prediccion.valorLibros),
    porcentajeDepreciado: Number(prediccion.porcentajeDepreciado),
  };
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { data } = await http.post<GraphQlResponse<T>>("/graphql", {
    query,
    variables,
  });

  if (data.errors?.length) {
    throw new Error(data.errors.map((error) => error.message).join("\n"));
  }

  if (!data.data) {
    throw new Error("Respuesta GraphQL vacía");
  }

  return data.data;
}

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
    const { data } = await http.post<BackendLoginResponse>("/auth/login", {
      username: credentials.username,
      password: credentials.password,
    });

    return {
      token: data.token,
      usuario: {
        id: data.id,
        nombre: data.username,
        email: data.email,
        rol: data.rol,
      },
    };
  },

  /** CU-40, CU-41: Obtener activos asignados al área del responsable */
  async getActivosAsignados(usuarioId: string): Promise<Activo[]> {
    void usuarioId;
    const { activos } = await graphqlRequest<{ activos: BackendActivo[] }>(
      `
        query ActivosMobile {
          activos {
            ${ACTIVO_FIELDS}
          }
        }
      `,
    );
    return activos.map(mapActivo);
  },

  /** CU-41: Obtener detalle completo de un activo */
  async getActivoById(activoId: string): Promise<Activo> {
    const { activo } = await graphqlRequest<{ activo: BackendActivo | null }>(
      `
        query ActivoMobile($id: ID!) {
          activo(id: $id) {
            ${ACTIVO_FIELDS}
          }
        }
      `,
      { id: activoId },
    );

    if (!activo) {
      throw new Error("Activo no encontrado");
    }

    return mapActivo(activo);
  },

  /** CU-42: Actualizar coordenadas GPS del activo */
  async actualizarUbicacion(
    activoId: string,
    latitud: number,
    longitud: number,
  ): Promise<void> {
    await graphqlRequest<{ actualizarUbicacionActivo: Pick<Activo, "id"> }>(
      `
        mutation ActualizarUbicacionMobile($activoId: ID!, $ubicacion: String) {
          actualizarUbicacionActivo(
            activoId: $activoId
            ubicacion: $ubicacion
          ) {
            id
          }
        }
      `,
      {
        activoId,
        ubicacion: `${latitud},${longitud}`,
      },
    );
  },

  /** CU-37: Valida el activo antes de consultar el historial IA */
  async registrarDiagnostico(
    activoId: string,
    diagnosticoId: string,
  ): Promise<void> {
    void diagnosticoId;
    const { activo } = await graphqlRequest<{
      activo: Pick<Activo, "id"> | null;
    }>(
      `
        query VerificarActivoParaDiagnostico($activoId: ID!) {
          activo(id: $activoId) {
            id
          }
        }
      `,
      { activoId },
    );
    if (!activo) {
      throw new Error("Activo no encontrado");
    }
  },

  /** CU-38: Consultar transacciones de mantenimiento registradas */
  async getDiagnosticosHistorial(
    activoId: string,
  ): Promise<RegistroBlockchainMobile[]> {
    const { historialBlockchain } = await graphqlRequest<{
      historialBlockchain: RegistroBlockchainMobile[];
    }>(
      `
        query HistorialDiagnosticosMobile($activoId: ID!) {
          historialBlockchain(activoId: $activoId) {
            id
            hash
            tipoTransaccion
            payload
            bloqueId
            timestamp
          }
        }
      `,
      { activoId },
    );
    return historialBlockchain.filter(
      (registro) => registro.tipoTransaccion === "MANTENIMIENTO",
    );
  },

  /** CU-39: Solicitar orden de mantenimiento */
  async solicitarMantenimiento(
    activoId: string,
    descripcion: string,
  ): Promise<void> {
    void descripcion;
    const activo = await this.getActivoById(activoId);
    if (activo.estado === "EN_MANTENIMIENTO") {
      return;
    }

    await graphqlRequest<{ cambiarEstadoActivo: Pick<Activo, "id"> }>(
      `
        mutation SolicitarMantenimientoMobile(
          $activoId: ID!
          $nuevoEstado: EstadoActivo!
        ) {
          cambiarEstadoActivo(
            activoId: $activoId
            nuevoEstado: $nuevoEstado
          ) {
            id
          }
        }
      `,
      { activoId, nuevoEstado: "EN_MANTENIMIENTO" },
    );
  },

  /** Predicción de vida útil para la ficha del activo (CU-64 desde móvil) */
  async getPrediccionVidaUtil(activoId: string): Promise<PrediccionVidaUtil> {
    const { proyectarVidaUtil } = await graphqlRequest<{
      proyectarVidaUtil: BackendPrediccionVidaUtil;
    }>(
      `
        query PrediccionVidaUtilMobile($activoId: ID!) {
          proyectarVidaUtil(activoId: $activoId) {
            activoId
            activoCodigo
            activoNombre
            vidaUtilAnios
            aniosTranscurridos
            aniosRestantes
            mesesRestantes
            porcentajeDepreciado
            valorLibros
            estaDepreciadoCompletamente
          }
        }
      `,
      { activoId },
    );
    return mapPrediccionVidaUtil(proyectarVidaUtil);
  },
};
