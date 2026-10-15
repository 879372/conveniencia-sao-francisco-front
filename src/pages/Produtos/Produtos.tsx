import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import InfiniteScroll from '../../components/InfiniteScroll';
import { PaginaApi, usePaginatedList } from '../../hooks/usePaginatedList';

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

export default function Produtos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  const [showKardex, setShowKardex] = useState(false);
  const [kardexProduto, setKardexProduto] = useState<Produto | null>(null);

  const lista = usePaginatedList<Produto>(['produtos', search], async (page) => {
    const resp = await api.get<PaginaApi<Produto>>('/produtos/', { params: { search, page } });
    return resp.data;
  });
  const { items: produtos, count, isLoading, page, setPage, totalPages, isMobile } = lista;

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
            {isLoading ? 'Carregando total...' : `${count.toLocaleString('pt-BR')} itens registrados`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="card table-card list-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {isMobile ? (
          <div className="m-list">
            {isLoading ? (
              <div className="loading">Carregando produtos...</div>
            ) : produtos.length === 0 ? (
              <div className="m-empty">Nenhum produto encontrado.</div>
            ) : produtos.map((p) => (
              <div key={p.id} className="m-card clickable" onClick={() => handleEdit(p)}>
                <div className="m-card-head">
                  <div>
                    <div className="m-card-title">{p.nome}</div>
                    <div className="m-card-sub">Cód. {p.codigo_legado || '—'} · {p.grupo || 'Sem grupo'} · {p.unidade_medida}</div>
                  </div>
                  <span className={`badge ${p.ativo ? 'badge-green' : 'badge-red'}`}>{p.ativo ? 'Ativo' : 'Pausado'}</span>
                </div>
                <div className="m-card-value" style={{ color: 'var(--accent-green)' }}>
                  R$ {Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="m-card-actions" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}><Edit3 size={16} /> Editar</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleKardex(p)}><History size={16} /> Histórico</button>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleToggle(p)} aria-label={`${p.ativo ? 'Desativar' : 'Ativar'} ${p.nome}`}>
                    {p.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
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
              ) : produtos.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum produto encontrado.</td></tr>
              ) : (
                produtos.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleEdit(p)}
                    style={{ cursor: 'pointer' }}
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
                      <div className="product-actions">
                        <button type="button" className="btn product-action-btn" onClick={(event) => { event.stopPropagation(); handleEdit(p); }} title="Editar" aria-label={`Editar ${p.nome}`}>
                          <Edit3 size={23} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <button type="button" className="btn product-action-btn" onClick={(event) => { event.stopPropagation(); handleKardex(p); }} title="Histórico (Kardex)" aria-label={`Histórico de ${p.nome}`}>
                          <History size={23} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn product-action-btn"
                          onClick={(event) => { event.stopPropagation(); handleToggle(p); }}
                          title={p.ativo ? 'Desativar' : 'Ativar'}
                          aria-label={`${p.ativo ? 'Desativar' : 'Ativar'} ${p.nome}`}
                        >
                          {p.ativo ? <ToggleRight size={24} strokeWidth={2.5} aria-hidden="true" /> : <ToggleLeft size={24} strokeWidth={2.5} aria-hidden="true" />}
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
