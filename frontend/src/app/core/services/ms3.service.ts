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
}
