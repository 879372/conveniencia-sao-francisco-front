import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import Modal from '../../components/Modal';
import InfiniteScroll from '../../components/InfiniteScroll';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useProgressiveList } from '../../hooks/useProgressiveList';

interface Movimentacao {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  motivo: string;
  quantidade: string;
  saldo_anterior: string;
  saldo_atual: string;
  observacoes: string;
  created_at: string;
}

interface KardexModalProps {
  produtoId: string | number;
  produtoNome: string;
  onClose: () => void;
}

export default function KardexModal({ produtoId, produtoNome, onClose }: KardexModalProps) {
  const { data: movimentacoes, isLoading } = useQuery<Movimentacao[]>({
    queryKey: ['kardex', produtoId],
    queryFn: async () => {
      const resp = await api.get(`/produtos/${produtoId}/movimentacoes/`);
      return resp.data;
    },
  });

  const isMobile = useIsMobile();
  const { visiveis, temMais, carregarMais } = useProgressiveList(movimentacoes ?? [], String(produtoId));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatQty = (qty: string | number) => {
    return Number(qty).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="kardex-modal-title"
      describedBy="kardex-product-name"
      panelClassName="modal-content"
      panelStyle={{ maxWidth: 800, width: '95%' }}
    >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-box icon-box-primary">
              <History size={20} />
            </div>
            <div>
              <h2 id="kardex-modal-title" className="modal-title">Histórico de Estoque (Kardex)</h2>
              <p id="kardex-product-name" className="modal-subtitle">{produtoNome}</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar histórico de estoque">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body kardex-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
            </div>
          ) : !movimentacoes || movimentacoes.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma movimentação registrada para este produto.
            </div>
          ) : isMobile ? (
            <div className="m-list">
              {visiveis.map((m) => (
                <div key={m.id} className="m-card">
                  <div className="m-card-head">
                    <div>
                      <div className="m-card-title">{m.motivo}</div>
                      <div className="m-card-sub">{formatDate(m.created_at)}</div>
                    </div>
                    <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`} style={{ gap: 4 }}>
                      {m.tipo === 'ENTRADA' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                      {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                  {m.observacoes && <div className="m-card-sub">{m.observacoes}</div>}
                  <div className="m-card-meta">
                    <span style={{ fontWeight: 700, color: m.tipo === 'ENTRADA' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {m.tipo === 'ENTRADA' ? '+' : '-'}{formatQty(m.quantidade)}
                    </span>
                    <span>{formatQty(m.saldo_anterior)} → <strong>{formatQty(m.saldo_atual)}</strong></span>
                  </div>
                </div>
              ))}
              <InfiniteScroll hasMore={temMais} onLoadMore={carregarMais} />
            </div>
          ) : (
            <table className="table">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1 }}>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th style={{ textAlign: 'right' }}>Qtd.</th>
                  <th style={{ textAlign: 'right' }}>Anterior</th>
                  <th style={{ textAlign: 'right' }}>Saldo Atual</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(m.created_at)}</td>
                    <td>
                      <span className={`badge ${m.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`} style={{ gap: 4 }}>
                        {m.tipo === 'ENTRADA' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                        {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td>
                        <div style={{ fontWeight: 500 }}>{m.motivo}</div>
                        {m.observacoes && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.observacoes}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: m.tipo === 'ENTRADA' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {m.tipo === 'ENTRADA' ? '+' : '-'}{formatQty(m.quantidade)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatQty(m.saldo_anterior)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatQty(m.saldo_atual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      <style>{`
        .icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-box-primary {
          background: var(--bg-hover);
          color: var(--primary);
        }
      `}</style>
    </Modal>
  );
}
