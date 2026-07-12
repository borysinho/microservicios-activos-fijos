import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppConfig } from '../config/app-config.service';
import { FlujosService } from '../flujos/flujos.service';
import { Ms1ClientService } from '../ms1-client/ms1-client.service';
import { Ms2ClientService } from '../ms2-client/ms2-client.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ResultadoSolicitudRevision, WhatsappMensajeEntrante } from './dto';
import { DecisionAgenteWhatsapp, IntencionWhatsapp, WhatsappLlmAgentService } from './whatsapp-llm-agent.service';

const CODIGO_ACTIVO_REGEX = /[A-Z]{2,4}-\d{4}-\d+/i;
const OPERACION_WEB_MOVIL_REGEX =
  /\b(?:dar\s+de\s+baja|baja\s+definitiva|trasladar|traslado|transferir|transferencia|asignar|reasignar|crear\s+activo|registrar\s+activo|alta\s+de\s+activo|editar|modificar|actualizar|cambiar\s+valor|depreciar|depreciacion|subir\s+documento|cargar\s+documento|adjuntar|descargar\s+documento|eliminar\s+documento|diagnosticar|diagnostico|camara|foto|imagen|programar|agendar|usuario|usuarios|rol|roles|permiso|permisos|dashboard|bi|indicador|kpi)\b/i;
const AYUDA_REGEX = /\b(?:ayuda|menu|opciones|comandos|hola|buenas)\b/i;
const CONSULTA_REGEX =
  /\b(?:consultar|consulta|estado|ubicacion|ubicado|donde|informacion|info|ver|responsable)\b/i;
const SOLICITUD_REVISION_REGEX =
  /\b(?:revision|revisar|mantenimiento|falla|fallo|problema|incidente|averia|danado|roto|no\s+enciende|defecto|soporte)\b/i;

@Injectable()
export class WhatsappService {
  constructor(
    private readonly config: AppConfig,
    private readonly flujosService: FlujosService,
    private readonly ms1Client: Ms1ClientService,
    private readonly ms2Client: Ms2ClientService,
    private readonly notificacionesService: NotificacionesService,
    private readonly llmAgent: WhatsappLlmAgentService,
  ) {}

  verificarWebhook(mode?: string, token?: string, challenge?: string): string {
    if (mode === 'subscribe' && token === this.config.whatsappVerifyToken && challenge) {
      return challenge;
    }
    throw new ForbiddenException('Token de verificacion invalido');
  }

  validarFirma(signature: string | undefined, rawBody?: Buffer): void {
    if (this.config.whatsappProvider === 'waha' || this.config.whatsappProvider === 'twilio') {
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
    return this.procesarMensajeAgente(mensaje);
  }

  async procesarMensajeAgente(mensaje: WhatsappMensajeEntrante): Promise<ResultadoSolicitudRevision> {
    const decision = await this.analizarIntencionNegocio(mensaje.text);

    if (decision.intencion === 'AYUDA') {
      await this.notificacionesService.enviarWhatsAppTexto(mensaje.from, this.mensajeAyuda());
      return { recibido: true, intencion: decision.intencion, mensaje: 'Ayuda enviada' };
    }

    if (decision.intencion === 'NO_PERMITIDA') {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Operacion no permitida por chat');
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        [
          'No puedo realizar esa operacion por WhatsApp.',
          'Por seguridad debe hacerse desde la aplicacion web o movil, con autenticacion y validaciones completas.',
          this.mensajeAyuda(),
        ].join('\n'),
      );
      return {
        recibido: true,
        intencion: decision.intencion,
        codigoActivo: decision.codigoActivo,
        mensaje: 'Operacion no permitida por chat',
      };
    }

    if (decision.intencion === 'NO_ENTENDIDA') {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Intencion no entendida');
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        [
          'No pude identificar una operacion permitida para este chat.',
          this.mensajeAyuda(),
        ].join('\n'),
      );
      return {
        recibido: true,
        intencion: decision.intencion,
        mensaje: 'Intencion no entendida',
      };
    }

    if (decision.intencion === 'CONSULTAR_ACTIVO') {
      return this.consultarActivoPorChat(mensaje, decision.codigoActivo!);
    }

