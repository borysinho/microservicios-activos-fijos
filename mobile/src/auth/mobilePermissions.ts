import type { RolUsuario } from "../types/activo.types";

export type MobilePermission =
  | "activos.ver"
  | "activos.diagnosticarIA"
  | "activos.registrarGPS"
  | "activos.solicitarMantenimiento"
  | "activos.reportarProblema"
  | "activos.verPrediccion"
  | "offline.verEstado"
  | "notificaciones.ver";

const ALL_ROLES: RolUsuario[] = [
  "ADMINISTRADOR",
  "RESPONSABLE_AREA",
  "AUDITOR",
  "SOLO_LECTURA",
];

const FIELD_ROLES: RolUsuario[] = ["ADMINISTRADOR", "RESPONSABLE_AREA"];

export const MOBILE_PERMISSION_ROLES: Record<MobilePermission, RolUsuario[]> = {
  "activos.ver": ALL_ROLES,
  "activos.diagnosticarIA": FIELD_ROLES,
  "activos.registrarGPS": FIELD_ROLES,
  "activos.solicitarMantenimiento": FIELD_ROLES,
  "activos.reportarProblema": FIELD_ROLES,
  "activos.verPrediccion": ALL_ROLES,
  "offline.verEstado": ALL_ROLES,
  "notificaciones.ver": ALL_ROLES,
};

export function canMobile(
  rol: RolUsuario | undefined | null,
  permission: MobilePermission,
): boolean {
  return !!rol && MOBILE_PERMISSION_ROLES[permission].includes(rol);
}

export function getRoleLabel(rol: RolUsuario | undefined | null): string {
  switch (rol) {
    case "ADMINISTRADOR":
      return "Administrador";
    case "RESPONSABLE_AREA":
      return "Responsable de area";
    case "AUDITOR":
      return "Auditor";
    case "SOLO_LECTURA":
      return "Solo lectura";
    default:
      return "Sin perfil";
  }
}

export function getRoleHomeTitle(rol: RolUsuario | undefined | null): string {
  switch (rol) {
    case "ADMINISTRADOR":
      return "Supervision movil";
    case "RESPONSABLE_AREA":
      return "Trabajo de campo";
    case "AUDITOR":
      return "Revision y evidencia";
    case "SOLO_LECTURA":
      return "Consulta movil";
    default:
      return "Inicio";
  }
}
