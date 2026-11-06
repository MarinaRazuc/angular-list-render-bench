# Angular list render bench

¿Cuánto cuesta realmente renderizar un listado grande en Angular, y qué técnica conviene según el caso?

Este repo renderiza **el mismo listado de productos** (con filtro de texto) con cuatro estrategias y las mide con un harness de Playwright reproducible: primer render, bloqueo del hilo principal, latencia al filtrar, fluidez del scroll, nodos DOM y memoria.

Angular 22 (zoneless, standalone, signals) · Angular CDK · Playwright · GitHub Actions.

## Las cuatro estrategias

| | Estrategia | Qué hace | Archivo |
|---|---|---|---|
| 1 | **Naive** | Change detection por defecto, filtro en un método del template, filas nuevas en cada filtro con `track` por identidad, un `Intl` nuevo por celda. Todo en el DOM. | [`naive.ts`](src/app/strategies/naive.ts) |
| 2 | **Signals + track** | `OnPush`, lista filtrada en un `computed`, `track row.id`, pipes puros con formateadores reutilizados. Mismo DOM que la 1. | [`optimized.ts`](src/app/strategies/optimized.ts) |
| 3 | **Render incremental** | Empieza con 200 filas y agrega bloques de 200 cuando un centinela se acerca al viewport (`IntersectionObserver`). | [`chunked.ts`](src/app/strategies/chunked.ts) |
| 4 | **Virtual scroll (CDK)** | `cdk-virtual-scroll-viewport`: solo existen las filas visibles más un buffer. | [`virtual.ts`](src/app/strategies/virtual.ts) |

La 1 y la 2 renderizan exactamente lo mismo, así que su diferencia aísla **cuánto se gana solo con escribir mejor el componente**. La 3 y la 4 cambian **qué** se renderiza.

## Resultados

<!-- results:start -->
_Mediana de 5 corridas · Chrome headless · CPU ×4 · 2026-11-04_

### 1,000 filas

| Estrategia | Primer render | vs. naive | TBT | Filtrar | Quitar filtro | Scroll p95 frame | Nodos DOM | Heap JS |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Naive | 1,537 ms | 1.0× | 1,182 ms | 126 ms | 1,103 ms | 38.1 ms | 7,024 | 3.4 MB |
| Signals + track | 1,076 ms | 1.4× | 633 ms | 60 ms | 479 ms | 26.9 ms | 7,024 | 3.5 MB |
| Render incremental | 843 ms | 1.8× | 379 ms | 61 ms | 98 ms | 122.0 ms | 1,425 | 3.0 MB |
| Virtual scroll (CDK) | 640 ms | 2.4× | 256 ms | 59 ms | 44 ms | 50.8 ms | 447 | 3.1 MB |

### 10,000 filas

| Estrategia | Primer render | vs. naive | TBT | Filtrar | Quitar filtro | Scroll p95 frame | Nodos DOM | Heap JS |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Naive | 11,508 ms | 1.0× | 11,061 ms | 1,379 ms | 9,957 ms | 231.9 ms | 70,024 | 9.7 MB |
| Signals + track | 5,256 ms | 2.2× | 4,808 ms | 696 ms | 3,862 ms | 109.8 ms | 70,024 | 9.7 MB |
| Render incremental | 761 ms | 15.1× | 323 ms | 130 ms | 120 ms | 116.0 ms | 1,425 | 4.5 MB |
| Virtual scroll (CDK) | 678 ms | 17.0× | 303 ms | 102 ms | 43 ms | 55.8 ms | 447 | 4.7 MB |

### 50,000 filas

| Estrategia | Primer render | vs. naive | TBT | Filtrar | Quitar filtro | Scroll p95 frame | Nodos DOM | Heap JS |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Naive | 51,593 ms | 1.0× | 51,029 ms | 6,886 ms | 49,132 ms | 1,005.9 ms | 350,024 | 37.1 MB |
| Signals + track | 22,162 ms | 2.3× | 21,638 ms | 8,331 ms | 19,141 ms | 545.6 ms | 350,024 | 37.3 MB |
| Render incremental | 840 ms | 61.4× | 431 ms | 166 ms | 139 ms | 120.1 ms | 1,425 | 10.9 MB |
| Virtual scroll (CDK) | 692 ms | 74.6× | 311 ms | 106 ms | 44 ms | 51.6 ms | 447 | 11.2 MB |

<!-- results:end -->

