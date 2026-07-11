import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppConfig } from '../src/config/app-config.service';
import { Ms1ClientService } from '../src/ms1-client/ms1-client.service';
import { Ms2ClientService } from '../src/ms2-client/ms2-client.service';
import { NotificacionesService } from '../src/notificaciones/notificaciones.service';

describe('MS3 API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfig)
      .useValue({
        port: 3000,
        nodeEnv: 'test',
        devToolsEnabled: true,
        corsOrigins: ['*'],
        whatsappVerifyToken: 'verify-token',
        whatsappAppSecret: '',
        n8nWebhookUrl: '',
        ms1GraphqlUrl: 'http://ms1/graphql',
        ms2BaseUrl: 'http://ms2/api',
        sendgridApiKey: '',
        sendgridFromEmail: 'noreply@activos.local',
        whatsappToken: '',
        whatsappPhoneNumberId: '',
        whatsappApiUrl: 'https://graph.facebook.com/v18.0',
      })
      .overrideProvider(Ms1ClientService)
      .useValue({
        buscarActivoPorCodigo: jest.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          codigo: 'ACT-2024-001',
          nombre: 'Laptop',
          estado: 'ACTIVO',
          responsableEmail: 'resp@empresa.com',
        }),
        obtenerActivoPorId: jest.fn().mockResolvedValue({ id: 'id', estado: 'ACTIVO' }),
        crearTicketRevision: jest.fn().mockResolvedValue({
          ticketId: 'TKT-1',
          activoId: '550e8400-e29b-41d4-a716-446655440000',
          estado: 'CREADO',
        }),
      })
      .overrideProvider(Ms2ClientService)
      .useValue({
        obtenerDocumentos: jest.fn().mockResolvedValue([{ documentoId: 'doc-1' }]),
      })
      .overrideProvider(NotificacionesService)
      .useValue({
        enviarEmail: jest.fn().mockResolvedValue({ enviado: false }),
        enviarWhatsAppTexto: jest.fn().mockResolvedValue({ enviado: false }),
        enviarWhatsAppMantenimiento: jest.fn().mockResolvedValue({ enviado: false }),
        registrarToken: jest.fn(),
        listarNotificaciones: jest.fn().mockReturnValue([]),
        guardarNotificacion: jest.fn(),
        enviarPush: jest.fn().mockResolvedValue({ enviado: false }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health expone health check productivo', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          status: 'ok',
          service: 'ms3-automatizacion',
          mode: 'test',
        });
      });
  });

  it('GET /whatsapp/webhook devuelve challenge valido', async () => {
    await request(app.getHttpServer())
      .get('/whatsapp/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge-123',
      })
      .expect(200)
      .expect('challenge-123');
  });

  it('POST /whatsapp/webhook procesa solicitud entrante', async () => {
    await request(app.getHttpServer())
      .post('/whatsapp/webhook')
      .send({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '59170000000',
                      timestamp: '1710000000',
                      text: { body: 'Revisar ACT-2024-001' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          recibido: true,
          codigoActivo: 'ACT-2024-001',
          ticketId: 'TKT-1',
        });
      });
  });

  it('GET /api/flujos lista los tres flujos', async () => {
    await request(app.getHttpServer())
      .get('/api/flujos')
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(3);
      });
  });

  it('POST /api/webhook/reportar-problema mantiene contrato mobile', async () => {
    await request(app.getHttpServer())
      .post('/api/webhook/reportar-problema')
      .send({
        activoId: '550e8400-e29b-41d4-a716-446655440000',
        activoCodigo: 'ACT-2024-001',
        descripcion: 'Pantalla rota',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({
          ticketId: 'TKT-1',
          mensaje: 'Reporte recibido para ACT-2024-001',
        });
      });
  });

  it('POST /api/dev/simular/whatsapp permite probar el flujo en desarrollo', async () => {
    await request(app.getHttpServer())
      .post('/api/dev/simular/whatsapp')
      .send({
        from: '59170000000',
        text: 'Revision local ACT-2024-001',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          recibido: true,
          codigoActivo: 'ACT-2024-001',
          ticketId: 'TKT-1',
        });
      });
  });

  it('POST /api/dev/simular/vencimiento-garantia permite probar CU-73 en desarrollo', async () => {
    await request(app.getHttpServer())
      .post('/api/dev/simular/vencimiento-garantia')
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          enviado: true,
          flujo: 'alerta-garantia',
        });
      });
  });

  it('POST /api/dev/simular/mantenimiento-programado permite probar CU-74 en desarrollo', async () => {
    await request(app.getHttpServer())
      .post('/api/dev/simular/mantenimiento-programado')
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          enviado: true,
          flujo: 'alerta-mantenimiento',
        });
      });
  });
});
