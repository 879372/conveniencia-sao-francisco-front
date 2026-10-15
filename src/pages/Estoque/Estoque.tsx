import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, History, Pencil, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import KardexModal from '../Produtos/KardexModal';
import Modal from '../../components/Modal';
import InfiniteScroll from '../../components/InfiniteScroll';
import { PaginaApi, usePaginatedList } from '../../hooks/usePaginatedList';

interface ProdutoEstoque {
  id: string | number;
  codigo_legado?: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: number | string;
  ativo: boolean;
}

export default function Estoque() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [produto, setProduto] = useState<ProdutoEstoque | null>(null);
  const [novoSaldo, setNovoSaldo] = useState('');
  const [kardex, setKardex] = useState<ProdutoEstoque | null>(null);

  const lista = usePaginatedList<ProdutoEstoque>(['estoque', search], async (page) => {
    const response = await api.get<PaginaApi<ProdutoEstoque>>('/produtos/', { params: { search, page } });
    return response.data;
  });
  const { items, count, isLoading, page, setPage, totalPages, isMobile } = lista;

  const ajusteMutation = useMutation({
    mutationFn: async () => {
      if (!produto) return;
      await api.patch(`/produtos/${produto.id}/`, { estoque_inicial: Number(novoSaldo) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Estoque atualizado com sucesso.');
      setProduto(null);
      setNovoSaldo('');
    },
    onError: () => toast.error('Não foi possível atualizar o estoque.'),
  });

  const abrirAjuste = (item: ProdutoEstoque) => {
    setProduto(item);
    setNovoSaldo(String(Number(item.estoque_atual || 0)));
  };

  const salvarAjuste = (event: FormEvent) => {
    event.preventDefault();
    if (novoSaldo === '' || Number(novoSaldo) < 0) {
      toast.error('Informe um saldo válido.');
      return;
    }
    ajusteMutation.mutate();
  };

  return (
    <div className="animate-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Consulte e ajuste o saldo atual de cada produto</p>
        </div>
        <div className="badge badge-blue">{count} produtos</div>
      </div>

      <div className="card table-card list-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="search"
              className="input"
              placeholder="Buscar produto ou código..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
        </div>

        {isMobile ? (
          <div className="m-list">
            {isLoading ? (
              <div className="loading">Carregando estoque...</div>
            ) : items.length === 0 ? (
              <div className="m-empty">Nenhum produto encontrado.</div>
            ) : items.map((item) => {
              const saldo = Number(item.estoque_atual || 0);
              const baixo = saldo <= 10;
              return (
                <div key={item.id} className="m-card">
                  <div className="m-card-head">
                    <div>
                      <div className="m-card-title">{item.nome}</div>
                      <div className="m-card-sub">Cód. {item.codigo_legado || '—'} · {item.unidade_medida}</div>
                    </div>
                    <span className={`badge ${baixo ? 'badge-yellow' : 'badge-green'}`}>
                      {baixo ? <AlertTriangle size={12} /> : <Boxes size={12} />}
                      {baixo ? 'Baixo' : 'Normal'}
                    </span>
                  </div>
                  <div className="m-card-meta">
                    <span>Saldo atual: <strong className={baixo ? 'text-danger' : 'text-success'} style={{ fontSize: '1.05rem' }}>{saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</strong></span>
                  </div>
                  <div className="m-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setKardex(item)}><History size={15} /> Histórico</button>
                    <button className="btn btn-primary btn-sm" onClick={() => abrirAjuste(item)}><Pencil size={15} /> Ajustar</button>
                  </div>
                </div>
              );
            })}
            <InfiniteScroll hasMore={!!lista.hasNextPage} loading={lista.isFetchingNextPage} onLoadMore={lista.fetchNextPage} />
          </div>
        ) : (
        <>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Unidade</th>
                <th>Saldo atual</th>
                <th>Situação</th>
                <th className="table-actions-cell">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [1, 2, 3, 4, 5].map((item) => (
                <tr key={item}><td colSpan={6}><div className="skeleton-line" style={{ height: 24 }} /></td></tr>
              )) : items.map((item) => {
                const saldo = Number(item.estoque_atual || 0);
                const baixo = saldo <= 10;
                return (
                  <tr key={item.id}>
                    <td className="mono-muted">{item.codigo_legado || '—'}</td>
                    <td><strong>{item.nome}</strong></td>
                    <td>{item.unidade_medida}</td>
                    <td><strong className={baixo ? 'text-danger' : 'text-success'}>{saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</strong></td>
                    <td>
                      <span className={`badge ${baixo ? 'badge-yellow' : 'badge-green'}`}>
                        {baixo ? <AlertTriangle size={12} /> : <Boxes size={12} />}
                        {baixo ? 'Estoque baixo' : 'Normal'}
                      </span>
                    </td>
                    <td className="table-actions-cell">
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setKardex(item)}><History size={15} /> Histórico</button>
                        <button className="btn btn-primary btn-sm" onClick={() => abrirAjuste(item)}><Pencil size={15} /> Ajustar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
            <span>Página {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button>
          </div>
        )}
        </>
        )}
      </div>

      {produto && (
        <Modal onClose={() => setProduto(null)} labelledBy="stock-adjustment-title" panelClassName="modal-content modal-panel-sm">
            <div className="modal-header">
              <div>
                <h2 id="stock-adjustment-title" className="modal-title">Ajustar estoque</h2>
                <p className="modal-subtitle">{produto.nome}</p>
              </div>
              <button className="btn-icon" onClick={() => setProduto(null)} aria-label="Fechar"><X size={20} /></button>
            </div>
            <form onSubmit={salvarAjuste}>
              <div className="form-group">
                <label className="form-label">Novo saldo ({produto.unidade_medida})</label>
                <input className="input input-emphasis" type="number" min="0" step="0.001" autoFocus value={novoSaldo} onChange={(event) => setNovoSaldo(event.target.value)} />
                <p className="field-hint">O histórico registrará automaticamente a diferença como ajuste manual.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setProduto(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={ajusteMutation.isPending}>Salvar ajuste</button>
              </div>
            </form>
        </Modal>
      )}

      {kardex && <KardexModal produtoId={kardex.id} produtoNome={kardex.nome} onClose={() => setKardex(null)} />}
    </div>
  );
}
