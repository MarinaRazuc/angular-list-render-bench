import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BenchProbe } from '../bench/bench-probe';
import { matches } from '../data/dataset';
import { PricePipe, ShortDatePipe } from './format';

/**
 * Virtual scrolling with Angular CDK: only the rows inside the viewport (plus a buffer)
 * exist in the DOM, no matter how big the list is.
 *
 * Trade-offs: needs a fixed-height container and (here) a fixed row height, and
 * Ctrl+F / screen readers only see the rendered window.
 */
@Component({
  selector: 'app-virtual',
  providers: [BenchProbe],
  imports: [ScrollingModule, PricePipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="toolbar">
      <h1>Virtual scroll (CDK) <small>{{ probe.rowCount }} filas</small></h1>
      <input data-testid="filter" placeholder="Filtrar…" (input)="term.set($any($event.target).value)" />
      <span data-testid="count">{{ visibleRows().length }} resultados</span>
    </header>
    <cdk-virtual-scroll-viewport class="viewport" data-testid="viewport" itemSize="36" minBufferPx="720" maxBufferPx="1440">
      <div *cdkVirtualFor="let row of visibleRows(); trackBy: trackById" class="row">
        <span>{{ row.sku }}</span>
        <span>{{ row.name }}</span>
        <span>{{ row.category }}</span>
        <span class="num">{{ row.price | price }}</span>
        <span class="num">{{ row.stock }}</span>
        <span>{{ row.updatedAt | shortDate }}</span>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
})
export class VirtualList {
  protected readonly probe = inject(BenchProbe);
  protected readonly term = signal('');
  protected readonly visibleRows = computed(() => {
    const t = this.term();
    return this.probe.products.filter((r) => matches(r, t));
  });
  protected readonly trackById = (_: number, row: { id: number }) => row.id;

  constructor() {
    this.probe.reportReadyAfterFirstRender('virtual');
  }
}
