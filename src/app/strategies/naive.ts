import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BenchProbe } from '../bench/bench-probe';
import { matches, Product } from '../data/dataset';

/**
 * Baseline: the "it works on my machine" version that shows up a lot in real code.
 *
 * - Default change detection.
 * - Filtering runs in a template method, so it re-runs on every change detection pass.
 * - Each filter returns *new* row objects (like re-mapping an API response), and the
 *   loop tracks by object identity → Angular destroys and recreates every row.
 * - A new Intl.NumberFormat / Date formatter is created for every cell, every pass.
 * - Every row is in the DOM.
 */
@Component({
  selector: 'app-naive',
  providers: [BenchProbe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <header class="toolbar">
      <h1>Naive <small>{{ probe.rowCount }} filas</small></h1>
      <input data-testid="filter" placeholder="Filtrar…" (input)="term = $any($event.target).value" />
      <span data-testid="count">{{ visibleRows().length }} resultados</span>
    </header>
    <div class="viewport" data-testid="viewport">
      @for (row of visibleRows(); track row) {
        <div class="row">
          <span>{{ row.sku }}</span>
          <span>{{ row.name }}</span>
          <span>{{ row.category }}</span>
          <span class="num">{{ formatPrice(row.price) }}</span>
          <span class="num">{{ row.stock }}</span>
          <span>{{ formatDate(row.updatedAt) }}</span>
        </div>
      }
    </div>
  `,
})
export class NaiveList {
  protected readonly probe: BenchProbe;
  protected term = '';

  constructor(probe: BenchProbe) {
    this.probe = probe;
    probe.reportReadyAfterFirstRender('naive');
  }

  protected visibleRows(): Product[] {
    return this.probe.products.filter((r) => matches(r, this.term)).map((r) => ({ ...r }));
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected formatDate(value: number): string {
    return new Intl.DateTimeFormat('es-ES').format(value);
  }
}
