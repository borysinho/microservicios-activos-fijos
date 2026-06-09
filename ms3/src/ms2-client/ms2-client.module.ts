import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Ms2ClientService } from './ms2-client.service';

@Module({
  imports: [HttpModule],
  providers: [Ms2ClientService],
  exports: [Ms2ClientService],
})
export class Ms2ClientModule {}
