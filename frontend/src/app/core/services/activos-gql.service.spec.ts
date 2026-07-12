import { firstValueFrom, of } from 'rxjs';
import { ActivosGqlService } from './activos-gql.service';

describe('ActivosGqlService', () => {
  let apollo: {
    watchQuery: ReturnType<typeof vi.fn>;
    mutate: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
  let service: ActivosGqlService;

  beforeEach(() => {
    apollo = {
      watchQuery: vi.fn(),
      mutate: vi.fn(),
      query: vi.fn(),
    };
    service = new ActivosGqlService(apollo as any);
  });

  it('consulta activos por GraphQL con fetch de red para no usar datos obsoletos', async () => {
    apollo.watchQuery.mockReturnValue({
      valueChanges: of({
        data: {
          activos: [{ id: 'activo-1', codigo: 'ACT-2024-001', nombre: 'Laptop' }],
        },
      }),
    });

    const result = await firstValueFrom(service.getActivos({ estado: 'ACTIVO' } as any));

    expect(apollo.watchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { filtro: { estado: 'ACTIVO' } },
        fetchPolicy: 'network-only',
      }),
    );
    expect(result[0].codigo).toBe('ACT-2024-001');
  });

  it('registra activos mediante mutation y pide refrescar el inventario', async () => {
    apollo.mutate.mockReturnValue(
      of({
        data: {
          registrarActivo: { id: 'activo-2', codigo: 'ACT-2024-002', nombre: 'Impresora' },
        },
      }),
    );

    const result = await firstValueFrom(
      service.registrarActivo({
        codigo: 'ACT-2024-002',
        nombre: 'Impresora',
      } as any),
    );

    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({ codigo: 'ACT-2024-002' }),
        },
        refetchQueries: expect.any(Array),
      }),
    );
    expect(result.nombre).toBe('Impresora');
  });

  it('ejecuta asignacion, traslado y baja como mutaciones GraphQL separadas', async () => {
    apollo.mutate
      .mockReturnValueOnce(of({ data: { asignarActivo: { id: 'asg-1' } } }))
      .mockReturnValueOnce(of({ data: { trasladarActivo: { id: 'tra-1' } } }))
      .mockReturnValueOnce(of({ data: { darDeBajaActivo: { id: 'baja-1' } } }));

    await firstValueFrom(
      service.asignarActivo({
        activoId: 'activo-1',
        responsableId: 'resp-1',
        areaId: 'area-1',
        fechaAsignacion: '2026-07-12',
      }),
    );
    await firstValueFrom(
      service.trasladarActivo({
        activoId: 'activo-1',
        areaDestinoId: 'area-2',
        autorizadoPorId: 'user-1',
        fecha: '2026-07-12',
        motivoTraslado: 'Cambio de area',
      }),
    );
    await firstValueFrom(
      service.darDeBaja({
        activoId: 'activo-1',
        autorizadoPorId: 'user-1',
        motivo: 'Obsolescencia',
      }),
    );

    expect(apollo.mutate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ variables: { input: expect.objectContaining({ responsableId: 'resp-1' }) } }),
    );
    expect(apollo.mutate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ variables: { input: expect.objectContaining({ areaDestinoId: 'area-2' }) } }),
    );
    expect(apollo.mutate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ variables: { input: expect.objectContaining({ motivo: 'Obsolescencia' }) } }),
    );
  });
});
