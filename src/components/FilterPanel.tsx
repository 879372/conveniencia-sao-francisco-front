import { ReactNode, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface FilterPanelProps {
  /** Campo de busca: sempre visível. */
  search?: ReactNode;
  /** Texto do botão quando não há busca (ex.: período selecionado). */
  resumo?: ReactNode;
  /** Demais filtros: ocultos no mobile até tocar no ícone. */
  children: ReactNode;
  /** Quantos filtros estão preenchidos (mostra um contador no ícone). */
  ativos?: number;
}

/**
 * No desktop renderiza busca e filtros normalmente (dentro do grid do pai).
 * No mobile mostra só a busca + botão para expandir/retrair os filtros.
 */
export default function FilterPanel({ search, resumo, children, ativos = 0 }: FilterPanelProps) {
  const isMobile = useIsMobile();
  const [aberto, setAberto] = useState(false);

  if (!isMobile) {
    return (
      <>
        {search}
        {children}
      </>
    );
  }

  return (
    <div className="mobile-filters">
      <div className="mobile-filters-bar">
        {search ? <div className="mobile-filters-search">{search}</div> : (
          <button type="button" className="mobile-filters-summary" onClick={() => setAberto((v) => !v)}>
            {resumo}
          </button>
        )}
        <button
          type="button"
          className={`mobile-filters-toggle${aberto ? ' active' : ''}`}
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={aberto ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <SlidersHorizontal size={18} />
          {ativos > 0 && <span className="mobile-filters-count">{ativos}</span>}
        </button>
      </div>
      {aberto && <div className="mobile-filters-panel">{children}</div>}
    </div>
  );
}
