import { Body, Controller, Post } from '@nestjs/common';
import {
  DiagnosticoCriticoDto,
  EventoActivoDto,
  MantenimientoProgramadoDto,
  ReportarProblemaDto,
  VencimientoGarantiaDto,
} from './dto';
import { WebhooksService } from './webhooks.service';

@Controller(['api/webhooks', 'webhooks'])
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('evento-activo')
  eventoActivo(@Body() dto: EventoActivoDto) {
    return this.webhooksService.procesarEventoActivo(dto);
  }

  @Post('vencimiento-garantia')
  vencimientoGarantia(@Body() dto: VencimientoGarantiaDto) {
    return this.webhooksService.alertaVencimientoGarantia(dto);
  }

  @Post('mantenimiento-programado')
  mantenimientoProgramado(@Body() dto: MantenimientoProgramadoDto) {
    return this.webhooksService.alertaMantenimientoProgramado(dto);
  }

  @Post('diagnostico-critico')
  diagnosticoCritico(@Body() dto: DiagnosticoCriticoDto) {
    return this.webhooksService.diagnosticoCritico(dto);
  }

  @Post('reportar-problema')
  reportarProblema(@Body() dto: ReportarProblemaDto) {
    return this.webhooksService.reportarProblema(dto);
  }
}

@Controller(['api/webhook', 'webhook'])
export class WebhookCompatController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('activos')
  eventoActivoLegacy(@Body() dto: EventoActivoDto) {
    return this.webhooksService.procesarEventoActivo(dto);
  }

  @Post('reportar-problema')
  reportarProblema(@Body() dto: ReportarProblemaDto) {
    return this.webhooksService.reportarProblema(dto);
  }
}
