import { describe, expect, it } from 'vitest';
import { discountInCents, maxDiscountInput, toCents } from './PDV';

describe('cálculos monetários do PDV', () => {
  it('arredonda valores monetários em centavos', () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('arredonda desconto percentual e mantém total líquido mínimo de um centavo', () => {
    expect(discountInCents(999, 10, 'PERCENTUAL')).toBe(100);
    expect(discountInCents(1000, 100, 'PERCENTUAL')).toBe(999);
    expect(discountInCents(1000, 10, 'VALOR')).toBe(999);
  });

  it('deriva limites de desconto coerentes com o total', () => {
    expect(maxDiscountInput(1000, 'VALOR')).toBe(9.99);
    expect(maxDiscountInput(1000, 'PERCENTUAL')).toBe(99.9);
    expect(maxDiscountInput(1, 'VALOR')).toBe(0);
  });
});
