import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type ActivoMs1 = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fechaAdquisicion?: string;
  valorAdquisicion?: number | string;
  vidaUtilAnios?: number;
  estado?: string;
  ubicacion?: string;
  valorLibros?: number | string;
  responsableEmail?: string;
  responsablePhone?: string;
  categoria?: {
    nombre?: string;
    metodoDepreciacion?: string;
    tasaDepreciacion?: number;
  };
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
  traslados?: Array<{
    id: string;
    fecha?: string;
    motivoTraslado?: string;
    recepcionConfirmada: boolean;
    areaOrigen?: { nombre?: string };
    areaDestino?: { nombre?: string };
  }>;
};

export type TicketRevision = {
  ticketId: string;
  activoId: string;
  estado: 'CREADO' | 'SIMULADO';
};

type ResponsableMs1 = {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
};

const ACTIVOS_DEMO: Record<string, ActivoMs1> = {
  'ACT-2024-001': {
    id: '550e8400-e29b-41d4-a716-446655440000',
    codigo: 'ACT-2024-001',
    nombre: 'Laptop Dell Demo',
    estado: 'ACTIVO',
    ubicacion: 'Piso 2 - Mesa TI',
    valorAdquisicion: 8200,
    vidaUtilAnios: 4,
    valorLibros: 4100,
    categoria: {
      nombre: 'Equipos de computacion',
      metodoDepreciacion: 'LINEAL',
      tasaDepreciacion: 25,
    },
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
    ubicacion: 'Piso 1 - Soporte',
    valorAdquisicion: 3500,
    vidaUtilAnios: 5,
    valorLibros: 2100,
    categoria: {
      nombre: 'Equipos de oficina',
      metodoDepreciacion: 'LINEAL',
      tasaDepreciacion: 20,
    },
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
    ubicacion: 'Datacenter',
    valorAdquisicion: 1200,
    vidaUtilAnios: 3,
    valorLibros: 800,
    categoria: {
      nombre: 'Redes',
      metodoDepreciacion: 'ACELERADO',
      tasaDepreciacion: 30,
    },
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
          ...ActivoWhatsappFields
        }
      }

      fragment ActivoWhatsappFields on Activo {
        id
        codigo
        nombre
        descripcion
        fechaAdquisicion
        valorAdquisicion
        vidaUtilAnios
        estado
        ubicacion
        valorLibros
        categoria {
          nombre
          metodoDepreciacion
          tasaDepreciacion
        }
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
        traslados {
          id
          fecha
          motivoTraslado
          recepcionConfirmada
          areaOrigen {
            nombre
          }
          areaDestino {
            nombre
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
          ...ActivoWhatsappFields
        }
      }

      fragment ActivoWhatsappFields on Activo {
        id
        codigo
        nombre
        descripcion
        fechaAdquisicion
        valorAdquisicion
        vidaUtilAnios
        estado
        ubicacion
        valorLibros
        categoria {
          nombre
          metodoDepreciacion
          tasaDepreciacion
        }
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
        traslados {
          id
          fecha
          motivoTraslado
          recepcionConfirmada
          areaOrigen {
            nombre
          }
          areaDestino {
            nombre
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

  async listarActivosPorTelefono(telefonoWhatsapp: string): Promise<ActivoMs1[]> {
    const telefono = this.normalizarTelefono(telefonoWhatsapp);
    if (!telefono) {
      return [];
    }

    const queryResponsables = `
      query ResponsablesWhatsapp {
        responsables {
          id
          nombre
          email
          telefono
        }
      }
    `;

    const queryActivos = `
      query ActivosPorResponsable($responsableId: ID!) {
        activosPorResponsable(responsableId: $responsableId) {
          id
          codigo
          nombre
          estado
          ubicacion
          valorLibros
          areaActual {
            nombre
          }
          categoria {
            nombre
            metodoDepreciacion
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
          traslados {
            id
            fecha
            motivoTraslado
            recepcionConfirmada
            areaOrigen {
              nombre
            }
            areaDestino {
              nombre
            }
          }
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.config.ms1GraphqlUrl, { query: queryResponsables }, this.authOptions()),
      );
      const responsables = (data?.data?.responsables ?? []) as ResponsableMs1[];
      const responsable = responsables.find((item) => this.normalizarTelefono(item.telefono) === telefono);
      if (!responsable) {
        return this.activosDemoPorTelefono(telefonoWhatsapp);
      }

      const activosResponse = await firstValueFrom(
        this.http.post(
          this.config.ms1GraphqlUrl,
          { query: queryActivos, variables: { responsableId: responsable.id } },
          this.authOptions(),
        ),
      );

      const activos = (activosResponse.data?.data?.activosPorResponsable ?? []) as ActivoMs1[];
      return activos.map((activo) => this.conResponsableActivo(activo) ?? activo);
    } catch (error) {
      this.logger.warn(`MS1 no respondio al listar activos por telefono: ${(error as Error).message}`);
      return this.activosDemoPorTelefono(telefonoWhatsapp);
    }
  }

  async confirmarRecepcionTraslado(trasladoId: string): Promise<{ id: string; recepcionConfirmada: boolean }> {
    const mutation = `
      mutation ConfirmarRecepcion($trasladoId: ID!) {
        confirmarRecepcionActivo(trasladoId: $trasladoId) {
          id
          recepcionConfirmada
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          this.config.ms1GraphqlUrl,
          { query: mutation, variables: { trasladoId } },
          this.authOptions(),
        ),
      );
      return data?.data?.confirmarRecepcionActivo ?? { id: trasladoId, recepcionConfirmada: true };
    } catch (error) {
      this.logger.warn(`No se pudo confirmar recepcion ${trasladoId} en MS1: ${(error as Error).message}`);
      if (!this.config.devToolsEnabled) {
        throw error;
      }
      return { id: trasladoId, recepcionConfirmada: true };
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

  private activosDemoPorTelefono(telefonoWhatsapp: string): ActivoMs1[] {
    if (!this.config.devToolsEnabled) {
      return [];
    }

    return Object.values(ACTIVOS_DEMO).filter((activo) =>
      this.telefonoTieneAccesoActivo(activo, telefonoWhatsapp),
    );
  }
}
