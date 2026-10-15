import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, FileText, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

interface Compra {
  id: string;
  numero_documento: string;
  fornecedor: string;
  cnpj_fornecedor: string;
  data_emissao: string;
  data_entrada: string;
  valor_total: string;
  observacoes: string;
}

const today = () => new Date().toLocaleDateString('sv-SE');
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE');
const currency = (value: string | number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const maskCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14)
  .replace(/^(\d{2})(\d)/, '$1.$2')
  .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1/$2')
  .replace(/(\d{4})(\d)/, '$1-$2');

const emptyForm = {
  numero_documento: '', fornecedor: '', cnpj_fornecedor: '', data_emissao: today(), valor_total: '', observacoes: '',
};

export default function Compras() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Compra | null>(null);
  const [search, setSearch] = useState('');
  const [dates, setDates] = useState({ start: monthStart(), end: today() });
  const [form, setForm] = useState(emptyForm);

  const { data: compras = [], isLoading, refetch } = useQuery<Compra[]>({
    queryKey: ['compras-data', search, dates],
    queryFn: async () => {
      const response = await api.get('/compras/', { params: { search: search || undefined, data_inicio: dates.start, data_fim: dates.end } });
      return response.data.results || response.data;
    },
  });

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, valor_total: Number(form.valor_total || 0), status: 'RECEBIDA' };
      return editing ? api.patch(`/compras/${editing.id}/`, payload) : api.post('/compras/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(editing ? 'Compra atualizada.' : 'Compra registrada.');
      closeModal();
    },
    onError: () => toast.error('Não foi possível salvar a compra.'),
  });

  const openEdit = (compra: Compra) => {
    setEditing(compra);
    setForm({
      numero_documento: compra.numero_documento || '',
      fornecedor: compra.fornecedor || '',
      cnpj_fornecedor: compra.cnpj_fornecedor || '',
      data_emissao: compra.data_emissao || today(),
      valor_total: compra.valor_total || '',
      observacoes: compra.observacoes || '',
    });
    setModal(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const total = compras.reduce((sum, compra) => sum + Number(compra.valor_total || 0), 0);

  return (
    <div className="animate-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Compras / Entradas</h1>
          <p className="page-subtitle">Registro simples das compras realizadas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={18} /> Registrar compra</button>
      </div>

      <div className="kpi-grid compact-kpis">
        <div className="kpi-card yellow"><div className="kpi-label">Compras no período</div><div className="kpi-value">{compras.length}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Total registrado</div><div className="kpi-value">{currency(total)}</div></div>
      </div>

      <div className="card filter-card">
        <div className="responsive-toolbar-grid filters-grid">
          <div>
            <label className="form-label">Fornecedor ou documento</label>
            <div className="search-input-wrapper"><Search size={18} className="search-icon" /><input className="input" placeholder="Pesquisar..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>
          <div><label className="form-label">Data inicial</label><input type="date" className="input" value={dates.start} onChange={(event) => setDates((value) => ({ ...value, start: event.target.value }))} /></div>
          <div><label className="form-label">Data final</label><input type="date" className="input" value={dates.end} onChange={(event) => setDates((value) => ({ ...value, end: event.target.value }))} /></div>
          <button className="btn btn-ghost" onClick={() => refetch()}><RefreshCw size={16} /> Atualizar</button>
        </div>
      </div>

      <div className="card table-card">
        {isLoading ? <div className="loading">Carregando registros...</div> : compras.length === 0 ? (
          <div className="empty-state"><FileText size={44} /><h3>Nenhuma compra encontrada</h3><p>Registre uma compra para manter o histórico organizado.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Fornecedor</th><th>Documento</th><th>Emissão</th><th>Entrada</th><th>Valor</th><th>Observação</th><th className="table-actions-cell">Ações</th></tr></thead>
              <tbody>{compras.map((compra) => (
                <tr key={compra.id}>
                  <td><strong>{compra.fornecedor}</strong><div className="mono-muted">{compra.cnpj_fornecedor || 'CNPJ não informado'}</div></td>
                  <td>{compra.numero_documento || 'S/N'}</td>
                  <td><span className="inline-icon"><Calendar size={14} />{formatDate(compra.data_emissao)}</span></td>
                  <td>{formatDate(compra.data_entrada)}</td>
                  <td><strong className="text-success">{currency(compra.valor_total)}</strong></td>
                  <td className="truncate-cell" title={compra.observacoes}>{compra.observacoes || '—'}</td>
                  <td className="table-actions-cell"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(compra)}><Pencil size={15} /> Editar</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="modal-content modal-panel">
            <div className="modal-header">
              <div><h2 className="modal-title">{editing ? 'Editar compra' : 'Registrar compra'}</h2><p className="modal-subtitle">Este cadastro serve como histórico da entrada.</p></div>
              <button className="btn-icon" onClick={closeModal} aria-label="Fechar"><X size={20} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid-2">
                <div className="form-group form-span-2"><label className="form-label">Fornecedor *</label><input className="input" required autoFocus value={form.fornecedor} onChange={(event) => setForm((value) => ({ ...value, fornecedor: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label">CNPJ</label><input className="input" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj_fornecedor} onChange={(event) => setForm((value) => ({ ...value, cnpj_fornecedor: maskCnpj(event.target.value) }))} /></div>
                <div className="form-group"><label className="form-label">Documento</label><input className="input" value={form.numero_documento} onChange={(event) => setForm((value) => ({ ...value, numero_documento: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Data de emissão</label><input className="input" type="date" value={form.data_emissao} onChange={(event) => setForm((value) => ({ ...value, data_emissao: event.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Valor total *</label><input className="input" type="number" min="0" step="0.01" required placeholder="0,00" value={form.valor_total} onChange={(event) => setForm((value) => ({ ...value, valor_total: event.target.value }))} /></div>
                <div className="form-group form-span-2"><label className="form-label">Observações</label><textarea className="input" rows={4} value={form.observacoes} onChange={(event) => setForm((value) => ({ ...value, observacoes: event.target.value }))} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar compra'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
