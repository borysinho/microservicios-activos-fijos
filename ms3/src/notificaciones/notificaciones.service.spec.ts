import { of, throwError } from 'rxjs';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  const baseConfig: any = {
    sendgridApiKey: '',
    sendgridFromEmail: 'noreply@activos.local',
    whatsappProvider: 'meta',
    whatsappApiUrl: 'https://graph.facebook.com/v18.0',
    whatsappPhoneNumberId: '',
    whatsappToken: '',
    wahaBaseUrl: 'http://waha:3000',
    wahaSession: 'default',
    wahaApiKey: 'local-key',
    fcmProjectId: '',
    fcmAccessToken: '',
  };

  it('envia texto por WAHA cuando el proveedor local esta habilitado', async () => {
    const http = {
      post: jest.fn().mockReturnValue(of({ data: { id: 'msg-1' } })),
    };
    const service = new NotificacionesService(http as any, {
      ...baseConfig,
      whatsappProvider: 'waha',
    });

    const result = await service.enviarWhatsAppTexto('+591 70000000', 'Hola');

    expect(http.post).toHaveBeenCalledWith(
      'http://waha:3000/api/sendText',
      {
        session: 'default',
        chatId: '59170000000@c.us',
        text: 'Hola',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'local-key',
        },
      },
    );
    expect(result).toEqual({
      enviado: true,
      canal: 'whatsapp',
      modo: 'real',
      destino: '+591 70000000',
    });
  });

  it('mantiene el chatId de WAHA si ya viene formateado', async () => {
    const http = {
      post: jest.fn().mockReturnValue(of({ data: { id: 'msg-1' } })),
    };
    const service = new NotificacionesService(http as any, {
      ...baseConfig,
      whatsappProvider: 'waha',
    });

    await service.enviarWhatsAppTexto('59170000000@c.us', 'Hola');

    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ chatId: '59170000000@c.us' }),
      expect.any(Object),
    );
  });

  it('degrada a modo simulado cuando WAHA no responde', async () => {
    const http = {
      post: jest.fn().mockReturnValue(throwError(() => new Error('ECONNREFUSED'))),
    };
    const service = new NotificacionesService(http as any, {
      ...baseConfig,
      whatsappProvider: 'waha',
    });

    const result = await service.enviarWhatsAppTexto('59170000000', 'Hola');

    expect(result).toEqual({
      enviado: false,
      canal: 'whatsapp',
      modo: 'simulado',
      destino: '59170000000',
    });
  });
});
