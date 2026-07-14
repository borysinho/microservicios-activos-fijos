import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
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
  private readonly notificacionesTtlMs = 5000;
  private readonly notificacionesCache = new Map<
    string,
    { expiresAt: number; request$: Observable<Notificacion[]> }
  >();

  constructor(private http: HttpClient) {}

  listarFlujos(): Observable<EstadoFlujo[]> {
    return this.http.get<EstadoFlujo[]>(`${this.base}/flujos`);
  }

  estadoFlujo(id: string): Observable<EstadoFlujo> {
    return this.http.get<EstadoFlujo>(`${this.base}/flujos/${id}`);
  }

  listarNotificaciones(usuarioId: string): Observable<Notificacion[]> {
    const key = usuarioId.trim();
    const cached = this.notificacionesCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.request$;
    }

    const request$ = this.http.get<Notificacion[]>(`${this.base}/notificaciones`, {
      params: { usuarioId },
    }).pipe(
      tap({ error: () => this.notificacionesCache.delete(key) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.notificacionesCache.set(key, {
      expiresAt: Date.now() + this.notificacionesTtlMs,
      request$,
    });

    return request$;
  }

  marcarNotificacionLeida(usuarioId: string, notificacionId: string): Observable<{
    actualizada: boolean;
    notificacion: Notificacion | null;
  }> {
    return this.http.patch<{ actualizada: boolean; notificacion: Notificacion | null }>(
      `${this.base}/notificaciones/${notificacionId}/leida`,
      {},
      { params: { usuarioId } },
    ).pipe(tap(() => this.notificacionesCache.delete(usuarioId.trim())));
  }
}
