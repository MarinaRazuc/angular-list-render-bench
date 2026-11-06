import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { BenchProbe } from '../bench/bench-probe';
import { matches } from '../data/dataset';
import { PricePipe, ShortDatePipe } from './format';

const CHUNK = 200;

/**
 * Incremental rendering in blocks: start with CHUNK rows and append another block whenever a
 * sentinel at the end of the list gets close to the viewport (IntersectionObserver).
 *
 * Keeps normal document flow (native scroll, Ctrl+F on what's loaded, variable row heights,
 * no special container) while the DOM grows only as far as the user actually scrolls.
 */
@Component({
  selector: 'app-chunked',
  providers: [BenchProbe],
  imports: [PricePipe, ShortDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="toolbar">
      <h1>Render incremental <small>{{ probe.rowCount }} filas</small></h1>
      <input data-testid="filter" placeholder="Filtrar…" (input)="onFilter($any($event.target).value)" />
      <span data-testid="count">{{ filtered().length }} resultados</span>
    </header>
    <div class="viewport" data-testid="viewport" #viewport>
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
      <div class="sentinel" #sentinel></div>
    </div>
  `,
})
export class ChunkedList {
  protected readonly probe = inject(BenchProbe);
  protected readonly term = signal('');
  protected readonly limit = signal(CHUNK);
  protected readonly filtered = computed(() => {
    const t = this.term();
    return this.probe.products.filter((r) => matches(r, t));
  });
  protected readonly visibleRows = computed(() => this.filtered().slice(0, this.limit()));

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    this.probe.reportReadyAfterFirstRender('chunked');
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && this.limit() < this.filtered().length) {
            this.limit.update((l) => l + CHUNK);
          }
        },
        { root: this.viewport().nativeElement, rootMargin: '0px 0px 800px 0px' },
      );
      observer.observe(this.sentinel().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onFilter(value: string): void {
    this.term.set(value);
    this.limit.set(CHUNK);
    this.viewport().nativeElement.scrollTop = 0;
  }
}
