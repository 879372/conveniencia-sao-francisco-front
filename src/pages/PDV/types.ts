export interface Produto {
  id: string;
  nome: string;
  preco_venda: string | number;
  codigo_legado?: string;
  unidade_medida?: string;
}

export interface ItemCarrinho {
  id?: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  unidade?: string;
}

export interface Sessao {
  id: string;
  aberta_em: string;
  fundo_inicial: string;
  operador_nome: string;
  status: 'ABERTA' | 'FECHADA';
}

export interface Venda {
  id: string;
  total: string | number;
  status: 'EM_ABERTO' | 'FINALIZADA' | 'CANCELADA';
  itens: any[];
}

export interface Pagamento {
  forma: string;
  valor: number;
}
