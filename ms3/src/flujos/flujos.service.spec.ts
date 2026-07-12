import { of, throwError } from 'rxjs';
import { FlujosService } from './flujos.service';

describe('FlujosService', () => {
  const http = {
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispara MS4/N8N usando la URL base configurada en MS3', async () => {
    http.post.mockReturnValueOnce(of({ data: { ok: true } }));
    const service = new FlujosService(http as any, {
      n8nWebhookUrl: 'https://ms4.azurewebsites.net/webhook/',
    } as any);

    const result = await service.dispararN8n('solicitud-revision', {
      from: 'whatsapp:+59177685777',
      text: 'Solicito revision de ACT-2024-001',
    });

    expect(result).toBe(true);
    expect(http.post).toHaveBeenCalledWith(
      'https://ms4.azurewebsites.net/webhook/solicitud-revision',
      {
        from: 'whatsapp:+59177685777',
        text: 'Solicito revision de ACT-2024-001',
      },
    );
  });

  it('devuelve false si MS4/N8N no esta configurado', async () => {
    const service = new FlujosService(http as any, { n8nWebhookUrl: '' } as any);

    await expect(service.dispararN8n('solicitud-revision', { text: 'ACT-2024-001' })).resolves.toBe(
      false,
    );
    expect(http.post).not.toHaveBeenCalled();
  });

  it('devuelve false si MS4/N8N rechaza el webhook', async () => {
    http.post.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));
    const service = new FlujosService(http as any, {
      n8nWebhookUrl: 'https://ms4.azurewebsites.net/webhook',
    } as any);

    await expect(service.dispararN8n('solicitud-revision', { text: 'ACT-2024-001' })).resolves.toBe(
      false,
    );
  });
});
