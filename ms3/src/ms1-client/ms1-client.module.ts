import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Ms1ClientService } from './ms1-client.service';

@Module({
  imports: [HttpModule],
  providers: [Ms1ClientService],
  exports: [Ms1ClientService],
})
export class Ms1ClientModule {}
