/**
 * Dados do cupom (DAV) impresso pelo PDV.
 */

export const LOJA = {
  nome: 'CONVENIÊNCIA SÃO FRANCISCO',
  cnpj: '08207365463',
  ie: '',
  endereco: 'ZONA RURAL,0',
  bairro: 'MASSANGANA - CEARÁ-MIRIM RN - 59570000',
};

export const FORMAS: Record<string, string> = {
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

export const moeda = (valor: number) =>
  `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
