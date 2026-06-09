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
  readonly ms1TicketsUrl = env('MS1_TICKETS_URL');
  readonly ms2BaseUrl = env('MS2_BASE_URL', 'http://localhost:8000/api');
  readonly n8nWebhookUrl = env('N8N_WEBHOOK_URL');
  readonly corsOrigins = env('CORS_ORIGINS', '*').split(',').map((origin) => origin.trim());

  readonly whatsappApiUrl = env('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0');
  readonly whatsappPhoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID');
  readonly whatsappToken = env('WHATSAPP_TOKEN');
  readonly whatsappAppSecret = env('WHATSAPP_APP_SECRET');
  readonly whatsappVerifyToken = env('WHATSAPP_VERIFY_TOKEN', 'activos-ms3-verify');

  readonly sendgridApiKey = env('SENDGRID_API_KEY');
  readonly sendgridFromEmail = env('SENDGRID_FROM_EMAIL', 'noreply@activos.empresa.com');

  readonly fcmProjectId = env('FCM_PROJECT_ID');
  readonly fcmAccessToken = env('FCM_ACCESS_TOKEN');
}
