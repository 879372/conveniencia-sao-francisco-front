import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import api from '../../lib/api';
import { X, User, Phone, Mail, MapPin, Building2, CreditCard } from 'lucide-react';
import Modal from '../../components/Modal';

interface Cliente {
  id?: string;
  nome: string;
  razao_social: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  pessoa: 'F' | 'J';
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  ativo: boolean;
}

interface ClienteModalProps {
  cliente: Cliente | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClienteModal({ cliente, onClose, onSuccess }: ClienteModalProps) {
  const [formData, setFormData] = useState<Cliente>({
    nome: '',
    razao_social: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    pessoa: 'F',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    ativo: true
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cliente) {
      setFormData({
        ...cliente,
        razao_social: cliente.razao_social || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        uf: cliente.uf || ''
      });
    }
  }, [cliente]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (cliente?.id) {
        await api.patch(`/clientes/${cliente.id}/`, formData);
      } else {
        await api.post('/clientes/', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="cliente-modal-title"
      panelClassName="card animate-in modal-panel modal-panel-lg"
      closeOnBackdrop={false}
    >
        <div className="modal-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, color: 'var(--accent)' }}>
              <User size={20} />
            </div>
            <h2 id="cliente-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {cliente ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 18 }}>

            {/* Dados Principais */}
            <div style={{ gridColumn: 'span 8' }}>
              <label className="form-label" htmlFor="cliente-nome">Nome Completo / Nome Fantasia *</label>
              <input id="cliente-nome" name="nome" value={formData.nome} onChange={handleChange} className="input" required placeholder="Ex: João da Silva ou Mercado Central" />
            </div>

            <div style={{ gridColumn: 'span 4' }}>
              <label className="form-label" htmlFor="cliente-tipo">Tipo</label>
              <select id="cliente-tipo" name="pessoa" value={formData.pessoa} onChange={handleChange} className="input">
                <option value="F">Pessoa Física</option>
                <option value="J">Pessoa Jurídica</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <label className="form-label" htmlFor="cliente-documento">CPF / CNPJ</label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input id="cliente-documento" name="cpf_cnpj" value={formData.cpf_cnpj} onChange={handleChange} className="input" style={{ paddingLeft: 36 }} placeholder="000.000.000-00" />
              </div>
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <label className="form-label" htmlFor="cliente-razao-social">Razão Social (opcional)</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input id="cliente-razao-social" name="razao_social" value={formData.razao_social} onChange={handleChange} className="input" style={{ paddingLeft: 36 }} placeholder="Nome empresarial" />
              </div>
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <label className="form-label" htmlFor="cliente-telefone">Telefone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input id="cliente-telefone" name="telefone" value={formData.telefone} onChange={handleChange} className="input" style={{ paddingLeft: 36 }} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <label className="form-label" htmlFor="cliente-email">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input id="cliente-email" name="email" type="email" value={formData.email} onChange={handleChange} className="input" style={{ paddingLeft: 36 }} placeholder="cliente@email.com" />
              </div>
            </div>

            {/* Endereço */}
            <div style={{ gridColumn: 'span 12', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
               <MapPin size={16} style={{ color: 'var(--accent)' }} />
               <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Localização / Endereço</h3>
               <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 8 }}></div>
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label className="form-label" htmlFor="cliente-cep">CEP</label>
              <input id="cliente-cep" name="cep" value={formData.cep} onChange={handleChange} className="input" placeholder="00000-000" />
            </div>

            <div style={{ gridColumn: 'span 9' }}>
              <label className="form-label" htmlFor="cliente-endereco">Logradouro / Endereço</label>
              <input id="cliente-endereco" name="endereco" value={formData.endereco} onChange={handleChange} className="input" placeholder="Rua, Av, Travessa..." />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label className="form-label" htmlFor="cliente-numero">Número</label>
              <input id="cliente-numero" name="numero" value={formData.numero} onChange={handleChange} className="input" />
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label className="form-label" htmlFor="cliente-bairro">Bairro</label>
              <input id="cliente-bairro" name="bairro" value={formData.bairro} onChange={handleChange} className="input" />
            </div>

            <div style={{ gridColumn: 'span 4' }}>
              <label className="form-label" htmlFor="cliente-cidade">Cidade</label>
              <input id="cliente-cidade" name="cidade" value={formData.cidade} onChange={handleChange} className="input" />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="cliente-uf">UF</label>
              <input id="cliente-uf" name="uf" value={formData.uf} onChange={handleChange} className="input" maxLength={2} style={{ textTransform: 'uppercase' }} />
            </div>

          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Descartar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 140, justifyContent: 'center' }}>
              {loading ? 'Salvando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
