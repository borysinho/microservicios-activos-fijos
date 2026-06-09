import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { FlujosModule } from '../flujos/flujos.module';
import { Ms1ClientModule } from '../ms1-client/ms1-client.module';
import { Ms2ClientModule } from '../ms2-client/ms2-client.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [FlujosModule, Ms1ClientModule, Ms2ClientModule, NotificacionesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
