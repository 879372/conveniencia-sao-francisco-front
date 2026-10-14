import { useState, FormEvent } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';

interface ContaFormProps {
  tipo: 'PAGAR' | 'RECEBER';
  editData?: any;
  onSave: () => void;
  onClose: () => void;
}

export default function ContaForm({ tipo, editData, onSave, onClose }: ContaFormProps) {
  const [form, setForm] = useState({
    descricao: editData?.descricao || '',
    valor: editData?.valor || '',
    vencimento: editData?.vencimento || '',
    status: editData?.status || 'PENDENTE',
    observacoes: editData?.observacoes || '',
    fornecedor_ou_cliente: editData?.fornecedor || editData?.cliente_nome || '',
    recorrente: editData?.recorrente || false,
    data_fim_recorrencia: editData?.data_fim_recorrencia || '',
  });

  const handleChange = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      vencimento: form.vencimento,
      status: form.status,
      observacoes: form.observacoes,
      recorrente: form.recorrente,
      data_fim_recorrencia: form.data_fim_recorrencia || null,
      ...(tipo === 'PAGAR' ? { fornecedor: form.fornecedor_ou_cliente } : { cliente_nome: form.fornecedor_ou_cliente }),
    };

    try {
      const endpoint = tipo === 'PAGAR' ? '/financeiro/contas-pagar/' : '/financeiro/contas-receber/';

      if (editData?.id) {
        await api.patch(`${endpoint}${editData.id}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      onSave();
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
      toast.error('Erro ao salvar lançamento.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>

      <div className="form-group">
        <label className="form-label">Descrição *</label>
        <input
          className="input"
          required
          value={form.descricao}
          onChange={e => handleChange('descricao', e.target.value)}
          placeholder="Ex: Aluguel, Fornecedor Atacado..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">{tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</label>
          <input
            className="input"
            value={form.fornecedor_ou_cliente}
            onChange={e => handleChange('fornecedor_ou_cliente', e.target.value)}
            placeholder="Nome"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <input
            className="input"
            type="number"
            step="0.01"
            required
            value={form.valor}
            onChange={e => handleChange('valor', e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Vencimento *</label>
          <input
            className="input"
            type="date"
            required
            value={form.vencimento}
            onChange={e => handleChange('vencimento', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Status Inicial</label>
          <select
            className="select"
            value={form.status}
            onChange={e => handleChange('status', e.target.value)}
          >
            <option value="PENDENTE">Pendente</option>
            <option value={tipo === 'PAGAR' ? 'PAGO' : 'RECEBIDO'}>{tipo === 'PAGAR' ? 'Efetuado' : 'Recebido'}</option>
            <option value="VENCIDO">Vencido</option>
          </select>
        </div>
      </div>

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
        <input
          type="checkbox"
          id="recorrente"
          style={{ width: 18, height: 18 }}
          checked={form.recorrente}
          onChange={e => handleChange('recorrente', e.target.checked)}
        />
        <label htmlFor="recorrente" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Lançamento Fixo (Repetir mensalmente)</label>
      </div>

      {form.recorrente && (
        <div className="form-group animate-in">
          <label className="form-label">Repetir até o mês de:</label>
          <input
            className="input"
            type="date"
            required={form.recorrente}
            value={form.data_fim_recorrencia}
            onChange={e => handleChange('data_fim_recorrencia', e.target.value)}
          />
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>O sistema irá gerar um lançamento para cada mês até esta data.</p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Observações</label>
        <input
          className="input"
          value={form.observacoes}
          onChange={e => handleChange('observacoes', e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
          {editData ? 'Salvar Alterações' : 'Confirmar Lançamento'}
        </button>
      </div>
    </form>
  );
}
