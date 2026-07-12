const mockPost = jest.fn();
const mockGet = jest.fn();
const mockInterceptorUse = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: {
          use: mockInterceptorUse,
        },
      },
    })),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

describe("ms3Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reporta problemas al webhook de MS3 que orquesta N8N", async () => {
    const { ms3Service } = require("./ms3Service");
    mockPost.mockResolvedValueOnce({
      data: {
        ticketId: "TKT-MOB-1",
        mensaje: "Reporte recibido para ACT-2024-001",
      },
    });

    const result = await ms3Service.reportarProblema({
      activoId: "activo-1",
      activoCodigo: "ACT-2024-001",
      descripcion: "No enciende",
      latitud: -17.78,
      longitud: -63.18,
    });

    expect(mockPost).toHaveBeenCalledWith("/webhook/reportar-problema", {
      activoId: "activo-1",
      activoCodigo: "ACT-2024-001",
      descripcion: "No enciende",
      latitud: -17.78,
      longitud: -63.18,
    });
    expect(result.ticketId).toBe("TKT-MOB-1");
  });

  it("consulta notificaciones del usuario desde MS3", async () => {
    const { ms3Service } = require("./ms3Service");
    mockGet.mockResolvedValueOnce({
      data: [{ id: "not-1", titulo: "Mantenimiento" }],
    });

    const result = await ms3Service.getNotificaciones("user-1");

    expect(mockGet).toHaveBeenCalledWith("/notificaciones?usuarioId=user-1");
    expect(result).toEqual([{ id: "not-1", titulo: "Mantenimiento" }]);
  });
});
