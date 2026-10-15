import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'sonner';
import ClienteModal from './ClienteModal';
import ConfirmModal from '../../components/ConfirmModal';
import InfiniteScroll from '../../components/InfiniteScroll';
import { PaginaApi, usePaginatedList } from '../../hooks/usePaginatedList';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Phone,
  CreditCard,
  MapPin
} from 'lucide-react';

interface Cliente {
  id: string;
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
  codigo_legado?: string;
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteParaToggle, setClienteParaToggle] = useState<Cliente | null>(null);

  const lista = usePaginatedList<Cliente>(['clientes', search], async (page) => {
    const resp = await api.get<PaginaApi<Cliente>>('/clientes/', { params: { search, page } });
    return resp.data;
  });
  const { items: clientes, count, isLoading, page, setPage, totalPages, isMobile } = lista;

  // Toggle Active Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (cliente: Cliente) => {
      return api.patch(`/clientes/${cliente.id}/`, { ativo: !cliente.ativo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setClienteParaToggle(null);
      toast.success('Status do cliente atualizado!');
    },
  });

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowModal(true);
  };

  const handleNew = () => {
    setSelectedCliente(null);
    setShowModal(true);
  };

  const handleToggle = (cliente: Cliente) => {
    setClienteParaToggle(cliente);
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Gestão de Clientes</h1>
          <p className="page-subtitle">
            {isLoading ? 'Carregando total...' : `${count.toLocaleString('pt-BR')} registros na base`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="card table-card list-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Buscar por nome, CPF/CNPJ ou código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {isMobile ? (
          <div className="m-list">
            {isLoading ? (
              <div className="loading">Carregando clientes...</div>
            ) : clientes.length === 0 ? (
              <div className="m-empty">Nenhum cliente encontrado.</div>
            ) : clientes.map((c) => (
              <div key={c.id} className="m-card clickable" onClick={() => handleEdit(c)}>
                <div className="m-card-head">
                  <div>
                    <div className="m-card-title">{c.nome}</div>
                    <div className="m-card-sub">
                      {c.codigo_legado ? `#${c.codigo_legado} · ` : ''}{c.pessoa === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </div>
                  </div>
                  <span className={`badge ${c.ativo ? 'badge-green' : 'badge-red'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="m-card-meta">
                  <span><CreditCard size={13} /> {c.cpf_cnpj || '—'}</span>
                  <span><Phone size={13} /> {c.telefone || '—'}</span>
                  <span><MapPin size={13} /> {[c.cidade, c.uf].filter(Boolean).join('/') || 'N/D'}</span>
                </div>
                <div className="m-card-actions" onClick={(event) => event.stopPropagation()}>
                  {c.telefone && (
                    <a className="btn btn-ghost btn-sm" href={`tel:${c.telefone.replace(/\D/g, '')}`}><Phone size={15} /> Ligar</a>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(c)}><Edit3 size={15} /> Editar</button>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => handleToggle(c)}
                    style={{ color: c.ativo ? 'var(--accent-red)' : 'var(--accent-green)' }}
                    aria-label={`${c.ativo ? 'Desativar' : 'Ativar'} ${c.nome}`}
                  >
                    {c.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
            ))}
            <InfiniteScroll hasMore={!!lista.hasNextPage} loading={lista.isFetchingNextPage} onLoadMore={lista.fetchNextPage} />
          </div>
        ) : (
        <>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Cliente / Razão Social</th><th>CPF/CNPJ</th><th>Telefone / Cidade</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td colSpan={6}><div className="skeleton-line" style={{ height: 24, margin: '8px 0', borderRadius: 4 }}></div></td>
                  </tr>
                ))
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                          {c.codigo_legado ? `#${c.codigo_legado} · ` : ''}{c.pessoa === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </div>
                    </td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <CreditCard size={12} className="text-muted" />
                            <span style={{ fontFamily: 'monospace' }}>{c.cpf_cnpj || '—'}</span>
                        </div>
                    </td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <Phone size={12} className="text-muted" />
                            <span>{c.telefone || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <MapPin size={10} />
                            <span>{[c.cidade, c.uf].filter(Boolean).join('/') || 'N/D'}</span>
                        </div>
                    </td>
                    <td>
                      <span className={`badge ${c.ativo ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(c)} title="Editar" aria-label={`Editar ${c.nome}`}>
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleToggle(c)}
                          style={{ color: c.ativo ? 'var(--accent-red)' : 'var(--accent-green)' }}
                          title={c.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {c.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!isLoading && totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Página {page}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        </>
        )}
      </div>

      {showModal && (
        <ClienteModal
          cliente={selectedCliente}
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clientes'] })}
        />
      )}

      <ConfirmModal
        isOpen={!!clienteParaToggle}
        title={clienteParaToggle?.ativo ? 'Desativar Cliente' : 'Ativar Cliente'}
        description={`Deseja realmente ${clienteParaToggle?.ativo ? 'desativar' : 'ativar'} o cliente "${clienteParaToggle?.nome}"?`}
        confirmLabel={clienteParaToggle?.ativo ? 'Desativar' : 'Ativar'}
        onConfirm={() => clienteParaToggle && toggleMutation.mutate(clienteParaToggle)}
        onClose={() => setClienteParaToggle(null)}
        isLoading={toggleMutation.isPending}
        isDanger={clienteParaToggle?.ativo}
      />
    </div>
  );
}
