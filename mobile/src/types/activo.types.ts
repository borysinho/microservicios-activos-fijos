// Tipos principales del dominio — App Móvil Activos Fijos

export type EstadoActivo =
  | "ACTIVO"
  | "EN_MANTENIMIENTO"
  | "TRANSFERIDO"
  | "DADO_DE_BAJA";

export type EstadoFisicoActivo =
  | "bueno"
  | "deteriorado"
  | "requiere_mantenimiento"
  | "oxidado";

export type RolUsuario =
  | "ADMINISTRADOR"
  | "RESPONSABLE_AREA"
  | "AUDITOR"
  | "SOLO_LECTURA";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  areaId?: string;
}

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  responsableId?: string;
}

export interface CategoriaActivo {
  id: string;
  nombre: string;
  descripcion?: string;
  tasaDepreciacion: number;
  metodoDepreciacion: "LINEAL" | "ACELERADO" | "SUMA_DIGITOS";
}

export interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  valorAdquisicion: number;
  valorLibros: number;
  fechaAdquisicion: string;
  vidaUtilAnios: number;
  estado: EstadoActivo;
  categoria: CategoriaActivo;
  area?: Area;
  responsable?: Usuario;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  imageUrl?: string;
  ultimoDiagnostico?: DiagnosticoIA;
}

export interface Asignacion {
  id: string;
  activoId: string;
  activo?: Activo;
  responsableId: string;
  areaId: string;
  fechaAsignacion: string;
  fechaDevolucion?: string;
  observaciones?: string;
}

export interface DiagnosticoIA {
  id?: string;
  activoId: string;
  estado: EstadoFisicoActivo;
  confianza: number;
  detalle: string;
  recomendacion: string;
  imagenUrl?: string;
  latitud?: number;
  longitud?: number;
  fechaDiagnostico: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: "mantenimiento" | "alerta" | "info" | "baja";
  activoId?: string;
  leida: boolean;
  fechaCreacion: string;
}

export interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface PrediccionVidaUtil {
  activoId: string;
  activoCodigo: string;
  activoNombre: string;
  vidaUtilAnios: number;
  aniosTranscurridos: number;
  aniosRestantes: number;
  mesesRestantes: number;
  porcentajeDepreciado: number;
  valorLibros: number;
  estaDepreciadoCompletamente: boolean;
}

// Tipos de navegación
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  ActivoDetalle: { activoId: string };
  DiagnosticoIA: { activoId: string };
  Mapa: { activoId?: string; latitud?: number; longitud?: number };
  ResultadoDiagnostico: { resultado: DiagnosticoIA };
};

export type BottomTabParamList = {
  Activos: undefined;
  Notificaciones: undefined;
};
