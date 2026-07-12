import AsyncStorage from "@react-native-async-storage/async-storage";
import { ms2Service } from "./ms2Service";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

describe("ms2Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("jwt-mobile");
    global.fetch = jest.fn();
    (global as any).FormData = class {
      parts: Array<[string, unknown]> = [];

      append(name: string, value: unknown) {
        this.parts.push([name, value]);
      }
    };
  });

  it("envia imagen, activo y GPS al diagnostico IA de MS2", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        diagnostico: "EVIDENCIA_VALIDADA",
        estado: "evidencia_validada",
        confianza: 0.93,
        detalle: "Evidencia aceptada",
        recomendacion: "Registrar verificacion",
      }),
    });

    const result = await ms2Service.diagnosticarImagen({
      imagePath: "/tmp/foto.jpg",
      activoId: "activo-1",
      latitud: -17.7833,
      longitud: -63.1821,
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/api/ia/diagnostico-imagen");
    expect(init).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer jwt-mobile",
      }),
    });
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as any).parts).toEqual(
      expect.arrayContaining([
        ["activoId", "activo-1"],
        ["latitud", "-17.7833"],
        ["longitud", "-63.1821"],
      ]),
    );
    expect(result).toMatchObject({
      activoId: "activo-1",
      estado: "evidencia_validada",
      confianza: 0.93,
      latitud: -17.7833,
      longitud: -63.1821,
    });
  });

  it("falla explicitamente si MS2 rechaza la imagen", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Tipo de archivo no permitido",
    });

    await expect(
      ms2Service.diagnosticarImagen({
        imagePath: "/tmp/foto.txt",
        activoId: "activo-1",
        latitud: 0,
        longitud: 0,
      }),
    ).rejects.toThrow("Error en verificación IA: 400");
  });
});
