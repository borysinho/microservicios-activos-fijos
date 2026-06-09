import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';
import { DiagnosticoCriticoDto, MantenimientoProgramadoDto, VencimientoGarantiaDto } from '../webhooks/dto';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

type SimularWhatsappDto = {
  from?: string;
  text?: string;
};

@Controller(['api/dev', 'dev'])
export class DevController {
  constructor(
    private readonly config: AppConfig,
    private readonly whatsappService: WhatsappService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Get('health')
  health() {
    this.assertDevEnabled();
    return {
      ok: true,
      devToolsEnabled: this.config.devToolsEnabled,
      mode: this.config.nodeEnv,
      endpoints: [
        'POST /api/dev/simular/whatsapp',
        'POST /api/dev/simular/vencimiento-garantia',
        'POST /api/dev/simular/mantenimiento-programado',
        'POST /api/dev/simular/diagnostico-critico',
      ],
    };
  }

  @Post('simular/whatsapp')
  simularWhatsapp(@Body() dto: SimularWhatsappDto) {
    this.assertDevEnabled();
    return this.whatsappService.procesarSolicitudRevision({
      from: dto.from ?? '59170000000',
      text: dto.text ?? 'Solicito revision de ACT-2024-001',
      timestamp: String(Math.floor(Date.now() / 1000)),
    });
  }

  @Post('simular/vencimiento-garantia')
  simularVencimientoGarantia(@Body() dto: Partial<VencimientoGarantiaDto>) {
    this.assertDevEnabled();
    return this.webhooksService.alertaVencimientoGarantia({
      activoId: dto.activoId ?? '550e8400-e29b-41d4-a716-446655440000',
      codigo: dto.codigo ?? 'ACT-2024-001',
      nombre: dto.nombre ?? 'Laptop Dell Demo',
      fechaVencimientoGarantia: dto.fechaVencimientoGarantia ?? '2026-07-15',
      responsableEmail: dto.responsableEmail ?? 'responsable.area@activos.local',
      responsablePhone: dto.responsablePhone ?? '59170000000',
      responsableUsuarioId: dto.responsableUsuarioId ?? 'user-demo',
    });
  }

  @Post('simular/mantenimiento-programado')
  simularMantenimientoProgramado(@Body() dto: Partial<MantenimientoProgramadoDto>) {
    this.assertDevEnabled();
    return this.webhooksService.alertaMantenimientoProgramado({
      activoId: dto.activoId ?? '550e8400-e29b-41d4-a716-446655440001',
      codigo: dto.codigo ?? 'ACT-2024-002',
      nombre: dto.nombre ?? 'Impresora HP Demo',
      fechaMantenimiento: dto.fechaMantenimiento ?? '2026-06-20',
      responsableEmail: dto.responsableEmail ?? 'responsable.area@activos.local',
      responsablePhone: dto.responsablePhone ?? '59170000000',
      responsableUsuarioId: dto.responsableUsuarioId ?? 'user-demo',
    });
  }

  @Post('simular/diagnostico-critico')
  simularDiagnosticoCritico(@Body() dto: Partial<DiagnosticoCriticoDto>) {
    this.assertDevEnabled();
    return this.webhooksService.diagnosticoCritico({
      activoId: dto.activoId ?? '550e8400-e29b-41d4-a716-446655440002',
      codigo: dto.codigo ?? 'ACT-2024-003',
      estadoDiagnostico: dto.estadoDiagnostico ?? 'REQUIERE_MANTENIMIENTO',
      confianza: dto.confianza ?? '0.91',
      responsableEmail: dto.responsableEmail ?? 'responsable.area@activos.local',
    });
  }

  private assertDevEnabled() {
    if (!this.config.devToolsEnabled) {
      throw new ForbiddenException('Dev tools deshabilitados');
    }
  }
}
