import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppConfig } from '../config/app-config.service';
import { FlujosService } from '../flujos/flujos.service';
import { ActivoMs1, Ms1ClientService } from '../ms1-client/ms1-client.service';
import { Ms2ClientService } from '../ms2-client/ms2-client.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ResultadoSolicitudRevision, WhatsappMensajeEntrante } from './dto';
import { DecisionAgenteWhatsapp, IntencionWhatsapp, WhatsappLlmAgentService } from './whatsapp-llm-agent.service';

const CODIGO_ACTIVO_REGEX = /[A-Z]{2,4}-\d{4}-\d+/i;
const DOCUMENTO_ID_REGEX = /\b(?:doc-[a-z0-9-]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
const OPERACION_WEB_MOVIL_REGEX =
  /\b(?:dar\s+de\s+baja|baja\s+definitiva|asignar|reasignar|crear\s+activo|registrar\s+activo|alta\s+de\s+activo|editar|modificar|actualizar|cambiar\s+valor|cambiar\s+vida|cambiar\s+categoria|cambiar\s+metodo|subir\s+documento|cargar\s+documento|eliminar\s+documento|programar|agendar|usuario|usuarios|rol|roles|permiso|permisos|dashboard|bi|indicador|kpi|administrar|configurar)\b/i;
const AYUDA_REGEX = /\b(?:ayuda|menu|opciones|comandos|hola|buenas)\b/i;
const LISTAR_ACTIVOS_REGEX = /\b(?:mis\s+activos|listar\s+activos|lista\s+de\s+activos|activos\s+asignados|que\s+activos\s+tengo)\b/i;
const CONSULTA_REGEX =
  /\b(?:consultar|consulta|estado|ubicacion|ubicado|donde|informacion|info|ver|responsable)\b/i;
const DOCUMENTOS_REGEX = /\b(?:documento|documentos|documentacion|factura|garantia|contrato|manual|poliza)\b/i;
const ENLACE_DOCUMENTO_REGEX = /\b(?:enlace|link|url|descargar|descarga)\b/i;
const DEPRECIACION_REGEX = /\b(?:depreciacion|valor\s+libros|valor\s+actual|vida\s+util|valor\s+depreciado)\b/i;
const SOLICITUD_REVISION_REGEX =
  /\b(?:revision|revisar|mantenimiento|falla|fallo|problema|incidente|averia|danado|roto|no\s+enciende|defecto|soporte)\b/i;
const INCIDENTE_REGEX =
  /\b(?:perdida|perdido|robo|robado|hurto|dano|danado|grave|golpe|accidente|observacion|requiere\s+mantenimiento|mal\s+estado|foto|imagen|evidencia)\b/i;
const TRASLADO_REGEX = /\b(?:solicitar\s+traslado|pedir\s+traslado|trasladar|traslado|transferir|transferencia)\b/i;
const CONFIRMAR_RECEPCION_REGEX = /\b(?:confirmo|confirmar|acepto|recibido|recepcion|recibi)\b/i;

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
        mediaUrls: this.extraerMediaUrlsWaha(payload.payload),
        mediaTypes: this.extraerMediaTypesWaha(payload.payload),
      };
    }

    if (payload?.From && (payload?.Body || Number(payload?.NumMedia ?? 0) > 0)) {
      return {
        from: payload.From,
        text: String(payload.Body ?? '').trim(),
        timestamp: String(payload.MessageSid ?? payload.SmsMessageSid ?? ''),
        mediaUrls: this.extraerMediaUrlsTwilio(payload),
        mediaTypes: this.extraerMediaTypesTwilio(payload),
      };
    }

    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) {
      return null;
    }

    return {
      from: message.from,
      text: (message.text?.body ?? message.image?.caption ?? message.document?.caption ?? '').trim(),
      timestamp: message.timestamp,
      mediaUrls: message.image?.id ? [`meta-media:${message.image.id}`] : undefined,
      mediaTypes: message.image?.mime_type ? [message.image.mime_type] : undefined,
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

    if (decision.intencion === 'LISTAR_ACTIVOS') {
      return this.listarActivosAsociados(mensaje);
    }

    if (decision.intencion === 'CONSULTAR_ACTIVO') {
      return this.consultarActivoPorChat(mensaje, decision.codigoActivo!);
    }

    if (decision.intencion === 'CONSULTAR_DOCUMENTOS') {
      return this.consultarDocumentosPorChat(mensaje, decision.codigoActivo!);
    }

    if (decision.intencion === 'SOLICITAR_ENLACE_DOCUMENTO') {
      return this.generarEnlaceDocumentoPorChat(mensaje, decision.codigoActivo!);
    }

    if (decision.intencion === 'CONSULTAR_DEPRECIACION') {
      return this.consultarDepreciacionPorChat(mensaje, decision.codigoActivo!);
    }

    if (decision.intencion === 'REPORTAR_INCIDENTE') {
      return this.registrarSolicitudOperativa(mensaje, decision.codigoActivo!, 'REPORTAR_INCIDENTE');
    }

    if (decision.intencion === 'SOLICITAR_TRASLADO') {
      return this.registrarSolicitudOperativa(mensaje, decision.codigoActivo!, 'SOLICITAR_TRASLADO');
    }

    if (decision.intencion === 'CONFIRMAR_RECEPCION') {
      return this.confirmarRecepcionPorChat(mensaje, decision.codigoActivo!);
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

    if (LISTAR_ACTIVOS_REGEX.test(textoNormalizado)) {
      return { intencion: 'LISTAR_ACTIVOS' };
    }

    if (!codigoActivo) {
      return { intencion: 'NO_ENTENDIDA' };
    }

    if (CONFIRMAR_RECEPCION_REGEX.test(textoNormalizado) && /recepcion|recibi|recibido/.test(textoNormalizado)) {
      return { intencion: 'CONFIRMAR_RECEPCION', codigoActivo };
    }

    if (TRASLADO_REGEX.test(textoNormalizado)) {
      return { intencion: 'SOLICITAR_TRASLADO', codigoActivo };
    }

    if (ENLACE_DOCUMENTO_REGEX.test(textoNormalizado) && DOCUMENTOS_REGEX.test(textoNormalizado)) {
      return { intencion: 'SOLICITAR_ENLACE_DOCUMENTO', codigoActivo };
    }

    if (DOCUMENTOS_REGEX.test(textoNormalizado)) {
      return { intencion: 'CONSULTAR_DOCUMENTOS', codigoActivo };
    }

    if (DEPRECIACION_REGEX.test(textoNormalizado)) {
      return { intencion: 'CONSULTAR_DEPRECIACION', codigoActivo };
    }

    if (INCIDENTE_REGEX.test(textoNormalizado)) {
      return { intencion: 'REPORTAR_INCIDENTE', codigoActivo };
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

    if (this.requiereCodigoActivo(intencion) && !codigoActivo) {
      return { intencion: 'NO_ENTENDIDA' };
    }

    return { intencion, codigoActivo };
  }

  private intencionPermitida(intencion: IntencionWhatsapp): boolean {
    return (
      intencion === 'AYUDA' ||
      intencion === 'LISTAR_ACTIVOS' ||
      intencion === 'CONSULTAR_ACTIVO' ||
      intencion === 'CONSULTAR_DOCUMENTOS' ||
      intencion === 'SOLICITAR_ENLACE_DOCUMENTO' ||
      intencion === 'CONSULTAR_DEPRECIACION' ||
      intencion === 'SOLICITAR_REVISION' ||
      intencion === 'REPORTAR_INCIDENTE' ||
      intencion === 'SOLICITAR_TRASLADO' ||
      intencion === 'CONFIRMAR_RECEPCION' ||
      intencion === 'NO_PERMITIDA' ||
      intencion === 'NO_ENTENDIDA'
    );
  }

  private requiereCodigoActivo(intencion: IntencionWhatsapp): boolean {
    return (
      intencion === 'CONSULTAR_ACTIVO' ||
      intencion === 'CONSULTAR_DOCUMENTOS' ||
      intencion === 'SOLICITAR_ENLACE_DOCUMENTO' ||
      intencion === 'CONSULTAR_DEPRECIACION' ||
      intencion === 'SOLICITAR_REVISION' ||
      intencion === 'REPORTAR_INCIDENTE' ||
      intencion === 'SOLICITAR_TRASLADO' ||
      intencion === 'CONFIRMAR_RECEPCION'
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
        `Ubicacion: ${activo.ubicacion ?? 'No registrada'}`,
        `Responsable: ${this.responsableActivo(activo)}`,
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

  async listarActivosAsociados(mensaje: WhatsappMensajeEntrante): Promise<ResultadoSolicitudRevision> {
    this.flujosService.marcar('solicitud-revision', 'EN_PROCESO', 'Listado de activos asociados por chat');

    const activos = await this.ms1Client.listarActivosPorTelefono(mensaje.from);
    if (activos.length === 0) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'No encontre activos asociados a este numero de WhatsApp.',
      );
      this.flujosService.marcar('solicitud-revision', 'COMPLETADO', 'Sin activos asociados');
      return {
        recibido: true,
        intencion: 'LISTAR_ACTIVOS',
        mensaje: 'Sin activos asociados',
      };
    }

    const lineas = activos.slice(0, 10).map((activo) =>
      [
        `${activo.codigo} - ${activo.nombre}`,
        `Estado: ${activo.estado ?? 'SIN_ESTADO'}`,
        `Area: ${activo.areaActual?.nombre ?? 'No registrada'}`,
      ].join(' | '),
    );

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        'Activos asociados a tu WhatsApp:',
        ...lineas,
        activos.length > 10 ? `Mostrando 10 de ${activos.length}. Usa el codigo para consultar detalle.` : '',
      ].filter(Boolean).join('\n'),
    );

    this.flujosService.marcar('solicitud-revision', 'COMPLETADO', `Activos asociados: ${activos.length}`);
    return {
      recibido: true,
      intencion: 'LISTAR_ACTIVOS',
      mensaje: `Activos asociados encontrados: ${activos.length}`,
    };
  }

  async consultarDocumentosPorChat(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
  ): Promise<ResultadoSolicitudRevision> {
    const activo = await this.obtenerActivoAutorizado(mensaje, codigoActivo, 'CONSULTAR_DOCUMENTOS');
    if (!activo.autorizado) {
      return activo.resultado;
    }

    const documentos = await this.ms2Client.obtenerDocumentos(activo.activo.id);
    const activos = documentos.filter((doc) => doc.activo !== false);
    if (activos.length === 0) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `El activo ${activo.activo.codigo} no tiene documentos activos registrados.`,
      );
      return {
        recibido: true,
        intencion: 'CONSULTAR_DOCUMENTOS',
        codigoActivo: activo.activo.codigo,
        documentosEncontrados: 0,
        mensaje: 'Sin documentos activos',
      };
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        `Documentos de ${activo.activo.codigo}:`,
        ...activos.slice(0, 8).map((doc) =>
          `${doc.documentoId ?? doc.id} | ${doc.tipo ?? 'TIPO'} | ${doc.nombre ?? 'Sin nombre'} | v${doc.version ?? 1}`,
        ),
        'Para enlace temporal: enlace documento ' + activo.activo.codigo + ' <documentoId>',
      ].join('\n'),
    );

    return {
      recibido: true,
      intencion: 'CONSULTAR_DOCUMENTOS',
      codigoActivo: activo.activo.codigo,
      documentosEncontrados: activos.length,
      mensaje: 'Documentos consultados',
    };
  }

  async generarEnlaceDocumentoPorChat(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
  ): Promise<ResultadoSolicitudRevision> {
    const documentoId = mensaje.text.match(DOCUMENTO_ID_REGEX)?.[0];
    if (!documentoId) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'Indica el documentoId. Ejemplo: enlace documento ACT-2024-001 doc-123.',
      );
      return {
        recibido: true,
        intencion: 'SOLICITAR_ENLACE_DOCUMENTO',
        codigoActivo,
        mensaje: 'Documento no indicado',
      };
    }

    const activo = await this.obtenerActivoAutorizado(mensaje, codigoActivo, 'SOLICITAR_ENLACE_DOCUMENTO');
    if (!activo.autorizado) {
      return activo.resultado;
    }

    const documentos = await this.ms2Client.obtenerDocumentos(activo.activo.id);
    const documentoPerteneceActivo = documentos.some((doc) =>
      [doc.documentoId, doc.id].filter(Boolean).includes(documentoId),
    );
    if (!documentoPerteneceActivo) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `No encontre el documento ${documentoId} asociado al activo ${activo.activo.codigo}.`,
      );
      return {
        recibido: true,
        intencion: 'SOLICITAR_ENLACE_DOCUMENTO',
        codigoActivo: activo.activo.codigo,
        mensaje: 'Documento no asociado al activo',
      };
    }

    const enlace = await this.ms2Client.obtenerUrlDocumento(documentoId);
    if (!enlace) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        'No pude generar el enlace temporal del documento en este momento.',
      );
      return {
        recibido: true,
        intencion: 'SOLICITAR_ENLACE_DOCUMENTO',
        codigoActivo: activo.activo.codigo,
        mensaje: 'Enlace no generado',
      };
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        `Enlace temporal para ${documentoId}:`,
        enlace.url,
        `Expira en ${Math.round(enlace.expiraEn / 60)} minutos. El acceso queda registrado en auditoria documental.`,
      ].join('\n'),
    );

    return {
      recibido: true,
      intencion: 'SOLICITAR_ENLACE_DOCUMENTO',
      codigoActivo: activo.activo.codigo,
      mensaje: 'Enlace temporal generado',
    };
  }

  async consultarDepreciacionPorChat(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
  ): Promise<ResultadoSolicitudRevision> {
    const activo = await this.obtenerActivoAutorizado(mensaje, codigoActivo, 'CONSULTAR_DEPRECIACION');
    if (!activo.autorizado) {
      return activo.resultado;
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        `Depreciacion de ${activo.activo.codigo} - ${activo.activo.nombre}`,
        `Valor original: ${this.formatearMonto(activo.activo.valorAdquisicion)}`,
        `Valor en libros: ${this.formatearMonto(activo.activo.valorLibros)}`,
        `Vida util: ${activo.activo.vidaUtilAnios ?? 'No registrada'} anios`,
        `Metodo: ${activo.activo.categoria?.metodoDepreciacion ?? 'No registrado'}`,
        'Los parametros contables solo se modifican desde la aplicacion web.',
      ].join('\n'),
    );

    return {
      recibido: true,
      intencion: 'CONSULTAR_DEPRECIACION',
      codigoActivo: activo.activo.codigo,
      mensaje: 'Depreciacion consultada',
    };
  }

  async registrarSolicitudOperativa(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
    intencion: 'REPORTAR_INCIDENTE' | 'SOLICITAR_TRASLADO',
  ): Promise<ResultadoSolicitudRevision> {
    const activo = await this.obtenerActivoAutorizado(mensaje, codigoActivo, intencion);
    if (!activo.autorizado) {
      return activo.resultado;
    }

    const etiqueta = intencion === 'REPORTAR_INCIDENTE' ? 'incidente' : 'traslado';
    const ticket = await this.ms1Client.crearTicketRevision({
      activoId: activo.activo.id,
      solicitadoPorWhatsApp: mensaje.from,
      motivo: [
        `[WhatsApp:${intencion}] ${mensaje.text}`,
        `Adjuntos recibidos: ${mensaje.mediaUrls?.length ?? 0}`,
      ].join('\n'),
    });

    if (activo.activo.responsableEmail) {
      await this.notificacionesService.enviarEmail({
        to: activo.activo.responsableEmail,
        subject: `Solicitud de ${etiqueta} para ${activo.activo.codigo}`,
        text: [
          `Se recibio una solicitud de ${etiqueta} por WhatsApp.`,
          `Activo: ${activo.activo.codigo} - ${activo.activo.nombre}`,
          `Solicitante: ${mensaje.from}`,
          `Mensaje: ${mensaje.text}`,
          `Adjuntos WhatsApp: ${mensaje.mediaUrls?.length ?? 0}`,
          `Referencia: ${ticket.ticketId}`,
        ].join('\n'),
      });
    }

    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      [
        `Solicitud de ${etiqueta} registrada para ${activo.activo.codigo}.`,
        `Referencia: ${ticket.ticketId}.`,
        intencion === 'SOLICITAR_TRASLADO'
          ? 'La aprobacion y ejecucion del traslado se revisan desde la aplicacion web.'
          : 'Si adjuntaste imagen, queda asociada como evidencia del reporte operativo.',
      ].join('\n'),
    );

    return {
      recibido: true,
      intencion,
      codigoActivo: activo.activo.codigo,
      ticketId: ticket.ticketId,
      mensaje: `Solicitud de ${etiqueta} registrada`,
    };
  }

  async confirmarRecepcionPorChat(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
  ): Promise<ResultadoSolicitudRevision> {
    const activo = await this.obtenerActivoAutorizado(mensaje, codigoActivo, 'CONFIRMAR_RECEPCION');
    if (!activo.autorizado) {
      return activo.resultado;
    }

    const trasladoPendiente = (activo.activo.traslados ?? []).find((traslado) => !traslado.recepcionConfirmada);
    if (!trasladoPendiente) {
      await this.notificacionesService.enviarWhatsAppTexto(
        mensaje.from,
        `El activo ${activo.activo.codigo} no tiene una recepcion de traslado pendiente.`,
      );
      return {
        recibido: true,
        intencion: 'CONFIRMAR_RECEPCION',
        codigoActivo: activo.activo.codigo,
        mensaje: 'Sin recepcion pendiente',
      };
    }

    const confirmado = await this.ms1Client.confirmarRecepcionTraslado(trasladoPendiente.id);
    await this.notificacionesService.enviarWhatsAppTexto(
      mensaje.from,
      `Recepcion confirmada para ${activo.activo.codigo}. Traslado: ${confirmado.id}.`,
    );

    return {
      recibido: true,
      intencion: 'CONFIRMAR_RECEPCION',
      codigoActivo: activo.activo.codigo,
      mensaje: 'Recepcion confirmada',
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

  private async obtenerActivoAutorizado(
    mensaje: WhatsappMensajeEntrante,
    codigoActivo: string,
    intencion: string,
  ): Promise<
    | { autorizado: true; activo: ActivoMs1 }
    | { autorizado: false; resultado: ResultadoSolicitudRevision }
  > {
    const activo = await this.ms1Client.buscarActivoPorCodigo(codigoActivo);
    const autorizacion = await this.validarAccesoActivoPorWhatsapp(mensaje.from, codigoActivo, activo, intencion);
    if (!autorizacion.autorizado) {
      return autorizacion;
    }

    return { autorizado: true, activo: activo! };
  }

  private normalizarTexto(texto?: string): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private extraerMediaUrlsTwilio(payload: any): string[] | undefined {
    const total = Number(payload?.NumMedia ?? 0);
    const urls = Array.from({ length: total })
      .map((_, index) => payload?.[`MediaUrl${index}`])
      .filter((url): url is string => typeof url === 'string' && Boolean(url.trim()));
    return urls.length ? urls : undefined;
  }

  private extraerMediaTypesTwilio(payload: any): string[] | undefined {
    const total = Number(payload?.NumMedia ?? 0);
    const types = Array.from({ length: total })
      .map((_, index) => payload?.[`MediaContentType${index}`])
      .filter((type): type is string => typeof type === 'string' && Boolean(type.trim()));
    return types.length ? types : undefined;
  }

  private extraerMediaUrlsWaha(payload: any): string[] | undefined {
    const url = payload?.media?.url ?? payload?.mediaUrl ?? payload?.downloadUrl;
    return typeof url === 'string' && url.trim() ? [url] : undefined;
  }

  private extraerMediaTypesWaha(payload: any): string[] | undefined {
    const mime = payload?.media?.mimetype ?? payload?.mimetype ?? payload?.mediaType;
    return typeof mime === 'string' && mime.trim() ? [mime] : undefined;
  }

  private formatearMonto(value?: string | number): string {
    if (value === undefined || value === null || value === '') {
      return 'No registrado';
    }

    const numero = Number(value);
    if (Number.isNaN(numero)) {
      return String(value);
    }

    return numero.toFixed(2);
  }

  private responsableActivo(activo: ActivoMs1): string {
    const asignacion = (activo.asignaciones ?? []).find((item) => item.activa && item.responsable);
    return asignacion?.responsable?.nombre ?? activo.responsableEmail ?? 'No registrado';
  }

  private async validarAccesoActivoPorWhatsapp(
    telefonoOrigen: string,
    codigoActivo: string,
    activo: ActivoMs1 | null,
    intencion = 'SOLICITUD_WHATSAPP',
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
          intencion,
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
      '- Mis activos: mis activos',
      '- Consultar estado/ubicacion: consultar ACT-2024-001',
      '- Documentos: documentos ACT-2024-001',
      '- Enlace temporal: enlace documento ACT-2024-001 <documentoId>',
      '- Depreciacion: depreciacion ACT-2024-001',
      '- Solicitar revision/mantenimiento: revisar ACT-2024-001 no enciende',
      '- Reportar incidente con evidencia: reportar dano ACT-2024-001',
      '- Solicitar traslado: solicitar traslado ACT-2024-001 al area Contabilidad',
      '- Confirmar recepcion: confirmo recepcion ACT-2024-001',
      'Altas, bajas definitivas, asignaciones directas, cambios contables, usuarios, roles, BI y administracion se realizan solo desde web.',
    ].join('\n');
  }
}
