import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'sonner';
import FinanceiroColumn from './components/FinanceiroColumn';
import ContaForm from './components/ContaForm';
import ConfirmModal from '../../components/ConfirmModal';
import {
  TrendingUp,
  TrendingDown,
  X,
  CreditCard,
  Wallet,
  AlertCircle,
  Calendar,
  Search
} from 'lucide-react';

interface Conta {
  id: string;
  descricao: string;
  valor: string;
  vencimento: string;
  status: 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO';
  fornecedor?: string;
  cliente_nome?: string;
  data_pagamento?: string;
  data_recebimento?: string;
  observacoes?: string;
  tipo: 'PAGAR' | 'RECEBER';
}

export default function Financeiro() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState<{ type: 'PAGAR' | 'RECEBER', editData?: Conta } | null>(null);
  const [contaParaExcluir, setContaParaExcluir] = useState<Conta | null>(null);
  const [activeTab, setActiveTab] = useState<'vencidos' | 'pagar' | 'receber' | 'pagos' | 'recebidos'>('vencidos');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('sv-SE').slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Contas a Pagar
  const { data: pagar = [], isLoading: loadingPagar } = useQuery<Conta[]>({
    queryKey: ['contas-pagar'],
    queryFn: async () => {
      const resp = await api.get('/financeiro/contas-pagar/');
      const data = resp.data.results || resp.data;
      return data.map((c: any) => ({ ...c, tipo: 'PAGAR' }));
    },
  });

  // Fetch Contas a Receber
  const { data: receber = [], isLoading: loadingReceber } = useQuery<Conta[]>({
    queryKey: ['contas-receber'],
    queryFn: async () => {
      const resp = await api.get('/financeiro/contas-receber/');
      const data = resp.data.results || resp.data;
      return data.map((c: any) => ({ ...c, tipo: 'RECEBER' }));
    },
  });

  // Mutation para baixar conta
  const baixarMutation = useMutation({
    mutationFn: async ({ conta, tipo }: { conta: Conta, tipo: 'PAGAR' | 'RECEBER' }) => {
      const endpoint = tipo === 'PAGAR' ? `/financeiro/contas-pagar/${conta.id}/` : `/financeiro/contas-receber/${conta.id}/`;
      const hoje = new Date().toLocaleDateString('sv-SE');
      return api.patch(endpoint, {
        status: tipo === 'PAGAR' ? 'PAGO' : 'RECEBIDO',
        ...(tipo === 'PAGAR' ? { data_pagamento: hoje } : { data_recebimento: hoje }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
    },
  });

  const handleBaixar = (conta: Conta, tipo: 'PAGAR' | 'RECEBER') => {
    baixarMutation.mutate({ conta, tipo });
  };

  // Mutation para excluir conta
  const excluirMutation = useMutation({
    mutationFn: async ({ conta, tipo }: { conta: Conta, tipo: 'PAGAR' | 'RECEBER' }) => {
      const endpoint = tipo === 'PAGAR' ? `/financeiro/contas-pagar/${conta.id}/` : `/financeiro/contas-receber/${conta.id}/`;
      return api.delete(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      toast.success('Lançamento excluído com sucesso');
      setContaParaExcluir(null);
    },
  });

  const handleDelete = (conta: Conta) => {
    setContaParaExcluir(conta);
  };

  const handleEdit = (conta: Conta) => {
    setShowModal({ type: conta.tipo, editData: conta });
  };

  // Filtragem por mês e pesquisa
  const filterBySearch = (c: Conta) => {
    const search = searchTerm.toLowerCase();
    return (
      c.descricao?.toLowerCase().includes(search) ||
      c.fornecedor?.toLowerCase().includes(search) ||
      c.cliente_nome?.toLowerCase().includes(search) ||
      c.observacoes?.toLowerCase().includes(search)
    );
  };

  const filteredPagar = pagar.filter(c => {
    const date = c.status === 'PAGO' ? (c.data_pagamento || c.vencimento) : c.vencimento;
    return date.startsWith(selectedMonth) && filterBySearch(c);
  });

  const filteredReceber = receber.filter(c => {
    const date = c.status === 'RECEBIDO' ? (c.data_recebimento || c.vencimento) : c.vencimento;
    return date.startsWith(selectedMonth) && filterBySearch(c);
  });

  const vencidos = [...filteredPagar.filter(c => c.status === 'VENCIDO'), ...filteredReceber.filter(c => c.status === 'VENCIDO')];
  const aPagar = filteredPagar.filter(c => c.status === 'PENDENTE');
  const aReceber = filteredReceber.filter(c => c.status === 'PENDENTE');
  const pagos = filteredPagar.filter(c => c.status === 'PAGO');
  const recebidos = filteredReceber.filter(c => c.status === 'RECEBIDO');

  const calcKpi = (lista: Conta[]) => lista.reduce((a, c) => a + parseFloat(c.valor), 0);

  const kpi = {
    vencido: calcKpi(vencidos),
    aPagar: calcKpi(aPagar),
    aReceber: calcKpi(aReceber),
    pagos: calcKpi(pagos),
    recebidos: calcKpi(recebidos),
  };

  const loading = loadingPagar || loadingReceber;

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Gestão Financeira</h1>
          <p className="page-subtitle">Fluxo de Caixa e Controle de Contas</p>
        </div>
        <div className="financeiro-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ color: 'var(--text-muted)', marginRight: 10 }} />
            <input
              type="text"
              placeholder="Pesquisar por descrição, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', width: '100%' }}
            />
          </div>
          <div className="month-picker" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <Calendar size={16} style={{ color: 'var(--accent)', marginRight: 10 }} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            />
          </div>
          <button className="btn btn-ghost" onClick={() => setShowModal({ type: 'RECEBER' })}>
            <TrendingUp size={18} className="text-accent-green" />
            Lançar Recebimento
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal({ type: 'PAGAR' })}>
            <TrendingDown size={18} />
            Lançar Pagamento
          </button>
        </div>
      </div>

      {/* Resumo financeiro unificado */}
      {loading ? (
        <div className="kpi-grid" style={{ marginBottom: 28, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton-line" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div className="kpi-grid" style={{ marginBottom: 28, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { label: 'Vencidos', val: kpi.vencido, color: 'var(--accent-red)' },
            { label: 'A Pagar', val: kpi.aPagar, color: 'var(--accent-yellow)' },
            { label: 'A Receber', val: kpi.aReceber, color: 'var(--accent)' },
            { label: 'Pagos', val: kpi.pagos, color: 'var(--accent-green)' },
            { label: 'Recebidos', val: kpi.recebidos, color: 'var(--accent-green)' },
          ].map(({ label, val, color }) => (
            <div key={label} className="kpi-card" style={{ padding: '12px 16px' }}>
              <div className="kpi-label" style={{ color, fontSize: '0.65rem' }}>{label}</div>
              <div className="kpi-value" style={{ fontSize: '1rem' }}>R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .financeiro-tabs { display: none; }
        @media (max-width: 1024px) {
          .page-header { flex-direction: column; align-items: flex-start !important; gap: 20px !important; }
          .financeiro-actions { flex-direction: column; width: 100%; gap: 12px !important; }
          .search-box, .month-picker { width: 100%; justify-content: center; padding: 12px !important; }
          .financeiro-actions .btn { width: 100%; justify-content: center; padding: 12px !important; }

          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .kpi-card:last-child { grid-column: span 2; } /* O 5º card ocupa a largura toda ou fica sozinho */

          .financeiro-tabs { display: flex; width: 100%; background: var(--bg-secondary); border-radius: 12px; padding: 4px; margin-bottom: 24px; border: 1px solid var(--border); overflow: hidden; }
          .financeiro-tab { flex: 1 1 0; min-width: 0; padding: 12px 2px; border: none; background: none; color: var(--text-secondary); font-size: 0.66rem; font-weight: 700; cursor: pointer; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.2s; }
          .financeiro-tab.active { background: var(--bg-card); color: var(--accent); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          .kanban-container { grid-template-columns: 1fr !important; }
        }
        .kanban-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; padding-bottom: 24px; min-height: 500px; align-items: start; }
      `}</style>

      <div className="financeiro-tabs">
        {[
          { id: 'vencidos', l: 'Vencidos', Icon: AlertCircle },
          { id: 'pagar', l: 'Pagar', Icon: TrendingDown },
          { id: 'receber', l: 'Receber', Icon: TrendingUp },
          { id: 'pagos', l: 'Pagos', Icon: CreditCard },
          { id: 'recebidos', l: 'Recebidos', Icon: Wallet }
        ].map(t => (
          <button key={t.id} className={`financeiro-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id as any)}>
            <t.Icon size={16} />
            {t.l}
          </button>
        ))}
      </div>

      <div className="kanban-container">
        {loading ? (
             [1, 2, 3, 4, 5].map(i => (
               <div key={i} style={{ flex: 1, minWidth: 260 }}>
                 <div className="skeleton-line" style={{ height: 24, width: '60%', marginBottom: 16 }}></div>
                 <div className="skeleton-line" style={{ height: 100, marginBottom: 12, borderRadius: 12 }}></div>
               </div>
             ))
        ) : (
          <>
            <FinanceiroColumn
              titulo="Vencidos"
              Icon={<AlertCircle size={18} />}
              cor="var(--accent-red)"
              isActiveMobile={activeTab === 'vencidos'}
              itens={vencidos}
              onBaixar={c => handleBaixar(c, c.tipo)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            <FinanceiroColumn
              titulo="A Pagar"
              Icon={<TrendingDown size={18} />}
              cor="var(--accent-yellow)"
              isActiveMobile={activeTab === 'pagar'}
              itens={aPagar}
              onBaixar={c => handleBaixar(c, 'PAGAR')}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            <FinanceiroColumn
              titulo="A Receber"
              Icon={<TrendingUp size={18} />}
              cor="var(--accent)"
              isActiveMobile={activeTab === 'receber'}
              itens={aReceber}
              onBaixar={c => handleBaixar(c, 'RECEBER')}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            <FinanceiroColumn
              titulo="Pagos"
              Icon={<CreditCard size={18} />}
              cor="var(--accent-green)"
              isActiveMobile={activeTab === 'pagos'}
              itens={pagos}
              onBaixar={() => {}}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            <FinanceiroColumn
              titulo="Recebidos"
              Icon={<Wallet size={18} />}
              cor="var(--accent-green)"
              isActiveMobile={activeTab === 'recebidos'}
              itens={recebidos}
              onBaixar={() => {}}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="card animate-in modal-panel">
            <div className="modal-titlebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: showModal.type === 'PAGAR' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: 8, color: showModal.type === 'PAGAR' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  <CreditCard size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {showModal.editData ? 'Editar Lançamento' : (showModal.type === 'PAGAR' ? 'Novo Lançamento: A Pagar' : 'Novo Lançamento: A Receber')}
                </h2>
              </div>
              <button onClick={() => setShowModal(null)} className="btn btn-ghost btn-icon" aria-label="Fechar modal"><X size={20} /></button>
            </div>
            <ContaForm
              tipo={showModal.type}
              editData={showModal.editData}
              onClose={() => setShowModal(null)}
              onSave={() => { setShowModal(null); queryClient.invalidateQueries({ queryKey: ['contas-pagar'] }); queryClient.invalidateQueries({ queryKey: ['contas-receber'] }); }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!contaParaExcluir}
        title="Excluir Lançamento"
        description={`Deseja realmente excluir "${contaParaExcluir?.descricao}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => contaParaExcluir && excluirMutation.mutate({ conta: contaParaExcluir, tipo: contaParaExcluir.tipo })}
        onClose={() => setContaParaExcluir(null)}
        isLoading={excluirMutation.isPending}
      />
    </div>
  );
}
