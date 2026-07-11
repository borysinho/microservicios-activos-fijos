import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../config/app-config.service';

export type DocumentoActivo = {
  id?: string;
  documentoId?: string;
  nombre?: string;
  tipo?: string;
  activo?: boolean;
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
