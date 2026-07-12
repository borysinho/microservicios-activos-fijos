const mockPost = jest.fn();
const mockInterceptorUse = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: mockPost,
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

describe("ms1Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("autentica contra MS1 y mapea el usuario movil", async () => {
    const { ms1Service } = require("./ms1Service");
    mockPost.mockResolvedValueOnce({
      data: {
        token: "jwt",
        id: "user-1",
        username: "admin",
        email: "admin@empresa.com",
        rol: "ADMINISTRADOR",
      },
    });

    const result = await ms1Service.login({ username: "admin", password: "secret" });

    expect(mockPost).toHaveBeenCalledWith("/auth/login", {
      username: "admin",
      password: "secret",
    });
    expect(result).toEqual({
      token: "jwt",
      usuario: {
        id: "user-1",
        nombre: "admin",
        email: "admin@empresa.com",
        rol: "ADMINISTRADOR",
      },
    });
  });

  it("consulta activos por GraphQL y convierte valores numericos y GPS", async () => {
    const { ms1Service } = require("./ms1Service");
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          activos: [
            {
              id: "activo-1",
              codigo: "ACT-2024-001",
              nombre: "Laptop",
              descripcion: "Equipo portatil",
              fechaAdquisicion: "2026-01-01",
              valorAdquisicion: "10000.50",
              valorLibros: "7500.25",
              vidaUtilAnios: 4,
              estado: "ACTIVO",
              ubicacion: "-17.7833,-63.1821",
              categoria: {
                id: "cat-1",
                nombre: "Computo",
                tasaDepreciacion: 25,
                metodoDepreciacion: "LINEAL",
              },
              areaActual: {
                id: "area-1",
                nombre: "Contabilidad",
              },
            },
          ],
        },
      },
    });

    const result = await ms1Service.getActivosAsignados("user-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/graphql",
      expect.objectContaining({
        query: expect.stringContaining("query ActivosMobile"),
      }),
    );
    expect(result[0]).toMatchObject({
      codigo: "ACT-2024-001",
      valorAdquisicion: 10000.5,
      valorLibros: 7500.25,
      latitud: -17.7833,
      longitud: -63.1821,
      area: { id: "area-1", nombre: "Contabilidad" },
    });
  });

  it("solicita mantenimiento cambiando estado solo si el activo no esta en mantenimiento", async () => {
    const { ms1Service } = require("./ms1Service");
    mockPost
      .mockResolvedValueOnce({
        data: {
          data: {
            activo: {
              id: "activo-1",
              codigo: "ACT-2024-001",
              nombre: "Laptop",
              fechaAdquisicion: "2026-01-01",
              valorAdquisicion: 10000,
              valorLibros: 9000,
              vidaUtilAnios: 4,
              estado: "ACTIVO",
              categoria: {
                id: "cat-1",
                nombre: "Computo",
                tasaDepreciacion: 25,
                metodoDepreciacion: "LINEAL",
              },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            cambiarEstadoActivo: { id: "activo-1" },
          },
        },
      });

    await ms1Service.solicitarMantenimiento("activo-1", "No enciende");

    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      "/graphql",
      expect.objectContaining({
        query: expect.stringContaining("mutation SolicitarMantenimientoMobile"),
        variables: {
          activoId: "activo-1",
          nuevoEstado: "EN_MANTENIMIENTO",
        },
      }),
    );
  });
});
