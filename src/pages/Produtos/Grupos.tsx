import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface Grupo {
  id: string | number;
  nome: string;
  descricao: string;
}

interface ApiResponse {
  count: number;
  results: Grupo[];
}

export default function Grupos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['grupos', search, page],
    queryFn: async () => {
      const resp = await api.get('/grupos/', { params: { search, page } });
      return resp.data;
    },
  });

  const groups = data?.results || [];

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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              className="input"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

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
        {!isLoading && data && data.count > 50 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Página {page}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page * 50 >= data.count}>
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card modal-panel modal-panel-sm">
            <div className="modal-titlebar">
              <h2 style={{ fontWeight: 700 }}>{selectedGrupo ? 'Editar Grupo' : 'Novo Grupo'}</h2>
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
          </div>
        </div>
      )}
    </div>
  );
}
