import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BenchProbe } from '../bench/bench-probe';
import { matches } from '../data/dataset';
import { PricePipe, ShortDatePipe } from './format';

/**
 * Same DOM as the baseline (every row rendered), but written the idiomatic modern way:
 *
 * - OnPush + signals: the filtered list is a `computed`, recalculated only when the term changes.
 * - `track row.id`: rows that survive a filter keep their DOM nodes.
 * - Formatting through pure pipes with formatters built once.
 *
 * This isolates how much you win from *code quality alone*, without changing what is rendered.
 */
@Component({
  selector: 'app-optimized',
  providers: [BenchProbe],
  imports: [PricePipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="toolbar">
      <h1>Signals + track <small>{{ probe.rowCount }} filas</small></h1>
      <input data-testid="filter" placeholder="Filtrar…" (input)="term.set($any($event.target).value)" />
      <span data-testid="count">{{ visibleRows().length }} resultados</span>
    </header>
    <div class="viewport" data-testid="viewport">
      @for (row of visibleRows(); track row.id) {
        <div class="row">
          <span>{{ row.sku }}</span>
          <span>{{ row.name }}</span>
          <span>{{ row.category }}</span>
          <span class="num">{{ row.price | price }}</span>
          <span class="num">{{ row.stock }}</span>
          <span>{{ row.updatedAt | shortDate }}</span>
        </div>
      }
    </div>
  `,
})
export class OptimizedList {
  protected readonly probe = inject(BenchProbe);
  protected readonly term = signal('');
  protected readonly visibleRows = computed(() => {
    const t = this.term();
    return this.probe.products.filter((r) => matches(r, t));
  });

  constructor() {
    this.probe.reportReadyAfterFirstRender('optimized');
  }
}
