import { Body, Controller, Post, Query } from '@nestjs/common';
import {
  DiagnosticoCriticoDto,
  EventoActivoDto,
  MantenimientoProgramadoDto,
  ReportarProblemaDto,
  SolicitudRevisionN8nDto,
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

  @Post('solicitud-revision')
  solicitudRevisionN8n(
    @Body() dto: SolicitudRevisionN8nDto | Record<string, any>,
    @Query() query: Partial<SolicitudRevisionN8nDto>,
  ) {
    return this.webhooksService.solicitudRevisionN8n(this.normalizarSolicitudRevisionN8n(dto, query));
  }

  private normalizarSolicitudRevisionN8n(
    dto: SolicitudRevisionN8nDto | Record<string, any>,
    query: Partial<SolicitudRevisionN8nDto>,
  ): SolicitudRevisionN8nDto {
    if (query.from && query.text && query.codigoActivo) {
      return query as SolicitudRevisionN8nDto;
    }
    const payload = (dto as any).from ? dto : ((dto as any)[''] ?? dto);
    if (typeof payload === 'string') {
      if (!payload.trim()) {
        return query as SolicitudRevisionN8nDto;
      }
      return JSON.parse(payload);
    }
    return payload as SolicitudRevisionN8nDto;
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
