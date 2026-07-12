import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappLlmAgentService } from './whatsapp-llm-agent.service';
import { WhatsappService } from './whatsapp.service';
import { FlujosModule } from '../flujos/flujos.module';
import { Ms1ClientModule } from '../ms1-client/ms1-client.module';
import { Ms2ClientModule } from '../ms2-client/ms2-client.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [HttpModule, FlujosModule, Ms1ClientModule, Ms2ClientModule, NotificacionesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappLlmAgentService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
