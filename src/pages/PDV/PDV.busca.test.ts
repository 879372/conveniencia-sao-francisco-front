import { describe, expect, it } from 'vitest';
import { parseEntradaPdv } from './PDV';

describe('parseEntradaPdv', () => {
  it('trata somente dígitos como código de barras', () => {
    expect(parseEntradaPdv(' 7891234567890 ')).toEqual({ termo: '7891234567890', quantidade: 1, ehCodigo: true });
  });

  it('aplica o multiplicador de quantidade ao código', () => {
    expect(parseEntradaPdv('3*7891234567890')).toEqual({ termo: '7891234567890', quantidade: 3, ehCodigo: true });
    expect(parseEntradaPdv('1,5 * 38')).toEqual({ termo: '38', quantidade: 1.5, ehCodigo: true });
  });

  it('trata texto como busca por nome', () => {
    expect(parseEntradaPdv('2*coca')).toEqual({ termo: 'coca', quantidade: 2, ehCodigo: false });
    expect(parseEntradaPdv('coca 2l')).toEqual({ termo: 'coca 2l', quantidade: 1, ehCodigo: false });
  });

  it('ignora quantidade zero ou inválida', () => {
    expect(parseEntradaPdv('0*789')).toEqual({ termo: '0*789', quantidade: 1, ehCodigo: false });
  });
});
