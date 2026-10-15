import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  Search,
  Eye,
  Trash2,
  Clock,
  User,
  X,
  ShoppingCart,
  Printer
} from 'lucide-react';
import { cupomDaVenda } from '../../lib/cupom';
import { imprimirCupom } from '../../lib/impressao';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import Modal from '../../components/Modal';
import FilterPanel from '../../components/FilterPanel';
import InfiniteScroll from '../../components/InfiniteScroll';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface VendaItem {
  id: number;
  produto_nome?: string;
  produto?: {
    nome: string;
    unidade_medida: string;
  };
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  unidade: string;
}

interface VendaPagamento {
  id: number;
  forma: string;
  valor: number;
}

interface Venda {
  id: number;
  data: string;
  cliente_nome: string;
  total: number;
  status: 'EM_ABERTO' | 'FINALIZADA' | 'CANCELADA';
  id_externo?: string;
  desconto?: number;
  itens: VendaItem[];
  pagamentos: VendaPagamento[];
}

const formatCurrency = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? '0,00' : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Vendas() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Sem data por padrão: mostra todas as vendas (a API já ordena das mais recentes).
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<{ id: number, justificativa?: string } | null>(null);

  const lista = usePaginatedList<Venda>(
    ['vendas', searchTerm, statusFilter, dateRange],
    async (page) => {
      const resp = await api.get('/vendas/', {
        params: {
          q: searchTerm,
          status: statusFilter || undefined,
          data_inicio: dateRange.start || undefined,
          data_fim: dateRange.end || undefined,
          page
        }
      });
      return resp.data;
    }
  );
  const { items: vendas, isLoading, page, setPage, totalPages, isMobile } = lista;
  const filtrosAtivos = [dateRange.start, dateRange.end, statusFilter].filter(Boolean).length;

  const cancelarMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number, justificativa?: string }) =>
      api.post(`/vendas/${id}/cancelar/`, { justificativa }),
    onSuccess: () => {
      toast.success('Venda cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      setSelectedVenda(null);
      setVendaParaCancelar(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.erro || 'Erro ao cancelar venda.';
      toast.error(msg);
    }
  });

  const handleImprimir = async (venda: Venda) => {
    try {
      await imprimirCupom(cupomDaVenda(venda));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao imprimir o cupom.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZADA': return <span className="badge badge-green">Finalizada</span>;
      case 'CANCELADA': return <span className="badge badge-red">Cancelada</span>;
      case 'EM_ABERTO': return <span className="badge badge-yellow">Em Aberto</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Histórico de Vendas</h1>
        <p className="page-subtitle">Gerencie e consulte todas as transações realizadas no PDV.</p>
      </div>

      {/* FILTROS */}
      <div className="card filter-card" style={{ marginBottom: 24, padding: '16px 24px' }}>
        <div className="responsive-toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <FilterPanel
            ativos={filtrosAtivos}
            search={
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CLIENTE / ID</label>
                <div className="search-input-wrapper" style={{ margin: 0 }}>
                  <Search className="search-icon" size={18} />
                  <input
                    type="search"
                    className="input"
                    placeholder="Buscar venda..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            }
          >
            <div>
              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DATA INICIAL</label>
              <input
                type="date"
                className="input"
                value={dateRange.start}
                onChange={e => { setDateRange(prev => ({ ...prev, start: e.target.value })); setPage(1); }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DATA FINAL</label>
              <input
                type="date"
                className="input"
                value={dateRange.end}
                onChange={e => { setDateRange(prev => ({ ...prev, end: e.target.value })); setPage(1); }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STATUS</label>
              <select
                className="select"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">Todos</option>
                <option value="FINALIZADA">Finalizadas</option>
                <option value="CANCELADA">Canceladas</option>
                <option value="EM_ABERTO">Em Aberto</option>
              </select>
            </div>

            <button className="btn btn-ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['vendas'] })} style={{ height: 42 }}>
              <Clock size={18} />
              Atualizar
            </button>
          </FilterPanel>
        </div>
      </div>

      {/* LISTA (mobile) */}
      {isMobile ? (
        <div className="m-list">
          {isLoading ? (
            <div className="loading">Carregando vendas...</div>
          ) : vendas.length === 0 ? (
            <div className="m-empty">Nenhuma venda encontrada.</div>
          ) : vendas.map((v) => (
            <div key={v.id} className="m-card clickable" onClick={() => setSelectedVenda(v)}>
              <div className="m-card-head">
                <div>
                  <div className="m-card-title">Venda #{String(v.id).slice(-6).toUpperCase()}</div>
                  <div className="m-card-sub">{new Date(v.data).toLocaleString('pt-BR')}</div>
                </div>
                {getStatusBadge(v.status)}
              </div>
              <div className="m-card-head" style={{ alignItems: 'center' }}>
                <div className="m-card-meta"><span><User size={13} /> {v.cliente_nome || 'Consumidor Final'}</span></div>
                <div className="m-card-value">R$ {formatCurrency(Number(v.total) - Number(v.desconto || 0))}</div>
              </div>
            </div>
          ))}
          <InfiniteScroll hasMore={!!lista.hasNextPage} loading={lista.isFetchingNextPage} onLoadMore={lista.fetchNextPage} />
        </div>
      ) : (
      /* TABELA */
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data / Hora</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="loading">Carregando vendas...</td></tr>
              ) : vendas?.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhuma venda encontrada.</td></tr>
              ) : (
                vendas?.map((v, idx) => (
                  <tr key={`${v.id}-${idx}`}>
                    <td style={{ fontWeight: 700 }}>#{String(v.id).slice(-6).toUpperCase()}</td>
                    <td>{new Date(v.data).toLocaleString('pt-BR')}</td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <User size={14} className="text-muted" />
                           {v.cliente_nome || 'Consumidor Final'}
                        </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      R$ {formatCurrency(Number(v.total) - Number(v.desconto || 0))}
                    </td>
                    <td>{getStatusBadge(v.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedVenda(v)}>
                        <Eye size={16} />
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Página {page} de {totalPages}</span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        )}
      </div>
      )}

      {/* MODAL DE DETALHES */}
      {selectedVenda && (
        <Modal
          onClose={() => setSelectedVenda(null)}
          labelledBy="sale-details-title"
          panelClassName="card animate-in"
          panelStyle={{ width: '100%', maxWidth: 1000, padding: 0, overflow: 'hidden' }}
          overlayStyle={{ zIndex: 1000 }}
        >
            <div className="sale-detail-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ flex: 1 }}>
                <h2 id="sale-details-title" style={{ fontSize: '1.25rem', fontWeight: 900 }}>Venda #{selectedVenda?.id ? String(selectedVenda.id).slice(-6).toUpperCase() : '---'}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                   {selectedVenda?.data ? new Date(selectedVenda.data).toLocaleString('pt-BR') : 'Data Indisponível'} · {selectedVenda?.cliente_nome || 'Consumidor Final'}
                </div>
              </div>
              <button onClick={() => setSelectedVenda(null)} className="btn btn-ghost btn-icon" aria-label="Fechar detalhes da venda">
                <X size={24} />
              </button>
            </div>

            <div className="sale-detail-body" style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
               <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Itens da Venda</h3>
                  <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                     {selectedVenda.itens?.map((item, idx) => (
                       <div key={`item-${item.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                          <div>
                             <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                               {item?.produto?.nome || item?.produto_nome || 'Produto desconhecido'}
                             </div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item?.quantidade} x R$ {formatCurrency(item?.preco_unitario)}</div>
                          </div>
                          <div style={{ fontWeight: 800 }}>R$ {formatCurrency(item?.subtotal)}</div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <div>
                     <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Pagamento</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedVenda.pagamentos?.map((p, idx) => (
                          <div key={`p-${p.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                             <span style={{ color: 'var(--text-secondary)' }}>{p?.forma || 'Pagamento'}</span>
                             <span style={{ fontWeight: 700 }}>R$ {formatCurrency(p?.valor)}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 20, borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                     <div className="kpi-label" style={{ color: 'var(--accent)' }}>Total da Transação</div>
                     <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        R$ {formatCurrency(Number(selectedVenda.total) - Number(selectedVenda.desconto || 0))}
                     </div>
                     {(selectedVenda.desconto || 0) > 0 && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Subtotal: R$ {formatCurrency(selectedVenda.total)} | Desconto: -R$ {formatCurrency(selectedVenda.desconto)}
                        </div>
                     )}
                     <div style={{ marginTop: 8 }}>{getStatusBadge(selectedVenda.status)}</div>
                  </div>
               </div>
            </div>

            <div className="sale-detail-footer" style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>

               <div className="sale-detail-actions" style={{ display: 'flex', gap: 12 }}>
                {selectedVenda.status === 'FINALIZADA' && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)' }}
                      onClick={() => handleImprimir(selectedVenda)}
                    >
                      <Printer size={16} />
                      Reimprimir
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        setVendaParaCancelar({ id: selectedVenda.id });
                      }}
                      disabled={cancelarMutation.isPending}
                    >
                      <Trash2 size={16} />
                      Cancelar Venda
                    </button>

                  </>
                )}

                {selectedVenda.status === 'EM_ABERTO' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/pdv?venda_id=${selectedVenda.id}`)}
                  >
                    <ShoppingCart size={16} />
                    Continuar no PDV
                  </button>
                )}
               </div>
            </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!vendaParaCancelar}
        title="Cancelar Venda"
        description="Tem certeza que deseja cancelar esta venda? O estoque será devolvido."
        confirmLabel="Cancelar Venda"
        onConfirm={() => vendaParaCancelar && cancelarMutation.mutate(vendaParaCancelar)}
        onClose={() => setVendaParaCancelar(null)}
        isLoading={cancelarMutation.isPending}
      />

      {/* CSS LOCAIS PARA O HISTÓRICO */}
      <style>{`
        .badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .btn-danger:hover {
          background: #ef4444;
          color: white;
        }
      `}</style>
    </div>
  );
}
