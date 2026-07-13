import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import * as nodemailer from 'nodemailer';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type ResultadoEnvio = {
  enviado: boolean;
  canal: 'email' | 'whatsapp' | 'push';
  modo: 'real' | 'simulado';
  destino: string;
};

export type Notificacion = {
  id: string;
  usuarioId: string;
  tipo: 'mantenimiento' | 'alerta' | 'info' | 'baja';
  titulo: string;
  mensaje: string;
  activoId?: string;
  leida: boolean;
  fechaCreacion: string;
};

export const NOTIFICACION_GLOBAL_USUARIO_ID = 'GLOBAL';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly tokensPush = new Map<string, Set<string>>();
  private readonly notificaciones: Notificacion[] = [];
  private readonly googleAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfig,
  ) {}

  async enviarEmail(params: {
    to: string;
    subject: string;
    text: string;
  }): Promise<ResultadoEnvio> {
    if (this.config.emailProvider === 'smtp') {
      return this.enviarEmailSmtp(params);
    }

    if (!this.config.sendgridApiKey) {
      return { enviado: false, canal: 'email', modo: 'simulado', destino: params.to };
    }

    try {
      await firstValueFrom(
        this.http.post(
          'https://api.sendgrid.com/v3/mail/send',
          {
            personalizations: [{ to: [{ email: params.to }] }],
            from: { email: this.config.sendgridFromEmail },
            subject: params.subject,
            content: [{ type: 'text/plain', value: params.text }],
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return { enviado: true, canal: 'email', modo: 'real', destino: params.to };
    } catch (error) {
      this.logger.warn(`SendGrid fallo para ${params.to}: ${(error as Error).message}`);
      return { enviado: false, canal: 'email', modo: 'simulado', destino: params.to };
    }
  }

  private async enviarEmailSmtp(params: {
    to: string;
    subject: string;
    text: string;
  }): Promise<ResultadoEnvio> {
    if (!this.config.smtpHost || !this.config.smtpUser || !this.config.smtpPassword) {
      return { enviado: false, canal: 'email', modo: 'simulado', destino: params.to };
    }

    try {
      const transport = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        },
      });

      await transport.sendMail({
        from: this.config.smtpFromEmail,
        to: params.to,
        subject: params.subject,
        text: params.text,
      });

      return { enviado: true, canal: 'email', modo: 'real', destino: params.to };
    } catch (error) {
      this.logger.warn(`SMTP fallo para ${params.to}: ${(error as Error).message}`);
      return { enviado: false, canal: 'email', modo: 'simulado', destino: params.to };
    }
  }

  async enviarWhatsAppTexto(to: string, body: string): Promise<ResultadoEnvio> {
    if (this.config.whatsappProvider === 'waha') {
      return this.enviarWhatsAppWaha(to, body);
    }

    if (this.config.whatsappProvider === 'twilio') {
      return this.enviarWhatsAppTwilio(to, body);
    }

    if (!this.config.whatsappToken || !this.config.whatsappPhoneNumberId) {
      return { enviado: false, canal: 'whatsapp', modo: 'simulado', destino: to };
    }

    try {
      const url = `${this.config.whatsappApiUrl}/${this.config.whatsappPhoneNumberId}/messages`;
      await firstValueFrom(
        this.http.post(
          url,
          {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body },
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.whatsappToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return { enviado: true, canal: 'whatsapp', modo: 'real', destino: to };
    } catch (error) {
      this.logger.warn(`WhatsApp fallo para ${to}: ${(error as Error).message}`);
      return { enviado: false, canal: 'whatsapp', modo: 'simulado', destino: to };
    }
  }

  private async enviarWhatsAppTwilio(to: string, body: string): Promise<ResultadoEnvio> {
    if (!this.config.twilioAccountSid || !this.config.twilioAuthToken || !this.config.twilioWhatsappFrom) {
      return { enviado: false, canal: 'whatsapp', modo: 'simulado', destino: to };
    }

    const form = new URLSearchParams();
    form.set('From', this.toTwilioWhatsappAddress(this.config.twilioWhatsappFrom));
    form.set('To', this.toTwilioWhatsappAddress(to));
    form.set('Body', body);

    try {
      await firstValueFrom(
        this.http.post(
          `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages.json`,
          form.toString(),
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return { enviado: true, canal: 'whatsapp', modo: 'real', destino: to };
    } catch (error) {
      this.logger.warn(`Twilio WhatsApp fallo para ${to}: ${(error as Error).message}`);
      return { enviado: false, canal: 'whatsapp', modo: 'simulado', destino: to };
    }
  }

  private async enviarWhatsAppWaha(to: string, body: string): Promise<ResultadoEnvio> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.wahaApiKey) {
        headers['X-Api-Key'] = this.config.wahaApiKey;
      }

      await firstValueFrom(
        this.http.post(
          `${this.config.wahaBaseUrl.replace(/\/$/, '')}/api/sendText`,
          {
            session: this.config.wahaSession,
            chatId: this.toWahaChatId(to),
            text: body,
          },
          { headers },
        ),
      );

      return { enviado: true, canal: 'whatsapp', modo: 'real', destino: to };
    } catch (error) {
      this.logger.warn(`WAHA fallo para ${to}: ${(error as Error).message}`);
      return { enviado: false, canal: 'whatsapp', modo: 'simulado', destino: to };
    }
  }

  private toWahaChatId(to: string): string {
    if (to.includes('@c.us') || to.includes('@g.us')) {
      return to;
    }

    return `${to.replace(/\D/g, '')}@c.us`;
  }

  private toTwilioWhatsappAddress(value: string): string {
    if (value.startsWith('whatsapp:')) {
      return value;
    }

    const trimmed = value.trim();
    const phone = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/\D/g, '')}`;
    return `whatsapp:${phone}`;
  }

  async enviarWhatsAppMantenimiento(params: {
    to: string;
    codigoActivo: string;
    fechaMantenimiento: string;
  }): Promise<ResultadoEnvio> {
    const body = `Recordatorio: El activo ${params.codigoActivo} tiene mantenimiento programado para el ${params.fechaMantenimiento}. Por favor coordine su disponibilidad.`;
    return this.enviarWhatsAppTexto(params.to, body);
  }

  registrarToken(usuarioId: string, token: string): void {
    const tokens = this.tokensPush.get(usuarioId) ?? new Set<string>();
    tokens.add(token);
    this.tokensPush.set(usuarioId, tokens);
  }

  listarNotificaciones(usuarioId: string): Notificacion[] {
    return this.notificaciones
      .filter((notificacion) =>
        notificacion.usuarioId === usuarioId ||
        notificacion.usuarioId === NOTIFICACION_GLOBAL_USUARIO_ID,
      )
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
  }

  guardarNotificacion(
    params: Omit<Notificacion, 'id' | 'usuarioId' | 'leida' | 'fechaCreacion'> & { usuarioId?: string },
  ): Notificacion {
    const notificacion: Notificacion = {
      id: `NTF-${Date.now()}-${this.notificaciones.length + 1}`,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      ...params,
      usuarioId: params.usuarioId ?? NOTIFICACION_GLOBAL_USUARIO_ID,
    };
    this.notificaciones.push(notificacion);
    return notificacion;
  }

  marcarLeida(usuarioId: string, notificacionId: string): Notificacion | null {
    const notificacion = this.notificaciones.find(
      (item) =>
        item.id === notificacionId &&
        (item.usuarioId === usuarioId || item.usuarioId === NOTIFICACION_GLOBAL_USUARIO_ID),
    );
    if (!notificacion) {
      return null;
    }

    notificacion.leida = true;
    return notificacion;
  }

  async guardarYEnviarPush(params: {
    usuarioId?: string;
    tipo: Notificacion['tipo'];
    titulo: string;
    mensaje: string;
    activoId?: string;
  }): Promise<{ notificacion: Notificacion; push: ResultadoEnvio }> {
    const notificacion = this.guardarNotificacion(params);
    const push = params.usuarioId
      ? await this.enviarPush({
          usuarioId: params.usuarioId,
          titulo: params.titulo,
          mensaje: params.mensaje,
          tipo: params.tipo,
          activoId: params.activoId,
          notificacionId: notificacion.id,
        })
      : { enviado: false, canal: 'push' as const, modo: 'simulado' as const, destino: NOTIFICACION_GLOBAL_USUARIO_ID };
    return { notificacion, push };
  }

  async enviarPush(params: {
    usuarioId: string;
    titulo: string;
    mensaje: string;
    tipo?: Notificacion['tipo'];
    activoId?: string;
    notificacionId?: string;
  }): Promise<ResultadoEnvio> {
    const tokens = [...(this.tokensPush.get(params.usuarioId) ?? [])];
    if (tokens.length === 0 || !this.config.fcmProjectId) {
      return { enviado: false, canal: 'push', modo: 'simulado', destino: params.usuarioId };
    }

    const accessToken = await this.obtenerFcmAccessToken();
    if (!accessToken) {
      return { enviado: false, canal: 'push', modo: 'simulado', destino: params.usuarioId };
    }

    try {
      const url = `https://fcm.googleapis.com/v1/projects/${this.config.fcmProjectId}/messages:send`;
      const results = await Promise.allSettled(
        tokens.map((token) =>
          firstValueFrom(
            this.http.post(
              url,
              {
                message: {
                  token,
                  notification: { title: params.titulo, body: params.mensaje },
                  data: {
                    tipo: params.tipo ?? 'info',
                    activoId: params.activoId ?? '',
                    notificacionId: params.notificacionId ?? '',
                  },
                  android: {
                    priority: 'HIGH',
                    notification: {
                      channel_id: 'activos_alertas',
                    },
                  },
                  apns: {
                    payload: {
                      aps: {
                        sound: 'default',
                      },
                    },
                  },
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              },
            ),
          ),
        ),
      );
      const enviados = results.filter((result) => result.status === 'fulfilled').length;
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(`FCM fallo para ${params.usuarioId}/${index + 1}: ${(result.reason as Error).message}`);
        }
      });
      return {
        enviado: enviados > 0,
        canal: 'push',
        modo: enviados > 0 ? 'real' : 'simulado',
        destino: params.usuarioId,
      };
    } catch (error) {
      this.logger.warn(`FCM fallo para ${params.usuarioId}: ${(error as Error).message}`);
      return { enviado: false, canal: 'push', modo: 'simulado', destino: params.usuarioId };
    }
  }

  private async obtenerFcmAccessToken(): Promise<string | null> {
    if (this.config.fcmAccessToken) {
      return this.config.fcmAccessToken;
    }

    if (this.config.fcmServiceAccountJson) {
      try {
        const credentials = JSON.parse(this.config.fcmServiceAccountJson);
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        return (await auth.getAccessToken()) ?? null;
      } catch (error) {
        this.logger.warn(`Credenciales FCM invalidas: ${(error as Error).message}`);
        return null;
      }
    }

    try {
      return (await this.googleAuth.getAccessToken()) ?? null;
    } catch (error) {
      this.logger.warn(`No se pudo obtener token ADC para FCM: ${(error as Error).message}`);
      return null;
    }
  }
}
