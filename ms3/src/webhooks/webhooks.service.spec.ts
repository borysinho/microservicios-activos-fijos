import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  const flujosService = {
    dispararN8n: jest.fn().mockResolvedValue(false),
    marcar: jest.fn(),
  };
  const ms1Client = {
    obtenerActivoPorId: jest.fn(),
    crearTicketRevision: jest.fn(),
  };
  const ms2Client = {
    obtenerDocumentos: jest.fn(),
  };
  const notificacionesService = {
    enviarEmail: jest.fn().mockResolvedValue({ enviado: false }),
    enviarPush: jest.fn().mockResolvedValue({ enviado: false }),
    enviarWhatsAppMantenimiento: jest.fn().mockResolvedValue({ enviado: false }),
    guardarNotificacion: jest.fn(),
  };

  let service: WebhooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebhooksService(
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
    );
  });

  it('procesa CU-73 alerta de vencimiento de garantia', async () => {
    ms1Client.obtenerActivoPorId.mockResolvedValue({ id: 'id', estado: 'ACTIVO' });
    ms2Client.obtenerDocumentos.mockResolvedValue([{ documentoId: 'poliza' }]);

    const result = await service.alertaVencimientoGarantia({
      activoId: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-002',
      nombre: 'Impresora',
      fechaVencimientoGarantia: '2026-07-15',
      responsableEmail: 'resp@empresa.com',
      responsableUsuarioId: 'user-1',
    });

    expect(flujosService.dispararN8n).toHaveBeenCalledWith(
      'alerta-garantia',
      expect.objectContaining({ codigo: 'ACT-2024-002' }),
    );
    expect(ms2Client.obtenerDocumentos).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(notificacionesService.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'resp@empresa.com' }),
    );
    expect(notificacionesService.enviarPush).toHaveBeenCalledWith(
      'user-1',
      'Garantia por vencer: ACT-2024-002',
      'Vence el 2026-07-15',
    );
    expect(result).toEqual({
      enviado: true,
      flujo: 'alerta-garantia',
      activoId: '11111111-1111-1111-1111-111111111111',
      documentosEncontrados: 1,
    });
  });

  it('procesa CU-74 alerta de mantenimiento programado', async () => {
    ms1Client.obtenerActivoPorId.mockResolvedValue({ id: 'id', estado: 'EN_MANTENIMIENTO' });

    const result = await service.alertaMantenimientoProgramado({
      activoId: '22222222-2222-2222-2222-222222222222',
      codigo: 'ACT-2024-003',
      nombre: 'Proyector',
      fechaMantenimiento: '2026-06-20',
      responsableEmail: 'resp@empresa.com',
      responsablePhone: '59171111111',
      responsableUsuarioId: 'user-2',
    });

    expect(flujosService.dispararN8n).toHaveBeenCalledWith(
      'alerta-mantenimiento',
      expect.objectContaining({ codigo: 'ACT-2024-003' }),
    );
    expect(notificacionesService.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Mantenimiento programado: ACT-2024-003' }),
    );
    expect(notificacionesService.enviarWhatsAppMantenimiento).toHaveBeenCalledWith({
      to: '59171111111',
      codigoActivo: 'ACT-2024-003',
      fechaMantenimiento: '2026-06-20',
    });
    expect(result).toEqual({
      enviado: true,
      flujo: 'alerta-mantenimiento',
      activoId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('crea reporte de problema desde mobile', async () => {
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-MOB-1',
      activoId: '33333333-3333-3333-3333-333333333333',
      estado: 'SIMULADO',
    });

    const result = await service.reportarProblema({
      activoId: '33333333-3333-3333-3333-333333333333',
      activoCodigo: 'ACT-2024-004',
      descripcion: 'Ruido anormal',
    });

    expect(ms1Client.crearTicketRevision).toHaveBeenCalledWith({
      activoId: '33333333-3333-3333-3333-333333333333',
      solicitadoPorWhatsApp: 'mobile-app',
      motivo: 'Ruido anormal',
    });
    expect(flujosService.dispararN8n).toHaveBeenCalledWith(
      'solicitud-revision',
      expect.objectContaining({
        activoCodigo: 'ACT-2024-004',
        ticketId: 'TKT-MOB-1',
        origen: 'mobile',
      }),
    );
    expect(result).toEqual({
      ticketId: 'TKT-MOB-1',
      mensaje: 'Reporte recibido para ACT-2024-004',
    });
  });

  it('crea orden desde N8N sin volver a disparar N8N', async () => {
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-N8N-1',
      activoId: '44444444-4444-4444-4444-444444444444',
      estado: 'SIMULADO',
    });

    const result = await service.reportarProblema({
      activoId: '44444444-4444-4444-4444-444444444444',
      activoCodigo: 'EQ-2024-005',
      descripcion: 'Solicitud recibida desde N8N',
      origen: 'n8n',
    });

    expect(ms1Client.crearTicketRevision).toHaveBeenCalledWith({
      activoId: '44444444-4444-4444-4444-444444444444',
      solicitadoPorWhatsApp: 'mobile-app',
      motivo: 'Solicitud recibida desde N8N',
    });
    expect(flujosService.dispararN8n).not.toHaveBeenCalled();
    expect(result).toEqual({
      ticketId: 'TKT-N8N-1',
      mensaje: 'Reporte recibido para EQ-2024-005',
    });
  });
});
