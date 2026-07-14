import AsyncStorage from "@react-native-async-storage/async-storage";
import { ms2Service } from "./ms2Service";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

type MockXhrResponse =
  | { type: "load"; status: number; responseText: string }
  | { type: "error"; message?: string };

describe("ms2Service", () => {
  let xhrResponses: MockXhrResponse[];
  let xhrInstances: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("jwt-mobile");
    global.fetch = jest.fn();
    xhrResponses = [];
    xhrInstances = [];
    (global as any).FormData = class {
      parts: Array<[string, unknown]> = [];

      append(name: string, value: unknown) {
        this.parts.push([name, value]);
      }
    };
    (global as any).XMLHttpRequest = class {
      method = "";
      url = "";
      headers: Record<string, string> = {};
      body?: FormData;
      status = 0;
      responseText = "";
      timeout = 0;
      onload?: () => void;
      onerror?: () => void;
      ontimeout?: () => void;

      constructor() {
        xhrInstances.push(this);
      }

      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }

      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }

      send(body: FormData) {
        this.body = body;
        const response = xhrResponses.shift();
        if (!response || response.type === "error") {
          this.onerror?.();
          return;
        }

        this.status = response.status;
        this.responseText = response.responseText;
        this.onload?.();
      }
    };
  });

  it("envia imagen, activo y GPS al diagnostico IA de MS2", async () => {
    xhrResponses.push({
      type: "load",
      status: 200,
      responseText: JSON.stringify({
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

    expect(xhrInstances[0].url).toContain("/api/ia/diagnostico-imagen");
    expect(xhrInstances[0].method).toBe("POST");
    expect(xhrInstances[0].headers.Authorization).toBe("Bearer jwt-mobile");
    expect(xhrInstances[0].body).toBeInstanceOf(FormData);
    expect((xhrInstances[0].body as any).parts).toEqual(
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
    xhrResponses.push({
      type: "load",
      status: 400,
      responseText: "Tipo de archivo no permitido",
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

  it("reintenta con ruta local sin file scheme si MS2 esta disponible", async () => {
    xhrResponses.push(
      { type: "error" },
      {
        type: "load",
        status: 200,
        responseText: JSON.stringify({
          diagnostico: "EVIDENCIA_VALIDADA",
          estado: "evidencia_validada",
          confianza: 0.91,
          detalle: "Evidencia aceptada",
          recomendacion: "Registrar verificacion",
        }),
      },
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    const result = await ms2Service.diagnosticarImagen({
      imagePath: "/data/user/0/com.app/cache/foto.jpg",
      activoId: "activo-1",
      latitud: -17.7833,
      longitud: -63.1821,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("/health");
    const retryBody = xhrInstances[1].body;
    expect(retryBody.parts).toEqual(
      expect.arrayContaining([
        [
          "imagen",
          expect.objectContaining({
            uri: "/data/user/0/com.app/cache/foto.jpg",
          }),
        ],
      ]),
    );
    expect(result.estado).toBe("evidencia_validada");
  });
});
