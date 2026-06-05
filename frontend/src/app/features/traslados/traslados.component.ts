import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Activo, Traslado, Area, Usuario } from '../../core/models/models';

@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './traslados.component.html',
  styleUrl: './traslados.component.scss',
})
export class TrasladosComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  activos = signal<Activo[]>([]);
  areas = signal<Area[]>([]);
  usuarios = signal<Usuario[]>([]);
  traslados = signal<Traslado[]>([]);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');

  showModal = signal(false);
  selectedActivoId = signal<string>('');
  searchTerm = '';

  form = {
    activoId: '',
    areaDestinoId: '',
    autorizadoPorId: '',
    fecha: new Date().toISOString().slice(0, 10),
    motivoTraslado: '',
  };

  ngOnInit(): void {
    this.gql.getActivos().subscribe((data) => this.activos.set(data));
    this.gql.getAreas().subscribe((data) => this.areas.set(data));
    this.gql.getUsuarios().subscribe((data) => this.usuarios.set(data));
    this.loading.set(false);
  }

  cargar(): void {
    if (!this.selectedActivoId()) {
      this.traslados.set([]);
      return;
    }
    this.loading.set(true);
    this.gql.getTrasladosPorActivo(this.selectedActivoId()).subscribe({
      next: (data) => {
        this.traslados.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar traslados.');
        this.loading.set(false);
      },
    });
  }

  get trasladosFiltrados(): Traslado[] {
    if (!this.searchTerm) return this.traslados();
    const term = this.searchTerm.toLowerCase();
    return this.traslados().filter(
      (t) =>
        t.areaDestino?.nombre?.toLowerCase().includes(term) ||
        t.motivoTraslado?.toLowerCase().includes(term),
    );
  }

  /** Áreas disponibles como destino: excluye el área actual del activo seleccionado */
  get areasDestino(): Area[] {
    const activo = this.activos().find((a) => a.id === this.form.activoId);
    const areaActualId = activo?.areaActual?.id;
    return areaActualId ? this.areas().filter((ar) => ar.id !== areaActualId) : this.areas();
  }

  /** Área de origen del activo seleccionado en el formulario */
  get areaOrigenLabel(): string {
    const activo = this.activos().find((a) => a.id === this.form.activoId);
    return activo?.areaActual?.nombre ?? '—';
  }

  openModal(): void {
    this.form = {
      activoId: this.selectedActivoId() || '',
      areaDestinoId: '',
      autorizadoPorId: '',
      fecha: new Date().toISOString().slice(0, 10),
      motivoTraslado: '',
    };
    this.showModal.set(true);
  }

  guardar(): void {
    if (!this.form.activoId || !this.form.areaDestinoId || !this.form.autorizadoPorId) return;
    this.saving.set(true);
    this.error.set('');
    this.gql.trasladarActivo(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.success.set('Traslado registrado.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        const msg =
          e?.graphQLErrors?.[0]?.message ?? e?.message ?? 'Error al registrar el traslado.';
        this.error.set(msg);
      },
    });
  }

  confirmar(traslado: Traslado): void {
    if (!confirm(`¿Confirmar recepción del traslado hacia "${traslado.areaDestino?.nombre}"?`))
      return;
    this.gql.confirmarRecepcion(traslado.id).subscribe({
      next: () => {
        this.success.set('Recepción confirmada.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) =>
        this.error.set(e?.graphQLErrors?.[0]?.message ?? e?.message ?? 'Error al confirmar.'),
    });
  }
}
