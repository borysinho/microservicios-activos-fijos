import { Component, OnInit, ViewChild, ElementRef, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { environment } from '../../../environments/environment';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import { Ms2Service } from '../../core/services/ms2.service';
import type { DashboardMetricasDTO } from '../../core/models/models';
import type { ClusteringResult } from '../../core/services/ms2.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

type ChartTheme = {
  accent: string;
  cyan: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  purple: string;
  grid: string;
  text: string;
  chartBorder: string;
};

@Component({
  selector: 'app-dashboard-bi',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './dashboard-bi.component.html',
  styleUrl: './dashboard-bi.component.scss',
})
export class DashboardBiComponent implements OnInit, OnDestroy {
  @ViewChild('donutCanvas') donutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas') barRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('areaCanvas') areaRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineRef?: ElementRef<HTMLCanvasElement>;

  private gql = inject(ActivosGqlService);
  private ms2 = inject(Ms2Service);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sub?: Subscription;
  private subClustering?: Subscription;
  private charts: Chart[] = [];
  private colorSchemeQuery?: MediaQueryList;
  private readonly colorSchemeListener = () => {
    const currentData = this.data();
    if (currentData) {
      setTimeout(() => this.renderCharts(currentData), 0);
    }
  };

  data = signal<DashboardMetricasDTO | null>(null);
  // CU-59: Proyección de vida útil de activos críticos
  clusteringData = signal<ClusteringResult | null>(null);
  clusteringLoading = signal(false);
  loading = signal(true);
  error = signal('');
  refreshing = signal(false);

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.colorSchemeQuery.addEventListener('change', this.colorSchemeListener);
    }
    this.load();
    this.loadClustering();
  }

  // CU-59: Carga activos críticos desde el clustering de MS2
  private loadClustering(): void {
    this.clusteringLoading.set(true);
    this.subClustering = this.ms2.clustering().subscribe({
      next: (r) => {
        this.clusteringData.set(r);
        this.clusteringLoading.set(false);
      },
      error: () => this.clusteringLoading.set(false),
    });
  }

  // Obtiene el cluster de "Alta criticidad" para CU-59
  get activosCriticos(): string[] {
    return this.clusteringData()?.clusters.find((c) => c.id === 0)?.activos ?? [];
  }

  refresh(): void {
    this.refreshing.set(true);
    this.sub?.unsubscribe();
    this.sub = this.gql.getDashboardBI().subscribe({
      next: (d) => {
        this.data.set(d);
        this.refreshing.set(false);
        setTimeout(() => this.renderCharts(d), 0);
      },
      error: (err) => {
        this.refreshing.set(false);
        this.handleError(err);
      },
    });
  }

  private load(): void {
    this.sub = this.gql.getDashboardBI().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(d), 0);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleError(err);
      },
    });
  }

  private handleError(err: any): void {
    // Cobertura amplia: HttpErrorResponse (.status), ServerError/ServerParseError
    // (.statusCode, .response.status) y CORS-blocked 401 que llega como status 0
    const httpStatus =
      err?.networkError?.status ??
      err?.networkError?.statusCode ??
      err?.networkError?.response?.status;

    const isUnauthorized =
      err?.graphQLErrors?.some(
        (e: any) =>
          e?.extensions?.classification === 'UNAUTHORIZED' ||
          e?.message?.toLowerCase().includes('unauthorized') ||
          e?.message?.toLowerCase().includes('access denied'),
      ) ||
      httpStatus === 401 ||
      httpStatus === 403 ||
      // status 0 = CORS bloqueado, típicamente por 401/403 de Spring Security
      // antes de que se añadan los headers CORS → tratar como sesión expirada
      (err?.networkError != null && httpStatus === 0);

    if (isUnauthorized) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return;
    }

    const msg = err?.networkError
      ? `Error de red: no se pudo alcanzar MS1 (${environment.ms1GraphqlUrl})`
      : (err?.graphQLErrors?.[0]?.message ?? 'Error desconocido al cargar métricas');
    this.error.set(msg);
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subClustering?.unsubscribe();
    this.colorSchemeQuery?.removeEventListener('change', this.colorSchemeListener);
    this.charts.forEach((c) => c.destroy());
  }

  private renderCharts(d: DashboardMetricasDTO): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    const theme = this.getChartTheme();
    const palette = [
      theme.accent,
      theme.cyan,
      theme.success,
      theme.danger,
      theme.warning,
      theme.purple,
    ];

    // Donut: activos por estado
    this.charts.push(
      new Chart(this.donutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Activos', 'Mantenimiento', 'Transferidos', 'Baja'],
          datasets: [
            {
              data: [
                d.activosActivos,
                d.activosEnMantenimiento,
                d.activosTransferidos,
                d.activosDadoDeBaja,
              ],
              backgroundColor: [theme.success, theme.warning, theme.info, theme.danger],
              borderColor: theme.chartBorder,
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.text,
                padding: 14,
                font: { family: 'Inter', size: 12 },
              },
            },
          },
        },
      }),
    );

    // Bar: activos por categoría
    this.charts.push(
      new Chart(this.barRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.activosPorCategoria.map((c) => c.categoria),
          datasets: [
            {
              label: 'Activos',
              data: d.activosPorCategoria.map((c) => c.cantidad),
              backgroundColor: palette,
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: theme.grid },
              ticks: { color: theme.text, font: { family: 'Inter' } },
            },
            y: {
              grid: { color: theme.grid },
              ticks: { color: theme.text, font: { family: 'Inter' } },
              beginAtZero: true,
            },
          },
        },
      }),
    );

    // Bar horizontal: activos por área
    this.charts.push(
      new Chart(this.areaRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.activosPorArea.map((a) => a.area),
          datasets: [
            {
              label: 'Activos',
              data: d.activosPorArea.map((a) => a.cantidad),
              backgroundColor: theme.cyan,
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: theme.grid },
              ticks: { color: theme.text, font: { family: 'Inter' } },
              beginAtZero: true,
            },
            y: {
              grid: { color: 'transparent' },
              ticks: { color: theme.text, font: { family: 'Inter' } },
            },
          },
        },
      }),
    );

    // CU-58: Línea — tendencia de adquisiciones por año
    if (this.lineRef && d.adquisicionesPorAnio?.length) {
      this.charts.push(
        new Chart(this.lineRef.nativeElement, {
          type: 'line',
          data: {
            labels: d.adquisicionesPorAnio.map((p) => String(p.anio)),
            datasets: [
              {
                label: 'Adquisiciones',
                data: d.adquisicionesPorAnio.map((p) => p.cantidad),
                borderColor: theme.accent,
                backgroundColor: this.hexToRgba(theme.accent, 0.14),
                borderWidth: 2,
                pointBackgroundColor: theme.accent,
                pointRadius: 4,
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { color: theme.grid },
                ticks: { color: theme.text, font: { family: 'Inter' } },
              },
              y: {
                grid: { color: theme.grid },
                ticks: { color: theme.text, font: { family: 'Inter' }, stepSize: 1 },
                beginAtZero: true,
              },
            },
          },
        }),
      );
    }
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
      info: cssVar('--info', '#3b82f6'),
      purple: '#a855f7',
      grid: cssVar('--border', '#d9e2ec'),
      text: cssVar('--text-secondary', '#536276'),
      chartBorder: cssVar('--chart-border', '#ffffff'),
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

  // CU-60: Exportar reporte BI en PDF usando window.print()
  exportarPDF(): void {
    window.print();
  }

  porcentaje(valor: number, total: number): number {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
  }
}
