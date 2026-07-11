import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Modelos ──────────────────────────────────────────────────────────────────

export interface DocumentoMetadata {
  documentoId: string;
  activoId: string;
  nombre: string;
  tipo: string;
  s3Key: string;
  s3Url: string;
  version: number;
  subidoPor: string;
  fechaCreacion: string;
  activo: boolean;
}

export interface UrlDescarga {
  documentoId: string;
  url: string;
  expiraEn: number;
}

export interface EventoAuditoria {
  eventoId: string;
  documentoId: string;
  activoId: string;
  accion: string;
  usuario: string;
  ipOrigen: string;
  detalles: string;
  timestamp: string;
}

export interface DiagnosticoIA {
  activoId: string;
  diagnostico: string;
  confianza: number;
  recomendacion: string;
  estado?: string;
  detalle?: string;
  tipoAnalisis?: string;
  similitudReferencia?: number | null;
  verificaciones?: { criterio: string; resultado: string; detalle: string }[];
}

export interface PrediccionVidaUtil {
  categoriaId: string | null;
  vidaUtilRestante: number;
  probabilidad_fallo_6m: number; // 0.0 – 1.0 (CU-62)
  cluster: number;
  cluster_label: string; // "Alta criticidad" | "Mantenimiento regular" | "Rendimiento eficiente"
  confianza: number;
  recomendacion_mantenimiento: string; // CU-65
}

export interface ClusteringResult {
  clusters: { id: number; nombre: string; activos: string[] }[];
}

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class Ms2Service {
  private readonly base = environment.ms2BaseUrl;

  constructor(private http: HttpClient) {}

  // ── CU-26: Cargar documento ───────────────────────────────────────────────
  subirDocumento(
    activoId: string,
    archivo: File,
    tipo: string = 'OTRO',
  ): Observable<DocumentoMetadata> {
    const form = new FormData();
    form.append('file', archivo);
    form.append('activoId', activoId);
    form.append('tipo', tipo);
    return this.http.post<DocumentoMetadata>(`${this.base}/documentos/upload`, form);
  }

  // ── CU-27: URL presignada de descarga ─────────────────────────────────────
  obtenerUrlDescarga(documentoId: string): Observable<UrlDescarga> {
    return this.http.get<UrlDescarga>(`${this.base}/documentos/${documentoId}/url`);
  }

  // ── CU-28: Nueva versión ──────────────────────────────────────────────────
  nuevaVersion(documentoId: string, archivo: File): Observable<DocumentoMetadata> {
    const form = new FormData();
    form.append('file', archivo);
    return this.http.put<DocumentoMetadata>(`${this.base}/documentos/${documentoId}/version`, form);
  }

  // ── CU-29: Historial de versiones ─────────────────────────────────────────
  historialVersiones(documentoId: string): Observable<DocumentoMetadata[]> {
    return this.http.get<DocumentoMetadata[]>(`${this.base}/documentos/${documentoId}/versiones`);
  }

  // ── CU-30: Eliminar documento (soft delete) ───────────────────────────────
  eliminarDocumento(documentoId: string): Observable<{ mensaje: string; documentoId: string }> {
    return this.http.delete<{ mensaje: string; documentoId: string }>(
      `${this.base}/documentos/${documentoId}`,
    );
  }

  // ── CU-31: Log de auditoría de un documento ───────────────────────────────
  logAuditoriaDocumento(documentoId: string): Observable<EventoAuditoria[]> {
    return this.http.get<EventoAuditoria[]>(`${this.base}/documentos/${documentoId}/auditoria`);
  }

  // ── CU-32/33: Listar y buscar documentos de un activo ─────────────────────
  listarDocumentos(
    activoId: string,
    tipo?: string,
    desde?: string,
    hasta?: string,
  ): Observable<DocumentoMetadata[]> {
    let params = new HttpParams().set('activoId', activoId);
    if (tipo) params = params.set('tipo', tipo);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<DocumentoMetadata[]>(`${this.base}/documentos`, { params });
  }

  // ── IA ────────────────────────────────────────────────────────────────────
  diagnosticarImagen(imagen: File, activoId?: string): Observable<DiagnosticoIA> {
    const form = new FormData();
    form.append('imagen', imagen);
    if (activoId) form.append('activoId', activoId);
    return this.http.post<DiagnosticoIA>(`${this.base}/ia/diagnostico`, form);
  }

  // ── ML ────────────────────────────────────────────────────────────────────
  prediccionVidaUtil(params: {
    categoriaId?: string;
    valorAdquisicion?: number;
    aniosFabricacion?: number;
  }): Observable<PrediccionVidaUtil> {
    return this.http.get<PrediccionVidaUtil>(`${this.base}/ml/prediccion-vida-util`, {
      params: params as Record<string, string | number>,
    });
  }

  clustering(_params?: Record<string, unknown>): Observable<ClusteringResult> {
    return this.http.get<ClusteringResult>(`${this.base}/ml/clustering`);
  }
}
