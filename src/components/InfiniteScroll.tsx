import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
}

/** Marca o fim da lista; quando aparece na tela, pede mais itens. */
export default function InfiniteScroll({ hasMore, loading = false, onLoadMore }: InfiniteScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || !hasMore || loading || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore && !loading) return null;

  return (
    <div ref={ref} className="infinite-scroll" aria-live="polite">
      {loading && (
        <>
          <Loader2 size={16} className="animate-spin" />
          Carregando mais...
        </>
      )}
      {!loading && hasMore && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLoadMoreRef.current()}>
          Carregar mais
        </button>
      )}
    </div>
  );
}
