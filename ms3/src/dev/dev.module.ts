import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule, WebhooksModule],
  controllers: [DevController],
})
export class DevModule {}
