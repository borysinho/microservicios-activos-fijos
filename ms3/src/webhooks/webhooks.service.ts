import { Injectable } from '@nestjs/common';
import { FlujosService } from '../flujos/flujos.service';
import { Ms1ClientService } from '../ms1-client/ms1-client.service';
import { Ms2ClientService } from '../ms2-client/ms2-client.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  DiagnosticoCriticoDto,
  EventoActivoDto,
  MantenimientoProgramadoDto,
  ReportarProblemaDto,
  SolicitudRevisionN8nDto,
  VencimientoGarantiaDto,
} from './dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly flujosService: FlujosService,
    private readonly ms1Client: Ms1ClientService,
    private readonly ms2Client: Ms2ClientService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async procesarEventoActivo(dto: EventoActivoDto) {
    const tipo = dto.tipoEvento ?? dto.tipo ?? 'MANTENIMIENTO';
    await this.flujosService.dispararN8n('evento-activo', dto);

    if (dto.responsableEmail) {
      await this.notificacionesService.enviarEmail({
        to: dto.responsableEmail,
        subject: `Evento de activo ${dto.codigoActivo ?? dto.activoId}`,
        text: `Se registro el evento ${tipo} para el activo ${dto.codigoActivo ?? dto.activoId}.`,
      });
    }

    return {
      recibido: true,
      tipo,
      activoId: dto.activoId,
    };
  }

  async alertaVencimientoGarantia(dto: VencimientoGarantiaDto) {
    await this.flujosService.dispararN8n('alerta-garantia', dto);
    this.flujosService.marcar('alerta-garantia', 'EN_PROCESO', dto.codigo);

    const [activo, documentos] = await Promise.all([
      this.ms1Client.obtenerActivoPorId(dto.activoId),
      this.ms2Client.obtenerDocumentos(dto.activoId),
    ]);

    await this.notificacionesService.enviarEmail({
      to: dto.responsableEmail,
      subject: `Garantia por vencer: ${dto.codigo}`,
      text: [
        `El activo ${dto.codigo} - ${dto.nombre} tiene garantia por vencer.`,
        `Fecha de vencimiento: ${dto.fechaVencimientoGarantia}`,
        `Estado MS1: ${activo?.estado ?? 'SIN_ESTADO'}`,
        `Documentos asociados en MS2: ${documentos.length}`,
      ].join('\n'),
    });

    if (dto.responsableUsuarioId) {
      this.notificacionesService.guardarNotificacion({
        usuarioId: dto.responsableUsuarioId,
        tipo: 'alerta',
        titulo: `Garantia por vencer: ${dto.codigo}`,
        mensaje: `Vence el ${dto.fechaVencimientoGarantia}`,
        activoId: dto.activoId,
      });
      await this.notificacionesService.enviarPush(
        dto.responsableUsuarioId,
        `Garantia por vencer: ${dto.codigo}`,
        `Vence el ${dto.fechaVencimientoGarantia}`,
      );
    }

    this.flujosService.marcar('alerta-garantia', 'COMPLETADO', dto.codigo);
    return {
      enviado: true,
      flujo: 'alerta-garantia',
      activoId: dto.activoId,
      documentosEncontrados: documentos.length,
    };
  }

  async alertaMantenimientoProgramado(dto: MantenimientoProgramadoDto) {
    await this.flujosService.dispararN8n('alerta-mantenimiento', dto);
    this.flujosService.marcar('alerta-mantenimiento', 'EN_PROCESO', dto.codigo);

    const activo = await this.ms1Client.obtenerActivoPorId(dto.activoId);
    await this.notificacionesService.enviarEmail({
      to: dto.responsableEmail,
      subject: `Mantenimiento programado: ${dto.codigo}`,
      text: [
        `El activo ${dto.codigo} - ${dto.nombre} tiene mantenimiento programado.`,
        `Fecha: ${dto.fechaMantenimiento}`,
        `Estado MS1: ${activo?.estado ?? 'SIN_ESTADO'}`,
      ].join('\n'),
    });
    await this.notificacionesService.enviarWhatsAppMantenimiento({
      to: dto.responsablePhone,
      codigoActivo: dto.codigo,
      fechaMantenimiento: dto.fechaMantenimiento,
    });

    if (dto.responsableUsuarioId) {
      this.notificacionesService.guardarNotificacion({
        usuarioId: dto.responsableUsuarioId,
        tipo: 'mantenimiento',
        titulo: `Mantenimiento: ${dto.codigo}`,
        mensaje: `Programado para ${dto.fechaMantenimiento}`,
        activoId: dto.activoId,
      });
    }

    this.flujosService.marcar('alerta-mantenimiento', 'COMPLETADO', dto.codigo);
    return {
      enviado: true,
      flujo: 'alerta-mantenimiento',
      activoId: dto.activoId,
    };
  }

  async diagnosticoCritico(dto: DiagnosticoCriticoDto) {
    await this.flujosService.dispararN8n('diagnostico-critico', dto);
    if (dto.responsableEmail) {
      await this.notificacionesService.enviarEmail({
        to: dto.responsableEmail,
        subject: `Diagnostico critico: ${dto.codigo}`,
        text: `El activo ${dto.codigo} fue diagnosticado como ${dto.estadoDiagnostico} con confianza ${dto.confianza}.`,
      });
    }
    return { recibido: true, activoId: dto.activoId };
  }

  async reportarProblema(dto: ReportarProblemaDto) {
    const ticket = await this.ms1Client.crearTicketRevision({
      activoId: dto.activoId,
      solicitadoPorWhatsApp: 'mobile-app',
      motivo: dto.descripcion,
    });

    if (dto.origen === 'n8n') {
      this.flujosService.marcar('solicitud-revision', 'COMPLETADO', `Ticket ${ticket.ticketId}`);
    } else {
      await this.flujosService.dispararN8n('solicitud-revision', {
        ...dto,
        ticketId: ticket.ticketId,
        origen: dto.origen ?? 'mobile',
      });
    }

    return {
      ticketId: ticket.ticketId,
      mensaje: `Reporte recibido para ${dto.activoCodigo}`,
    };
  }

  async solicitudRevisionN8n(dto: SolicitudRevisionN8nDto) {
    const activo = await this.ms1Client.buscarActivoPorCodigo(dto.codigoActivo);
    if (!activo) {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Activo no existe en MS1');
      return {
        recibido: true,
        encontrado: false,
        autorizado: false,
        codigoActivo: dto.codigoActivo,
        from: dto.from,
        mensaje: `Codigo de activo no encontrado: ${dto.codigoActivo}`,
      };
    }

    if (!this.ms1Client.telefonoTieneAccesoActivo(activo, dto.from)) {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'WhatsApp no autorizado para activo');
      return {
        recibido: true,
        encontrado: true,
        autorizado: false,
        from: dto.from,
        codigoActivo: activo.codigo,
        activoId: activo.id,
        mensaje: `El numero ${dto.from} no esta autorizado para el activo ${activo.codigo}`,
      };
    }

    if (!activo.responsableEmail) {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Responsable sin email');
      return {
        recibido: true,
        encontrado: true,
        autorizado: false,
        from: dto.from,
        codigoActivo: activo.codigo,
        activoId: activo.id,
        mensaje: `El activo ${activo.codigo} no tiene correo de responsable registrado`,
      };
    }

    const ticket = await this.ms1Client.crearTicketRevision({
      activoId: activo.id,
      solicitadoPorWhatsApp: dto.from,
      motivo: dto.text,
    });
    const documentos = await this.ms2Client.obtenerDocumentos(activo.id);

    this.flujosService.marcar('solicitud-revision', 'COMPLETADO', `Ticket ${ticket.ticketId}`);
    return {
      recibido: true,
      encontrado: true,
      autorizado: true,
      from: dto.from,
      codigoActivo: activo.codigo,
      activoId: activo.id,
      activoNombre: activo.nombre,
      activoEstado: activo.estado ?? 'SIN_ESTADO',
      responsableEmail: activo.responsableEmail,
      responsablePhone: activo.responsablePhone,
      ticketId: ticket.ticketId,
      documentosEncontrados: documentos.length,
      mensajeOriginal: dto.text,
    };
  }
}
