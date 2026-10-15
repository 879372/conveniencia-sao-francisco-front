import { describe, expect, it } from 'vitest';
import { COLUNAS, cupomDaVenda, montarCupom } from './cupom';

const vendaApi = {
  id: 33586,
  data: '2026-10-14T16:50:37',
  total: '5.00',
  desconto: '0.00',
  status: 'FINALIZADA',
  cliente_nome: null,
  operador_nome: '1',
  itens: [
    {
      produto: { codigo_legado: 38, nome: 'FOSFORO OLHO CAIXA', unidade_medida: 'UND' },
      quantidade: '1.000',
      preco_unitario: '5.00',
      subtotal: '5.00',
    },
  ],
  pagamentos: [{ forma: 'DINHEIRO', valor: '5.00' }],
};

// Remove comandos ESC/POS para inspecionar só o texto impresso.
const textoImpresso = (cupom: string) => cupom
  // eslint-disable-next-line no-control-regex
  .replace(/\x1B@|\x1Ba[\s\S]|\x1BE[\s\S]|\x1D![\s\S]|\x1DV[\s\S]/g, '')
  .split('\n');

describe('montarCupom', () => {
  it('reproduz o layout do DAV com pagamento em dinheiro e troco', () => {
    const cupom = montarCupom(cupomDaVenda(vendaApi, {
      pagamentos: [{ forma: 'DINHEIRO', valor: 20 }],
      troco: 15,
    }));
    const linhas = textoImpresso(cupom);

    expect(linhas).toContain('CONVENIENCIA SAO FRANCISCO');
    expect(linhas).toContain('DAV N.: 33586');
    expect(linhas).toContain('001  38      FOSFORO OLHO CAIXA');
    expect(linhas.some((l) => /^Dinheiro +R\$ 20,00$/.test(l))).toBe(true);
    expect(linhas.some((l) => /^TROCO R\$\.: +R\$ 15,00$/.test(l))).toBe(true);
    expect(linhas).toContain('CLIENTE.: AVULSO');
  });

  it('não ultrapassa a largura do papel e usa apenas ASCII', () => {
    const cupom = montarCupom(cupomDaVenda({
      ...vendaApi,
      cliente_nome: 'José da Conceição',
      itens: [{ ...vendaApi.itens[0], produto: { nome: 'NOME DE PRODUTO MUITO GRANDE QUE PRECISA QUEBRAR EM DUAS LINHAS' } }],
    }));

    textoImpresso(cupom).forEach((l) => expect(l.length).toBeLessThanOrEqual(COLUNAS));
    expect([...cupom].every((c) => c.charCodeAt(0) < 128)).toBe(true);
  });
});
