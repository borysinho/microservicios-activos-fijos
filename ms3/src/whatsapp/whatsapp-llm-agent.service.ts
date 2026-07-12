import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type IntencionWhatsapp =
  | 'AYUDA'
  | 'CONSULTAR_ACTIVO'
  | 'SOLICITAR_REVISION'
  | 'NO_PERMITIDA'
  | 'NO_ENTENDIDA';

export type DecisionAgenteWhatsapp = {
  intencion: IntencionWhatsapp;
  codigoActivo?: string;
};

@Injectable()
export class WhatsappLlmAgentService {
  private readonly logger = new Logger(WhatsappLlmAgentService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfig,
  ) {}

  configurado(): boolean {
    return Boolean(
      this.config.azureOpenAiEndpoint &&
        this.config.azureOpenAiApiKey &&
        this.config.azureOpenAiDeployment,
    );
  }

  async clasificarMensaje(texto: string): Promise<DecisionAgenteWhatsapp | null> {
    if (!this.configurado()) {
      return null;
    }

    const endpoint = this.config.azureOpenAiEndpoint.replace(/\/$/, '');
    const deployment = encodeURIComponent(this.config.azureOpenAiDeployment);
    const apiVersion = encodeURIComponent(this.config.azureOpenAiApiVersion);
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          url,
          {
            messages: [
              {
                role: 'system',
                content: [
                  'Eres el agente LLM de WhatsApp del Sistema de Gestion de Activos Fijos.',
                  'Tu unica tarea es clasificar la intencion del mensaje del usuario.',
                  'No ejecutes operaciones ni inventes datos.',
                  'Devuelve solo JSON valido con esta forma:',
                  '{"intencion":"AYUDA|CONSULTAR_ACTIVO|SOLICITAR_REVISION|NO_PERMITIDA|NO_ENTENDIDA","codigoActivo":"ACT-2024-001"}',
                  'Permitido por chat: ayuda, consultar estado/ubicacion/responsable de un activo, solicitar revision o mantenimiento correctivo.',
                  'No permitido por chat: alta, edicion, baja, traslado, transferencia, asignacion, documentos, diagnostico con camara/foto, usuarios, roles, BI, configuracion o administracion.',
                  'Si la operacion cambia estado formal, permisos, documentos o requiere recursos moviles, responde NO_PERMITIDA.',
                ].join(' '),
              },
              {
                role: 'user',
                content: texto,
              },
            ],
            response_format: { type: 'json_object' },
            max_completion_tokens: 400,
          },
          {
            headers: {
              'api-key': this.config.azureOpenAiApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          },
        ),
      );

      return this.parsearDecision(data?.choices?.[0]?.message?.content);
    } catch (error) {
      this.logger.warn(`Azure OpenAI no pudo clasificar WhatsApp: ${(error as Error).message}`);
      return null;
    }
  }

  private parsearDecision(content: unknown): DecisionAgenteWhatsapp | null {
    if (typeof content !== 'string' || !content.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as Partial<DecisionAgenteWhatsapp>;
      if (!this.esIntencionValida(parsed.intencion)) {
        return null;
      }

      return {
        intencion: parsed.intencion,
        codigoActivo: typeof parsed.codigoActivo === 'string' ? parsed.codigoActivo.toUpperCase() : undefined,
      };
    } catch (error) {
      this.logger.warn(`Respuesta LLM no JSON para WhatsApp: ${(error as Error).message}`);
      return null;
    }
  }

  private esIntencionValida(intencion: unknown): intencion is IntencionWhatsapp {
    return (
      intencion === 'AYUDA' ||
      intencion === 'CONSULTAR_ACTIVO' ||
      intencion === 'SOLICITAR_REVISION' ||
      intencion === 'NO_PERMITIDA' ||
      intencion === 'NO_ENTENDIDA'
    );
  }
}
