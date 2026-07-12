import { NativeModules } from 'react-native';

describe('mobile env', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uses native config values when available', () => {
    NativeModules.RNCConfigModule = {
      getConfig: () => ({
        config: {
          MS1_BASE_URL: 'https://ms1.example.com',
          MS2_BASE_URL: 'https://ms2.example.com/api',
          MS3_BASE_URL: 'https://ms3.example.com/api',
        },
      }),
    };

    const { env } = require('./env');

    expect(env).toEqual({
      MS1_BASE_URL: 'https://ms1.example.com',
      MS2_BASE_URL: 'https://ms2.example.com/api',
      MS3_BASE_URL: 'https://ms3.example.com/api',
    });
  });

  it('falls back to development defaults when native config is missing', () => {
    delete NativeModules.RNCConfigModule;

    const { env } = require('./env');

    expect(env.MS1_BASE_URL).toContain('http://');
    expect(env.MS2_BASE_URL).toContain('/api');
    expect(env.MS3_BASE_URL).toContain('/api');
  });
});
