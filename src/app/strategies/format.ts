import { Pipe, PipeTransform } from '@angular/core';

// Formatters are expensive to construct: build them once and reuse them.
const priceFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('es-ES');

/** Pure pipes: Angular only re-runs them when the input value changes. */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(value: number): string {
    return priceFmt.format(value);
  }
}

@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  transform(value: number): string {
    return dateFmt.format(value);
  }
}
