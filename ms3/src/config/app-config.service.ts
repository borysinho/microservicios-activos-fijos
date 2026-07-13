import { Injectable } from '@nestjs/common';

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

@Injectable()
export class AppConfig {
  readonly nodeEnv = env('MS3_NODE_ENV', env('NODE_ENV', 'development'));
  readonly devToolsEnabled = env('MS3_DEV_TOOLS_ENABLED', this.nodeEnv === 'production' ? 'false' : 'true') === 'true';

  readonly port = Number(env('MS3_PORT', env('PORT', '3000')));
  readonly ms1GraphqlUrl = env('MS3_MS1_GRAPHQL_URL', 'http://localhost:8081/graphql');
  readonly ms1AuthToken = env('MS3_MS1_AUTH_TOKEN');
  readonly ms1TicketsUrl = env('MS3_MS1_TICKETS_URL');
  readonly ms2BaseUrl = env('MS3_MS2_BASE_URL', 'http://localhost:8000/api');
  readonly ms2AuthToken = env('MS3_MS2_AUTH_TOKEN');
  readonly ms4N8nWebhookUrl = env('MS3_MS4_N8N_WEBHOOK_URL');
  readonly n8nWebhookUrl = this.ms4N8nWebhookUrl;
  readonly corsOrigins = env('MS3_CORS_ORIGINS', '*').split(',').map((origin) => origin.trim());

  readonly twilioAccountSid = env('MS3_TWILIO_ACCOUNT_SID');
  readonly twilioAuthToken = env('MS3_TWILIO_AUTH_TOKEN');
  readonly twilioWhatsappFrom = env('MS3_TWILIO_WHATSAPP_FROM');
  readonly wahaBaseUrl = env('MS3_WAHA_BASE_URL', 'http://localhost:3001');
  readonly wahaSession = env('MS3_WAHA_SESSION', 'default');
  readonly wahaApiKey = env('MS3_WAHA_API_KEY');
  readonly whatsappApiUrl = env('MS3_WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0');
  readonly whatsappPhoneNumberId = env('MS3_WHATSAPP_PHONE_NUMBER_ID');
  readonly whatsappToken = env('MS3_WHATSAPP_TOKEN');
  readonly whatsappAppSecret = env('MS3_WHATSAPP_APP_SECRET');
  readonly whatsappVerifyToken = env('MS3_WHATSAPP_VERIFY_TOKEN', 'activos-ms3-verify');
  readonly whatsappProvider = env('MS3_WHATSAPP_PROVIDER', this.detectWhatsappProvider()).toLowerCase();

  readonly emailProvider = env('MS3_EMAIL_PROVIDER', env('MS3_SMTP_HOST') ? 'smtp' : 'sendgrid').toLowerCase();
  readonly smtpHost = env('MS3_SMTP_HOST');
  readonly smtpPort = Number(env('MS3_SMTP_PORT', '587'));
  readonly smtpSecure = env('MS3_SMTP_SECURE', 'false') === 'true';
  readonly smtpUser = env('MS3_SMTP_USER');
  readonly smtpPassword = env('MS3_SMTP_PASSWORD');
  readonly smtpFromEmail = env('MS3_SMTP_FROM_EMAIL', this.smtpUser || 'noreply@activos.empresa.com');
  readonly sendgridApiKey = env('MS3_SENDGRID_API_KEY');
  readonly sendgridFromEmail = env('MS3_SENDGRID_FROM_EMAIL', 'noreply@activos.empresa.com');

  readonly fcmProjectId = env('MS3_FCM_PROJECT_ID');
  readonly fcmServiceAccountJson = env('MS3_FCM_SERVICE_ACCOUNT_JSON');
  readonly fcmAccessToken = env('MS3_FCM_ACCESS_TOKEN');

  readonly azureOpenAiEndpoint = env('MS3_AZURE_OPENAI_ENDPOINT');
  readonly azureOpenAiApiKey = env('MS3_AZURE_OPENAI_API_KEY');
  readonly azureOpenAiDeployment = env('MS3_AZURE_OPENAI_DEPLOYMENT', 'whatsapp-agent-mini');
  readonly azureOpenAiApiVersion = env('MS3_AZURE_OPENAI_API_VERSION', '2025-01-01-preview');

  private detectWhatsappProvider(): string {
    if (this.twilioAccountSid && this.twilioAuthToken && this.twilioWhatsappFrom) {
      return 'twilio';
    }

    if (env('MS3_WAHA_BASE_URL') || env('MS3_WAHA_API_KEY')) {
      return 'waha';
    }

    return 'meta';
  }
}
