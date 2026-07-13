import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  const flujosService = {
    dispararN8n: jest.fn().mockResolvedValue(false),
    marcar: jest.fn(),
  };
  const ms1Client = {
    buscarActivoPorCodigo: jest.fn(),
    obtenerActivoPorId: jest.fn(),
    obtenerUsuarioIdPorEmail: jest.fn(),
    crearTicketRevision: jest.fn(),
    telefonoTieneAccesoActivo: jest.fn().mockReturnValue(true),
  };
  const ms2Client = {
    obtenerDocumentos: jest.fn(),
  };
  const notificacionesService = {
    enviarEmail: jest.fn().mockResolvedValue({ enviado: false }),
    enviarPush: jest.fn().mockResolvedValue({ enviado: false }),
    enviarWhatsAppMantenimiento: jest.fn().mockResolvedValue({ enviado: false }),
    guardarNotificacion: jest.fn(),
    guardarYEnviarPush: jest.fn().mockResolvedValue({
      notificacion: { id: 'not-1' },
      push: { enviado: false },
    }),
  };

  let service: WebhooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    ms1Client.telefonoTieneAccesoActivo.mockReturnValue(true);
    ms1Client.obtenerUsuarioIdPorEmail.mockResolvedValue(null);
    service = new WebhooksService(
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
    );
  });

  it('enriquece eventos de activo con responsable MS1 para entregar email y push', async () => {
    ms1Client.obtenerActivoPorId.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-010',
      responsableEmail: 'resp@empresa.com',
      responsablePhone: '59170000000',
    });
    ms1Client.obtenerUsuarioIdPorEmail.mockResolvedValue('user-resp-1');

    const result = await service.procesarEventoActivo({
      tipoEvento: 'ASIGNACION',
      activoId: '11111111-1111-1111-1111-111111111111',
    });

    expect(ms1Client.obtenerActivoPorId).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(ms1Client.obtenerUsuarioIdPorEmail).toHaveBeenCalledWith('resp@empresa.com');
    expect(flujosService.dispararN8n).toHaveBeenCalledWith(
      'evento-activo',
      expect.objectContaining({
        codigoActivo: 'ACT-2024-010',
        responsableEmail: 'resp@empresa.com',
        responsablePhone: '59170000000',
        responsableUsuarioId: 'user-resp-1',
      }),
    );
    expect(notificacionesService.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'resp@empresa.com',
        subject: 'Activo asignado: ACT-2024-010',
      }),
    );
    expect(notificacionesService.guardarYEnviarPush).toHaveBeenCalledWith({
      usuarioId: 'user-resp-1',
      tipo: 'info',
      titulo: 'Activo asignado: ACT-2024-010',
      mensaje: 'Se registro el evento ASIGNACION para el activo ACT-2024-010.',
      activoId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result).toEqual({
      recibido: true,
      tipo: 'ASIGNACION',
      activoId: '11111111-1111-1111-1111-111111111111',
    });
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
    expect(notificacionesService.guardarYEnviarPush).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      tipo: 'alerta',
      titulo: 'Garantia por vencer: ACT-2024-002',
      mensaje: 'Vence el 2026-07-15',
      activoId: '11111111-1111-1111-1111-111111111111',
    });
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
    expect(notificacionesService.guardarYEnviarPush).toHaveBeenCalledWith({
      usuarioId: 'user-2',
      tipo: 'mantenimiento',
      titulo: 'Mantenimiento: ACT-2024-003',
      mensaje: 'Programado para 2026-06-20',
      activoId: '22222222-2222-2222-2222-222222222222',
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
    expect(flujosService.marcar).toHaveBeenCalledWith(
      'solicitud-revision',
      'COMPLETADO',
      'Ticket TKT-N8N-1',
    );
    expect(result).toEqual({
      ticketId: 'TKT-N8N-1',
      mensaje: 'Reporte recibido para EQ-2024-005',
    });
  });

  it('procesa solicitud de revision desde N8N usando MS3 como fachada del sistema', async () => {
    ms1Client.obtenerActivoPorId.mockReset();
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
    });
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-N8N-2',
      activoId: '550e8400-e29b-41d4-a716-446655440000',
      estado: 'CREADO',
    });
    ms2Client.obtenerDocumentos.mockResolvedValue([{ documentoId: 'doc-1' }]);

    const result = await service.solicitudRevisionN8n({
      from: 'whatsapp:+59177685777',
      text: 'Solicito revision del activo ACT-2024-001',
      codigoActivo: 'ACT-2024-001',
    });

    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('ACT-2024-001');
    expect(ms1Client.telefonoTieneAccesoActivo).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'ACT-2024-001' }),
      'whatsapp:+59177685777',
    );
    expect(ms1Client.crearTicketRevision).toHaveBeenCalledWith({
      activoId: '550e8400-e29b-41d4-a716-446655440000',
      solicitadoPorWhatsApp: 'whatsapp:+59177685777',
      motivo: 'Solicito revision del activo ACT-2024-001',
    });
    expect(ms2Client.obtenerDocumentos).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(flujosService.marcar).toHaveBeenCalledWith(
      'solicitud-revision',
      'COMPLETADO',
      'Ticket TKT-N8N-2',
    );
    expect(result).toMatchObject({
      encontrado: true,
      autorizado: true,
      codigoActivo: 'ACT-2024-001',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
      ticketId: 'TKT-N8N-2',
      documentosEncontrados: 1,
    });
  });

  it('rechaza solicitud N8N si el WhatsApp no corresponde al responsable asignado', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
    });
    ms1Client.telefonoTieneAccesoActivo.mockReturnValue(false);

    const result = await service.solicitudRevisionN8n({
      from: 'whatsapp:+59170000000',
      text: 'Solicito revision del activo ACT-2024-001',
      codigoActivo: 'ACT-2024-001',
    });

    expect(ms1Client.crearTicketRevision).not.toHaveBeenCalled();
    expect(ms2Client.obtenerDocumentos).not.toHaveBeenCalled();
    expect(flujosService.marcar).toHaveBeenCalledWith(
      'solicitud-revision',
      'ERROR',
      'WhatsApp no autorizado para activo',
    );
    expect(result).toEqual({
      recibido: true,
      encontrado: true,
      autorizado: false,
      from: 'whatsapp:+59170000000',
      codigoActivo: 'ACT-2024-001',
      activoId: '550e8400-e29b-41d4-a716-446655440000',
      mensaje: 'El numero whatsapp:+59170000000 no esta autorizado para el activo ACT-2024-001',
    });
  });
});
