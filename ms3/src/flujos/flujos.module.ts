import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlujosController } from './flujos.controller';
import { FlujosService } from './flujos.service';

@Module({
  imports: [HttpModule],
  controllers: [FlujosController],
  providers: [FlujosService],
  exports: [FlujosService],
})
export class FlujosModule {}
