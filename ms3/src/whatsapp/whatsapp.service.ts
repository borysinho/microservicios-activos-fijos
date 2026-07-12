import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppConfig } from '../config/app-config.service';
import { FlujosService } from '../flujos/flujos.service';
import { Ms1ClientService } from '../ms1-client/ms1-client.service';
import { Ms2ClientService } from '../ms2-client/ms2-client.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ResultadoSolicitudRevision, WhatsappMensajeEntrante } from './dto';

const CODIGO_ACTIVO_REGEX = /[A-Z]{2,4}-\d{4}-\d+/i;

@Injectable()
export class WhatsappService {
  constructor(
    private readonly config: AppConfig,
    private readonly flujosService: FlujosService,
    private readonly ms1Client: Ms1ClientService,
    private readonly ms2Client: Ms2ClientService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  verificarWebhook(mode?: string, token?: string, challenge?: string): string {
    if (mode === 'subscribe' && token === this.config.whatsappVerifyToken && challenge) {
      return challenge;
    }
    throw new ForbiddenException('Token de verificacion invalido');
  }

  validarFirma(signature: string | undefined, rawBody?: Buffer): void {
    if (this.config.whatsappProvider === 'waha') {
      return;
    }

    if (!this.config.whatsappAppSecret) {
      return;
    }
    if (!signature || !rawBody) {
      throw new ForbiddenException('Firma de WhatsApp ausente');
    }

    const expected = `sha256=${createHmac('sha256', this.config.whatsappAppSecret)
      .update(rawBody)
      .digest('hex')}`;

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new ForbiddenException('Firma de WhatsApp invalida');
    }
  }

  extraerMensaje(payload: any): WhatsappMensajeEntrante | null {
    if (payload?.event === 'message' && payload?.payload) {
      if (payload.payload.fromMe) {
        return null;
      }

      return {
        from: payload.payload.from,
        text: payload.payload.body?.trim() ?? '',
        timestamp: String(payload.payload.timestamp ?? ''),
      };
    }

    if (payload?.From && payload?.Body) {
      return {
        from: payload.From,
        text: String(payload.Body).trim(),
        timestamp: String(payload.MessageSid ?? payload.SmsMessageSid ?? ''),
      };
    }

    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) {
      return null;
    }

    return {
      from: message.from,
      text: message.text?.body?.trim() ?? '',
      timestamp: message.timestamp,
    };
  }

  async procesarWebhook(payload: any, signature?: string, rawBody?: Buffer): Promise<ResultadoSolicitudRevision> {
    this.validarFirma(signature, rawBody);
    const mensaje = this.extraerMensaje(payload);
    if (!mensaje) {
      return { recibido: true, mensaje: 'Payload sin mensaje procesable' };
    }
    return this.procesarSolicitudRevision(mensaje);
  }

  async procesarSolicitudRevision(mensaje: WhatsappMensajeEntrante): Promise<ResultadoSolicitudRevision> {
    await this.flujosService.dispararN8n('solicitud-revision', mensaje);
    this.flujosService.marcar('solicitud-revision', 'EN_PROCESO', 'Mensaje WhatsApp recibido');

    if (!mensaje.text) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'Solo acepto texto con el codigo del activo, por ejemplo EQ-2024-005 o ACT-2024-001.',
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Mensaje vacio o no soportado');
      return { recibido: true, mensaje: 'Mensaje vacio o no soportado' };
    }

    const codigoActivo = mensaje.text.match(CODIGO_ACTIVO_REGEX)?.[0]?.toUpperCase();
    if (!codigoActivo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'No encontre un codigo de activo. Envia un codigo con formato EQ-2024-005 o ACT-2024-001.',
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Codigo de activo no encontrado');
      return { recibido: true, mensaje: 'Codigo de activo no encontrado' };
    }

    const activo = await this.ms1Client.buscarActivoPorCodigo(codigoActivo);
    if (!activo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `Codigo de activo no encontrado: ${codigoActivo}.`,
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Activo no existe en MS1');
      return { recibido: true, codigoActivo, mensaje: 'Activo no encontrado' };
    }

    const ticket = await this.ms1Client.crearTicketRevision({
      activoId: activo.id,
      solicitadoPorWhatsApp: mensaje.from,
      motivo: mensaje.text,
    });
    const documentos = await this.ms2Client.obtenerDocumentos(activo.id);
    const responsableEmail = activo.responsableEmail ?? 'responsable.area@activos.local';

    await this.notificacionesService.enviarEmail({
      to: responsableEmail,
      subject: `Solicitud de revision de activo ${activo.codigo}`,
      text: [
        'Se recibio una solicitud de revision via WhatsApp.',
        `Activo: ${activo.codigo} - ${activo.nombre}`,
        `Estado actual: ${activo.estado ?? 'SIN_ESTADO'}`,
        `Solicitante: ${mensaje.from}`,
        `Mensaje: ${mensaje.text}`,
        `Documentos asociados: ${documentos.length}`,
        `Referencia: ${ticket.ticketId}`,
      ].join('\n'),
    });

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      `Tu solicitud de revision para el activo ${activo.codigo} fue recibida. Referencia: ${ticket.ticketId}.`,
    );

    this.flujosService.marcar('solicitud-revision', 'COMPLETADO', `Ticket ${ticket.ticketId}`);
    return {
      recibido: true,
      codigoActivo,
      ticketId: ticket.ticketId,
      documentosEncontrados: documentos.length,
      mensaje: 'Solicitud de revision procesada',
    };
  }
}
