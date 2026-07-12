import { Injectable } from '@nestjs/common';

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

@Injectable()
export class AppConfig {
  readonly nodeEnv = env('NODE_ENV', 'development');
  readonly devToolsEnabled = env('MS3_DEV_TOOLS_ENABLED', env('NODE_ENV', 'development') === 'production' ? 'false' : 'true') === 'true';

  readonly port = Number(env('PORT', '3000'));
  readonly ms1GraphqlUrl = env('MS1_GRAPHQL_URL', 'http://localhost:8081/graphql');
  readonly ms1AuthToken = env('MS1_AUTH_TOKEN');
  readonly ms1TicketsUrl = env('MS1_TICKETS_URL');
  readonly ms2BaseUrl = env('MS2_BASE_URL', 'http://localhost:8000/api');
  readonly ms2AuthToken = env('MS2_AUTH_TOKEN');
  readonly ms4N8nWebhookUrl = env('MS4_N8N_WEBHOOK_URL', env('N8N_WEBHOOK_URL'));
  readonly n8nWebhookUrl = this.ms4N8nWebhookUrl;
  readonly corsOrigins = env('CORS_ORIGINS', '*').split(',').map((origin) => origin.trim());

  readonly twilioAccountSid = env('TWILIO_ACCOUNT_SID');
  readonly twilioAuthToken = env('TWILIO_AUTH_TOKEN');
  readonly twilioWhatsappFrom = env('TWILIO_WHATSAPP_FROM');
  readonly wahaBaseUrl = env('WAHA_BASE_URL', 'http://localhost:3001');
  readonly wahaSession = env('WAHA_SESSION', 'default');
  readonly wahaApiKey = env('WAHA_API_KEY');
  readonly whatsappApiUrl = env('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0');
  readonly whatsappPhoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID');
  readonly whatsappToken = env('WHATSAPP_TOKEN');
  readonly whatsappAppSecret = env('WHATSAPP_APP_SECRET');
  readonly whatsappVerifyToken = env('WHATSAPP_VERIFY_TOKEN', 'activos-ms3-verify');
  readonly whatsappProvider = env('WHATSAPP_PROVIDER', this.detectWhatsappProvider()).toLowerCase();

  readonly emailProvider = env('EMAIL_PROVIDER', env('SMTP_HOST') ? 'smtp' : 'sendgrid').toLowerCase();
  readonly smtpHost = env('SMTP_HOST');
  readonly smtpPort = Number(env('SMTP_PORT', '587'));
  readonly smtpSecure = env('SMTP_SECURE', 'false') === 'true';
  readonly smtpUser = env('SMTP_USER', env('GMAIL_USERNAME'));
  readonly smtpPassword = env('SMTP_PASSWORD', env('GMAIL_PASSWORD'));
  readonly smtpFromEmail = env('SMTP_FROM_EMAIL', this.smtpUser || 'noreply@activos.empresa.com');
  readonly sendgridApiKey = env('SENDGRID_API_KEY');
  readonly sendgridFromEmail = env('SENDGRID_FROM_EMAIL', 'noreply@activos.empresa.com');

  readonly fcmProjectId = env('FCM_PROJECT_ID');
  readonly fcmAccessToken = env('FCM_ACCESS_TOKEN');

  private detectWhatsappProvider(): string {
    if (this.twilioAccountSid && this.twilioAuthToken && this.twilioWhatsappFrom) {
      return 'twilio';
    }

    if (env('WAHA_BASE_URL') || env('WAHA_API_KEY')) {
      return 'waha';
    }

    return 'meta';
  }
}
