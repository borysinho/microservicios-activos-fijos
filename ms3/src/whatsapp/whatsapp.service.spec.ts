import { ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  const config: any = {
    whatsappVerifyToken: 'verify-token',
    whatsappAppSecret: '',
  };
  const flujosService = {
    dispararN8n: jest.fn().mockResolvedValue(false),
    marcar: jest.fn(),
  };
  const ms1Client = {
    buscarActivoPorCodigo: jest.fn(),
    listarActivosPorTelefono: jest.fn(),
    crearTicketRevision: jest.fn(),
    confirmarRecepcionTraslado: jest.fn(),
    telefonoTieneAccesoActivo: jest.fn().mockReturnValue(true),
  };
  const ms2Client = {
    obtenerDocumentos: jest.fn(),
    obtenerUrlDocumento: jest.fn(),
  };
  const notificacionesService = {
    enviarEmail: jest.fn().mockResolvedValue({ enviado: false }),
    enviarWhatsAppTexto: jest.fn().mockResolvedValue({ enviado: false }),
  };
  const llmAgent = {
    clasificarMensaje: jest.fn().mockResolvedValue(null),
  };

  let service: WhatsappService;

  beforeEach(() => {
    jest.resetAllMocks();
    flujosService.dispararN8n.mockResolvedValue(false);
    notificacionesService.enviarEmail.mockResolvedValue({ enviado: false });
    notificacionesService.enviarWhatsAppTexto.mockResolvedValue({ enviado: false });
    llmAgent.clasificarMensaje.mockResolvedValue(null);
    ms1Client.telefonoTieneAccesoActivo.mockReturnValue(true);
    service = new WhatsappService(
      config,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );
  });

  it('verifica el challenge inicial de WhatsApp', () => {
    expect(service.verificarWebhook('subscribe', 'verify-token', 'abc123')).toBe('abc123');
  });

  it('rechaza token de verificacion invalido', () => {
    expect(() => service.verificarWebhook('subscribe', 'otro', 'abc123')).toThrow(ForbiddenException);
  });

  it('valida firma HMAC cuando hay secret configurado', () => {
    const raw = Buffer.from(JSON.stringify({ ok: true }));
    const secretConfig = { ...config, whatsappAppSecret: 'secret' };
    const signed = new WhatsappService(
      secretConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    const signature = `sha256=${createHmac('sha256', 'secret').update(raw).digest('hex')}`;

    expect(() => signed.validarFirma(signature, raw)).not.toThrow();
    expect(() => signed.validarFirma('sha256=bad', raw)).toThrow(ForbiddenException);
  });

  it('omite validacion HMAC cuando el proveedor es WAHA', () => {
    const wahaConfig = {
      ...config,
      whatsappProvider: 'waha',
      whatsappAppSecret: 'secret',
    };
    const signed = new WhatsappService(
      wahaConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    expect(() => signed.validarFirma(undefined, undefined)).not.toThrow();
  });

  it('omite validacion HMAC de Meta cuando el proveedor es Twilio', () => {
    const twilioConfig = {
      ...config,
      whatsappProvider: 'twilio',
      whatsappAppSecret: 'meta-secret-no-aplica',
    };
    const signed = new WhatsappService(
      twilioConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    expect(() => signed.validarFirma(undefined, undefined)).not.toThrow();
  });

  it('extrae mensajes entrantes desde webhook WAHA', () => {
    expect(
      service.extraerMensaje({
        event: 'message',
        session: 'default',
        payload: {
          timestamp: 1710000000,
          from: '59170000000@c.us',
          fromMe: false,
          body: 'Solicito revision de ACT-2024-001',
        },
      }),
    ).toEqual({
      from: '59170000000@c.us',
      text: 'Solicito revision de ACT-2024-001',
      timestamp: '1710000000',
    });
  });

  it('ignora mensajes salientes reportados por WAHA', () => {
    expect(
      service.extraerMensaje({
        event: 'message',
        payload: {
          from: '59170000000@c.us',
          fromMe: true,
          body: 'Respuesta automatica',
        },
      }),
    ).toBeNull();
  });

  it('extrae mensajes entrantes desde webhook Twilio', () => {
    expect(
      service.extraerMensaje({
        From: 'whatsapp:+59177685777',
        Body: 'Solicito revision de ACT-2024-001',
        MessageSid: 'SM123',
      }),
    ).toEqual({
      from: 'whatsapp:+59177685777',
      text: 'Solicito revision de ACT-2024-001',
      timestamp: 'SM123',
    });
  });

  it('delegacion productiva Twilio -> MS3 valida acceso y dispara MS4 sin crear ticket local', async () => {
    flujosService.dispararN8n.mockResolvedValueOnce(true);
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
      asignaciones: [{
        activa: true,
        responsable: { email: 'quirogaborys@gmail.com', telefono: '591-77685777' },
      }],
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    const twilioConfig = {
      ...config,
      n8nWebhookUrl: 'https://ms4.azurewebsites.net/webhook',
      whatsappProvider: 'twilio',
    };
    const signed = new WhatsappService(
      twilioConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    const result = await signed.procesarWebhook({
      From: 'whatsapp:+59177685777',
      To: 'whatsapp:+14155238886',
      Body: 'Solicito revision del activo ACT-2024-001. No enciende',
      MessageSid: 'SM-TWILIO-001',
    });

    expect(flujosService.marcar).toHaveBeenCalledWith(
      'solicitud-revision',
      'EN_PROCESO',
      'Mensaje WhatsApp recibido',
    );
    expect(flujosService.dispararN8n).toHaveBeenCalledWith(
      'solicitud-revision',
      expect.objectContaining({
        from: 'whatsapp:+59177685777',
        text: 'Solicito revision del activo ACT-2024-001. No enciende',
        timestamp: 'SM-TWILIO-001',
        activoId: '550e8400-e29b-41d4-a716-446655440000',
        activoNombre: 'Laptop Dell',
        activoEstado: 'ACTIVO',
        codigoActivo: 'ACT-2024-001',
        responsableEmail: 'quirogaborys@gmail.com',
        responsablePhone: '591-77685777',
        intencion: 'SOLICITAR_REVISION',
        origen: 'whatsapp',
        proveedor: 'twilio',
        recibidoEn: expect.any(String),
      }),
    );
    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('ACT-2024-001');
    expect(ms1Client.telefonoTieneAccesoActivo).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'ACT-2024-001' }),
      'whatsapp:+59177685777',
    );
    expect(ms1Client.crearTicketRevision).not.toHaveBeenCalled();
    expect(ms2Client.obtenerDocumentos).not.toHaveBeenCalled();
    expect(notificacionesService.enviarEmail).not.toHaveBeenCalled();
    expect(notificacionesService.enviarWhatsAppTexto).not.toHaveBeenCalled();
    expect(result).toEqual({
      recibido: true,
      codigoActivo: 'ACT-2024-001',
      intencion: 'SOLICITAR_REVISION',
      mensaje: 'Solicitud enviada a MS4/N8N',
    });
  });

  it('marca error cuando MS4/N8N no recibe el webhook de Twilio', async () => {
    flujosService.dispararN8n.mockResolvedValueOnce(false);
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
      asignaciones: [{
        activa: true,
        responsable: { email: 'quirogaborys@gmail.com', telefono: '591-77685777' },
      }],
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    const twilioConfig = {
      ...config,
      n8nWebhookUrl: 'https://ms4.azurewebsites.net/webhook',
      whatsappProvider: 'twilio',
    };
    const signed = new WhatsappService(
      twilioConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    const result = await signed.procesarWebhook({
      From: 'whatsapp:+59177685777',
      Body: 'Solicito revision de ACT-2024-001',
      MessageSid: 'SM-TWILIO-002',
    });

    expect(flujosService.marcar).toHaveBeenLastCalledWith(
      'solicitud-revision',
      'ERROR',
      'MS4/N8N no disponible',
    );
    expect(result).toEqual({
      recibido: true,
      mensaje: 'No se pudo iniciar el flujo MS4/N8N',
    });
  });

  it('procesa CU-67 a CU-72 para solicitud de revision', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'resp@empresa.com',
      responsablePhone: '59170000000',
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-1',
      activoId: '11111111-1111-1111-1111-111111111111',
      estado: 'CREADO',
    });
    ms2Client.obtenerDocumentos.mockResolvedValue([{ documentoId: 'doc-1' }, { documentoId: 'doc-2' }]);

    const result = await service.procesarSolicitudRevision({
      from: '59170000000',
      text: 'Solicito revision de ACT-2024-001 por falla electrica',
    });

    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('ACT-2024-001');
    expect(ms1Client.crearTicketRevision).toHaveBeenCalledWith({
      activoId: '11111111-1111-1111-1111-111111111111',
      solicitadoPorWhatsApp: '59170000000',
      motivo: 'Solicito revision de ACT-2024-001 por falla electrica',
    });
    expect(ms2Client.obtenerDocumentos).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(notificacionesService.enviarEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'resp@empresa.com' }),
    );
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('TKT-1'),
    );
    expect(result).toEqual({
      recibido: true,
      codigoActivo: 'ACT-2024-001',
      ticketId: 'TKT-1',
      documentosEncontrados: 2,
      intencion: 'SOLICITAR_REVISION',
      mensaje: 'Solicitud de revision procesada',
    });
    expect(flujosService.marcar).toHaveBeenLastCalledWith(
      'solicitud-revision',
      'COMPLETADO',
      'Ticket TKT-1',
    );
  });

  it('responde por WhatsApp si no encuentra codigo de activo', async () => {
    const result = await service.procesarSolicitudRevision({
      from: '59170000000',
      text: 'Necesito revision urgente',
    });

    expect(ms1Client.buscarActivoPorCodigo).not.toHaveBeenCalled();
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('No encontre un codigo'),
    );
    expect(result.mensaje).toBe('Codigo de activo no encontrado');
  });

  it('acepta codigos de activos reales de MS1 con prefijo distinto a ACT', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '55555555-5555-5555-5555-555555555555',
      codigo: 'EQ-2024-005',
      nombre: 'MacBook Pro',
      estado: 'ACTIVO',
      responsableEmail: 'resp@empresa.com',
      responsablePhone: '59177685777',
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-EQ-1',
      activoId: '55555555-5555-5555-5555-555555555555',
      estado: 'CREADO',
    });
    ms2Client.obtenerDocumentos.mockResolvedValue([]);

    const result = await service.procesarSolicitudRevision({
      from: 'whatsapp:+59177685777',
      text: 'Solicito revision de EQ-2024-005',
    });

    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('EQ-2024-005');
    expect(result).toEqual({
      recibido: true,
      codigoActivo: 'EQ-2024-005',
      ticketId: 'TKT-EQ-1',
      documentosEncontrados: 0,
      intencion: 'SOLICITAR_REVISION',
      mensaje: 'Solicitud de revision procesada',
    });
  });

  it('bloquea solicitudes de revision desde WhatsApp no asignado al activo', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'quirogaborys@gmail.com',
      responsablePhone: '591-77685777',
      asignaciones: [{
        activa: true,
        responsable: { email: 'quirogaborys@gmail.com', telefono: '591-77685777' },
      }],
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(false);

    const result = await service.procesarSolicitudRevision({
      from: 'whatsapp:+59170000000',
      text: 'Solicito revision de ACT-2024-001',
    });

    expect(ms1Client.crearTicketRevision).not.toHaveBeenCalled();
    expect(notificacionesService.enviarEmail).not.toHaveBeenCalled();
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      'whatsapp:+59170000000',
      expect.stringContaining('solo puede consultarse o reportarse'),
    );
    expect(result).toEqual({
      recibido: true,
      codigoActivo: 'ACT-2024-001',
      intencion: 'NO_AUTORIZADA',
      mensaje: 'WhatsApp no autorizado para activo',
    });
  });

  it('bloquea operaciones que deben realizarse desde web o movil antes de llegar a MS4', async () => {
    const twilioConfig = {
      ...config,
      n8nWebhookUrl: 'https://ms4.azurewebsites.net/webhook',
      whatsappProvider: 'twilio',
    };
    const signed = new WhatsappService(
      twilioConfig,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
      llmAgent as any,
    );

    const result = await signed.procesarWebhook({
      From: 'whatsapp:+59177685777',
      Body: 'Dar de baja ACT-2024-001 porque ya no sirve',
      MessageSid: 'SM-TWILIO-BAJA',
    });

    expect(flujosService.dispararN8n).not.toHaveBeenCalled();
    expect(llmAgent.clasificarMensaje).not.toHaveBeenCalled();
    expect(ms1Client.buscarActivoPorCodigo).not.toHaveBeenCalled();
    expect(ms1Client.crearTicketRevision).not.toHaveBeenCalled();
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      'whatsapp:+59177685777',
      expect.stringContaining('No puedo realizar esa operacion por WhatsApp'),
    );
    expect(result).toEqual({
      recibido: true,
      intencion: 'NO_PERMITIDA',
      codigoActivo: 'ACT-2024-001',
      mensaje: 'Operacion no permitida por chat',
    });
  });

  it('permite consultar informacion basica de un activo por chat sin crear ticket', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      areaActual: { nombre: 'Contabilidad' },
    });

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'Consultar estado de ACT-2024-001',
    });

    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('ACT-2024-001');
    expect(ms1Client.crearTicketRevision).not.toHaveBeenCalled();
    expect(ms2Client.obtenerDocumentos).not.toHaveBeenCalled();
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('Estado: ACTIVO'),
    );
    expect(result).toEqual({
      recibido: true,
      intencion: 'CONSULTAR_ACTIVO',
      codigoActivo: 'ACT-2024-001',
      mensaje: 'Consulta de activo procesada',
    });
  });

  it('lista solo activos asociados al numero de WhatsApp', async () => {
    ms1Client.listarActivosPorTelefono.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        codigo: 'ACT-2024-001',
        nombre: 'Laptop Dell',
        estado: 'ACTIVO',
        areaActual: { nombre: 'Contabilidad' },
      },
    ]);

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'mis activos',
    });

    expect(ms1Client.listarActivosPorTelefono).toHaveBeenCalledWith('59170000000');
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('ACT-2024-001 - Laptop Dell'),
    );
    expect(result).toEqual({
      recibido: true,
      intencion: 'LISTAR_ACTIVOS',
      mensaje: 'Activos asociados encontrados: 1',
    });
  });

  it('consulta documentos del activo y exige acceso por WhatsApp', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms2Client.obtenerDocumentos.mockResolvedValue([
      { documentoId: 'doc-1', nombre: 'Factura.pdf', tipo: 'FACTURA', version: 2, activo: true },
    ]);

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'documentos ACT-2024-001',
    });

    expect(ms2Client.obtenerDocumentos).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('doc-1 | FACTURA | Factura.pdf | v2'),
    );
    expect(result).toEqual({
      recibido: true,
      intencion: 'CONSULTAR_DOCUMENTOS',
      codigoActivo: 'ACT-2024-001',
      documentosEncontrados: 1,
      mensaje: 'Documentos consultados',
    });
  });

  it('genera enlace temporal solo si el documento pertenece al activo autorizado', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms2Client.obtenerDocumentos.mockResolvedValue([
      { documentoId: 'doc-123', nombre: 'Factura.pdf', tipo: 'FACTURA', activo: true },
    ]);
    ms2Client.obtenerUrlDocumento.mockResolvedValue({
      documentoId: 'doc-123',
      url: 'https://s3.example/doc-123',
      expiraEn: 900,
    });

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'enlace documento ACT-2024-001 doc-123',
    });

    expect(ms2Client.obtenerUrlDocumento).toHaveBeenCalledWith('doc-123');
    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('https://s3.example/doc-123'),
    );
    expect(result).toMatchObject({
      recibido: true,
      intencion: 'SOLICITAR_ENLACE_DOCUMENTO',
      codigoActivo: 'ACT-2024-001',
      mensaje: 'Enlace temporal generado',
    });
  });

  it('consulta depreciacion sin permitir cambios contables', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      valorAdquisicion: 10000,
      valorLibros: 6500,
      vidaUtilAnios: 4,
      categoria: { metodoDepreciacion: 'LINEAL' },
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'depreciacion ACT-2024-001',
    });

    expect(notificacionesService.enviarWhatsAppTexto).toHaveBeenCalledWith(
      '59170000000',
      expect.stringContaining('Valor en libros: 6500.00'),
    );
    expect(result).toMatchObject({
      recibido: true,
      intencion: 'CONSULTAR_DEPRECIACION',
      codigoActivo: 'ACT-2024-001',
    });
  });

  it('registra solicitud de traslado como ticket sin ejecutar traslado directo', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'resp@empresa.com',
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms1Client.crearTicketRevision.mockResolvedValue({
      ticketId: 'TKT-TR-1',
      activoId: '11111111-1111-1111-1111-111111111111',
      estado: 'CREADO',
    });

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'solicitar traslado ACT-2024-001 al area Contabilidad',
    });

    expect(ms1Client.crearTicketRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        activoId: '11111111-1111-1111-1111-111111111111',
        solicitadoPorWhatsApp: '59170000000',
      }),
    );
    expect(result).toEqual({
      recibido: true,
      intencion: 'SOLICITAR_TRASLADO',
      codigoActivo: 'ACT-2024-001',
      ticketId: 'TKT-TR-1',
      mensaje: 'Solicitud de traslado registrada',
    });
  });

  it('confirma recepcion cuando existe traslado pendiente del activo autorizado', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'TRANSFERIDO',
      traslados: [{ id: '22222222-2222-2222-2222-222222222222', recepcionConfirmada: false }],
    });
    ms1Client.telefonoTieneAccesoActivo = jest.fn().mockReturnValue(true);
    ms1Client.confirmarRecepcionTraslado.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      recepcionConfirmada: true,
    });

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'confirmo recepcion ACT-2024-001',
    });

    expect(ms1Client.confirmarRecepcionTraslado).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
    expect(result).toEqual({
      recibido: true,
      intencion: 'CONFIRMAR_RECEPCION',
      codigoActivo: 'ACT-2024-001',
      mensaje: 'Recepcion confirmada',
    });
  });

  it('usa el LLM de Azure para clasificar mensajes permitidos antes del fallback deterministico', async () => {
    llmAgent.clasificarMensaje.mockResolvedValueOnce({
      intencion: 'CONSULTAR_ACTIVO',
      codigoActivo: 'ACT-2024-001',
    });
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
    });

    const result = await service.procesarMensajeAgente({
      from: '59170000000',
      text: 'Que pasa con ACT-2024-001?',
    });

    expect(llmAgent.clasificarMensaje).toHaveBeenCalledWith('Que pasa con ACT-2024-001?');
    expect(ms1Client.buscarActivoPorCodigo).toHaveBeenCalledWith('ACT-2024-001');
    expect(result).toMatchObject({
      recibido: true,
      intencion: 'CONSULTAR_ACTIVO',
      codigoActivo: 'ACT-2024-001',
    });
  });
});
