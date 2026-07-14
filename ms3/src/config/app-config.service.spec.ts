import { AppConfig } from './app-config.service';

describe('AppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.MS3_WHATSAPP_PROVIDER;
    delete process.env.MS3_TWILIO_ACCOUNT_SID;
    delete process.env.MS3_TWILIO_AUTH_TOKEN;
    delete process.env.MS3_TWILIO_WHATSAPP_FROM;
    delete process.env.MS3_WAHA_BASE_URL;
    delete process.env.MS3_WAHA_API_KEY;
    delete process.env.MS3_CORS_ORIGINS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('infiere Twilio cuando existen credenciales del sandbox/API', () => {
    process.env.MS3_TWILIO_ACCOUNT_SID = 'AC123';
    process.env.MS3_TWILIO_AUTH_TOKEN = 'token';
    process.env.MS3_TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    const config = new AppConfig();

    expect(config.whatsappProvider).toBe('twilio');
  });

  it('respeta MS3_WHATSAPP_PROVIDER cuando se define explicitamente', () => {
    process.env.MS3_WHATSAPP_PROVIDER = 'meta';
    process.env.MS3_TWILIO_ACCOUNT_SID = 'AC123';
    process.env.MS3_TWILIO_AUTH_TOKEN = 'token';
    process.env.MS3_TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    const config = new AppConfig();

    expect(config.whatsappProvider).toBe('meta');
  });

  it('incluye el origen local del frontend y produccion Vercel por defecto para CORS', () => {
    const config = new AppConfig();

    expect(config.corsOrigins).toEqual(['http://localhost:4200', 'https://*.vercel.app']);
  });

  it('normaliza origenes CORS definidos por ambiente', () => {
    process.env.MS3_CORS_ORIGINS = ' http://localhost:4200, https://frontend.example.com ,,';

    const config = new AppConfig();

    expect(config.corsOrigins).toEqual(['http://localhost:4200', 'https://frontend.example.com']);
  });
});
