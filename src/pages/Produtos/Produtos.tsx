import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ProdutoModal from './ProdutoModal';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ToggleLeft,
  ToggleRight,
  History
} from 'lucide-react';
import KardexModal from './KardexModal';

interface Produto {
  id: string | number;
  nome: string;
  codigo_legado: string;
  codigo_barras: string;
  preco_venda: number;
  preco_compra: number;
  unidade_medida: string;
  grupo: string;
  subgrupo: string;
  ativo: boolean;
}

interface ApiResponse {
  count: number;
  results: Produto[];
}

export default function Produtos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  const [showKardex, setShowKardex] = useState(false);
  const [kardexProduto, setKardexProduto] = useState<Produto | null>(null);

  // Fetch Produtos with React Query
  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['produtos', search, page],
    queryFn: async () => {
      const resp = await api.get('/produtos/', { params: { search, page } });
      return resp.data;
    },
  });

  // Toggle Active Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (produto: Produto) => {
      return api.patch(`/produtos/${produto.id}/`, { ativo: !produto.ativo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setShowModal(true);
  };

  const handleNew = () => {
    setSelectedProduto(null);
    setShowModal(true);
  };

  const handleToggle = (produto: Produto) => {
    toggleMutation.mutate(produto);
  };

  const handleKardex = (produto: Produto) => {
    setKardexProduto(produto);
    setShowKardex(true);
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Catálogo de Produtos</h1>
          <p className="page-subtitle">
            {isLoading ? 'Carregando total...' : `${data?.count.toLocaleString('pt-BR')} itens registrados`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              className="input"
                placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Cód. P.</th>
                <th>Nome</th>
                <th>Grupo</th>
                <th>Und.</th>
                <th>Preço Venda</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                /* Skeleton Loading Rows */
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton-line" style={{ height: 24, margin: '8px 0', borderRadius: 4 }}></div>
                    </td>
                  </tr>
                ))
              ) : data?.results.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum produto encontrado.</td></tr>
              ) : (
                data?.results.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleEdit(p)}
                    style={{
                      cursor: 'pointer',
                      opacity: p.ativo ? 1 : 0.6
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.codigo_legado || '—'}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.nome}</td>
                    <td>{p.grupo || '—'}</td>
                    <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{p.unidade_medida}</span></td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                      R$ {Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${p.ativo ? 'badge-green' : 'badge-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                        {p.ativo ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon" onClick={(event) => { event.stopPropagation(); handleEdit(p); }} title="Editar" aria-label={`Editar ${p.nome}`}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={(event) => { event.stopPropagation(); handleKardex(p); }} title="Histórico (Kardex)" aria-label={`Histórico de ${p.nome}`}>
                          <History size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={(event) => { event.stopPropagation(); handleToggle(p); }}
                          style={{ color: p.ativo ? 'var(--accent-red)' : 'var(--accent-green)' }}
                          title={p.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {p.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
        <ProdutoModal
          produto={selectedProduto}
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['produtos'] })}
        />
      )}

      {showKardex && kardexProduto && (
        <KardexModal
          produtoId={kardexProduto.id}
          produtoNome={kardexProduto.nome}
          onClose={() => setShowKardex(false)}
        />
      )}

      {/* Global Skeleton Styles */}
      <style>{`
        @keyframes skeleton-pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        .skeleton-line {
          background: var(--bg-hover);
          animation: skeleton-pulse 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
