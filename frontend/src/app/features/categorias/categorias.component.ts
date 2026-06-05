import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { CategoriaActivo, MetodoDepreciacion } from '../../core/models/models';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class CategoriasComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  categorias = signal<CategoriaActivo[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');
  showModal = signal(false);
  editando = signal<CategoriaActivo | null>(null);
  searchTerm = '';

  readonly metodos: MetodoDepreciacion[] = ['LINEAL', 'ACELERADO', 'SUMA_DIGITOS'];

  form: {
    nombre: string;
    descripcion: string;
    metodoDepreciacion: string;
    tasaDepreciacion: number;
  } = {
    nombre: '',
    descripcion: '',
    metodoDepreciacion: 'LINEAL',
    tasaDepreciacion: 20,
  };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.gql.getCategorias().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar categorías.');
        this.loading.set(false);
      },
    });
  }

  get categoriasFiltradas(): CategoriaActivo[] {
    if (!this.searchTerm) return this.categorias();
    const t = this.searchTerm.toLowerCase();
    return this.categorias().filter((c) => c.nombre.toLowerCase().includes(t));
  }

  openNew(): void {
    this.editando.set(null);
    this.form = { nombre: '', descripcion: '', metodoDepreciacion: 'LINEAL', tasaDepreciacion: 20 };
    this.showModal.set(true);
  }

  openEdit(cat: CategoriaActivo): void {
    this.editando.set(cat);
    this.form = {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      metodoDepreciacion: cat.metodoDepreciacion,
      tasaDepreciacion: cat.tasaDepreciacion,
    };
    this.showModal.set(true);
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.metodoDepreciacion) return;
    this.saving.set(true);
    this.error.set('');
    const obs = this.editando()
      ? this.gql.actualizarCategoria(this.editando()!.id, this.form as any)
      : this.gql.crearCategoria(this.form as any);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.success.set(this.editando() ? 'Categoría actualizada.' : 'Categoría creada.');
        this.cargar();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.message || 'Error.');
      },
    });
  }

  metodoLabel(m: string): string {
    return (
      { LINEAL: 'Línea Recta', ACELERADO: 'Saldo Decreciente', SUMA_DIGITOS: 'Suma de Dígitos' }[
        m
      ] || m
    );
  }
}
