import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  Plus,
  FileText,
  Calendar,
  X,
  Info,
  Search,
  Check,
  CheckCircle2,
  RefreshCw,
  Archive,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';

interface NotaCompra {
  id: string;
  numero_documento: string;
  fornecedor: string;
  cnpj_fornecedor: string;
  data_emissao: string;
  data_entrada: string;
  valor_total: string;
  status: 'PENDENTE' | 'RECEBIDA' | 'CANCELADA';
  observacoes: string;
}

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  PENDENTE: { label: 'Aguardando', color: 'badge-yellow', icon: Info },
  RECEBIDA: { label: 'Confirmada', color: 'badge-green', icon: CheckCircle2 },
  CANCELADA: { label: 'Cancelada', color: 'badge-red', icon: X },
};

const formatCurrency = (val: any) => {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Compras() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'CONFIRMADAS' | 'CANCELADAS'>('PENDENTE');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE'), // Início do mês
    end: new Date().toLocaleDateString('sv-SE')
  });
  const [editItem, setEditItem] = useState<NotaCompra | null>(null);
  const [editForm, setEditForm] = useState({
    fornecedor: '',
    cnpj_fornecedor: '',
    numero_documento: '',
    data_emissao: '',
    valor_total: '',
    status: 'PENDENTE' as 'PENDENTE' | 'RECEBIDA' | 'CANCELADA',
    observacoes: '',
  });

  const [form, setForm] = useState({
    numero_documento: '',
    fornecedor: '',
    cnpj_fornecedor: '',
    data_emissao: '',
    valor_total: '',
    observacoes: ''
  });

  // Query mapeada para o status correto
  const currentStatus = activeTab === 'PENDENTE' ? 'PENDENTE' : (activeTab === 'CONFIRMADAS' ? 'RECEBIDA' : 'CANCELADA');

  const { data: items = [], isLoading, refetch } = useQuery<NotaCompra[]>({
    queryKey: ['compras-data', currentStatus, searchTerm, dateRange],
    queryFn: async () => {
      const resp = await api.get('/compras/', {
        params: {
          status: currentStatus,
          search: searchTerm || undefined,
          data_inicio: dateRange.start,
          data_fim: dateRange.end
        }
      });
      return resp.data.results || resp.data;
    },
  });

  const mutation = useMutation({
    mutationFn: (newNota: any) => api.post('/compras/', newNota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-data'] });
      setShowModal(false);
      resetForm();
      toast.success('Compra registrada!');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/compras/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-data'] });
      setEditItem(null);
      toast.success('Compra atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar alteração.'),
  });

  const openEdit = (nota: NotaCompra) => {
    setEditItem(nota);
    setEditForm({
      fornecedor: nota.fornecedor || '',
      cnpj_fornecedor: nota.cnpj_fornecedor || '',
      numero_documento: nota.numero_documento || '',
      data_emissao: nota.data_emissao || '',
      valor_total: nota.valor_total || '',
      status: nota.status,
      observacoes: nota.observacoes || '',
    });
  };

  const handleEditChange = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  const receberMutation = useMutation({
    mutationFn: (id: string) => api.post(`/compras/${id}/receber/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Compra confirmada! Estoque atualizado.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.erro || 'Erro ao confirmar recebimento.');
    }
  });

  const resetForm = () => {
    setForm({ numero_documento: '', fornecedor: '', cnpj_fornecedor: '', data_emissao: '', valor_total: '', observacoes: '' });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      valor_total: parseFloat(form.valor_total || '0')
    });
  };

  const handleInputChange = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Gestão de Compras</h1>
          <p className="page-subtitle">Controle de compras e entradas de estoque</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Registrar Compra
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="tabs-container" style={{ background: 'var(--bg-card)', padding: '6px', borderRadius: '12px' }}>
          <button
            className={`tab-item ${activeTab === 'PENDENTE' ? 'active' : ''}`}
            onClick={() => { setActiveTab('PENDENTE'); setSearchTerm(''); }}
            style={{ borderRadius: '8px' }}
          >
            <Archive size={16} style={{ marginRight: 8 }} />
            Pendentes
          </button>
          <button
            className={`tab-item ${activeTab === 'CONFIRMADAS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('CONFIRMADAS'); setSearchTerm(''); }}
            style={{ borderRadius: '8px' }}
          >
            <CheckCircle2 size={16} style={{ marginRight: 8 }} />
            Confirmadas
          </button>
          <button
            className={`tab-item ${activeTab === 'CANCELADAS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('CANCELADAS'); setSearchTerm(''); }}
            style={{ borderRadius: '8px' }}
          >
            <X size={16} style={{ marginRight: 8 }} />
            Canceladas
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS UNIFICADA */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div className="responsive-toolbar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BUSCAR FORNECEDOR / DOCUMENTO</label>
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <Search size={18} className="search-icon" />
              <input
                className="input"
                placeholder="Ex: nome, CNPJ ou nº do documento"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DE (DATA ENTRADA)</label>
            <input
              type="date"
              className="input"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATÉ (DATA ENTRADA)</label>
            <input
              type="date"
              className="input"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          <button className="btn btn-ghost" onClick={() => refetch()} style={{ height: 42 }}>
             <RefreshCw size={16} />
             Atualizar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading" style={{ height: 300 }}>Carregando registros...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nada por aqui</h3>
            <p style={{ color: 'var(--text-muted)' }}>Registre uma compra para acompanhar a entrada de estoque.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fornecedor / Emitente</th>
                  <th>Data Emissão</th>
                  <th>Documento</th>
                  <th>Valor Total</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => {
                  const StatusIcon = STATUS_MAP[n.status]?.icon || Info;
                  return (
                    <tr key={n.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{n.fornecedor}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{n.cnpj_fornecedor}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <Calendar size={14} className="text-muted" />
                          {n.data_emissao ? new Date(n.data_emissao).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          {n.numero_documento || 'S/N'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 800 }}>
                        R$ {formatCurrency(n.valor_total)}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_MAP[n.status]?.color || 'badge-blue'}`} style={{ gap: 4 }}>
                          <StatusIcon size={12} />
                          {STATUS_MAP[n.status]?.label || n.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        {n.observacoes ? (
                          <span
                            title={n.observacoes}
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.4',
                            }}
                          >
                            {n.observacoes}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {n.status === 'PENDENTE' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ background: 'var(--accent-green)', padding: '6px 12px' }}
                              onClick={() => receberMutation.mutate(n.id)}
                              disabled={receberMutation.isPending}
                            >
                              <Check size={14} />
                              Confirmar
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-ghost"
                            title="Editar observação"
                            onClick={() => openEdit(n)}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL MANUAL */}
      {showModal && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="card animate-in modal-panel">
            <div className="modal-titlebar">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Lançamento Manual</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon" aria-label="Fechar modal"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nome do Fornecedor *</label>
                  <input className="input" required value={form.fornecedor} onChange={e => handleInputChange('fornecedor', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Número do Documento</label>
                  <input className="input" value={form.numero_documento} onChange={e => handleInputChange('numero_documento', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Data de Emissão</label>
                  <input className="input" type="date" value={form.data_emissao} onChange={e => handleInputChange('data_emissao', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Valor Total (R$) *</label>
                  <input className="input" type="number" step="0.01" required value={form.valor_total} onChange={e => handleInputChange('valor_total', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Observações</label>
                  <textarea className="input" rows={3} value={form.observacoes} onChange={e => handleInputChange('observacoes', e.target.value)} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={mutation.isPending}>
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COMPRA */}
      {editItem && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setEditItem(null)}
        >
          <div className="card animate-in modal-panel">
            <div className="modal-titlebar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--accent-blue)', borderRadius: 8, padding: 8, display: 'flex' }}>
                  <Pencil size={18} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Editar Compra</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    {editItem.fornecedor}{editItem.numero_documento ? ` · ${editItem.numero_documento}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditItem(null)} className="btn btn-ghost btn-icon" aria-label="Fechar modal"><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nome do Fornecedor *</label>
                <input
                  className="input"
                  required
                  value={editForm.fornecedor}
                  onChange={e => handleEditChange('fornecedor', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">CNPJ do Fornecedor</label>
                <input
                  className="input"
                  value={editForm.cnpj_fornecedor}
                  onChange={e => handleEditChange('cnpj_fornecedor', e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="form-label">Número do Documento</label>
                <input
                  className="input"
                  value={editForm.numero_documento}
                  onChange={e => handleEditChange('numero_documento', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Data de Emissão</label>
                <input
                  className="input"
                  type="date"
                  value={editForm.data_emissao}
                  onChange={e => handleEditChange('data_emissao', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Valor Total (R$)</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={editForm.valor_total}
                  onChange={e => handleEditChange('valor_total', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  className="input"
                  value={editForm.status}
                  onChange={e => handleEditChange('status', e.target.value)}
                >
                  <option value="PENDENTE">Aguardando</option>
                  <option value="RECEBIDA">Confirmada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Observações</label>
                <textarea
                  className="input"
                  rows={4}
                  value={editForm.observacoes}
                  onChange={e => handleEditChange('observacoes', e.target.value)}
                  placeholder="Observações sobre esta compra..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditItem(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={editMutation.isPending}
                onClick={() => editMutation.mutate({
                  id: editItem.id,
                  data: {
                    ...editForm,
                    valor_total: parseFloat(editForm.valor_total || '0'),
                  }
                })}
              >
                <Pencil size={15} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
