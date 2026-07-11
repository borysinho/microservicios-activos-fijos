import { Controller, Get } from '@nestjs/common';
import { AppConfig } from './config/app-config.service';

@Controller()
export class HealthController {
  constructor(private readonly config: AppConfig) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'ms3-automatizacion',
      mode: this.config.nodeEnv,
    };
  }
}
