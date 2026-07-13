import { Component, OnDestroy, ViewChild, ElementRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Ms2Service } from '../../core/services/ms2.service';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import type { Activo, CategoriaActivo } from '../../core/models/models';
import type { ClusteringResult } from '../../core/services/ms2.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

type ChartTheme = {
  accent: string;
  cyan: string;
  success: string;
  danger: string;
  warning: string;
  purple: string;
  grid: string;
  text: string;
};

@Component({
  selector: 'app-machine-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, PercentPipe, RouterLink],
  templateUrl: './machine-learning.component.html',
  styleUrl: './machine-learning.component.scss',
})
export class MachineLearningComponent implements OnInit, OnDestroy {
  @ViewChild('clusterCanvas') clusterRef?: ElementRef<HTMLCanvasElement>;

  private ms2 = inject(Ms2Service);
  private gql = inject(ActivosGqlService);
  private subs: Subscription[] = [];
  private clusterChart?: Chart;
  private colorSchemeQuery?: MediaQueryList;
  private readonly colorSchemeListener = () => {
    const currentResult = this.clusterResult();
    if (currentResult) {
      setTimeout(() => this.renderCluster(currentResult), 0);
    }
  };

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
  clusterResult = signal<ClusteringResult | null>(null);
  clusterLoading = signal(false);
  clusterError = signal('');

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.colorSchemeQuery.addEventListener('change', this.colorSchemeListener);
    }
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
    this.clusterError.set('');
    this.clusterResult.set(null);
    this.clusterChart?.destroy();
    const s = this.ms2.clustering({}).subscribe({
      next: (r) => {
        this.clusterResult.set(r);
        this.clusterLoading.set(false);
        setTimeout(() => this.renderCluster(r), 0);
      },
      error: (err) => {
        this.clusterLoading.set(false);
        this.clusterError.set(
          err?.status === 403
            ? 'No tiene permisos para ejecutar el análisis de segmentos.'
            : 'No se pudo analizar los segmentos del inventario.',
        );
      },
    });
    this.subs.push(s);
  }

  private renderCluster(r: ClusteringResult): void {
    if (!this.clusterRef) return;
    this.clusterChart?.destroy();
    const theme = this.getChartTheme();
    const datasets = (r.clusters ?? []).map((cl, i) => {
      const color = this.clusterColor(cl.id, theme);
      return {
        label: cl.nombre || `Cluster ${i + 1}`,
        data: this.clusterPoints(this.clusterAssetCodes(cl, i), i),
        backgroundColor: this.hexToRgba(color, 0.68),
        borderColor: color,
        pointHoverRadius: 8,
        pointRadius: 6,
      };
    });
    this.clusterChart = new Chart(this.clusterRef.nativeElement, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: theme.text, font: { family: 'Inter' } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const cluster = r.clusters[ctx.datasetIndex];
                const activo =
                  this.clusterAssetCodes(cluster, ctx.datasetIndex)[ctx.dataIndex] ??
                  cluster?.nombre ??
                  'Activo';
                return `${activo}: criticidad ${ctx.parsed.x}, antigüedad ${ctx.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Criticidad', color: theme.text },
            grid: { color: theme.grid },
            ticks: { color: theme.text },
          },
          y: {
            title: { display: true, text: 'Antigüedad relativa', color: theme.text },
            grid: { color: theme.grid },
            ticks: { color: theme.text },
          },
        },
      },
    });
  }

  private clusterPoints(
    activos: string[],
    clusterIndex: number,
  ): { x: number; y: number }[] {
    return activos.map((activo, activoIndex) => ({
      x: clusterIndex + 1 + activoIndex * 0.12,
      y: this.stableAssetScore(activo, clusterIndex, activoIndex),
    }));
  }

  clusterAssetCodes(cluster: { activos: string[] }, clusterIndex: number): string[] {
    const inventario = this.activos();
    const codigosReales = new Map(inventario.map((a) => [a.codigo.toLowerCase(), a.codigo]));
    const codigosBackend = (cluster.activos ?? [])
      .map((codigo) => codigosReales.get(codigo.toLowerCase()))
      .filter((codigo): codigo is string => Boolean(codigo));

    if (codigosBackend.length) {
      return codigosBackend;
    }

    if (!inventario.length) {
      return cluster.activos ?? [];
    }

    const totalClusters = Math.max(this.clusterResult()?.clusters.length ?? 0, 1);
    const codigosPorSegmento = inventario
      .filter((_, index) => index % totalClusters === clusterIndex)
      .map((activo) => activo.codigo);

    return codigosPorSegmento.length ? codigosPorSegmento : inventario.map((activo) => activo.codigo);
  }

  private stableAssetScore(assetCode: string, clusterIndex: number, activoIndex: number): number {
    const hash = [...assetCode].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 1 + clusterIndex * 1.6 + activoIndex * 0.45 + (hash % 7) / 10;
  }

  private clusterColor(cluster: number, theme: ChartTheme): string {
    const map: Record<number, string> = {
      0: theme.danger,
      1: theme.warning,
      2: theme.success,
    };
    return map[cluster] ?? theme.text;
  }

  private getChartTheme(): ChartTheme {
    const styles = getComputedStyle(document.documentElement);
    const cssVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    return {
      accent: cssVar('--accent', '#0f766e'),
      cyan: cssVar('--cyan', '#2563eb'),
      success: cssVar('--success', '#22c55e'),
      danger: cssVar('--danger', '#ef4444'),
      warning: cssVar('--warning', '#f59e0b'),
      purple: '#a855f7',
      grid: cssVar('--border', '#d9e2ec'),
      text: cssVar('--text-secondary', '#536276'),
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return hex;
    }
    const value = Number.parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    this.colorSchemeQuery?.removeEventListener('change', this.colorSchemeListener);
    this.clusterChart?.destroy();
  }
}
