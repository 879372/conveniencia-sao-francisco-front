import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Tags,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../components/Modal';
import InfiniteScroll from '../../components/InfiniteScroll';
import { PaginaApi, usePaginatedList } from '../../hooks/usePaginatedList';

interface Grupo {
  id: string | number;
  nome: string;
  descricao: string;
}

export default function Grupos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });

  const lista = usePaginatedList<Grupo>(['grupos', search], async (page) => {
    const resp = await api.get<PaginaApi<Grupo>>('/grupos/', { params: { search, page } });
    return resp.data;
  });
  const { items: groups, isLoading, page, setPage, totalPages, isMobile } = lista;

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (selectedGrupo) {
        return api.patch(`/grupos/${selectedGrupo.id}/`, payload);
      }
      return api.post('/grupos/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      setShowModal(false);
      setFormData({ nome: '', descricao: '' });
      toast.success('Grupo salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar grupo. Certifique-se que o nome é único.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => api.delete(`/grupos/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo removido com sucesso!');
    },
    onError: () => {
      toast.error('Este grupo não pode ser removido pois existem produtos vinculados.');
    }
  });

  const handleEdit = (g: Grupo) => {
    setSelectedGrupo(g);
    setFormData({ nome: g.nome, descricao: g.descricao || '' });
    setShowModal(true);
  };

  const handleNew = () => {
    setSelectedGrupo(null);
    setFormData({ nome: '', descricao: '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Grupos de Produtos</h1>
          <p className="page-subtitle">Gerencie as categorias e categorias do seu catálogo</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} />
          Novo Grupo
        </button>
      </div>

      <div className="card table-card list-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {isMobile ? (
          <div className="m-list">
            {isLoading ? (
              <div className="loading">Carregando grupos...</div>
            ) : groups.length === 0 ? (
              <div className="m-empty">Nenhum grupo encontrado.</div>
            ) : groups.map((g) => (
              <div key={g.id} className="m-card clickable" onClick={() => handleEdit(g)}>
                <div className="m-card-title">{g.nome}</div>
                {g.descricao && <div className="m-card-sub">{g.descricao}</div>}
                <div className="m-card-actions" onClick={(event) => event.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(g)}><Edit3 size={15} /> Editar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteMutation.mutate(g.id)} style={{ color: 'var(--accent-red)' }}><Trash2 size={15} /> Excluir</button>
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
              <tr>
                <th style={{ width: 40 }}><Tags size={16} /></th>
                <th>Nome do Grupo</th>
                <th>Descrição / Notas</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Carregando...</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum grupo encontrado.</td></tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id}>
                    <td><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent)' }}></div></td>
                    <td style={{ fontWeight: 600 }}>{g.nome}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{g.descricao || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(g)} aria-label={`Editar ${g.nome}`}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => deleteMutation.mutate(g.id)} style={{ color: 'var(--accent-red)' }} aria-label={`Excluir ${g.nome}`}>
                          <Trash2 size={14} />
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
        <Modal
          onClose={() => setShowModal(false)}
          labelledBy="group-modal-title"
          panelClassName="card modal-panel modal-panel-sm"
          overlayStyle={{ zIndex: 1000 }}
          closeOnBackdrop={false}
        >
            <div className="modal-titlebar">
              <h2 id="group-modal-title" style={{ fontWeight: 700 }}>{selectedGrupo ? 'Editar Grupo' : 'Novo Grupo'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Fechar modal"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Nome do Grupo</label>
                <input
                  className="input"
                  required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Bebidas, Limpeza, Hortifruti"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Descrição (Opcional)</label>
                <textarea
                  className="input"
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  style={{ minHeight: 80, resize: 'none' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
