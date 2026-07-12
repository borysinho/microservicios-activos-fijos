import { Component, OnDestroy, ViewChild, ElementRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Ms2Service } from '../../core/services/ms2.service';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Activo, CategoriaActivo } from '../../core/models/models';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-machine-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, PercentPipe],
  templateUrl: './machine-learning.component.html',
  styleUrl: './machine-learning.component.scss',
})
export class MachineLearningComponent implements OnInit, OnDestroy {
  @ViewChild('clusterCanvas') clusterRef?: ElementRef<HTMLCanvasElement>;

  private ms2 = inject(Ms2Service);
  private gql = inject(ActivosGqlService);
  private subs: Subscription[] = [];
  private clusterChart?: Chart;

  tab = signal<'vida' | 'cluster'>('vida');
  activos = signal<Activo[]>([]);
  categorias = signal<CategoriaActivo[]>([]);
  cargandoCatalogos = signal(false);
  selectedActivoId = signal('');

  // Vida útil
  vidaParams = { categoriaId: '', valorAdquisicion: 0, aniosFabricacion: 0 };
  vidaResult = signal<any>(null);
  vidaLoading = signal(false);

  // Clustering
  clusterResult = signal<any>(null);
  clusterLoading = signal(false);

  ngOnInit(): void {
    this.cargandoCatalogos.set(true);
    const activosSub = this.gql.getActivos().subscribe({
      next: (data) => {
        this.activos.set(data);
        this.cargandoCatalogos.set(false);
      },
      error: () => this.cargandoCatalogos.set(false),
    });
    const categoriasSub = this.gql.getCategorias().subscribe({
      next: (data) => this.categorias.set(data),
    });
    this.subs.push(activosSub, categoriasSub);
  }

  onActivoSeleccionado(): void {
    const activo = this.activos().find((a) => a.id === this.selectedActivoId());
    if (!activo) return;
    const fecha = new Date(activo.fechaAdquisicion);
    const anios = Number.isNaN(fecha.getTime())
      ? 0
      : Math.max(0, new Date().getFullYear() - fecha.getFullYear());
    this.vidaParams = {
      categoriaId: activo.categoria.id,
      valorAdquisicion: activo.valorAdquisicion,
      aniosFabricacion: anios,
    };
  }

  predecirVida(): void {
    this.vidaLoading.set(true);
    const s = this.ms2.prediccionVidaUtil(this.vidaParams).subscribe({
      next: (r) => {
        this.vidaResult.set(r);
        this.vidaLoading.set(false);
      },
      error: () => this.vidaLoading.set(false),
    });
    this.subs.push(s);
  }

  ejecutarClustering(): void {
    this.clusterLoading.set(true);
    const s = this.ms2.clustering({}).subscribe({
      next: (r) => {
        this.clusterResult.set(r);
        this.clusterLoading.set(false);
        setTimeout(() => this.renderCluster(r), 50);
      },
      error: () => this.clusterLoading.set(false),
    });
    this.subs.push(s);
  }

  private renderCluster(r: any): void {
    if (!this.clusterRef) return;
    this.clusterChart?.destroy();
    const colors = ['#0f766e', '#2563eb', '#22c55e', '#ef4444', '#a855f7', '#f59e0b'];
    const datasets = (r.clusters ?? []).map((cl: any, i: number) => ({
      label: `Cluster ${i + 1}`,
      data: cl.puntos ?? [],
      backgroundColor: colors[i % colors.length] + 'aa',
      pointRadius: 6,
    }));
    this.clusterChart = new Chart(this.clusterRef.nativeElement, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#536276', font: { family: 'Inter' } },
          },
        },
        scales: {
          x: { grid: { color: '#d9e2ec' }, ticks: { color: '#536276' } },
          y: { grid: { color: '#d9e2ec' }, ticks: { color: '#536276' } },
        },
      },
    });
  }

  clusterBadge(cluster: number): string {
    const map: Record<number, string> = {
      0: 'badge badge--danger',
      1: 'badge badge--warning',
      2: 'badge badge--success',
    };
    return map[cluster] ?? 'badge';
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.clusterChart?.destroy();
  }
}
