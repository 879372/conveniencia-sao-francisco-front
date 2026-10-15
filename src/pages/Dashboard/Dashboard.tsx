import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Zap,
  Eye,
  EyeOff,
  CalendarDays
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [showValues, setShowValues] = useState(() => {
    const saved = localStorage.getItem('dashboard_show_values');
    return saved ? JSON.parse(saved) : true;
  });

  const toggleValues = () => {
    setShowValues(!showValues);
    localStorage.setItem('dashboard_show_values', JSON.stringify(!showValues));
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const resp = await api.get('dashboard-stats/');
      return resp.data;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const isMobile = useIsMobile();
  const eixoValor = (val: number) => isMobile
    ? Number(val).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
    : `R$ ${Number(val).toLocaleString('pt-BR')}`;

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const formatCurrency = (val: number) => {
    if (!showValues) return 'R$ ••••••';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="animate-in">
      <div className="page-header dashboard-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-subtitle">Panorama atual do sistema — {todayStr}</p>
        </div>
        <button className="btn btn-ghost dashboard-privacy" onClick={toggleValues} title={showValues ? "Ocultar Valores" : "Mostrar Valores"} aria-label={showValues ? "Ocultar valores" : "Mostrar valores"}>
          {showValues ? <EyeOff size={20} /> : <Eye size={20} />}
          <span className="dashboard-privacy-label" style={{ marginLeft: 8 }}>{showValues ? "Privacidade" : "Ver Valores"}</span>
        </button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="kpi-card" style={{ padding: '24px' }}>
              <div className="skeleton-line" style={{ height: 16, width: '40%', marginBottom: 12 }}></div>
              <div className="skeleton-line" style={{ height: 32, width: '80%', marginBottom: 8 }}></div>
            </div>
          ))
        ) : (
          <>
            <div className="kpi-card blue">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div className="kpi-label">Faturamento Hoje</div>
                  <div className="kpi-value">{formatCurrency(stats?.faturamento_hoje)}</div>
                </div>
                <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, color: 'var(--accent)' }}>
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="kpi-sub">{stats?.total_vendas_hoje} vendas realizadas hoje</div>
            </div>

            <div className="kpi-card green">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div className="kpi-label">Vendas Mês Atual</div>
                  <div className="kpi-value">{formatCurrency(stats?.faturamento_mes)}</div>
                </div>
                <div style={{ padding: 8, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, color: 'var(--accent-green)' }}>
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div className="kpi-sub">Acumulado do mês</div>
            </div>

            <div className="kpi-card yellow">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div className="kpi-label">Compras Mês Atual</div>
                  <div className="kpi-value">{formatCurrency(stats?.compras_mes)}</div>
                </div>
                <div style={{ padding: 8, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, color: 'var(--accent-yellow)' }}>
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div className="kpi-sub">Total de compras registradas</div>
            </div>

            <div className="kpi-card red" style={{ background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div className="kpi-label">Ticket Médio</div>
                  <div className="kpi-value">
                     {formatCurrency(stats?.faturamento_hoje / (stats?.total_vendas_hoje || 1))}
                  </div>
                </div>
                <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: 'var(--accent-red)' }}>
                  <Zap size={20} />
                </div>
              </div>
              <div className="kpi-sub">Valor médio por cliente</div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-main-grid">
        {/* Gráfico de Vendas */}
        <div className="card dashboard-chart-card" style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <CalendarDays size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Movimento do Mês</h3>
          </div>
          <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.grafico_vendas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="data"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={eixoValor}
                  width={isMobile ? 44 : 60}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats?.grafico_vendas?.map((_: unknown, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === stats.grafico_vendas.length - 1 ? 'var(--accent)' : 'rgba(169, 109, 23, 0.35)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas de Estoque */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Package size={18} className="text-accent" style={{ color: 'var(--accent-yellow)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Alertas de Ruptura</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {stats?.produtos_ruptura?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                Nenhum problema de estoque detectado.
              </div>
            ) : (
              stats?.produtos_ruptura?.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>Apenas {p.qtd} em estoque</div>
                  </div>
                  <NavLink to="/estoque" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>Repor</NavLink>
                </div>
              ))
            )}
          </div>
          <NavLink to="/estoque" className="btn btn-ghost" style={{ marginTop: 16, width: '100%', fontSize: '0.8rem' }}>
            Gerenciar estoque
          </NavLink>
        </div>
      </div>
    </div>
  );
}
