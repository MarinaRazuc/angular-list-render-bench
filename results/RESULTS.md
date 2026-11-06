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
