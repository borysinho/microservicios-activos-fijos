import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Area, Responsable } from '../../core/models/models';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './areas.component.html',
  styleUrl: './areas.component.scss',
})
export class AreasComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  areas = signal<Area[]>([]);
  responsables = signal<Responsable[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  showAreaModal = signal(false);
  showRespModal = signal(false);
  editandoArea = signal<Area | null>(null);
  editandoResp = signal<Responsable | null>(null);
  searchTerm = '';

  formArea = { codigo: '', nombre: '', descripcion: '', responsableId: '' };
  formResp = { nombre: '', cargo: '', email: '', telefono: '' };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.gql.getAreas().subscribe((data) => {
      this.areas.set(data);
      this.loading.set(false);
    });
    this.gql.getResponsables().subscribe((data) => this.responsables.set(data));
  }

  get areasFiltradas(): Area[] {
    if (!this.searchTerm) return this.areas();
    const t = this.searchTerm.toLowerCase();
    return this.areas().filter(
      (a) => a.nombre.toLowerCase().includes(t) || a.codigo.toLowerCase().includes(t),
    );
  }

  // ── Áreas ──────────────────────────────────────────────────────────────

  openNewArea(): void {
    this.editandoArea.set(null);
    this.formArea = { codigo: '', nombre: '', descripcion: '', responsableId: '' };
    this.showAreaModal.set(true);
  }

  openEditArea(area: Area): void {
    this.editandoArea.set(area);
    this.formArea = {
      codigo: area.codigo,
      nombre: area.nombre,
      descripcion: area.descripcion || '',
      responsableId: area.responsable?.id || '',
    };
    this.showAreaModal.set(true);
  }

  guardarArea(): void {
    if (!this.formArea.codigo || !this.formArea.nombre) return;
    this.saving.set(true);
    this.error.set('');
    const input = {
      codigo: this.formArea.codigo,
      nombre: this.formArea.nombre,
      descripcion: this.formArea.descripcion || undefined,
      responsableId: this.formArea.responsableId || undefined,
    };
    const obs = this.editandoArea()
      ? this.gql.actualizarArea(this.editandoArea()!.id, input)
      : this.gql.crearArea(input);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showAreaModal.set(false);
        this.success.set('Área guardada.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.message || 'Error.');
      },
    });
  }

  eliminarArea(area: Area): void {
    if (!confirm(`¿Eliminar el área "${area.nombre}"?`)) return;
    this.gql.eliminarArea(area.id).subscribe({
      next: () => {
        this.success.set('Área eliminada.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => this.error.set(e?.message || 'Error.'),
    });
  }

  // ── Responsables ─────────────────────────────────────────────────────────

  openNewResp(): void {
    this.editandoResp.set(null);
    this.formResp = { nombre: '', cargo: '', email: '', telefono: '' };
    this.showRespModal.set(true);
  }

  openEditResp(resp: Responsable): void {
    this.editandoResp.set(resp);
    this.formResp = {
      nombre: resp.nombre,
      cargo: resp.cargo,
      email: resp.email,
      telefono: resp.telefono || '',
    };
    this.showRespModal.set(true);
  }

  guardarResp(): void {
    if (!this.formResp.nombre || !this.formResp.cargo || !this.formResp.email) return;
    this.saving.set(true);
    this.error.set('');
    const input = {
      nombre: this.formResp.nombre,
      cargo: this.formResp.cargo,
      email: this.formResp.email,
      telefono: this.formResp.telefono || undefined,
    };
    const obs = this.editandoResp()
      ? this.gql.actualizarResponsable(this.editandoResp()!.id, input)
      : this.gql.crearResponsable(input);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showRespModal.set(false);
        this.success.set('Responsable guardado.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.message || 'Error.');
      },
    });
  }
}
