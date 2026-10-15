/**
 * Monta o cupom (DAV) em ESC/POS para impressora térmica de 80mm.
 * Layout baseado no DAV usado pela loja.
 */
import { sanitize } from './thermalPrint';

// Bematech MP-4200 TH em 80mm: 48 colunas na fonte padrão.
export const COLUNAS = 48;

export const LOJA = {
  nome: 'CONVENIÊNCIA SÃO FRANCISCO',
  cnpj: '08207365463',
  ie: '',
  endereco: 'ZONA RURAL,0',
  bairro: 'MASSANGANA - CEARÁ-MIRIM RN - 59570000',
};

const FORMAS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_DEBITO: 'Cartão Débito',
  CARTAO_CREDITO: 'Cartão Crédito',
  FIADO: 'Fiado',
};

export interface CupomItem {
  codigo?: string | number | null;
  descricao: string;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
  subtotal: number;
}

export interface CupomDados {
  numero: string | number;
  data: Date;
  itens: CupomItem[];
  total: number;
  desconto: number;
  pagamentos: { forma: string; valor: number }[];
  troco: number;
  cliente?: string | null;
  operador?: string | null;
  orcamento?: boolean;
}

const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  init: `${ESC}@`,
  left: `${ESC}a\x00`,
  center: `${ESC}a\x01`,
  boldOn: `${ESC}E\x01`,
  boldOff: `${ESC}E\x00`,
  normal: `${GS}!\x00`,
  doubleHeight: `${GS}!\x01`,
  cut: `${GS}V\x00`,
};

export const moeda = (valor: number) =>
  `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const quantidade = (valor: number) =>
  Number.isInteger(Number(valor))
    ? String(Number(valor))
    : Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const dataHora = (data: Date) =>
  `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}`;

/** Texto à esquerda e à direita na mesma linha. */
export const linha = (esquerda: string, direita = '') => {
  const esq = sanitize(esquerda);
  const dir = sanitize(direita);
  const espaco = Math.max(1, COLUNAS - esq.length - dir.length);
  return (esq + ' '.repeat(espaco) + dir).slice(0, COLUNAS);
};

/** Quebra textos longos em várias linhas de COLUNAS caracteres. */
const quebrar = (texto: string, recuo = 0) => {
  const limpo = sanitize(texto);
  const linhas: string[] = [];
  for (let i = 0; i < limpo.length; i += COLUNAS - (i ? recuo : 0)) {
    linhas.push((i ? ' '.repeat(recuo) : '') + limpo.slice(i, i + COLUNAS - (i ? recuo : 0)));
  }
  return linhas.length ? linhas : [''];
};

const tracejado = '-'.repeat(COLUNAS);
const duplo = '='.repeat(COLUNAS);

/** Gera o texto do cupom com comandos ESC/POS (somente ASCII). */
export function montarCupom(dados: CupomDados): string {
  const out: string[] = [];
  const add = (texto: string) => out.push(texto + '\n');

  out.push(CMD.init, CMD.center, CMD.boldOn);
  add(sanitize(LOJA.nome));
  out.push(CMD.boldOff);
  add(sanitize(LOJA.nome));
  out.push(CMD.left);
  add(linha(`CNPJ.: ${LOJA.cnpj}`, `IE.: ${LOJA.ie}`));
  quebrar(`End.: ${LOJA.endereco}`).forEach(add);
  quebrar(`Bairro.: ${LOJA.bairro}`).forEach(add);
  add('');

  out.push(CMD.center, CMD.boldOn);
  if (dados.orcamento) {
    add('ORCAMENTO');
  } else {
    add('DAV - Documento Auxiliar de Venda');
    add('da Nota Fiscal de Consumidor Eletronica');
  }
  out.push(CMD.boldOff);
  add('Nao tem valor fiscal');
  add('');

  out.push(CMD.left, CMD.doubleHeight);
  add(`${dados.orcamento ? 'ORCAMENTO' : 'DAV'} N.: ${dados.numero}`);
  out.push(CMD.normal);
  add(tracejado);
  add('ITEM  CODIGO  DESCRICAO');
  add('  QTD     UND'.padEnd(20) + 'VL.UNIT R$'.padStart(14) + 'TOTAL R$'.padStart(14));
  add(tracejado);

  dados.itens.forEach((item, index) => {
    const seq = String(index + 1).padStart(3, '0');
    const codigo = String(item.codigo ?? '').padEnd(6);
    quebrar(`${seq}  ${codigo}  ${item.descricao}`, 14).forEach(add);
    const qtd = `${quantidade(item.quantidade)} x ${sanitize(item.unidade || 'UN')}`;
    add(
      qtd.padStart(16).padEnd(20)
      + moeda(item.precoUnitario).padStart(14)
      + moeda(item.subtotal).padStart(14)
    );
  });

  add(duplo);
  add(linha('TOTAL R$.:', moeda(dados.total)));
  if (dados.desconto > 0) {
    add(linha('DESCONTO R$.:', `- ${moeda(dados.desconto)}`));
  }
  add(tracejado);

  out.push(CMD.boldOn);
  add(linha('PAGAR R$.:', moeda(dados.total - dados.desconto)));
  out.push(CMD.boldOff);
  if (dados.pagamentos.length) {
    add(linha('FORMA DE PAGAMENTO', 'Valor Pago'));
    dados.pagamentos.forEach((p) => add(linha(FORMAS[p.forma] || p.forma, moeda(p.valor))));
  }
  if (dados.troco > 0) {
    add(linha('TROCO R$.:', moeda(dados.troco)));
  }
  add(tracejado);

  add(`CLIENTE.: ${sanitize(dados.cliente || 'AVULSO').toUpperCase()}`);
  add(linha('', dataHora(dados.data)));
  add(tracejado);

  out.push(CMD.center, CMD.boldOn);
  add(`TERMINAL.: CAIXA OPERADOR.: ${sanitize(dados.operador || '1').toUpperCase()}`);
  out.push(CMD.boldOff, CMD.left);

  out.push('\n\n\n\n', CMD.cut);
  return out.join('');
}

export const cupomBytes = (dados: CupomDados) => new TextEncoder().encode(montarCupom(dados));

/**
 * Converte a venda retornada pela API (VendaReadSerializer) em dados do cupom.
 * No PDV, informe os pagamentos digitados e o troco: a API grava o dinheiro já
 * descontado do troco, então o "Valor Pago" original só existe no caixa.
 */
export function cupomDaVenda(
  venda: any,
  extras: { pagamentos?: { forma: string; valor: number }[]; troco?: number } = {},
): CupomDados {
  return {
    numero: venda.id ?? '',
    data: venda.data ? new Date(venda.data) : new Date(),
    itens: (venda.itens || []).map((item: any) => ({
      codigo: item.produto?.codigo_legado ?? null,
      descricao: item.produto?.nome || item.produto_nome || item.nome || 'Item',
      quantidade: Number(item.quantidade || 0),
      unidade: item.produto?.unidade_medida || item.unidade || 'UN',
      precoUnitario: Number(item.preco_unitario || 0),
      subtotal: Number(item.subtotal || 0),
    })),
    total: Number(venda.total || 0),
    desconto: Number(venda.desconto || 0),
    pagamentos: (extras.pagamentos || venda.pagamentos || []).map((p: any) => ({
      forma: p.forma,
      valor: Number(p.valor || 0),
    })),
    troco: extras.troco || 0,
    cliente: venda.cliente_nome,
    operador: venda.operador_nome,
    orcamento: venda.status === 'ORCAMENTO',
  };
}
