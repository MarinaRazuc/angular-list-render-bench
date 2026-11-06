import { afterNextRender, inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { generateProducts, Product } from '../data/dataset';

export interface BenchReady {
  strategy: string;
  rows: number;
  /** ms since navigation start until the first screen of rows has been painted */
  readyMs: number;
  domNodes: number;
}

declare global {
  interface Window {
    __bench?: BenchReady;
  }
}

/** Waits for the frame that contains the last DOM change to actually be painted. */
export function afterPaint(): Promise<number> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(() => resolve(performance.now()), 0)),
  );
}

/**
 * Per-page helper: reads `?n=` from the URL, builds the dataset and,
 * once Angular has rendered the first time, publishes timings on `window.__bench`
 * so the Playwright harness can read them.
 */
@Injectable()
export class BenchProbe {
  private readonly route = inject(ActivatedRoute);

  readonly rowCount = Math.max(1, Number(this.route.snapshot.queryParamMap.get('n')) || 10_000);
  readonly products: Product[] = generateProducts(this.rowCount);

  reportReadyAfterFirstRender(strategy: string): void {
    afterNextRender(async () => {
      const readyMs = await afterPaint();
      performance.mark('bench:ready');
      window.__bench = {
        strategy,
        rows: this.rowCount,
        readyMs: Math.round(readyMs),
        domNodes: document.getElementsByTagName('*').length,
      };
    });
  }
}
