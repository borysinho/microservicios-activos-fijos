import { canMobile, getRoleHomeTitle } from "./mobilePermissions";

describe("mobilePermissions", () => {
  it("permite trabajo de campo solo a administrador y responsable de area", () => {
    expect(canMobile("ADMINISTRADOR", "activos.diagnosticarIA")).toBe(true);
    expect(canMobile("RESPONSABLE_AREA", "activos.registrarGPS")).toBe(true);
    expect(canMobile("AUDITOR", "activos.diagnosticarIA")).toBe(false);
    expect(canMobile("SOLO_LECTURA", "activos.reportarProblema")).toBe(false);
  });

  it("mantiene consulta de activos y notificaciones para todos los roles", () => {
    expect(canMobile("ADMINISTRADOR", "activos.ver")).toBe(true);
    expect(canMobile("RESPONSABLE_AREA", "notificaciones.ver")).toBe(true);
    expect(canMobile("AUDITOR", "activos.verPrediccion")).toBe(true);
    expect(canMobile("SOLO_LECTURA", "activos.ver")).toBe(true);
  });

  it("personaliza el panel inicial por perfil", () => {
    expect(getRoleHomeTitle("RESPONSABLE_AREA")).toBe("Trabajo de campo");
    expect(getRoleHomeTitle("AUDITOR")).toBe("Revision y evidencia");
    expect(getRoleHomeTitle("SOLO_LECTURA")).toBe("Consulta movil");
  });
});
