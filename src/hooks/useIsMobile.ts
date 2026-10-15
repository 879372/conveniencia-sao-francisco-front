import { useMediaQuery } from './useMediaQuery';

/** Mesmo ponto de quebra do CSS mobile (index.css). */
export const MOBILE_QUERY = '(max-width: 768px)';

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
