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
  areaActual?: { nombre?: string };
  asignaciones?: Array<{
    activa: boolean;
    responsable: {
      nombre?: string;
      email?: string;
      telefono?: string;
    };
    area?: { nombre?: string };
  }>;
};

export type TicketRevision = {
  ticketId: string;
  activoId: string;
  estado: 'CREADO' | 'SIMULADO';
};

const ACTIVOS_DEMO: Record<string, ActivoMs1> = {
  'ACT-2024-001': {
    id: '550e8400-e29b-41d4-a716-446655440000',
    codigo: 'ACT-2024-001',
    nombre: 'Laptop Dell Demo',
    estado: 'ACTIVO',
    responsableEmail: 'quirogaborys@gmail.com',
    responsablePhone: '591-77685777',
    asignaciones: [{
      activa: true,
      responsable: {
        nombre: 'Borys Quiroga',
        email: 'quirogaborys@gmail.com',
        telefono: '591-77685777',
      },
      area: { nombre: 'Tecnologias de Informacion' },
    }],
  },
  'ACT-2024-002': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    codigo: 'ACT-2024-002',
    nombre: 'Impresora HP Demo',
    estado: 'EN_MANTENIMIENTO',
    responsableEmail: 'quirogaborys@gmail.com',
    responsablePhone: '591-77685777',
    asignaciones: [{
      activa: true,
      responsable: {
        nombre: 'Borys Quiroga',
        email: 'quirogaborys@gmail.com',
        telefono: '591-77685777',
      },
      area: { nombre: 'Tecnologias de Informacion' },
    }],
  },
  'ACT-2024-003': {
    id: '550e8400-e29b-41d4-a716-446655440002',
    codigo: 'ACT-2024-003',
    nombre: 'Router Cisco Demo',
    estado: 'ACTIVO',
    responsableEmail: 'quirogaborys@gmail.com',
    responsablePhone: '591-77685777',
    asignaciones: [{
      activa: true,
      responsable: {
        nombre: 'Borys Quiroga',
        email: 'quirogaborys@gmail.com',
        telefono: '591-77685777',
      },
      area: { nombre: 'Tecnologias de Informacion' },
    }],
  },
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
        activos(filtro: { codigo: $codigo }) {
          id
          codigo
          nombre
          estado
          areaActual {
            nombre
          }
          asignaciones {
            activa
            area {
              nombre
            }
            responsable {
              nombre
              email
              telefono
            }
          }
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1GraphqlUrl, {
          query,
          variables: { codigo },
        }, this.authOptions()),
      );
      return this.conResponsableActivo(data?.data?.activos?.[0]) ?? this.activoDemo(codigo);
    } catch (error) {
      this.logger.warn(`MS1 no respondio al buscar activo ${codigo}: ${(error as Error).message}`);
      return this.activoDemo(codigo);
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
          areaActual {
            nombre
          }
          asignaciones {
            activa
            area {
              nombre
            }
            responsable {
              nombre
              email
              telefono
            }
          }
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1GraphqlUrl, {
          query,
          variables: { id: activoId },
        }, this.authOptions()),
      );
      return this.conResponsableActivo(data?.data?.activo) ?? this.activoDemoPorId(activoId);
    } catch (error) {
      this.logger.warn(`MS1 no respondio al obtener activo ${activoId}: ${(error as Error).message}`);
      return this.activoDemoPorId(activoId);
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
        }, this.authOptions()),
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

  private authOptions() {
    if (!this.config.ms1AuthToken) {
      return undefined;
    }
    return {
      headers: {
        Authorization: `Bearer ${this.config.ms1AuthToken}`,
      },
    };
  }

  telefonoTieneAccesoActivo(activo: ActivoMs1, telefonoWhatsapp: string): boolean {
    const telefono = this.normalizarTelefono(telefonoWhatsapp);
    if (!telefono) {
      return false;
    }

    const telefonosAsignados = this.responsablesActivos(activo)
      .map((asignacion) => this.normalizarTelefono(asignacion.responsable.telefono))
      .filter(Boolean);

    if (telefonosAsignados.length > 0) {
      return telefonosAsignados.includes(telefono);
    }

    return this.normalizarTelefono(activo.responsablePhone) === telefono;
  }

  normalizarTelefono(value?: string): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private conResponsableActivo(activo?: ActivoMs1 | null): ActivoMs1 | null {
    if (!activo) {
      return null;
    }

    const asignacionActiva = this.responsablesActivos(activo)[0];
    if (!asignacionActiva) {
      return activo;
    }

    return {
      ...activo,
      responsableEmail: asignacionActiva.responsable.email ?? activo.responsableEmail,
      responsablePhone: asignacionActiva.responsable.telefono ?? activo.responsablePhone,
      areaActual: activo.areaActual ?? asignacionActiva.area,
    };
  }

  private responsablesActivos(activo: ActivoMs1) {
    return (activo.asignaciones ?? []).filter(
      (asignacion) => asignacion.activa && asignacion.responsable,
    );
  }

  private activoDemo(codigo: string): ActivoMs1 | null {
    if (!this.config.devToolsEnabled) {
      return null;
    }
    return ACTIVOS_DEMO[codigo.toUpperCase()] ?? null;
  }

  private activoDemoPorId(activoId: string): ActivoMs1 | null {
    if (!this.config.devToolsEnabled) {
      return null;
    }
    return Object.values(ACTIVOS_DEMO).find((activo) => activo.id === activoId) ?? null;
  }
}
