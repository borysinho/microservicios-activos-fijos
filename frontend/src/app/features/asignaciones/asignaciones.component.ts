import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import type { Activo, Asignacion, Area, Responsable } from '../../core/models/models';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.scss',
})
export class AsignacionesComponent implements OnInit {
  private gql = inject(ActivosGqlService);
  private auth = inject(AuthService);

  activos = signal<Activo[]>([]);
  areas = signal<Area[]>([]);
  responsables = signal<Responsable[]>([]);
  asignaciones = signal<Asignacion[]>([]);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');

  showModal = signal(false);
  selectedActivoId = signal<string>('');
  searchTerm = '';

  form = {
    activoId: '',
    responsableId: '',
    areaId: '',
    fechaAsignacion: new Date().toISOString().slice(0, 10),
    observaciones: '',
  };

  ngOnInit(): void {
    if (this.muestraVistaPorActivo) {
      this.loading.set(false);
      this.gql.getActivos().subscribe((data) => this.activos.set(data));
      this.gql.getAreas().subscribe((data) => this.areas.set(data));
    }

    this.gql.getResponsables().subscribe({
      next: (data) => {
        this.responsables.set(data);
        if (!this.muestraVistaPorActivo) {
          this.cargarAsignacionesDelUsuario(data);
        }
      },
      error: () => {
        this.error.set('Error al cargar responsables.');
        this.loading.set(false);
      },
    });
  }

  cargar(): void {
    if (!this.muestraVistaPorActivo) {
      this.cargarAsignacionesDelUsuario(this.responsables());
      return;
    }

    if (this.selectedActivoId()) {
      this.loading.set(true);
      this.gql.getAsignacionesPorActivo(this.selectedActivoId()).subscribe({
        next: (data) => {
          this.asignaciones.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar asignaciones.');
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  onActivoChange(): void {
    if (this.selectedActivoId()) this.cargar();
    else this.asignaciones.set([]);
  }

  get asignacionesFiltradas(): Asignacion[] {
    if (!this.searchTerm) return this.asignaciones();
    const term = this.searchTerm.toLowerCase();
    return this.asignaciones().filter(
      (a) =>
        a.activo?.codigo?.toLowerCase().includes(term) ||
        a.activo?.nombre?.toLowerCase().includes(term) ||
        a.responsable?.nombre?.toLowerCase().includes(term) ||
        a.area?.nombre?.toLowerCase().includes(term),
    );
  }

  get activosDisponibles(): Activo[] {
    return this.activos().filter((a) => a.estado === 'ACTIVO');
  }

  get muestraVistaPorActivo(): boolean {
    return this.auth.hasRole('ADMINISTRADOR', 'AUDITOR');
  }

  get puedeGestionarAsignaciones(): boolean {
    return this.auth.hasRole('ADMINISTRADOR');
  }

  openModal(): void {
    if (!this.puedeGestionarAsignaciones) return;
    this.form = {
      activoId: this.selectedActivoId() || '',
      responsableId: '',
      areaId: '',
      fechaAsignacion: new Date().toISOString().slice(0, 10),
      observaciones: '',
    };
    this.showModal.set(true);
  }

  guardar(): void {
    if (!this.puedeGestionarAsignaciones) return;
    if (!this.form.activoId || !this.form.responsableId || !this.form.areaId) return;
    this.saving.set(true);
    this.error.set('');
    this.gql.asignarActivo(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.success.set('Activo asignado correctamente.');
        if (this.selectedActivoId()) this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.message || 'Error al asignar activo.');
      },
    });
  }

  devolver(asignacion: Asignacion): void {
    if (!this.puedeGestionarAsignaciones) return;
    if (!confirm(`¿Devolver la asignación de "${asignacion.activo?.nombre}"?`)) return;
    this.gql.devolverActivo(asignacion.id).subscribe({
      next: () => {
        this.success.set('Activo devuelto.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => this.error.set(e?.message || 'Error al devolver.'),
    });
  }

  private cargarAsignacionesDelUsuario(responsables: Responsable[]): void {
    const user = this.auth.currentUser();
    const responsable = responsables.find(
      (r) => r.email.toLowerCase() === user?.email.toLowerCase(),
    );

    if (!responsable) {
      this.asignaciones.set([]);
      this.error.set('No existe un responsable vinculado al email del usuario autenticado.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.gql.getAsignacionesPorResponsable(responsable.id).subscribe({
      next: (data) => {
        this.asignaciones.set(data.filter((a) => a.activa));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los equipos asignados al usuario.');
        this.loading.set(false);
      },
    });
  }
}
