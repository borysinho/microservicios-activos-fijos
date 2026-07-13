import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { Ms2Service } from '../../core/services/ms2.service';
import { AuthService } from '../../core/services/auth.service';
import { canPerform } from '../../core/auth/permissions';
import type {
  Activo,
  ActivoInput,
  FiltroActivoInput,
  CategoriaActivo,
  Area,
  Responsable,
  Usuario,
  ProyeccionVidaUtilDTO,
} from '../../core/models/models';
import type { PrediccionVidaUtil } from '../../core/services/ms2.service';

@Component({
  selector: 'app-activos',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, PercentPipe],
  templateUrl: './activos.component.html',
  styleUrl: './activos.component.scss',
})
export class ActivosComponent implements OnInit {
  private gql = inject(ActivosGqlService);
  private ms2 = inject(Ms2Service);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private detalleCodigoPendiente = '';

  activos = signal<Activo[]>([]);
  categorias = signal<CategoriaActivo[]>([]);
  areas = signal<Area[]>([]);
  responsables = signal<Responsable[]>([]);
  usuarios = signal<Usuario[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');
  modalError = signal('');
  saving = signal(false);

  // Modales
  showModal = signal(false);
  showAsignarModal = signal(false);
  showTrasladarModal = signal(false);
  showBajaModal = signal(false);
  showDetallePanel = signal(false);
  editingActivoId = signal<string | null>(null);

  selectedActivo = signal<Activo | null>(null);
  detalleLoading = signal(false);
  proyeccion = signal<ProyeccionVidaUtilDTO | null>(null);
  mlPrediccion = signal<PrediccionVidaUtil | null>(null);

  // Filtros
  filtro: FiltroActivoInput = { estado: undefined, categoriaId: undefined };
  searchTerm = '';

  // Forms
  form: ActivoInput = {
    codigo: '',
    nombre: '',
    descripcion: '',
    fechaAdquisicion: '',
    valorAdquisicion: 0,
    vidaUtilAnios: 5,
    categoriaId: '',
    areaActualId: '',
    ubicacion: '',
  };

  formAsignar = {
    activoId: '',
    responsableId: '',
    areaId: '',
    fechaAsignacion: '',
    observaciones: '',
  };
  formTrasladar = {
    activoId: '',
    areaDestinoId: '',
    autorizadoPorId: '',
    fecha: '',
    motivoTraslado: '',
  };
  formBaja = {
    activoId: '',
    autorizadoPorId: '',
    motivo: '',
    valorResidual: 0,
    numeroResolucion: '',
  };

  readonly estadoOpts = ['ACTIVO', 'EN_MANTENIMIENTO', 'TRANSFERIDO', 'DADO_DE_BAJA'];
  readonly estadoCambioOpts = ['ACTIVO', 'EN_MANTENIMIENTO', 'TRANSFERIDO'];

  get puedeCrearActivo(): boolean {
    return this.can('activo.crear');
  }

  get puedeEditarActivo(): boolean {
    return this.can('activo.editar');
  }

  get puedeCambiarEstado(): boolean {
    return this.can('activo.cambiarEstado');
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.searchTerm = params.get('busqueda') ?? '';
    this.detalleCodigoPendiente = params.get('detalle') ?? '';
    this.cargar();
    this.gql.getCategorias().subscribe((data) => this.categorias.set(data));
    this.gql.getAreas().subscribe((data) => this.areas.set(data));
    this.gql.getResponsables().subscribe((data) => this.responsables.set(data));
    this.gql.getUsuarios().subscribe((data) => this.usuarios.set(data));
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.filtro = {
      ...this.filtro,
      busqueda: this.searchTerm.trim() || undefined,
    };
    this.gql.getActivos(this.filtro).subscribe({
      next: (data) => {
        this.activos.set(data);
        this.loading.set(false);
        this.abrirDetallePendiente(data);
      },
      error: () => {
        this.error.set('Error al cargar activos.');
        this.loading.set(false);
      },
    });
  }

  get activosFiltrados(): Activo[] {
    return this.activos();
  }

  private abrirDetallePendiente(activos: Activo[]): void {
    if (!this.detalleCodigoPendiente) return;
    const codigo = this.detalleCodigoPendiente.toLowerCase();
    this.detalleCodigoPendiente = '';
    const activo = activos.find((a) => a.codigo.toLowerCase() === codigo);
    if (activo) {
      this.verDetalle(activo);
    }
  }

  estadoBadge(estado?: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'badge badge--success',
      EN_MANTENIMIENTO: 'badge badge--warning',
      TRANSFERIDO: 'badge badge--info',
      DADO_DE_BAJA: 'badge badge--danger',
    };
    return map[estado ?? ''] ?? 'badge';
  }

