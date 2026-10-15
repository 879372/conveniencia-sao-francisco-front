import { useState } from 'react';
import { QueryKey, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useIsMobile } from './useIsMobile';

/** Tamanho da página do DRF (PAGE_SIZE no backend). */
export const PAGE_SIZE = 50;

export interface PaginaApi<T> {
  count: number;
  next?: string | null;
  results: T[];
}

const normalizar = <T,>(data: PaginaApi<T> | T[]): PaginaApi<T> =>
  Array.isArray(data) ? { count: data.length, next: null, results: data } : data;

/**
 * Lista paginada pelo servidor.
 * - Desktop: paginação com "Anterior / Próxima".
 * - Mobile: scroll infinito, acumulando as páginas.
 * O queryKey deve conter os filtros; as invalidações por prefixo continuam
 * funcionando (ex.: invalidateQueries({ queryKey: ['vendas'] })).
 */
export function usePaginatedList<T>(
  queryKey: QueryKey,
  fetchPage: (page: number) => Promise<PaginaApi<T> | T[]>,
) {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

  const desktop = useQuery({
    queryKey: [...queryKey, { page }],
    queryFn: async () => normalizar(await fetchPage(page)),
    enabled: !isMobile,
  });

  const mobile = useInfiniteQuery({
    queryKey: [...queryKey, 'infinito'],
    queryFn: async ({ pageParam }) => normalizar(await fetchPage(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (ultima, todas) => (ultima.next ? todas.length + 1 : undefined),
    enabled: isMobile,
  });

  if (isMobile) {
    return {
      isMobile,
      items: mobile.data?.pages.flatMap((p) => p.results) ?? [],
      count: mobile.data?.pages[0]?.count ?? 0,
      isLoading: mobile.isLoading,
      page,
      setPage,
      totalPages: 1,
      hasNextPage: mobile.hasNextPage,
      isFetchingNextPage: mobile.isFetchingNextPage,
      fetchNextPage: () => { mobile.fetchNextPage(); },
    };
  }

  const count = desktop.data?.count ?? 0;
  return {
    isMobile,
    items: desktop.data?.results ?? [],
    count,
    isLoading: desktop.isLoading,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
  };
}
