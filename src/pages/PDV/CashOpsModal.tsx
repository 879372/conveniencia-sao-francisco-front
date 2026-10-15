import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { X, ArrowDownCircle, ArrowUpCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../components/Modal';

interface CashOpsModalProps {
  sessaoId: number | string;
  tipo: 'SANGRIA' | 'SUPRIMENTO';
  onClose: () => void;
}

export default function CashOpsModal({ sessaoId, tipo, onClose }: CashOpsModalProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const endpoint = tipo === 'SANGRIA' ? 'sangria' : 'suprimento';
      return api.post(`/sessoes-caixa/${sessaoId}/${endpoint}/`, {
        valor: parseFloat(valor),
        motivo
      });
    },
    onSuccess: () => {
      toast.success(`${tipo === 'SANGRIA' ? 'Sangria' : 'Suprimento'} realizada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['sessao-ativa'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.erro || 'Erro ao processar operação.';
      toast.error(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) return;
    mutation.mutate();
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="cash-operation-title"
      describedBy="cash-operation-description"
      overlayClassName="modal-overlay-raised"
      panelClassName="modal-content modal-panel-sm"
    >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`icon-box ${tipo === 'SANGRIA' ? 'icon-box-red' : 'icon-box-green'}`}>
              {tipo === 'SANGRIA' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
            </div>
            <h2 id="cash-operation-title" className="modal-title">{tipo === 'SANGRIA' ? 'Sangria de Caixa' : 'Suprimento de Caixa'}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar modal"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p id="cash-operation-description" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {tipo === 'SANGRIA'
              ? 'Retirada de valores do caixa (ex: pagamento de fornecedor ou coleta).'
              : 'Entrada de valores no caixa (ex: reforço de troco).'}
          </p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="cash-operation-value">Valor (R$)</label>
            <input
              id="cash-operation-value"
              className="input"
              type="number"
              step="0.01"
              autoFocus
              required
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', height: 50 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cash-operation-reason">Motivo / Observação</label>
            <input
              id="cash-operation-reason"
              className="input"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo..."
            />
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="submit"
            className={`btn ${tipo === 'SANGRIA' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={mutation.isPending}
            style={{ minWidth: 120 }}
          >
            {mutation.isPending ? 'Processando...' : (
              <>
                <Check size={18} />
                Confirmar
              </>
            )}
          </button>
        </div>
      <style>{`
        .icon-box-red { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }
        .icon-box-green { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
        .btn-danger { background: var(--accent-red); color: white; }
        .btn-danger:hover { background: #dc2626; }
      `}</style>
    </Modal>
  );
}
