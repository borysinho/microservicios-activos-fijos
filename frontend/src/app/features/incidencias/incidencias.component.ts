import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, Observable, of, take } from 'rxjs';
import { canPerform } from '../../core/auth/permissions';
import type { Activo } from '../../core/models/models';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms3Service, type Notificacion } from '../../core/services/ms3.service';

type PrioridadIncidencia = 'ALTA' | 'MEDIA' | 'BAJA';
type EstadoIncidencia = 'ABIERTA' | 'NUEVA' | 'REVISADA';

interface IncidenciaView {
  id: string;
  origen: 'activo' | 'alerta';
  activoId?: string;
  notificacionId?: string;
  codigo: string;
  activo: string;
  area: string;
  tipo: string;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  fecha: string;
  detalle: string;
}

const PRIORIDAD_ORDEN: Record<PrioridadIncidencia, number> = {
  ALTA: 0,
  MEDIA: 1,
  BAJA: 2,
};

@Component({
  selector: 'app-incidencias',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './incidencias.component.html',
  styleUrl: './incidencias.component.scss',
})
export class IncidenciasComponent implements OnInit {
  private gql = inject(ActivosGqlService);
  private ms3 = inject(Ms3Service);
  private auth = inject(AuthService);
  private router = inject(Router);

  activos = signal<Activo[]>([]);
  notificaciones = signal<Notificacion[]>([]);
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  success = signal('');
  atendiendoId = signal('');

  searchTerm = '';
  filtroEstado: EstadoIncidencia | 'TODAS' = 'TODAS';
  filtroPrioridad: PrioridadIncidencia | 'TODAS' = 'TODAS';
  filtroArea = 'TODAS';

