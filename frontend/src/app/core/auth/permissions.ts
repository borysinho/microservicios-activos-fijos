import type { UserRole } from '../services/auth.service';

export type AppRoutePath =
  | 'dashboard'
  | 'activos'
  | 'incidencias'
  | 'asignaciones'
  | 'traslados'
  | 'bajas'
  | 'depreciacion'
  | 'documentos'
  | 'auditoria'
  | 'machine-learning'
  | 'blockchain'
  | 'categorias'
  | 'areas'
  | 'usuarios';

export type PermissionAction =
  | 'activo.crear'
  | 'activo.editar'
  | 'activo.cambiarEstado'
  | 'activo.asignar'
  | 'activo.trasladar'
  | 'activo.baja'
  | 'asignacion.gestionar'
  | 'traslado.registrar'
  | 'traslado.confirmar'
  | 'baja.gestionar'
  | 'baja.generarActa'
  | 'documento.subir'
  | 'documento.versionar'
  | 'documento.eliminar'
  | 'documento.verAuditoria'
  | 'ia.diagnosticar'
  | 'incidencia.gestionar'
  | 'reporte.exportar';

export interface NavItem {
  label: string;
  route: `/${AppRoutePath}`;
  icon: string;
}

const ALL_ROLES: UserRole[] = ['ADMINISTRADOR', 'RESPONSABLE_AREA', 'AUDITOR', 'SOLO_LECTURA'];
const ADMIN_AUDITOR: UserRole[] = ['ADMINISTRADOR', 'AUDITOR'];
const OPERATIVE_ROLES: UserRole[] = ['ADMINISTRADOR', 'RESPONSABLE_AREA', 'AUDITOR'];

export const ROUTE_ROLES: Record<AppRoutePath, UserRole[]> = {
  dashboard: ALL_ROLES,
  activos: ALL_ROLES,
  incidencias: ALL_ROLES,
  asignaciones: OPERATIVE_ROLES,
  traslados: OPERATIVE_ROLES,
  bajas: ADMIN_AUDITOR,
  depreciacion: ADMIN_AUDITOR,
  documentos: ALL_ROLES,
  auditoria: ADMIN_AUDITOR,
  'machine-learning': ALL_ROLES,
  blockchain: ALL_ROLES,
  categorias: ['ADMINISTRADOR'],
  areas: ['ADMINISTRADOR'],
  usuarios: ['ADMINISTRADOR'],
};

export const ACTION_ROLES: Record<PermissionAction, UserRole[]> = {
  'activo.crear': ['ADMINISTRADOR'],
  'activo.editar': ['ADMINISTRADOR'],
  'activo.cambiarEstado': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'activo.asignar': ['ADMINISTRADOR'],
  'activo.trasladar': ['ADMINISTRADOR'],
  'activo.baja': ['ADMINISTRADOR'],
  'asignacion.gestionar': ['ADMINISTRADOR'],
  'traslado.registrar': ['ADMINISTRADOR'],
  'traslado.confirmar': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'baja.gestionar': ['ADMINISTRADOR'],
  'baja.generarActa': ADMIN_AUDITOR,
  'documento.subir': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'documento.versionar': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'documento.eliminar': ['ADMINISTRADOR'],
  'documento.verAuditoria': ADMIN_AUDITOR,
  'ia.diagnosticar': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'incidencia.gestionar': ['ADMINISTRADOR', 'RESPONSABLE_AREA'],
  'reporte.exportar': ADMIN_AUDITOR,
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', route: '/dashboard', icon: 'dashboard' },
  { label: 'Inventario', route: '/activos', icon: 'activos' },
  { label: 'Incidencias', route: '/incidencias', icon: 'incidencias' },
  { label: 'Responsables', route: '/asignaciones', icon: 'asignaciones' },
  { label: 'Movimientos', route: '/traslados', icon: 'traslados' },
  { label: 'Retiro de activos', route: '/bajas', icon: 'bajas' },
  { label: 'Valor contable', route: '/depreciacion', icon: 'depreciacion' },
  { label: 'Expedientes', route: '/documentos', icon: 'documentos' },
  { label: 'Auditoría', route: '/auditoria', icon: 'auditoria' },
  { label: 'Predicción', route: '/machine-learning', icon: 'ml' },
  { label: 'Trazabilidad', route: '/blockchain', icon: 'blockchain' },
  { label: 'Catálogos', route: '/categorias', icon: 'categorias' },
  { label: 'Organización', route: '/areas', icon: 'areas' },
  { label: 'Usuarios', route: '/usuarios', icon: 'usuarios' },
];

export function routePathFromUrl(route: string): AppRoutePath | null {
  const normalized = route.replace(/^\//, '').split('/')[0] as AppRoutePath;
  return normalized in ROUTE_ROLES ? normalized : null;
}

export function hasAnyRole(role: UserRole | undefined | null, roles: readonly UserRole[]): boolean {
  return !!role && roles.includes(role);
}

export function canAccessRoute(role: UserRole | undefined | null, route: string): boolean {
  const path = routePathFromUrl(route);
  return path ? hasAnyRole(role, ROUTE_ROLES[path]) : true;
}

export function canPerform(role: UserRole | undefined | null, action: PermissionAction): boolean {
  return hasAnyRole(role, ACTION_ROLES[action]);
}