  estadoLabel(estado?: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'Activo',
      EN_MANTENIMIENTO: 'Mantenimiento',
      TRANSFERIDO: 'Transferido',
      DADO_DE_BAJA: 'Dado de baja',
    };
    return map[estado ?? ''] ?? estado ?? '—';
  }

  // ── Detalle ─────────────────────────────────────────────────────────────
  verDetalle(activo: Activo): void {
    this.selectedActivo.set(activo);
    this.showDetallePanel.set(true);
    this.detalleLoading.set(true);
    this.proyeccion.set(null);
    this.mlPrediccion.set(null);
    this.gql.getActivo(activo.id).subscribe({
      next: (data) => {
        this.selectedActivo.set(data);
        this.detalleLoading.set(false);
      },
      error: () => {
        this.detalleLoading.set(false);
      },
    });
    this.gql.proyectarVidaUtil(activo.id).subscribe({
      next: (p) => this.proyeccion.set(p),
      error: () => {},
    });
    // CU-64: predicción ML desde MS2
    const anios = activo.fechaAdquisicion
      ? new Date().getFullYear() - new Date(activo.fechaAdquisicion).getFullYear()
      : 0;
    this.ms2
      .prediccionVidaUtil({
        categoriaId: activo.categoria?.id,
        valorAdquisicion: activo.valorAdquisicion ?? 0,
        aniosFabricacion: anios,
      })
      .subscribe({
        next: (ml) => this.mlPrediccion.set(ml),
        error: () => {},
      });
  }

  cerrarDetalle(): void {
    this.showDetallePanel.set(false);
    this.selectedActivo.set(null);
    this.proyeccion.set(null);
    this.mlPrediccion.set(null);
  }

  mlClusterBadge(cluster: number): string {
    const map: Record<number, string> = {
      0: 'badge badge--danger',
      1: 'badge badge--warning',
      2: 'badge badge--success',
    };
    return map[cluster] ?? 'badge';
  }

  // ── Registrar activo ─────────────────────────────────────────────────────
  openModal(activo?: Activo): void {
    if (activo && !this.puedeEditarActivo) return;
    if (!activo && !this.puedeCrearActivo) return;
    this.modalError.set('');
    this.editingActivoId.set(activo?.id ?? null);
    this.form = {
      codigo: activo?.codigo ?? '',
      nombre: activo?.nombre ?? '',
      descripcion: activo?.descripcion ?? '',
      fechaAdquisicion: activo?.fechaAdquisicion ?? new Date().toISOString().split('T')[0],
      valorAdquisicion: activo?.valorAdquisicion ?? 0,
      vidaUtilAnios: activo?.vidaUtilAnios ?? 5,
      categoriaId: activo?.categoria?.id ?? '',
      areaActualId: activo?.areaActual?.id ?? '',
      ubicacion: activo?.ubicacion ?? '',
    };
    this.showModal.set(true);
  }

  guardar(): void {
    const editingId = this.editingActivoId();
    if (editingId && !this.puedeEditarActivo) return;
    if (!editingId && !this.puedeCrearActivo) return;
    if (
      !this.form.codigo ||
      !this.form.nombre ||
      !this.form.fechaAdquisicion ||
      !this.form.valorAdquisicion ||
      !this.form.categoriaId
    ) {
      return;
    }
    this.saving.set(true);
    this.modalError.set('');
    const request = editingId
      ? this.gql.actualizarActivo(editingId, this.form)
      : this.gql.registrarActivo(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.editingActivoId.set(null);
        this.success.set(
          editingId ? 'Activo actualizado correctamente.' : 'Activo registrado correctamente.',
        );
        setTimeout(() => this.success.set(''), 3000);
        this.cargar();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(this.errorMessage(e, 'No se pudo guardar el activo.'));
      },
    });
  }

  cambiarEstado(activo: Activo, nuevoEstado: string): void {
    if (!this.puedeCambiarEstado) return;
    if (nuevoEstado === activo.estado) return;
    this.error.set('');
    this.gql.cambiarEstadoActivo(activo.id, nuevoEstado).subscribe({
      next: () => this.cargar(),
      error: (e) =>
        this.error.set(
          e?.graphQLErrors?.[0]?.message ?? e?.message ?? 'No se pudo cambiar el estado.',
        ),
    });
  }

  // ── Asignar activo ───────────────────────────────────────────────────────
  openAsignar(activo: Activo): void {
    if (!this.canAsignar(activo)) return;
    this.modalError.set('');
    this.success.set('');
    this.formAsignar = {
      activoId: activo.id,
      responsableId: '',
      areaId: activo.areaActual?.id ?? '',
      fechaAsignacion: new Date().toISOString().split('T')[0],
      observaciones: '',
    };
    this.showAsignarModal.set(true);
  }

  guardarAsignacion(): void {
    if (!this.can('activo.asignar')) return;
    if (
      !this.formAsignar.responsableId ||
      !this.formAsignar.areaId ||
      !this.formAsignar.fechaAsignacion
    )
      return;
    this.saving.set(true);
    this.modalError.set('');
    this.gql.asignarActivo(this.formAsignar).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAsignarModal.set(false);
        this.success.set('Activo asignado correctamente.');
        setTimeout(() => this.success.set(''), 3000);
        this.cargar();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(this.errorMessage(e, 'No se pudo asignar el activo.'));
      },
    });
  }

  // ── Trasladar activo ─────────────────────────────────────────────────────
  openTrasladar(activo: Activo): void {
    if (!this.canTrasladar(activo)) return;
    this.modalError.set('');
    this.formTrasladar = {
      activoId: activo.id,
      areaDestinoId: '',
      autorizadoPorId: '',
      fecha: new Date().toISOString().split('T')[0],
      motivoTraslado: '',
    };
    this.showTrasladarModal.set(true);
  }

  guardarTraslado(): void {
    if (!this.can('activo.trasladar')) return;
    if (
      !this.formTrasladar.areaDestinoId ||
      !this.formTrasladar.autorizadoPorId ||
      !this.formTrasladar.motivoTraslado
    )
      return;
    this.saving.set(true);
    this.modalError.set('');
    this.gql.trasladarActivo(this.formTrasladar).subscribe({
      next: () => {
        this.saving.set(false);
        this.showTrasladarModal.set(false);
        this.success.set('Traslado registrado correctamente.');
        setTimeout(() => this.success.set(''), 3000);
        this.cargar();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(this.errorMessage(e, 'No se pudo registrar el traslado.'));
      },
    });
  }

  // ── Dar de baja ──────────────────────────────────────────────────────────
  openBaja(activo: Activo): void {
    if (!this.canBaja(activo)) return;
    this.modalError.set('');
    this.formBaja = {
      activoId: activo.id,
      autorizadoPorId: '',
      motivo: '',
      valorResidual: 0,
      numeroResolucion: '',
    };
    this.showBajaModal.set(true);
  }

  guardarBaja(): void {
    if (!this.can('activo.baja')) return;
    if (!this.formBaja.autorizadoPorId || !this.formBaja.motivo) return;
    this.saving.set(true);
    this.modalError.set('');
    this.gql.darDeBaja(this.formBaja).subscribe({
      next: () => {
        this.saving.set(false);
        this.showBajaModal.set(false);
        this.success.set('Activo dado de baja correctamente.');
        setTimeout(() => this.success.set(''), 3000);
        this.cargar();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(this.errorMessage(e, 'No se pudo dar de baja el activo.'));
      },
    });
  }

  canAsignar(activo: Activo): boolean {
    return this.can('activo.asignar') && activo.estado === 'ACTIVO';
  }

  canTrasladar(activo: Activo): boolean {
    return this.can('activo.trasladar') && (activo.estado === 'ACTIVO' || activo.estado === 'TRANSFERIDO');
  }

  canBaja(activo: Activo): boolean {
    return this.can('activo.baja') && activo.estado !== 'DADO_DE_BAJA';
  }

  private can(action: Parameters<typeof canPerform>[1]): boolean {
    return canPerform(this.auth.currentUser()?.rol, action);
  }

  private errorMessage(error: unknown, fallback: string): string {
    const err = error as {
      graphQLErrors?: { message?: string }[];
      networkError?: { message?: string };
      message?: string;
    };
    return (
      err?.graphQLErrors?.[0]?.message ?? err?.networkError?.message ?? err?.message ?? fallback
    );
  }
}
