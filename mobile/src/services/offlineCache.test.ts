import AsyncStorage from "@react-native-async-storage/async-storage";
import { offlineCache } from "./offlineCache";
import type { Activo } from "../types/activo.types";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

describe("offlineCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("guarda y carga activos asignados para uso sin conexion", async () => {
    const activos = [
      {
        id: "activo-1",
        codigo: "ACT-2024-001",
        nombre: "Laptop",
        valorAdquisicion: 10000,
        valorLibros: 8500,
        fechaAdquisicion: "2026-01-01",
        vidaUtilAnios: 4,
        estado: "ACTIVO",
        categoria: {
          id: "cat-1",
          nombre: "Computo",
          tasaDepreciacion: 25,
          metodoDepreciacion: "LINEAL",
        },
      },
    ] as Activo[];

    await offlineCache.saveActivos(activos);

    expect(AsyncStorage.multiSet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ["cache_activos_asignados", JSON.stringify(activos)],
        [
          "cache_activos_asignados_meta",
          expect.stringContaining('"total":1'),
        ],
      ]),
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(activos));
    await expect(offlineCache.loadActivos()).resolves.toEqual(activos);
  });

  it("carga metadata de sincronizacion de activos", async () => {
    const metadata = {
      syncedAt: "2026-07-14T03:00:00.000Z",
      total: 19,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(metadata),
    );

    await expect(offlineCache.loadActivosMetadata()).resolves.toEqual(
      metadata,
    );
  });

  it("encola operaciones pendientes con payload completo para sincronizar despues", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1234567890);
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("[]");

    await offlineCache.enqueuePendingOp({
      tipo: "reportar_problema",
      payload: {
        activoId: "activo-1",
        activoCodigo: "ACT-2024-001",
        descripcion: "Pantalla rota",
      },
    });

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const ops = JSON.parse(serialized);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "pending_operations",
      expect.any(String),
    );
    expect(ops[0]).toMatchObject({
      id: expect.stringContaining("1234567890-"),
      tipo: "reportar_problema",
      payload: {
        activoId: "activo-1",
        activoCodigo: "ACT-2024-001",
        descripcion: "Pantalla rota",
      },
      timestamp: expect.any(String),
    });

    jest.restoreAllMocks();
  });
});
