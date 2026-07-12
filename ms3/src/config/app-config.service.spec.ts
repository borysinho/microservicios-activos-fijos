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
});