  readonly estados: Array<EstadoIncidencia | 'TODAS'> = ['TODAS', 'ABIERTA', 'NUEVA', 'REVISADA'];
  readonly prioridades: Array<PrioridadIncidencia | 'TODAS'> = ['TODAS', 'ALTA', 'MEDIA', 'BAJA'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    const usuarioId = this.auth.currentUser()?.id ?? '';

    forkJoin({
      activos: this.gql.getActivos().pipe(
        take(1),
        catchError(() => of([] as Activo[])),
      ),
      notificaciones: usuarioId
        ? this.ms3.listarNotificaciones(usuarioId).pipe(
            take(1),
            catchError(() => of([] as Notificacion[])),
          )
        : of([] as Notificacion[]),
    }).subscribe({
      next: ({ activos, notificaciones }) => {
        this.activos.set(activos);
        this.notificaciones.set(notificaciones);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las incidencias.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.cargar();
  }

  get puedeGestionar(): boolean {
    return canPerform(this.auth.currentUser()?.rol, 'incidencia.gestionar');
  }

  get incidencias(): IncidenciaView[] {
    const activos = this.activos();
    const activoPorId = new Map(activos.map((activo) => [activo.id, activo]));
    const incidenciasActivos = activos
      .filter((activo) => activo.estado === 'EN_MANTENIMIENTO')
      .map((activo) => this.incidenciaDesdeActivo(activo));

    const incidenciasAlertas = this.notificaciones()
      .filter((notificacion) => ['mantenimiento', 'alerta', 'baja'].includes(notificacion.tipo))
      .map((notificacion) =>
        this.incidenciaDesdeNotificacion(notificacion, activoPorId.get(notificacion.activoId ?? '')),
      );

    return [...incidenciasActivos, ...incidenciasAlertas].sort(
      (a, b) =>
        PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad] ||
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
  }

  get incidenciasFiltradas(): IncidenciaView[] {
    const texto = this.searchTerm.trim().toLowerCase();
    return this.incidencias.filter((incidencia) => {
      const coincideTexto =
        !texto ||
        incidencia.codigo.toLowerCase().includes(texto) ||
        incidencia.activo.toLowerCase().includes(texto) ||
        incidencia.area.toLowerCase().includes(texto) ||
        incidencia.detalle.toLowerCase().includes(texto);
      const coincideEstado =
        this.filtroEstado === 'TODAS' || incidencia.estado === this.filtroEstado;
      const coincidePrioridad =
        this.filtroPrioridad === 'TODAS' || incidencia.prioridad === this.filtroPrioridad;
      const coincideArea = this.filtroArea === 'TODAS' || incidencia.area === this.filtroArea;
      return coincideTexto && coincideEstado && coincidePrioridad && coincideArea;
    });
  }

  get areas(): string[] {
    return Array.from(new Set(this.incidencias.map((incidencia) => incidencia.area))).sort();
  }

  get abiertas(): number {
    return this.incidencias.filter((incidencia) => incidencia.estado !== 'REVISADA').length;
  }

  get altaPrioridad(): number {
    return this.incidencias.filter((incidencia) => incidencia.prioridad === 'ALTA').length;
  }

  get enMantenimiento(): number {
    return this.activos().filter((activo) => activo.estado === 'EN_MANTENIMIENTO').length;
  }

  estadoLabel(estado: EstadoIncidencia | 'TODAS'): string {
    const map: Record<EstadoIncidencia | 'TODAS', string> = {
      TODAS: 'Todos los estados',
      ABIERTA: 'Abierta',
      NUEVA: 'Nueva',
      REVISADA: 'Revisada',
    };
    return map[estado];
  }

  prioridadLabel(prioridad: PrioridadIncidencia | 'TODAS'): string {
    const map: Record<PrioridadIncidencia | 'TODAS', string> = {
      TODAS: 'Todas las prioridades',
      ALTA: 'Alta',
      MEDIA: 'Media',
      BAJA: 'Baja',
    };
    return map[prioridad];
  }

  estadoClass(estado: EstadoIncidencia): string {
    const map: Record<EstadoIncidencia, string> = {
      ABIERTA: 'badge badge--warning',
      NUEVA: 'badge badge--danger',
      REVISADA: 'badge badge--default',
    };
    return map[estado];
  }

  prioridadClass(prioridad: PrioridadIncidencia): string {
    const map: Record<PrioridadIncidencia, string> = {
      ALTA: 'badge badge--danger',
      MEDIA: 'badge badge--warning',
      BAJA: 'badge badge--info',
    };
    return map[prioridad];
  }

  verActivo(incidencia: IncidenciaView): void {
    if (!incidencia.codigo || incidencia.codigo === '—') return;
    this.router.navigate(['/activos'], { queryParams: { detalle: incidencia.codigo } });
  }

  atender(incidencia: IncidenciaView): void {
    if (!this.puedeGestionar) return;
    this.atendiendoId.set(incidencia.id);
    this.success.set('');
    this.error.set('');

    const usuarioId = this.auth.currentUser()?.id ?? '';
    const request: Observable<unknown> =
      incidencia.origen === 'activo' && incidencia.activoId
        ? this.gql.cambiarEstadoActivo(incidencia.activoId, 'ACTIVO')
        : usuarioId && incidencia.notificacionId
          ? this.ms3.marcarNotificacionLeida(usuarioId, incidencia.notificacionId)
          : of(null);

    request.subscribe({
      next: () => {
        this.success.set('La incidencia fue marcada como atendida.');
        this.atendiendoId.set('');
        this.cargar();
      },
      error: () => {
        this.error.set('No se pudo actualizar la incidencia.');
        this.atendiendoId.set('');
      },
    });
  }

  private incidenciaDesdeActivo(activo: Activo): IncidenciaView {
    return {
      id: `activo-${activo.id}`,
      origen: 'activo',
      activoId: activo.id,
      codigo: activo.codigo,
      activo: activo.nombre,
      area: activo.areaActual?.nombre ?? 'Sin área',
      tipo: 'Mantenimiento',
      prioridad: 'ALTA',
      estado: 'ABIERTA',
      fecha: new Date().toISOString(),
      detalle: 'Activo actualmente fuera de operación por mantenimiento.',
    };
  }

  private incidenciaDesdeNotificacion(
    notificacion: Notificacion,
    activo?: Activo,
  ): IncidenciaView {
    return {
      id: `alerta-${notificacion.id}`,
      origen: 'alerta',
      activoId: notificacion.activoId,
      notificacionId: notificacion.id,
      codigo: activo?.codigo ?? notificacion.activoId ?? '—',
      activo: activo?.nombre ?? 'Activo no identificado',
      area: activo?.areaActual?.nombre ?? 'Sin área',
      tipo: this.tipoNotificacionLabel(notificacion.tipo),
      prioridad: this.prioridadNotificacion(notificacion),
      estado: notificacion.leida ? 'REVISADA' : 'NUEVA',
      fecha: notificacion.fechaCreacion,
      detalle: notificacion.mensaje,
    };
  }

  private tipoNotificacionLabel(tipo: Notificacion['tipo']): string {
    const map: Record<Notificacion['tipo'], string> = {
      mantenimiento: 'Mantenimiento',
      alerta: 'Alerta operativa',
      info: 'Información',
      baja: 'Retiro de activo',
    };
    return map[tipo];
  }

  private prioridadNotificacion(notificacion: Notificacion): PrioridadIncidencia {
    if (notificacion.tipo === 'alerta') return 'ALTA';
    if (notificacion.tipo === 'mantenimiento') return 'MEDIA';
    return 'BAJA';
  }
}
