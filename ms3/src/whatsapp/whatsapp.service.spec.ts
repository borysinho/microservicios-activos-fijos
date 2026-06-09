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
    crearTicketRevision: jest.fn(),
  };
  const ms2Client = {
    obtenerDocumentos: jest.fn(),
  };
  const notificacionesService = {
    enviarEmail: jest.fn().mockResolvedValue({ enviado: false }),
    enviarWhatsAppTexto: jest.fn().mockResolvedValue({ enviado: false }),
  };

  let service: WhatsappService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappService(
      config,
      flujosService as any,
      ms1Client as any,
      ms2Client as any,
      notificacionesService as any,
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
    );

    const signature = `sha256=${createHmac('sha256', 'secret').update(raw).digest('hex')}`;

    expect(() => signed.validarFirma(signature, raw)).not.toThrow();
    expect(() => signed.validarFirma('sha256=bad', raw)).toThrow(ForbiddenException);
  });

  it('procesa CU-67 a CU-72 para solicitud de revision', async () => {
    ms1Client.buscarActivoPorCodigo.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      codigo: 'ACT-2024-001',
      nombre: 'Laptop Dell',
      estado: 'ACTIVO',
      responsableEmail: 'resp@empresa.com',
    });
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
});
