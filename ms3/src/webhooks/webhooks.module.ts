import { Module } from '@nestjs/common';
import { FlujosModule } from '../flujos/flujos.module';
import { Ms1ClientModule } from '../ms1-client/ms1-client.module';
import { Ms2ClientModule } from '../ms2-client/ms2-client.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { WebhookCompatController, WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [FlujosModule, Ms1ClientModule, Ms2ClientModule, NotificacionesModule],
  controllers: [WebhooksController, WebhookCompatController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
