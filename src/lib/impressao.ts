/**
 * Impressão do cupom pelo PDV.
 *
 * - "sistema" (padrão): monta o cupom em HTML de 80mm e imprime pelo driver
 *   da impressora instalado no Windows. Com o Chrome aberto pelo atalho com
 *   --kiosk-printing, vai direto para a impressora padrão, sem abrir janela.
 * - "usb": envia ESC/POS direto via WebUSB (exige driver WinUSB no Windows).
 */
import { CupomDados, cupomBytes, FORMAS, LOJA, moeda } from './cupom';
import { thermalPrinter } from './thermalPrint';

export type ModoImpressao = 'sistema' | 'usb';

const STORAGE_MODO = 'pdv_impressao_modo';

export const getModoImpressao = (): ModoImpressao => {
  try {
    return localStorage.getItem(STORAGE_MODO) === 'usb' ? 'usb' : 'sistema';
  } catch {
    return 'sistema';
  }
};

export const setModoImpressao = (modo: ModoImpressao) => {
  try {
    localStorage.setItem(STORAGE_MODO, modo);
  } catch {
    // Sem armazenamento local: segue no modo padrão.
  }
};

export async function imprimirCupom(dados: CupomDados) {
  if (getModoImpressao() === 'usb') {
    await thermalPrinter.printBytes(cupomBytes(dados));
    return;
  }
  await imprimirPeloSistema(montarCupomHtml(dados));
}

const escapar = (texto: unknown) => String(texto ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const quantidade = (valor: number) =>
  Number.isInteger(Number(valor))
    ? String(Number(valor))
    : Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const linha = (esquerda: string, direita: string, classe = '') =>
  `<div class="row ${classe}"><span>${escapar(esquerda)}</span><span>${escapar(direita)}</span></div>`;

/** Mesmo layout do DAV impresso via ESC/POS, em HTML para o driver do Windows. */
export function montarCupomHtml(dados: CupomDados): string {
  const titulo = dados.orcamento
    ? '<div class="center bold">ORÇAMENTO</div>'
    : '<div class="center bold">DAV - Documento Auxiliar de Venda<br>da Nota Fiscal de Consumidor Eletrônica</div>';

  const itens = dados.itens.map((item, index) => `
    <div class="item">${String(index + 1).padStart(3, '0')}&nbsp;&nbsp;${escapar(item.codigo ?? '')}&nbsp;&nbsp;${escapar(item.descricao)}</div>
    <div class="cols"><span>${escapar(`${quantidade(item.quantidade)} x ${item.unidade || 'UN'}`)}</span><span>${escapar(moeda(item.precoUnitario))}</span><span>${escapar(moeda(item.subtotal))}</span></div>
  `).join('');

  const pagamentos = dados.pagamentos.length
    ? linha('FORMA DE PAGAMENTO', 'Valor Pago')
      + dados.pagamentos.map((p) => linha(FORMAS[p.forma] || p.forma, moeda(p.valor))).join('')
    : '';

  const data = `${dados.data.toLocaleDateString('pt-BR')} ${dados.data.toLocaleTimeString('pt-BR')}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Cupom ${escapar(dados.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: 72mm;
    padding: 2mm 3mm 6mm;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 11px;
    line-height: 1.3;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 15px; }
  .muted { margin-top: 2px; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  .sep-strong { border-top: 2px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .cols { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; padding-left: 8mm; text-align: right; }
  .cols span:first-child { text-align: left; }
  .item { word-break: break-word; }
  .right { text-align: right; }
  .space { height: 6px; }
</style>
</head>
<body>
  <div class="center bold">${escapar(LOJA.nome)}</div>
  <div class="center">${escapar(LOJA.nome)}</div>
  ${linha(`CNPJ.: ${LOJA.cnpj}`, `IE.: ${LOJA.ie}`)}
  <div>End.: ${escapar(LOJA.endereco)}</div>
  <div>Bairro.: ${escapar(LOJA.bairro)}</div>
  <div class="space"></div>
  ${titulo}
  <div class="center muted">Não tem valor fiscal</div>
  <div class="space"></div>
  <div class="big">${dados.orcamento ? 'ORÇAMENTO' : 'DAV'} N°.: ${escapar(dados.numero)}</div>
  <div class="sep"></div>
  <div>ITEM&nbsp;&nbsp;CÓDIGO&nbsp;&nbsp;DESCRIÇÃO</div>
  <div class="cols"><span>QTD&nbsp;&nbsp;UND</span><span>VL.UNIT R$</span><span>TOTAL R$</span></div>
  <div class="sep"></div>
  ${itens}
  <div class="sep-strong"></div>
  ${linha('TOTAL R$.:', moeda(dados.total))}
  ${dados.desconto > 0 ? linha('DESCONTO R$.:', `- ${moeda(dados.desconto)}`) : ''}
  <div class="sep"></div>
  ${linha('PAGAR R$.:', moeda(dados.total - dados.desconto), 'bold')}
  ${pagamentos}
  ${dados.troco > 0 ? linha('TROCO R$.:', moeda(dados.troco)) : ''}
  <div class="sep"></div>
  <div>CLIENTE.: ${escapar((dados.cliente || 'AVULSO').toUpperCase())}</div>
  <div class="right">${escapar(data)}</div>
  <div class="sep"></div>
  <div class="center bold">TERMINAL.: CAIXA OPERADOR.: ${escapar((dados.operador || '1').toUpperCase())}</div>
</body>
</html>`;
}

/**
 * Imprime o HTML num iframe oculto, sem trocar de página. O diálogo de
 * impressão só não aparece quando o Chrome é aberto com --kiosk-printing.
 */
function imprimirPeloSistema(html: string) {
  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

    const remover = () => setTimeout(() => iframe.remove(), 1000);

    iframe.onload = () => {
      const janela = iframe.contentWindow;
      if (!janela) {
        iframe.remove();
        reject(new Error('Não foi possível preparar a impressão.'));
        return;
      }
      janela.addEventListener('afterprint', remover, { once: true });
      janela.focus();
      janela.print();
      // Fallback caso o navegador não dispare afterprint.
      setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
      resolve();
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}
