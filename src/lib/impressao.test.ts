import { describe, expect, it } from 'vitest';
import { cupomDaVenda } from './cupom';
import { montarCupomHtml } from './impressao';

const venda = {
  id: 33586,
  data: '2026-10-14T16:50:37',
  total: '5.00',
  desconto: '0.00',
  status: 'FINALIZADA',
  cliente_nome: null,
  operador_nome: '1',
  itens: [{
    produto: { codigo_legado: 38, nome: 'FOSFORO OLHO CAIXA', unidade_medida: 'UND' },
    quantidade: '1.000',
    preco_unitario: '5.00',
    subtotal: '5.00',
  }],
  pagamentos: [],
};

describe('montarCupomHtml', () => {
  it('monta o DAV com itens, pagamento e troco', () => {
    const html = montarCupomHtml(cupomDaVenda(venda, {
      pagamentos: [{ forma: 'DINHEIRO', valor: 20 }],
      troco: 15,
    }));

    expect(html).toContain('DAV N°.: 33586');
    expect(html).toContain('FOSFORO OLHO CAIXA');
    expect(html).toContain('<span>Dinheiro</span><span>R$ 20,00</span>');
    expect(html).toContain('<span>TROCO R$.:</span><span>R$ 15,00</span>');
    expect(html).toContain('CLIENTE.: AVULSO');
    expect(html).toContain('size: 80mm auto');
  });

  it('escapa nomes vindos do cadastro', () => {
    const html = montarCupomHtml(cupomDaVenda({
      ...venda,
      cliente_nome: '<img src=x onerror=alert(1)>',
      itens: [{ ...venda.itens[0], produto: { nome: '<script>alert(1)</script>' } }],
    }));

    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('<IMG SRC=X');
    expect(html).toContain('&lt;script&gt;');
  });
});
