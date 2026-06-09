import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from './config/config.module';
import { FlujosModule } from './flujos/flujos.module';
import { Ms1ClientModule } from './ms1-client/ms1-client.module';
import { Ms2ClientModule } from './ms2-client/ms2-client.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DevModule } from './dev/dev.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    FlujosModule,
    Ms1ClientModule,
    Ms2ClientModule,
    NotificacionesModule,
    WebhooksModule,
    WhatsappModule,
    DevModule,
  ],
})
export class AppModule {}
