import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="home">
      <h1>Angular list render bench</h1>
      <p>El mismo listado de productos renderizado con cuatro estrategias. Elegí el tamaño y abrí cada una.</p>

      <label>
        Filas
        <select (change)="rows.set(+$any($event.target).value)">
          @for (n of sizes; track n) {
            <option [value]="n" [selected]="n === rows()">{{ n.toLocaleString('es-ES') }}</option>
          }
        </select>
      </label>

      <ul class="strategies">
        @for (s of strategies; track s.path) {
          <li>
            <a [routerLink]="s.path" [queryParams]="{ n: rows() }">{{ s.title }}</a>
            <p>{{ s.summary }}</p>
          </li>
        }
      </ul>
    </main>
  `,
})
export class Home {
  protected readonly sizes = [1_000, 10_000, 50_000, 100_000];
  protected readonly rows = signal(10_000);
  protected readonly strategies = [
    { path: '/naive', title: 'Naive', summary: 'Default CD, métodos en el template, filas nuevas en cada filtro. Todo el DOM.' },
    { path: '/optimized', title: 'Signals + track', summary: 'OnPush, computed, track por id, pipes puros. Todo el DOM.' },
    { path: '/chunked', title: 'Render incremental', summary: 'Bloques de 200 filas que se agregan al hacer scroll (IntersectionObserver).' },
    { path: '/virtual', title: 'Virtual scroll (CDK)', summary: 'Solo existen en el DOM las filas visibles.' },
  ];
}
