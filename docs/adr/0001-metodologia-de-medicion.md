# ADR 0001 · Cómo medimos

**Estado:** aceptado

## Contexto

Comparar estrategias de renderizado de listas solo tiene sentido si todas se miden igual, con datos idénticos y en condiciones reproducibles. Lighthouse sirve para páginas, pero no mide bien interacciones (filtrar) ni scroll dentro de un contenedor.

## Decisión

- **Mismos datos:** dataset generado con un PRNG con semilla fija (`mulberry32`, seed 42). Cada estrategia recibe exactamente las mismas filas.
- **Mismo layout:** todas renderizan dentro del mismo contenedor de altura fija (`.viewport`) con filas de 36 px, para que el scroll sea comparable.
- **Contexto limpio por corrida:** cada medición abre un `BrowserContext` nuevo (sin caché ni heap compartido) y se repite N veces; se reporta la **mediana**.
- **CPU limitada ×4** por CDP (`Emulation.setCPUThrottlingRate`) para acercarse a un portátil corporativo o un móvil de gama media. Configurable con `CPU=`.
- **Métricas:**
  - *Primer render*: ms desde el inicio de la navegación hasta que Angular terminó el primer render **y** el navegador pintó ese frame (`afterNextRender` → `requestAnimationFrame` → `setTimeout`).
  - *TBT*: suma de la parte de cada long task que supera 50 ms antes del primer render.
  - *Filtrar / quitar filtro*: tiempo desde que se dispara el `input` hasta el siguiente frame pintado (aproximación local de INP).
  - *Scroll p95 frame*: 40 saltos de 1.500 px; percentil 95 del tiempo entre frames.
  - *Nodos DOM* y *heap JS* (tras forzar GC por CDP).
- **Guardia de corrección:** `npm run verify` comprueba que las cuatro estrategias muestran el mismo número de resultados y la misma primera fila para varios filtros. Una estrategia más rápida que muestra otros datos no vale.

## Consecuencias

- Los números absolutos dependen de la máquina; lo que importa es la **relación entre estrategias** en la misma corrida.
- "Primer render" favorece por diseño a las estrategias que no pintan todo (incremental y virtual): es justamente lo que se quiere mostrar, por eso también se reportan nodos DOM tras el scroll.
- El CI publica la tabla en el resumen del job, así cada cambio deja su medición.
