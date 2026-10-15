import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Pencil, Plus, Receipt, Search, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import ConfirmModal from '../../components/ConfirmModal';

type Tipo = 'DESPESA' | 'RECEBER';
interface Lancamento {
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
  tipo: Tipo;
}

const localDate = () => new Date().toLocaleDateString('sv-SE');
const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const displayDate = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const blankForm = { descricao: '', pessoa: '', valor: '', data: localDate(), observacoes: '' };

export default function Financeiro() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tipo>('RECEBER');
  const [modal, setModal] = useState<Tipo | null>(null);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [deleting, setDeleting] = useState<Lancamento | null>(null);
  const [form, setForm] = useState(blankForm);

  const { data: despesas = [], isLoading: loadingExpenses } = useQuery<Lancamento[]>({
    queryKey: ['contas-pagar'],
    queryFn: async () => {
      const response = await api.get('/financeiro/contas-pagar/');
      return (response.data.results || response.data).map((item: Lancamento) => ({ ...item, tipo: 'DESPESA' }));
    },
  });
  const { data: recebiveis = [], isLoading: loadingReceivables } = useQuery<Lancamento[]>({
    queryKey: ['contas-receber'],
    queryFn: async () => {
      const response = await api.get('/financeiro/contas-receber/');
      return (response.data.results || response.data).map((item: Lancamento) => ({ ...item, tipo: 'RECEBER' }));
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
    queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
  };
  const closeModal = () => { setModal(null); setEditing(null); setForm(blankForm); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modal) return;
      const isExpense = modal === 'DESPESA';
      const endpoint = isExpense ? '/financeiro/contas-pagar/' : '/financeiro/contas-receber/';
      const payload = {
        descricao: form.descricao,
        valor: Number(form.valor),
        vencimento: form.data,
        status: isExpense ? 'PAGO' : (editing?.status === 'RECEBIDO' ? 'RECEBIDO' : 'PENDENTE'),
        observacoes: form.observacoes,
        ...(isExpense ? { fornecedor: form.pessoa, data_pagamento: form.data } : { cliente_nome: form.pessoa }),
      };
      return editing ? api.patch(`${endpoint}${editing.id}/`, payload) : api.post(endpoint, payload);
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'Lançamento atualizado.' : 'Lançamento salvo.'); closeModal(); },
    onError: () => toast.error('Não foi possível salvar o lançamento.'),
  });

  const receiveMutation = useMutation({
    mutationFn: (item: Lancamento) => api.patch(`/financeiro/contas-receber/${item.id}/`, { status: 'RECEBIDO', data_recebimento: localDate() }),
    onSuccess: () => { invalidate(); toast.success('Recebimento confirmado.'); },
    onError: () => toast.error('Não foi possível confirmar o recebimento.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: Lancamento) => api.delete(item.tipo === 'DESPESA' ? `/financeiro/contas-pagar/${item.id}/` : `/financeiro/contas-receber/${item.id}/`),
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Lançamento excluído.'); },
    onError: () => toast.error('Não foi possível excluir o lançamento.'),
  });

  const openNew = (type: Tipo) => { setEditing(null); setForm(blankForm); setModal(type); };
  const openEdit = (item: Lancamento) => {
    setEditing(item);
    setForm({
      descricao: item.descricao,
      pessoa: item.fornecedor || item.cliente_nome || '',
      valor: item.valor,
      data: item.data_pagamento || item.data_recebimento || item.vencimento,
      observacoes: item.observacoes || '',
    });
    setModal(item.tipo);
  };

  const match = (item: Lancamento) => {
    const haystack = `${item.descricao} ${item.fornecedor || ''} ${item.cliente_nome || ''}`.toLowerCase();
    return item.vencimento.startsWith(month) && haystack.includes(search.toLowerCase());
  };
  const filteredExpenses = despesas.filter(match);
  const filteredReceivables = recebiveis.filter(match);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.valor), 0);
  const pending = filteredReceivables.filter((item) => item.status !== 'RECEBIDO');
  const received = filteredReceivables.filter((item) => item.status === 'RECEBIDO');
  const totalPending = pending.reduce((sum, item) => sum + Number(item.valor), 0);
  const totalReceived = received.reduce((sum, item) => sum + Number(item.valor), 0);
  const list = tab === 'DESPESA' ? filteredExpenses : filteredReceivables;
  const loading = loadingExpenses || loadingReceivables;

  const submit = (event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); };

  return (
    <div className="animate-in">
      <div className="page-header page-header-row">
        <div><h1 className="page-title">Financeiro</h1><p className="page-subtitle">Controle simples de recebíveis e despesas</p></div>
        <div className="page-actions"><button className="btn btn-ghost" onClick={() => openNew('DESPESA')}><Receipt size={18} /> Registrar despesa</button><button className="btn btn-primary" onClick={() => openNew('RECEBER')}><Plus size={18} /> Novo recebível</button></div>
      </div>

      <div className="kpi-grid finance-kpis">
        <div className="kpi-card red"><div className="kpi-label">Despesas do mês</div><div className="kpi-value">{money(totalExpenses)}</div></div>
        <div className="kpi-card yellow"><div className="kpi-label">A receber</div><div className="kpi-value">{money(totalPending)}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Recebido</div><div className="kpi-value">{money(totalReceived)}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Resultado realizado</div><div className="kpi-value">{money(totalReceived - totalExpenses)}</div></div>
      </div>

      <div className="card filter-card">
        <div className="finance-toolbar">
          <div className="search-input-wrapper"><Search size={18} className="search-icon" /><input className="input" placeholder="Pesquisar lançamento..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="date-control"><Calendar size={18} /><input className="input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
          <div className="segmented-control"><button className={tab === 'RECEBER' ? 'active' : ''} onClick={() => setTab('RECEBER')}><TrendingUp size={16} /> Recebíveis</button><button className={tab === 'DESPESA' ? 'active' : ''} onClick={() => setTab('DESPESA')}><Receipt size={16} /> Despesas</button></div>
        </div>
      </div>

      <div className="card table-card">
        {loading ? <div className="loading">Carregando financeiro...</div> : list.length === 0 ? <div className="empty-state"><Wallet size={44} /><h3>Nenhum lançamento no período</h3></div> : (
          <div className="table-wrapper"><table className="table">
            <thead><tr><th>Descrição</th><th>{tab === 'DESPESA' ? 'Fornecedor' : 'Cliente'}</th><th>{tab === 'DESPESA' ? 'Data' : 'Vencimento'}</th><th>Status</th><th>Valor</th><th className="table-actions-cell">Ações</th></tr></thead>
            <tbody>{list.map((item) => (
              <tr key={`${item.tipo}-${item.id}`}>
                <td><strong>{item.descricao}</strong><div className="mono-muted">{item.observacoes || ''}</div></td>
                <td>{item.fornecedor || item.cliente_nome || '—'}</td><td>{displayDate(item.vencimento)}</td>
                <td><span className={`badge ${item.status === 'RECEBIDO' || item.tipo === 'DESPESA' ? 'badge-green' : item.status === 'VENCIDO' ? 'badge-red' : 'badge-yellow'}`}>{item.tipo === 'DESPESA' ? 'Registrada' : item.status === 'RECEBIDO' ? 'Recebido' : item.status === 'VENCIDO' ? 'Vencido' : 'A receber'}</span></td>
                <td><strong className={item.tipo === 'DESPESA' ? 'text-danger' : 'text-success'}>{money(item.valor)}</strong></td>
                <td className="table-actions-cell"><div className="table-actions">
                  {item.tipo === 'RECEBER' && item.status !== 'RECEBIDO' && <button className="btn btn-primary btn-sm" onClick={() => receiveMutation.mutate(item)}><CheckCircle2 size={15} /> Receber</button>}
                  <button className="btn-icon" onClick={() => openEdit(item)} aria-label="Editar"><Pencil size={15} /></button><button className="btn-icon danger" onClick={() => setDeleting(item)} aria-label="Excluir"><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {modal && <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && closeModal()}><div className="modal-content modal-panel-sm">
        <div className="modal-header"><div><h2 className="modal-title">{editing ? 'Editar' : 'Novo'} {modal === 'DESPESA' ? 'registro de despesa' : 'recebível'}</h2><p className="modal-subtitle">Preencha os dados do lançamento.</p></div><button className="btn-icon" onClick={closeModal}><X size={20} /></button></div>
        <form onSubmit={submit}><div className="form-group"><label className="form-label">Descrição *</label><input className="input" autoFocus required value={form.descricao} onChange={(event) => setForm((value) => ({ ...value, descricao: event.target.value }))} /></div>
          <div className="form-group"><label className="form-label">{modal === 'DESPESA' ? 'Fornecedor' : 'Cliente'}</label><input className="input" value={form.pessoa} onChange={(event) => setForm((value) => ({ ...value, pessoa: event.target.value }))} /></div>
          <div className="form-grid-2"><div className="form-group"><label className="form-label">Valor *</label><input className="input" type="number" min="0.01" step="0.01" required value={form.valor} onChange={(event) => setForm((value) => ({ ...value, valor: event.target.value }))} /></div><div className="form-group"><label className="form-label">{modal === 'DESPESA' ? 'Data da despesa' : 'Vencimento'} *</label><input className="input" type="date" required value={form.data} onChange={(event) => setForm((value) => ({ ...value, data: event.target.value }))} /></div></div>
          <div className="form-group"><label className="form-label">Observações</label><textarea className="input" rows={3} value={form.observacoes} onChange={(event) => setForm((value) => ({ ...value, observacoes: event.target.value }))} /></div>
          <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</button></div>
        </form>
      </div></div>}

      <ConfirmModal isOpen={Boolean(deleting)} title="Excluir lançamento" description={`Deseja excluir “${deleting?.descricao || ''}”?`} confirmLabel="Excluir" onConfirm={() => deleting && deleteMutation.mutate(deleting)} onClose={() => setDeleting(null)} isLoading={deleteMutation.isPending} />
    </div>
  );
}
