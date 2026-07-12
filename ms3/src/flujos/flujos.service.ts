import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type EstadoFlujoValor = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';

export type EstadoFlujo = {
  id: string;
  nombre: string;
  estado: EstadoFlujoValor;
  ultimaEjecucion: string;
  detalle?: string;
};

const FLUJOS_BASE: EstadoFlujo[] = [
  {
    id: 'solicitud-revision',
    nombre: 'Solicitud de Revision por WhatsApp',
    estado: 'PENDIENTE',
    ultimaEjecucion: '',
  },
  {
    id: 'alerta-garantia',
    nombre: 'Alerta de Vencimiento de Garantia',
    estado: 'PENDIENTE',
    ultimaEjecucion: '',
  },
  {
    id: 'alerta-mantenimiento',
    nombre: 'Alerta de Mantenimiento Programado',
    estado: 'PENDIENTE',
    ultimaEjecucion: '',
  },
];

@Injectable()
export class FlujosService {
  private readonly logger = new Logger(FlujosService.name);
  private readonly flujos = new Map<string, EstadoFlujo>(
    FLUJOS_BASE.map((flujo) => [flujo.id, { ...flujo }]),
  );

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfig,
  ) {}

  listar(): EstadoFlujo[] {
    return Array.from(this.flujos.values());
  }

  obtener(id: string): EstadoFlujo | undefined {
    return this.flujos.get(id);
  }

  marcar(id: string, estado: EstadoFlujoValor, detalle?: string): EstadoFlujo {
    const flujo = this.flujos.get(id) ?? {
      id,
      nombre: id,
      estado: 'PENDIENTE' as EstadoFlujoValor,
      ultimaEjecucion: '',
    };

    const actualizado: EstadoFlujo = {
      ...flujo,
      estado,
      detalle,
      ultimaEjecucion: new Date().toISOString(),
    };
    this.flujos.set(id, actualizado);
    return actualizado;
  }

  async dispararN8n<TPayload extends object>(ruta: string, payload: TPayload): Promise<boolean> {
    if (!this.config.n8nWebhookUrl) {
      this.logger.debug(`MS3_MS4_N8N_WEBHOOK_URL no configurado; flujo ${ruta} queda en modo interno`);
      return false;
    }

    const url = `${this.config.n8nWebhookUrl.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
    try {
      await firstValueFrom(this.http.post(url, payload));
      return true;
    } catch (error) {
      this.logger.warn(`No se pudo disparar MS4/N8N ${ruta}: ${(error as Error).message}`);
      return false;
    }
  }
}
