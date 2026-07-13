import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoFlujo {
  id: string;
  nombre: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';
  ultimaEjecucion: string;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: 'mantenimiento' | 'alerta' | 'info' | 'baja';
  titulo: string;
  mensaje: string;
  activoId?: string;
  leida: boolean;
  fechaCreacion: string;
}

@Injectable({ providedIn: 'root' })
export class Ms3Service {
  private readonly base = environment.ms3BaseUrl;

  constructor(private http: HttpClient) {}

  listarFlujos(): Observable<EstadoFlujo[]> {
    return this.http.get<EstadoFlujo[]>(`${this.base}/flujos`);
  }

  estadoFlujo(id: string): Observable<EstadoFlujo> {
    return this.http.get<EstadoFlujo>(`${this.base}/flujos/${id}`);
  }

  listarNotificaciones(usuarioId: string): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(`${this.base}/notificaciones`, {
      params: { usuarioId },
    });
  }

  marcarNotificacionLeida(usuarioId: string, notificacionId: string): Observable<{
    actualizada: boolean;
    notificacion: Notificacion | null;
  }> {
    return this.http.patch<{ actualizada: boolean; notificacion: Notificacion | null }>(
      `${this.base}/notificaciones/${notificacionId}/leida`,
      {},
      { params: { usuarioId } },
    );
  }
}
