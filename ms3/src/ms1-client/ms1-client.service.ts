import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type ActivoMs1 = {
  id: string;
  codigo: string;
  nombre: string;
  estado?: string;
  responsableEmail?: string;
  responsablePhone?: string;
  areaActual?: { nombre: string };
};

export type TicketRevision = {
  ticketId: string;
  activoId: string;
  estado: 'CREADO' | 'SIMULADO';
};

@Injectable()
export class Ms1ClientService {
  private readonly logger = new Logger(Ms1ClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfig,
  ) {}

  async buscarActivoPorCodigo(codigo: string): Promise<ActivoMs1 | null> {
    const query = `
      query BuscarActivoPorCodigo($codigo: String!) {
        activoPorCodigo(codigo: $codigo) {
          id
          codigo
          nombre
          estado
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1GraphqlUrl, {
          query,
          variables: { codigo },
        }),
      );
      return data?.data?.activoPorCodigo ?? null;
    } catch (error) {
      this.logger.warn(`MS1 no respondio al buscar activo ${codigo}: ${(error as Error).message}`);
      return null;
    }
  }

  async obtenerActivoPorId(activoId: string): Promise<ActivoMs1 | null> {
    const query = `
      query ActivoPorId($id: ID!) {
        activo(id: $id) {
          id
          codigo
          nombre
          estado
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1GraphqlUrl, {
          query,
          variables: { id: activoId },
        }),
      );
      return data?.data?.activo ?? null;
    } catch (error) {
      this.logger.warn(`MS1 no respondio al obtener activo ${activoId}: ${(error as Error).message}`);
      return null;
    }
  }

  async crearTicketRevision(params: {
    activoId: string;
    solicitadoPorWhatsApp: string;
    motivo: string;
  }): Promise<TicketRevision> {
    const fallbackTicket = {
      ticketId: `TKT-${Date.now()}`,
      activoId: params.activoId,
      estado: 'SIMULADO' as const,
    };

    if (!this.config.ms1TicketsUrl) {
      return fallbackTicket;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1TicketsUrl, {
          ...params,
          fechaSolicitud: new Date().toISOString(),
        }),
      );
      return {
        ticketId: data?.ticketId ?? fallbackTicket.ticketId,
        activoId: params.activoId,
        estado: 'CREADO',
      };
    } catch (error) {
      this.logger.warn(`No se pudo crear ticket en MS1: ${(error as Error).message}`);
      return fallbackTicket;
    }
  }
}
