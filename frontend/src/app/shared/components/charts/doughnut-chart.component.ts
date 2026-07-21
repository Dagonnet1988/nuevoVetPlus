import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-doughnut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 250px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `]
})
export class DoughnutChartComponent implements OnInit, OnChanges {
  @Input() data: any;
  @Input() options: any;
  @Input() title: string = '';
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef;

  private chart: Chart | null = null;

  ngOnInit() {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      this.updateChart(this.data);
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    const safeData = this.getSafeData(this.data);

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!this.title,
          text: this.title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'bottom' as const
        }
      }
    };

    const config: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: safeData,
      options: { ...defaultOptions, ...this.options }
    };

    this.chart = new Chart(ctx, config);
  }

  updateChart(newData: any) {
    const safeData = this.getSafeData(newData);

    if (this.chart) {
      this.chart.data = safeData;
      this.chart.update();
    } else {
      this.createChart();
    }
  }

  private getSafeData(data: any): any {
    if (data?.labels?.length && data?.datasets?.length) {
      return data;
    }

    return {
      labels: ['Sin datos'],
      datasets: [
        {
          data: [1],
          backgroundColor: ['#e0e0e0']
        }
      ]
    };
  }
}