La metodología completa está en [ADR 0001](docs/adr/0001-metodologia-de-medicion.md). Los números absolutos dependen de la máquina; lo relevante es la relación entre estrategias dentro de una misma corrida.

## Conclusiones

1. **Renderizar todo no escala, por mejor escrito que esté el componente.** Con 50.000 filas, la versión naive tarda 51,6 s en mostrar algo y el hilo principal queda bloqueado casi todo ese tiempo (TBT ≈ 51 s): la página está congelada. El coste crece de forma lineal con las filas porque crece lineal el DOM (7 nodos por fila).

2. **Escribir bien el componente reduce el tiempo a menos de la mitad, sin cambiar el DOM.** Signals + `track` + pipes puros es 2,2–2,3× más rápido en el primer render con 10.000 y 50.000 filas, y quitar el filtro pasa de 9,9 s a 3,9 s con 10.000. Para listas de cientos de filas es suficiente.

3. **Pero no siempre gana en todo.** Al filtrar 50.000 filas, la versión optimizada fue *más lenta* que la naive (8,3 s frente a 6,9 s). Hipótesis, pendiente de perfilar: con `track row.id` Angular resuelve fila por fila cuáles sobreviven y destruye unas 46.000 vistas de a una, mientras que la naive descarta la colección entera. Por eso medir importa: la intuición dice que `track` siempre ayuda.

4. **Cambiar qué se renderiza es lo que resuelve el problema.** El render incremental y el virtual scroll se quedan entre 0,6 y 0,85 s de primer render **sea cual sea el tamaño** (61× y 75× más rápidos que naive con 50.000 filas), con filtros por debajo de 170 ms.
5. **El render incremental cobra su precio en el scroll.** Su p95 de frame al hacer scroll ronda los 120 ms (cada bloque de 200 filas se pinta mientras el usuario baja) y el DOM crece: tras recorrer unas 1.650 filas tiene 12.600 nodos. El virtual scroll se mantiene en unos 50 ms y menos de 600 nodos. Siguiente experimento: bloques más pequeños o pintarlos en `requestIdleCallback`.

6. **La memoria la domina el DOM, no los datos.** Con 50.000 filas, las estrategias que pintan todo usan 37 MB de heap JS y las que no, 11 MB, con los mismos datos en memoria.

## ¿Cuál elegir?

| Si necesitás… | Conviene |
|---|---|
| Listas de cientos de filas | Signals + track. Con buen código no hace falta nada más. |
| Miles de filas, alturas variables, que funcione Ctrl+F sobre lo cargado, o un layout que no es un contenedor fijo | Render incremental |
| Decenas de miles de filas con altura fija, scroll libre hasta cualquier punto | Virtual scroll |
| Más de eso, o datos que llegan del servidor | Paginación o scroll infinito en el backend: no tiene sentido traer 100.000 filas al cliente |

Trade-offs que los números no muestran: el virtual scroll necesita altura de fila fija (o `autosize`, experimental), un contenedor con altura y rompe la búsqueda nativa del navegador y parte de la accesibilidad (los lectores de pantalla solo ven la ventana renderizada). El render incremental mantiene el flujo normal del documento pero el DOM crece a medida que el usuario baja.

## Cómo ejecutarlo

```bash
npm ci
npx playwright install chromium

npm start                 # app en http://localhost:4200 para explorar cada estrategia
npm run verify            # comprueba que las 4 estrategias muestran los mismos datos (requiere build)
npm run bench:full        # build de producción + benchmark; actualiza la tabla de este README
```

Variables del benchmark:

| Variable | Por defecto | |
|---|---|---|
| `SIZES` | `1000,10000,50000` | Tamaños de lista |
| `RUNS` | `5` | Corridas por combinación (se reporta la mediana) |
| `CPU` | `4` | Factor de throttling de CPU |
| `STRATEGIES` | las cuatro | Subconjunto a medir |
| `CHROME_PATH` | — | Usar un Chrome del sistema en vez del de Playwright |

Cada push corre `verify` y el benchmark en GitHub Actions y publica la tabla en el resumen del job ([workflow](.github/workflows/bench.yml)).

## Estructura

```
src/app/
  data/dataset.ts         dataset determinista (PRNG con semilla)
  bench/bench-probe.ts    expone las métricas del primer render en window.__bench
  strategies/             una estrategia por archivo
bench/
  run.mjs                 harness de medición y generación de la tabla
  verify.mjs              guardia de corrección
  serve.mjs               servidor estático del build
docs/adr/                 decisiones de diseño
```
