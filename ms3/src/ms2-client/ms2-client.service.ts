import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type DocumentoActivo = {
  id?: string;
  documentoId?: string;
  nombre?: string;
  tipo?: string;
  version?: number;
  activo?: boolean;
};

export type EnlaceDocumento = {
  documentoId: string;
  url: string;
  expiraEn: number;
};

@Injectable()
export class Ms2ClientService {
  private readonly logger = new Logger(Ms2ClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfig,
  ) {}

  async obtenerDocumentos(activoId: string): Promise<DocumentoActivo[]> {
    const base = this.config.ms2BaseUrl.replace(/\/$/, '');
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${base}/documentos`, {
          params: { activoId },
          ...this.authOptions(),
        }),
      );
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(data?.items)) {
        return data.items;
      }
      return [];
    } catch (error) {
      this.logger.warn(`MS2 no respondio al consultar documentos ${activoId}: ${(error as Error).message}`);
      return [];
    }
  }

  async obtenerUrlDocumento(documentoId: string): Promise<EnlaceDocumento | null> {
    const base = this.config.ms2BaseUrl.replace(/\/$/, '');
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${base}/documentos/${encodeURIComponent(documentoId)}/url`, this.authOptions()),
      );
      if (!data?.url) {
        return null;
      }
      return {
        documentoId: String(data.documentoId ?? documentoId),
        url: String(data.url),
        expiraEn: Number(data.expiraEn ?? 900),
      };
    } catch (error) {
      this.logger.warn(`MS2 no respondio al generar enlace ${documentoId}: ${(error as Error).message}`);
      return null;
    }
  }

  private authOptions() {
    if (!this.config.ms2AuthToken) {
      return {};
    }
    return {
      headers: {
        Authorization: `Bearer ${this.config.ms2AuthToken}`,
      },
    };
  }
}
