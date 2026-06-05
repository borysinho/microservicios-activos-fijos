import {
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  AfterViewInit,
} from '@angular/core';
import { CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Ms2Service } from '../../core/services/ms2.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-machine-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, PercentPipe],
  templateUrl: './machine-learning.component.html',
  styleUrl: './machine-learning.component.scss',
})
export class MachineLearningComponent implements OnDestroy {
  @ViewChild('clusterCanvas') clusterRef?: ElementRef<HTMLCanvasElement>;

  private ms2 = inject(Ms2Service);
  private subs: Subscription[] = [];
  private clusterChart?: Chart;

  tab = signal<'vida' | 'cluster'>('vida');

  // Vida útil
  vidaParams = { categoriaId: '', valorAdquisicion: 0, aniosFabricacion: 0 };
  vidaResult = signal<any>(null);
  vidaLoading = signal(false);

  // Clustering
  clusterResult = signal<any>(null);
  clusterLoading = signal(false);

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
    const colors = ['#f0a500', '#00cfd8', '#22c55e', '#ef4444', '#a855f7', '#3b82f6'];
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
            labels: { color: '#8da3c0', font: { family: 'Space Grotesk' } },
          },
        },
        scales: {
          x: { grid: { color: '#1e3356' }, ticks: { color: '#8da3c0' } },
          y: { grid: { color: '#1e3356' }, ticks: { color: '#8da3c0' } },
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
