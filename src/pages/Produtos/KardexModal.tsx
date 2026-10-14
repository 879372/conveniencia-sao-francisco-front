import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-box icon-box-primary">
              <History size={20} />
            </div>
            <div>
              <h2 className="modal-title">Histórico de Estoque (Kardex)</h2>
              <p className="modal-subtitle">{produtoNome}</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
            </div>
          ) : !movimentacoes || movimentacoes.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma movimentação registrada para este produto.
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
    </div>
  );
}
