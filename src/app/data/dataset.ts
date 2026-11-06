export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  updatedAt: number;
}

const CATEGORIES = ['Lácteos', 'Bebidas', 'Limpieza', 'Almacén', 'Frescos', 'Perfumería', 'Congelados', 'Bazar'];
const NOUNS = ['Leche', 'Yogur', 'Agua', 'Jugo', 'Detergente', 'Arroz', 'Fideos', 'Queso', 'Galletitas', 'Café', 'Jabón', 'Aceite'];
const ADJECTIVES = ['entera', 'descremada', 'sin TACC', 'orgánico', 'light', 'familiar', 'premium', 'clásico', 'integral', 'x6'];

/** Small deterministic PRNG (mulberry32) so every run benchmarks the same data. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<number, Product[]>();

export function generateProducts(count: number, seed = 42): Product[] {
  const cached = cache.get(count);
  if (cached) return cached;

  const rand = mulberry32(seed);
  const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
  const base = Date.UTC(2026, 0, 1);

  const rows: Product[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: i + 1,
      sku: `SKU-${(100000 + i).toString(36).toUpperCase()}`,
      name: `${pick(NOUNS)} ${pick(ADJECTIVES)} ${Math.floor(rand() * 900 + 100)}`,
      category: pick(CATEGORIES),
      price: Math.round(rand() * 50000) / 100,
      stock: Math.floor(rand() * 500),
      updatedAt: base + Math.floor(rand() * 300 * 86_400_000),
    };
  }
  cache.set(count, rows);
  return rows;
}

export function matches(row: Product, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return row.name.toLowerCase().includes(t) || row.sku.toLowerCase().includes(t) || row.category.toLowerCase().includes(t);
}
