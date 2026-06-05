import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { ReporteDepreciacionDTO, DetalleDepreciacionDTO } from '../../core/models/models';

@Component({
  selector: 'app-depreciacion',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './depreciacion.component.html',
  styleUrl: './depreciacion.component.scss',
})
export class DepreciacionComponent implements OnInit {
  private gql = inject(ActivosGqlService);

  anio = signal(new Date().getFullYear());
  reporte = signal<ReporteDepreciacionDTO | null>(null);
  loading = signal(false);
  error   = signal('');
  search  = '';

  readonly metodoLabels: Record<string, string> = {
    LINEAL:       'Lineal',
    ACELERADO:    'Acelerado',
    SUMA_DIGITOS: 'Suma de Dígitos',
  };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.gql.getReporteDepreciacion(this.anio()).subscribe({
      next: data => { this.reporte.set(data); this.loading.set(false); },
      error: () => { this.error.set('Error al generar el reporte.'); this.loading.set(false); },
    });
  }

  get detallesFiltrados(): DetalleDepreciacionDTO[] {
    const r = this.reporte();
    if (!r) return [];
    if (!this.search) return r.detalles;
    const t = this.search.toLowerCase();
    return r.detalles.filter(d =>
      d.activoCodigo.toLowerCase().includes(t) ||
      d.activoNombre.toLowerCase().includes(t)
    );
  }

  get anios(): number[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => current - i);
  }

  porcentajeDepreciado(d: DetalleDepreciacionDTO): number {
    if (!d.valorAdquisicion) return 0;
    return Math.min(100, Math.round((d.depreciacionAcumulada / d.valorAdquisicion) * 100));
  }

  metodoLabel(m: string): string {
    return this.metodoLabels[m] ?? m;
  }
}
