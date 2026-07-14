export type EstadoActivo = 'ACTIVO' | 'EN_MANTENIMIENTO' | 'TRANSFERIDO' | 'DADO_DE_BAJA';
export type EstadoIncidencia = 'NUEVA' | 'ABIERTA' | 'EN_PROCESO' | 'REVISADA';
export type MetodoDepreciacion = 'LINEAL' | 'ACELERADO' | 'SUMA_DIGITOS';
export type OrigenIncidencia = 'ACTIVO' | 'ALERTA';
export type PrioridadIncidencia = 'ALTA' | 'MEDIA' | 'BAJA';
export type RolUsuario = 'ADMINISTRADOR' | 'RESPONSABLE_AREA' | 'AUDITOR' | 'SOLO_LECTURA';
export type TipoTransaccionBlockchain =
  | 'REGISTRO'
  | 'ASIGNACION'
  | 'TRASLADO'
  | 'MANTENIMIENTO'
  | 'BAJA';

export interface CategoriaActivo {
  id: string;
  nombre: string;
  descripcion?: string;
  metodoDepreciacion: MetodoDepreciacion;
  tasaDepreciacion: number;
}
export interface Area {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  responsable?: Responsable;
}
export interface Responsable {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  telefono?: string;
}
export interface Usuario {
  id: string;
  username: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
}
export interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  vidaUtilAnios: number;
  estado: EstadoActivo;
  categoria: CategoriaActivo;
  areaActual?: Area;
  ubicacion?: string;
  valorLibros?: number;
  asignaciones: Asignacion[];
  traslados: Traslado[];
  registrosBlockchain: RegistroBlockchain[];
}
export interface Asignacion {
  id: string;
  activo: Activo;
  responsable: Responsable;
  area: Area;
  fechaAsignacion: string;
  fechaDevolucion?: string;
  observaciones?: string;
  activa: boolean;
}
export interface Traslado {
  id: string;
  activo: Activo;
  areaOrigen: Area;
  areaDestino: Area;
  autorizadoPor: Usuario;
  fecha: string;
  motivoTraslado?: string;
  recepcionConfirmada: boolean;
}
export interface Baja {
  id: string;
  activo: Activo;
  autorizadoPor: Usuario;
  fecha: string;
  motivo: string;
  valorResidual: number;
  numeroResolucion?: string;
  autorizada: boolean;
}
export interface RegistroBlockchain {
  id: string;
  activo: Activo;
  hash: string;
  tipoTransaccion: TipoTransaccionBlockchain;
  payload: string;
  bloqueId?: string;
  timestamp: string;
}
export interface Incidencia {
  id: string;
  origen: OrigenIncidencia;
  activo?: Activo;
  notificacionId?: string;
  codigoReferencia: string;
  titulo: string;
  tipo: string;
  area?: string;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  detalle: string;
  responsableOperativo?: string;
  diagnostico?: string;
  accionEjecutada?: string;
  proximaAccion?: string;
  fechaCompromiso?: string;
  creadoPor?: Usuario;
  cerradoPor?: Usuario;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaCierre?: string;
}
export interface DashboardMetricasDTO {
  totalActivos: number;
  activosActivos: number;
  activosEnMantenimiento: number;
  activosTransferidos: number;
  activosDadoDeBaja: number;
  valorTotalInventario: number;
  depreciacionAcumuladaTotal: number;
  activosPorCategoria: { categoria: string; cantidad: number }[];
  activosPorArea: { area: string; cantidad: number }[];
  asignacionesActivas: number;
  trasladosPendientes: number;
  adquisicionesPorAnio: { anio: number; cantidad: number }[];
}
export interface DetalleDepreciacionDTO {
  activoCodigo: string;
  activoNombre: string;
  metodoDepreciacion: string;
  valorAdquisicion: number;
  depreciacionAcumulada: number;
  depreciacionAnio: number;
  valorLibros: number;
}
export interface ReporteDepreciacionDTO {
  anio: number;
  detalles: DetalleDepreciacionDTO[];
  totalDepreciacionAnio: number;
  totalValorLibros: number;
}
export interface ActivoInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  vidaUtilAnios: number;
  categoriaId: string;
  areaActualId?: string;
  ubicacion?: string;
}
export interface FiltroActivoInput {
  busqueda?: string;
  codigo?: string;
  nombre?: string;
  estado?: EstadoActivo;
  categoriaId?: string;
  areaId?: string;
}
export interface FiltroIncidenciaInput {
  busqueda?: string;
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  origen?: OrigenIncidencia;
  activoId?: string;
  area?: string;
}
export interface IncidenciaInput {
  origen: OrigenIncidencia;
  activoId?: string;
  notificacionId?: string;
  codigoReferencia?: string;
  titulo: string;
  tipo: string;
  area?: string;
  prioridad: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  detalle: string;
  responsableOperativo?: string;
  diagnostico?: string;
  accionEjecutada?: string;
  proximaAccion?: string;
  fechaCompromiso?: string;
  usuarioId?: string;
}
export interface IncidenciaGestionInput {
  estado?: EstadoIncidencia;
  responsableOperativo?: string;
  diagnostico?: string;
  accionEjecutada?: string;
  proximaAccion?: string;
  fechaCompromiso?: string;
  usuarioId?: string;
}
export interface ProyeccionVidaUtilDTO {
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
