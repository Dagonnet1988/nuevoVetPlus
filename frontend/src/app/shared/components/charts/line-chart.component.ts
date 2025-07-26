import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-line-chart',
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
      min-height: 300px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `]
})
export class LineChartComponent implements OnInit {
  @Input() data: any;
  @Input() options: any;
  @Input() title: string = '';
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef;

  private chart: Chart | null = null;

  ngOnInit() {
    this.createChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    
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
          position: 'top' as const
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        x: {
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        }
      }
    };

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: this.data,
      options: { ...defaultOptions, ...this.options }
    };

    this.chart = new Chart(ctx, config);
  }

  updateChart(newData: any) {
    if (this.chart) {
      this.chart.data = newData;
      this.chart.update();
    }
  }
}