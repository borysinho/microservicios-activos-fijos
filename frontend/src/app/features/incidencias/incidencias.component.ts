import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, Observable, of, switchMap, take } from 'rxjs';
import { canPerform } from '../../core/auth/permissions';
import type {
  Activo,
  EstadoIncidencia,
  Incidencia,
  IncidenciaGestionInput,
  IncidenciaInput,
  PrioridadIncidencia,
} from '../../core/models/models';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms3Service, type Notificacion } from '../../core/services/ms3.service';

interface IncidenciaView {
  id: string;
  raw: Incidencia;
  origen: 'ACTIVO' | 'ALERTA';
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
  incidenciasPersistidas = signal<Incidencia[]>([]);
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  success = signal('');
  atendiendoId = signal('');
  selectedIncidenciaId = signal('');

  searchTerm = '';
  filtroEstado: EstadoIncidencia | 'TODAS' = 'TODAS';
  filtroPrioridad: PrioridadIncidencia | 'TODAS' = 'TODAS';
  filtroArea = 'TODAS';
  gestionForm = this.crearGestionForm();

  readonly estados: Array<EstadoIncidencia | 'TODAS'> = [
    'TODAS',
    'NUEVA',
    'ABIERTA',
    'EN_PROCESO',
    'REVISADA',
  ];
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
        this.sincronizarYListar(activos, notificaciones);
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
    return this.incidenciasPersistidas()
      .map((incidencia) => this.toView(incidencia))
      .sort(
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

  get incidenciaSeleccionada(): IncidenciaView | null {
    const selectedId = this.selectedIncidenciaId();
    return this.incidencias.find((incidencia) => incidencia.id === selectedId) ?? null;
  }

  get gestionSeleccionada(): Incidencia | null {
    return this.incidenciaSeleccionada?.raw ?? null;
  }

  get puedeGuardarGestion(): boolean {
    return (
      this.puedeGestionar &&
      !!this.incidenciaSeleccionada &&
      !!this.gestionForm.diagnostico.trim() &&
      !!this.gestionForm.accionEjecutada.trim()
    );
  }

  get puedeCerrarGestion(): boolean {
    const selected = this.incidenciaSeleccionada;
    return !!selected && selected.estado !== 'REVISADA' && this.puedeGuardarGestion;
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
      EN_PROCESO: 'En proceso',
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
      EN_PROCESO: 'badge badge--info',
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

  seleccionar(incidencia: IncidenciaView): void {
    this.selectedIncidenciaId.set(incidencia.id);
    this.error.set('');
    this.success.set('');

    this.gestionForm = {
      estado: incidencia.estado === 'NUEVA' ? 'ABIERTA' : incidencia.estado,
      responsableOperativo:
        incidencia.raw.responsableOperativo ??
        this.auth.currentUser()?.nombre ??
        this.auth.currentUser()?.email ??
        '',
      diagnostico: incidencia.raw.diagnostico ?? '',
      accionEjecutada: incidencia.raw.accionEjecutada ?? '',
      proximaAccion: incidencia.raw.proximaAccion ?? '',
      fechaCompromiso: incidencia.raw.fechaCompromiso ?? '',
    };
  }

  guardarGestion(): void {
    const incidencia = this.incidenciaSeleccionada;
    if (!incidencia || !this.puedeGuardarGestion) return;

    this.atendiendoId.set(incidencia.id);
    this.gql.actualizarIncidencia(incidencia.id, this.buildGestionInput()).subscribe({
      next: () => {
        this.success.set('Seguimiento de incidencia actualizado.');
        this.atendiendoId.set('');
        this.cargarIncidenciasPersistidas();
      },
      error: () => {
        this.error.set('No se pudo guardar el seguimiento de la incidencia.');
        this.atendiendoId.set('');
      },
    });
  }

  cerrarGestion(): void {
    const incidencia = this.incidenciaSeleccionada;
    if (!incidencia || !this.puedeCerrarGestion) return;

    this.atendiendoId.set(incidencia.id);
    const cerrar$ = this.gql.cerrarIncidencia(incidencia.id, this.buildGestionInput());
    const request: Observable<unknown> =
      incidencia.notificacionId && this.auth.currentUser()?.id
        ? cerrar$.pipe(
            switchMap(() =>
              this.ms3
                .marcarNotificacionLeida(this.auth.currentUser()!.id, incidencia.notificacionId!)
                .pipe(catchError(() => of(null))),
            ),
          )
        : cerrar$;

    request.subscribe({
      next: () => {
        this.success.set('La incidencia fue cerrada correctamente.');
        this.atendiendoId.set('');
        this.gestionForm.estado = 'REVISADA';
        this.cargar();
      },
      error: () => {
        this.error.set('No se pudo cerrar la incidencia.');
        this.atendiendoId.set('');
      },
    });
  }

  private sincronizarYListar(activos: Activo[], notificaciones: Notificacion[]): void {
    const inputs = this.puedeGestionar
      ? this.crearInputsSincronizacion(activos, notificaciones)
      : [];
    const sync$ = inputs.length
      ? forkJoin(
          inputs.map((input) =>
            this.gql.sincronizarIncidencia(input).pipe(catchError(() => of(null))),
          ),
        )
      : of([]);

    sync$.pipe(switchMap(() => this.gql.getIncidencias().pipe(take(1)))).subscribe({
      next: (incidencias) => {
        this.incidenciasPersistidas.set(incidencias);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las incidencias persistidas.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  private cargarIncidenciasPersistidas(): void {
    this.gql
      .getIncidencias()
      .pipe(take(1))
      .subscribe({
        next: (incidencias) => this.incidenciasPersistidas.set(incidencias),
        error: () => this.error.set('No se pudo actualizar la lista de incidencias.'),
      });
  }

  private crearInputsSincronizacion(
    activos: Activo[],
    notificaciones: Notificacion[],
  ): IncidenciaInput[] {
    const incidenciasActivos = activos
      .filter((activo) => activo.estado === 'EN_MANTENIMIENTO')
      .map(
        (activo): IncidenciaInput => ({
          origen: 'ACTIVO',
          activoId: activo.id,
          codigoReferencia: activo.codigo,
          titulo: activo.nombre,
          tipo: 'Mantenimiento',
          area: activo.areaActual?.nombre ?? 'Sin área',
          prioridad: 'ALTA',
          estado: 'ABIERTA',
          detalle: 'Activo actualmente fuera de operación por mantenimiento.',
          usuarioId: this.auth.currentUser()?.id,
        }),
      );

    const incidenciasAlertas = notificaciones
      .filter((notificacion) => ['mantenimiento', 'alerta', 'baja'].includes(notificacion.tipo))
      .map((notificacion): IncidenciaInput => {
        const activo = activos.find((item) => item.id === notificacion.activoId);
        return {
          origen: 'ALERTA',
          activoId: notificacion.activoId,
          notificacionId: notificacion.id,
          codigoReferencia: activo?.codigo ?? notificacion.activoId ?? notificacion.id,
          titulo: activo?.nombre ?? notificacion.titulo,
          tipo: this.tipoNotificacionLabel(notificacion.tipo),
          area: activo?.areaActual?.nombre ?? 'Sin área',
          prioridad: this.prioridadNotificacion(notificacion),
          estado: notificacion.leida ? 'REVISADA' : 'NUEVA',
          detalle: notificacion.mensaje,
          usuarioId: this.auth.currentUser()?.id,
        };
      });

    return [...incidenciasActivos, ...incidenciasAlertas];
  }

  private toView(incidencia: Incidencia): IncidenciaView {
    return {
      id: incidencia.id,
      raw: incidencia,
      origen: incidencia.origen,
      activoId: incidencia.activo?.id,
      notificacionId: incidencia.notificacionId,
      codigo: incidencia.codigoReferencia,
      activo: incidencia.activo?.nombre ?? incidencia.titulo,
      area: incidencia.area ?? incidencia.activo?.areaActual?.nombre ?? 'Sin área',
      tipo: incidencia.tipo,
      prioridad: incidencia.prioridad,
      estado: incidencia.estado,
      fecha: incidencia.fechaCreacion,
      detalle: incidencia.diagnostico || incidencia.detalle,
    };
  }

  private buildGestionInput(): IncidenciaGestionInput {
    return {
      estado: this.gestionForm.estado,
      responsableOperativo: this.gestionForm.responsableOperativo.trim() || undefined,
      diagnostico: this.gestionForm.diagnostico.trim() || undefined,
      accionEjecutada: this.gestionForm.accionEjecutada.trim() || undefined,
      proximaAccion: this.gestionForm.proximaAccion.trim() || undefined,
      fechaCompromiso: this.gestionForm.fechaCompromiso || undefined,
      usuarioId: this.auth.currentUser()?.id,
    };
  }

  private crearGestionForm() {
    return {
      estado: 'EN_PROCESO' as EstadoIncidencia,
      responsableOperativo: '',
      diagnostico: '',
      accionEjecutada: '',
      proximaAccion: '',
      fechaCompromiso: '',
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
