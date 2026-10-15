import { useState } from 'react';

/**
 * Scroll infinito para listas que já vêm inteiras do servidor: renderiza aos
 * poucos. `resetKey` deve mudar quando os filtros mudam, voltando ao início.
 */
export function useProgressiveList<T>(items: T[], resetKey: string, passo = 20) {
  const [limite, setLimite] = useState(passo);
  const [chave, setChave] = useState(resetKey);

  if (chave !== resetKey) {
    setChave(resetKey);
    setLimite(passo);
  }

  return {
    visiveis: items.slice(0, limite),
    temMais: items.length > limite,
    carregarMais: () => setLimite((atual) => atual + passo),
  };
}
