import { useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { getModoImpressao, ModoImpressao, setModoImpressao } from '../lib/impressao';
import { thermalPrinter } from '../lib/thermalPrint';

/** Escolha de como o cupom é impresso; a preferência fica salva neste navegador. */
export default function ModoImpressaoSelect({ style }: { style?: React.CSSProperties }) {
  const [modo, setModo] = useState<ModoImpressao>(getModoImpressao);

  const alterar = async (novo: ModoImpressao) => {
    setModo(novo);
    setModoImpressao(novo);
    if (novo === 'usb') {
      try {
        await thermalPrinter.requestDevice();
        toast.success('Impressora USB configurada!');
      } catch (error: any) {
        if (error?.name !== 'NotFoundError') {
          toast.error(error?.message || 'Falha ao conectar impressora USB.');
        }
      }
    }
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', ...style }}>
      <Printer size={14} />
      Impressão:
      <select
        className="input"
        style={{ height: 30, padding: '0 8px', fontSize: '0.8rem', width: 'auto' }}
        value={modo}
        onChange={(e) => alterar(e.target.value as ModoImpressao)}
      >
        <option value="sistema">Windows (impressora padrão)</option>
        <option value="usb">USB direta</option>
      </select>
    </label>
  );
}
