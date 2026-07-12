import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly tokensPush = new Map<string, string>();
  private readonly notificaciones: Notificacion[] = [];

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
    this.tokensPush.set(usuarioId, token);
  }

  listarNotificaciones(usuarioId: string): Notificacion[] {
    return this.notificaciones
      .filter((notificacion) => notificacion.usuarioId === usuarioId)
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
  }

  guardarNotificacion(params: Omit<Notificacion, 'id' | 'leida' | 'fechaCreacion'>): Notificacion {
    const notificacion: Notificacion = {
      id: `NTF-${Date.now()}-${this.notificaciones.length + 1}`,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      ...params,
    };
    this.notificaciones.push(notificacion);
    return notificacion;
  }

  async enviarPush(usuarioId: string, titulo: string, mensaje: string): Promise<ResultadoEnvio> {
    const token = this.tokensPush.get(usuarioId);
    if (!token || !this.config.fcmProjectId || !this.config.fcmAccessToken) {
      return { enviado: false, canal: 'push', modo: 'simulado', destino: usuarioId };
    }

    try {
      const url = `https://fcm.googleapis.com/v1/projects/${this.config.fcmProjectId}/messages:send`;
      await firstValueFrom(
        this.http.post(
          url,
          {
            message: {
              token,
              notification: { title: titulo, body: mensaje },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.fcmAccessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return { enviado: true, canal: 'push', modo: 'real', destino: usuarioId };
    } catch (error) {
      this.logger.warn(`FCM fallo para ${usuarioId}: ${(error as Error).message}`);
      return { enviado: false, canal: 'push', modo: 'simulado', destino: usuarioId };
    }
  }
}
