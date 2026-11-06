import { Routes } from '@angular/router';
import { Home } from './home';

// Each strategy is lazy-loaded so its cost shows up only on its own page.
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'naive', loadComponent: () => import('./strategies/naive').then((m) => m.NaiveList) },
  { path: 'optimized', loadComponent: () => import('./strategies/optimized').then((m) => m.OptimizedList) },
  { path: 'chunked', loadComponent: () => import('./strategies/chunked').then((m) => m.ChunkedList) },
  { path: 'virtual', loadComponent: () => import('./strategies/virtual').then((m) => m.VirtualList) },
  { path: '**', redirectTo: '' },
];
