import { Check, Edit2, Trash2 } from 'lucide-react';

interface Conta {
  id: string;
  descricao: string;
  valor: string;
  vencimento: string;
  status: 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO';
  fornecedor?: string;
  cliente_nome?: string;
  observacoes?: string;
  tipo: 'PAGAR' | 'RECEBER';
}

interface FinanceiroColumnProps {
  titulo: string;
  Icon: React.ReactNode;
  cor: string;
  itens: Conta[];
  onBaixar: (conta: Conta) => void;
  onEdit: (conta: Conta) => void;
  onDelete: (conta: Conta) => void;
  isActiveMobile: boolean;
}

export default function FinanceiroColumn({ titulo, Icon, cor, itens, onBaixar, onEdit, onDelete, isActiveMobile }: FinanceiroColumnProps) {
  return (
    <div className={`financeiro-col ${isActiveMobile ? 'active' : ''}`} style={{ minWidth: 0 }}>
      {/* Estilos específicos via classes injetadas para mobile */}
      <style>{`
        @media (max-width: 1024px) {
          .financeiro-col { display: none; }
          .financeiro-col.active { display: block; width: 100% !important; min-width: 100% !important; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `2px solid ${cor}` }}>
        <span style={{ fontSize: '1.2rem', color: cor }}>{Icon}</span>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>{titulo}</span>
        <span style={{ marginLeft: 'auto', background: `${cor}22`, color: cor, borderRadius: 8, padding: '2px 12px', fontSize: '0.75rem', fontWeight: 800 }}>{itens.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {itens.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed var(--border)' }}>
            Nenhum lançamento
          </div>
        )}
        {itens.map(c => (
          <div key={`${c.tipo}-${c.id}`} className="card animate-in" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: cor }}></div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{c.descricao}</div>

            {c.observacoes && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: 8, fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                "{c.observacoes}"
              </div>
            )}

            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{c.fornecedor || c.cliente_nome || 'Sem identificação'}</span>
              <span>•</span>
              <span>{new Date(c.vencimento).toLocaleDateString('pt-BR')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontWeight: 800,
                color: 'var(--accent-green)',
                fontSize: '1.15rem',
                letterSpacing: -0.5
              }}>
                R$ {parseFloat(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onDelete(c)}
                  style={{ padding: 6, color: 'var(--accent-red)' }}
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onEdit(c)}
                  style={{ padding: 6 }}
                  title="Editar"
                >
                  <Edit2 size={14} />
                </button>
                {(c.status === 'PENDENTE' || c.status === 'VENCIDO') && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onBaixar(c)}
                    style={{ gap: 4, height: 32, padding: '0 12px' }}
                  >
                    <Check size={14} />
                    Baixar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
