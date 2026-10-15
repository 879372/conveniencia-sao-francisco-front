import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../../lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  Wallet,
  Clock,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import FilterPanel from '../../components/FilterPanel';
import InfiniteScroll from '../../components/InfiniteScroll';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useProgressiveList } from '../../hooks/useProgressiveList';

interface Pagamento {
  forma: string;
  valor: string;
}

interface Venda {
  id: number;
  total: string;
  created_at: string;
  status: string;
  pagamentos: Pagamento[];
}

interface Sessao {
  id: number;
  operador_nome: string;
  aberta_em: string;
  fechada_em: string | null;
  fundo_inicial: string;
  total_vendas: string;
  total_sangrias: string;
  total_suprimentos: string;
  saldo_final_calculado: string;
}

export default function Relatorios() {
  const [tab, setTab] = useState<'vendas' | 'caixa'>('vendas');
  const [vendaParaCancelar, setVendaParaCancelar] = useState<Venda | null>(null);
  const queryClient = useQueryClient();

  const now = new Date();
  const [start, setStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE'));
  const [end, setEnd] = useState(now.toLocaleDateString('sv-SE'));

  const cancelarVendaMutation = useMutation({
    mutationFn: ({ id, justificativa }: { id: number; justificativa?: string }) =>
      api.post(`/vendas/${id}/cancelar/`, justificativa ? { justificativa } : {}),
    onSuccess: () => {
      toast.success('Venda cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['relatorios-vendas'] });
      setVendaParaCancelar(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.erro || 'Erro ao cancelar venda.';
      toast.error(msg);
      setVendaParaCancelar(null);
    },
  });

  const { data: vendas = [], isLoading } = useQuery<Venda[]>({
    queryKey: ['relatorios-vendas', start, end],
    queryFn: async () => {
      const resp = await api.get('/vendas/', { params: { status: 'FINALIZADA', data_inicio: start, data_fim: end } });
      return resp.data.results || resp.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['relatorios-stats', start, end],
    queryFn: async () => {
      const resp = await api.get('dashboard-stats/', { params: { data_inicio: start, data_fim: end } });
      return resp.data;
    }
  });

  const { data: sessoes = [], isLoading: loadingSessoes } = useQuery<Sessao[]>({
    queryKey: ['relatorios-sessoes', start, end],
    queryFn: async () => {
      const resp = await api.get('/sessoes-caixa/', { params: { data_inicio: start, data_fim: end } });
      return resp.data.results || resp.data;
    },
    enabled: tab === 'caixa'
  });

  const formasMap: Record<string, number> = {};
  vendas.forEach(v => {
    v.pagamentos?.forEach(p => {
      formasMap[p.forma] = (formasMap[p.forma] || 0) + parseFloat(p.valor);
    });
  });

  const isMobile = useIsMobile();
  const sessoesLista = useProgressiveList(sessoes, `${start}|${end}`);
  const dataCurta = (valor: string) => valor ? new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR') : '…';

  const dadosLucro = stats?.lucro_por_categoria || [];
  const lucroTotal = dadosLucro.reduce((acc: number, item: any) => acc + item.total, 0);

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 className="page-title">Relatórios & BI</h1>
          <p className="page-subtitle">Análise de performance e resultados</p>
        </div>

        <div className="reports-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <FilterPanel resumo={`Período: ${dataCurta(start)} – ${dataCurta(end)}`}>
          <div className="reports-date-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DE:</span>
            <input
              type="date"
              className="input"
              style={{ width: 150, height: 38, fontSize: '0.85rem' }}
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div className="reports-date-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ATÉ:</span>
            <input
              type="date"
              className="input"
              style={{ width: 150, height: 38, fontSize: '0.85rem' }}
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </div>
          </FilterPanel>
          <div className="tabs" style={{ display: 'flex', background: 'var(--bg-body)', padding: 4, borderRadius: 8, border: '1px solid var(--border)', marginLeft: 8 }}>
              <button className={`btn btn-sm ${tab === 'vendas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('vendas')}>Vendas</button>
              <button className={`btn btn-sm ${tab === 'caixa' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('caixa')}>Caixa</button>
          </div>
        </div>

        <style>{`
          input[type="date"]::-webkit-calendar-picker-indicator {
            opacity: 0.65;
            cursor: pointer;
          }
          input[type="date"]::-webkit-calendar-picker-indicator:hover {
            opacity: 1;
          }
        `}</style>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        {isLoading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="skeleton-line" style={{ height: 120, borderRadius: 12 }}></div>)
        ) : (
          <>
            <div className="kpi-card blue">
              <div className="kpi-label">Faturamento no Período</div>
              <div className="kpi-value">R$ {stats?.faturamento_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="kpi-sub">total bruto no período</div>
            </div>
            <div className="kpi-card green">
              <div className="kpi-label">Ticket Médio</div>
              <div className="kpi-value">R$ {Number(stats?.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="kpi-sub">média por venda finalizada</div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-label">Descontos Concedidos</div>
              <div className="kpi-value">R$ {Number(stats?.total_descontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="kpi-sub">total no período selecionado</div>
            </div>
            <div className="kpi-card yellow">
              <div className="kpi-label">Volume de Vendas</div>
              <div className="kpi-value">{stats?.quantidade_vendas_periodo ?? vendas.length}</div>
              <div className="kpi-sub">operações finalizadas</div>
            </div>
          </>
        )}
      </div>

      {tab === 'vendas' ? (
        <>
          <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 28 }}>
            {/* Gráfico Top 5 Lucro */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Lucro por Categoria (Top 5)</h3>
              </div>
              <div style={{ height: 300, width: '100%' }}>
                {dadosLucro.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
                    <TrendingDown size={32} opacity={0.3} />
                    <span>Sem dados de lucro (verifique os preços de compra)</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosLucro.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {dadosLucro.slice(0, 5).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={`rgba(16, 185, 129, ${1 - (index * 0.15)})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Ranking Geral de Lucro */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <FileText size={20} style={{ color: 'var(--accent-green)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ranking Geral de Lucro</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
                 {dadosLucro.map((item: any, idx: number) => (
                   <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < dadosLucro.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                         <span style={{ fontWeight: 700, marginRight: 8, color: 'var(--text-muted)' }}>{idx + 1}º</span>
                         <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-green)' }}>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((item.total / (lucroTotal || 1)) * 100).toFixed(1)}% do lucro</div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 28 }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <DollarSign size={20} style={{ color: 'var(--accent-green)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Métodos de Pagamento</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.keys(formasMap).length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Aguardando primeiras vendas...</div>
                ) : (
                  Object.entries(formasMap).sort((a,b) => b[1] - a[1]).map(([forma, valor]) => (
                    <div key={forma} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 6, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 6, color: 'var(--accent-green)' }}>
                          <Wallet size={14} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{forma}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Últimas Vendas</h3>
                <NavLink to="/vendas" className="btn btn-sm btn-ghost">Ver Tudo <ChevronRight size={14} /></NavLink>
              </div>
              {isMobile ? (
                <div className="m-list" style={{ padding: 12 }}>
                  {vendas.length === 0 ? <div className="m-empty">Nenhuma venda no período.</div> : vendas.slice(0, 10).map((v) => (
                    <div key={v.id} className="m-card">
                      <div className="m-card-head">
                        <div>
                          <div className="m-card-title">Venda #{v.id}</div>
                          <div className="m-card-sub">{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '—'}</div>
                        </div>
                        <div className="m-card-value" style={{ color: 'var(--accent-green)' }}>R$ {parseFloat(v.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {v.pagamentos?.map((p, idx) => <span key={`${v.id}-pm-${idx}`} className="badge badge-blue">{p.forma}</span>)}
                      </div>
                      <div className="m-card-actions">
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => setVendaParaCancelar(v)} disabled={cancelarVendaMutation.isPending}>Cancelar venda</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Venda ID</th>
                      <th>Formas Pagto.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.slice(0, 10).map((v, vIdx) => (
                      <tr key={`venda-${v.id}-${vIdx}`}>
                        <td>{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{v.id}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {v.pagamentos?.map((p, idx) => (
                              <span key={`${v.id}-p-${idx}`} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{p.forma}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-green)' }}>
                          R$ {parseFloat(v.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-red)', padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => setVendaParaCancelar(v)}
                            disabled={cancelarVendaMutation.isPending}
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        </>
      ) : isMobile ? (
        <div className="m-list">
          {loadingSessoes ? <div className="loading">Carregando sessões...</div> : sessoes.length === 0 ? (
            <div className="m-empty">Nenhuma sessão encontrada.</div>
          ) : sessoesLista.visiveis.map((s) => (
            <div key={s.id} className="m-card">
              <div className="m-card-head">
                <div>
                  <div className="m-card-title"><UserIcon size={14} style={{ color: 'var(--accent)', verticalAlign: -2 }} /> {s.operador_nome}</div>
                  <div className="m-card-sub">
                    <Clock size={11} style={{ verticalAlign: -1 }} /> {new Date(s.aberta_em).toLocaleString('pt-BR')}
                    {s.fechada_em ? ` → ${new Date(s.fechada_em).toLocaleString('pt-BR')}` : ''}
                  </div>
                </div>
                <span className={`badge ${s.fechada_em ? 'badge-blue' : 'badge-green'}`}>{s.fechada_em ? 'FECHADO' : 'ABERTO'}</span>
              </div>
              <div className="m-card-meta">
                <span>Vendas: <strong>R$ {parseFloat(s.total_vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                <span style={{ color: 'var(--accent-red)' }}>Sangrias: R$ {parseFloat(s.total_sangrias).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="m-card-head" style={{ alignItems: 'center' }}>
                <span className="m-card-sub">Saldo final (est.)</span>
                <span className="m-card-value" style={{ color: 'var(--accent-green)' }}>R$ {parseFloat(s.saldo_final_calculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
          <InfiniteScroll hasMore={sessoesLista.temMais} onLoadMore={sessoesLista.carregarMais} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Operador</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Vendas</th>
                  <th>Sangrias</th>
                  <th style={{ textAlign: 'right' }}>Final (Est.)</th>
                </tr>
              </thead>
              <tbody>
                {loadingSessoes ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}><td colSpan={7}><div className="skeleton-line" style={{ height: 24, margin: '8px 0' }}></div></td></tr>
                  ))
                ) : sessoes.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhuma sessão encontrada.</td></tr>
                ) : sessoes.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className={`badge ${s.fechada_em ? 'badge-blue' : 'badge-green'}`}>
                        {s.fechada_em ? 'FECHADO' : 'ABERTO'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <UserIcon size={14} style={{ color: 'var(--accent)' }} />
                         <span style={{ fontWeight: 600 }}>{s.operador_nome}</span>
                      </div>
                    </td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> {new Date(s.aberta_em).toLocaleString('pt-BR')}</div></td>
                    <td>{s.fechada_em ? new Date(s.fechada_em).toLocaleString('pt-BR') : '—'}</td>
                    <td style={{ fontWeight: 700 }}>R$ {parseFloat(s.total_vendas).toLocaleString('pt-BR')}</td>
                    <td style={{ color: 'var(--accent-red)' }}>R$ {parseFloat(s.total_sangrias).toLocaleString('pt-BR')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-green)' }}>
                      R$ {parseFloat(s.saldo_final_calculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!vendaParaCancelar}
        title="Cancelar Venda?"
        description={vendaParaCancelar ? `Venda #${vendaParaCancelar.id} — R$ ${parseFloat(vendaParaCancelar.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Confirmar Cancelamento"
        cancelLabel="Voltar"
        onConfirm={() => vendaParaCancelar && cancelarVendaMutation.mutate({ id: vendaParaCancelar.id })}
        onClose={() => setVendaParaCancelar(null)}
        isLoading={cancelarVendaMutation.isPending}
      />
    </div>
  );
}