    if (this.config.n8nWebhookUrl) {
      return this.procesarSolicitudRevisionConMs4(mensaje, decision.codigoActivo);
    }
    return this.procesarSolicitudRevision(mensaje);
  }

  async analizarIntencionNegocio(texto?: string): Promise<DecisionAgenteWhatsapp> {
    const textoNormalizado = this.normalizarTexto(texto);
    const codigoActivo = texto?.match(CODIGO_ACTIVO_REGEX)?.[0]?.toUpperCase();

    if (!textoNormalizado) {
      return { intencion: 'NO_ENTENDIDA' };
    }

    if (OPERACION_WEB_MOVIL_REGEX.test(textoNormalizado)) {
      return { intencion: 'NO_PERMITIDA', codigoActivo };
    }

    const decisionLlm = await this.llmAgent.clasificarMensaje(texto ?? '');
    const decisionSegura = this.sanitizarDecisionLlm(decisionLlm, codigoActivo);
    if (decisionSegura) {
      return decisionSegura;
    }

    if (AYUDA_REGEX.test(textoNormalizado)) {
      return { intencion: 'AYUDA', codigoActivo };
    }

    if (!codigoActivo) {
      return { intencion: 'NO_ENTENDIDA' };
    }

    if (CONSULTA_REGEX.test(textoNormalizado)) {
      return { intencion: 'CONSULTAR_ACTIVO', codigoActivo };
    }

    if (SOLICITUD_REVISION_REGEX.test(textoNormalizado)) {
      return { intencion: 'SOLICITAR_REVISION', codigoActivo };
    }

    if (textoNormalizado.trim() === codigoActivo.toLowerCase()) {
      return { intencion: 'CONSULTAR_ACTIVO', codigoActivo };
    }

    return { intencion: 'NO_ENTENDIDA', codigoActivo };
  }

  private sanitizarDecisionLlm(
    decision: DecisionAgenteWhatsapp | null,
    codigoDetectado?: string,
  ): DecisionAgenteWhatsapp | null {
    if (!decision) {
      return null;
    }

    const codigoActivo = (codigoDetectado ?? decision.codigoActivo)?.match(CODIGO_ACTIVO_REGEX)?.[0]?.toUpperCase();
    const intencion = this.intencionPermitida(decision.intencion) ? decision.intencion : 'NO_ENTENDIDA';

    if ((intencion === 'CONSULTAR_ACTIVO' || intencion === 'SOLICITAR_REVISION') && !codigoActivo) {
      return { intencion: 'NO_ENTENDIDA' };
    }

    return { intencion, codigoActivo };
  }

  private intencionPermitida(intencion: IntencionWhatsapp): boolean {
    return (
      intencion === 'AYUDA' ||
      intencion === 'CONSULTAR_ACTIVO' ||
      intencion === 'SOLICITAR_REVISION' ||
      intencion === 'NO_PERMITIDA' ||
      intencion === 'NO_ENTENDIDA'
    );
  }

  async procesarSolicitudRevisionConMs4(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo?: string,
  ): Promise<ResultadoSolicitudRevision> {
    this.flujosService.marcar('solicitud-revision', 'EN_PROCESO', 'Mensaje WhatsApp recibido');

    if (!codigoActivo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'No encontre un codigo de activo. Envia un codigo con formato EQ-2024-005 o ACT-2024-001.',
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Codigo de activo no encontrado');
      return { recibido: true, mensaje: 'Codigo de activo no encontrado' };
    }

    const activo = await this.ms1Client.buscarActivoPorCodigo(codigoActivo);
    const autorizacion = await this.validarAccesoActivoPorWhatsapp(mensaje.from, codigoActivo, activo);
    if (!autorizacion.autorizado) {
      return autorizacion.resultado;
    }

    const disparado = await this.flujosService.dispararN8n('solicitud-revision', {
      ...mensaje,
      activoId: activo!.id,
      activoNombre: activo!.nombre,
      activoEstado: activo!.estado,
      codigoActivo: activo!.codigo,
      responsableEmail: activo!.responsableEmail,
      responsablePhone: activo!.responsablePhone,
      intencion: 'SOLICITAR_REVISION',
      origen: 'whatsapp',
      proveedor: this.config.whatsappProvider || 'desconocido',
      recibidoEn: new Date().toISOString(),
    });

    if (!disparado) {
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'MS4/N8N no disponible');
      return { recibido: true, mensaje: 'No se pudo iniciar el flujo MS4/N8N' };
    }

    return {
      recibido: true,
      codigoActivo: activo!.codigo,
      intencion: 'SOLICITAR_REVISION',
      mensaje: 'Solicitud enviada a MS4/N8N',
    };
  }

  async consultarActivoPorChat(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
  ): Promise<ResultadoSolicitudRevision> {
    this.flujosService.marcar('solicitud-revision', 'EN_PROCESO', 'Consulta de activo por chat');

    const activo = await this.ms1Client.buscarActivoPorCodigo(codigoActivo);
    if (!activo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `Codigo de activo no encontrado: ${codigoActivo}.`,
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Activo no existe en MS1');
      return {
        recibido: true,
        intencion: 'CONSULTAR_ACTIVO',
        codigoActivo,
        mensaje: 'Activo no encontrado',
      };
    }

    const autorizacion = await this.validarAccesoActivoPorWhatsapp(mensaje.from, codigoActivo, activo);
    if (!autorizacion.autorizado) {
      return autorizacion.resultado;
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        `Activo: ${activo.codigo} - ${activo.nombre}`,
        `Estado: ${activo.estado ?? 'SIN_ESTADO'}`,
        `Area: ${activo.areaActual?.nombre ?? 'No registrada'}`,
        'Para solicitar revision, escribe: revisar ' + activo.codigo + ' y el motivo.',
      ].join('\n'),
    );

    this.flujosService.marcar('solicitud-revision', 'COMPLETADO', `Consulta ${activo.codigo}`);
    return {
      recibido: true,
      intencion: 'CONSULTAR_ACTIVO',
      codigoActivo: activo.codigo,
      mensaje: 'Consulta de activo procesada',
    };
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

    const autorizacion = await this.validarAccesoActivoPorWhatsapp(mensaje.from, codigoActivo, activo);
    if (!autorizacion.autorizado) {
      return autorizacion.resultado;
    }

    const ticket = await this.ms1Client.crearTicketRevision({
      activoId: activo.id,
      solicitadoPorWhatsApp: mensaje.from,
      motivo: mensaje.text,
    });
    const documentos = await this.ms2Client.obtenerDocumentos(activo.id);
    const responsableEmail = activo.responsableEmail;
    if (!responsableEmail) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `El activo ${activo.codigo} no tiene correo de responsable registrado.`,
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Responsable sin email');
      return { recibido: true, codigoActivo: activo.codigo, mensaje: 'Responsable sin email' };
    }

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
      intencion: 'SOLICITAR_REVISION',
      mensaje: 'Solicitud de revision procesada',
    };
  }

  private normalizarTexto(texto?: string): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async validarAccesoActivoPorWhatsapp(
    telefonoOrigen: string,
    codigoActivo: string,
    activo: Awaited<ReturnType<Ms1ClientService['buscarActivoPorCodigo']>>,
  ): Promise<
    | { autorizado: true }
    | { autorizado: false; resultado: ResultadoSolicitudRevision }
  > {
    if (!activo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        telefonoOrigen,
        `Codigo de activo no encontrado: ${codigoActivo}.`,
      );
      this.flujosService.marcar('solicitud-revision', 'ERROR', 'Activo no existe en MS1');
      return {
        autorizado: false,
        resultado: {
          recibido: true,
          codigoActivo,
          mensaje: 'Activo no encontrado',
        },
      };
    }

    if (this.ms1Client.telefonoTieneAccesoActivo(activo, telefonoOrigen)) {
      return { autorizado: true };
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      telefonoOrigen,
      [
        'No puedo procesar la solicitud desde este numero.',
        `El activo ${activo.codigo} solo puede consultarse o reportarse desde el WhatsApp del responsable asignado.`,
      ].join('\n'),
    );
    this.flujosService.marcar('solicitud-revision', 'ERROR', 'WhatsApp no autorizado para activo');
    return {
      autorizado: false,
      resultado: {
        recibido: true,
        codigoActivo: activo.codigo,
        intencion: 'NO_AUTORIZADA',
        mensaje: 'WhatsApp no autorizado para activo',
      },
    };
  }

  private mensajeAyuda(): string {
    return [
      'Operaciones permitidas por WhatsApp:',
      '- Consultar estado/ubicacion: consultar ACT-2024-001',
      '- Solicitar revision o mantenimiento: revisar ACT-2024-001 no enciende',
      'Altas, bajas, traslados, asignaciones, documentos, diagnostico con camara y administracion se realizan solo desde web o movil.',
    ].join('\n');
  }
}
