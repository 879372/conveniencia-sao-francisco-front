import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  ShoppingCart,
  Search,
  X,
  CreditCard,
  QrCode,
  Banknote,
  ClipboardList,
  ArrowRight,
  LogOut,
  Store,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Minus,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Loader2,
  Printer
} from 'lucide-react';
import { thermalPrinter } from '../../lib/thermalPrint';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Produto, ItemCarrinho, Sessao, Venda, Pagamento } from './types';
import CashOpsModal from './CashOpsModal';
import ProdutoModal from '../Produtos/ProdutoModal';
import Modal from '../../components/Modal';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const FORMAS_PAGAMENTO = [
  { key: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, color: 'var(--accent-green)' },
  { key: 'PIX', label: 'Pix', icon: QrCode, color: 'var(--accent)' },
  { key: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard, color: 'var(--accent-yellow)' },
  { key: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard, color: 'var(--accent-yellow)' },
  { key: 'FIADO', label: 'Fiado', icon: ClipboardList, color: 'var(--accent-red)' },
];

import { toast } from 'sonner';

export default function PDV() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeVendaId = searchParams.get('venda_id');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [qtyMultiplier, setQtyMultiplier] = useState(1);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => {
    const saved = localStorage.getItem('pdv_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [venda, setVenda] = useState<Venda | null>(() => {
    const saved = localStorage.getItem('pdv_venda');
    return saved ? JSON.parse(saved) : null;
  });
  const [productAddingId, setProductAddingId] = useState<number | string | null>(null);

  // Operações de Caixa
  const [showCashOp, setShowCashOp] = useState(false);
  const [cashOpType, setCashOpType] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [modalFecharCaixaOpen, setModalFecharCaixaOpen] = useState(false);
  const [valorContado, setValorContado] = useState('');
  const [modalCancelarVendaOpen, setModalCancelarVendaOpen] = useState(false);
  const [desconto, setDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState<'VALOR' | 'PERCENTUAL'>('VALOR');

  // Impressão de comprovante
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Persistência local do estado da venda
  useEffect(() => {
    localStorage.setItem('pdv_cart', JSON.stringify(carrinho));
    if (venda) localStorage.setItem('pdv_venda', JSON.stringify(venda));
    else localStorage.removeItem('pdv_venda');
  }, [carrinho, venda]);
  const [showPagamento, setShowPagamento] = useState(false);
  const [fundoInicial, setFundoInicial] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'cart'>('search');

  // Pagamentos Múltiplos
  const [pagamentosRealizados, setPagamentosRealizados] = useState<Pagamento[]>([]);
  const [formaPagto, setFormaPagto] = useState('DINHEIRO');
  const [valorPago, setValorPago] = useState('');
  const [clienteId, setClienteId] = useState<number | string | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('Consumidor Final');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  // Clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const resp = await api.get('/clientes/');
      return resp.data.results || resp.data;
    }
  });

  const buscaRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ code: string, time: number }>({ code: '', time: 0 });
  const isProcessingScanRef = useRef(false);
  const valorPagoRef = useRef<HTMLInputElement>(null);

  // Totais
  const total = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const valorDescontoReal = tipoDesconto === 'VALOR' ? desconto : (total * (desconto / 100));
  const totalLiquido = Math.max(0, total - valorDescontoReal);
  const totalJaPago = pagamentosRealizados.reduce((acc, p) => acc + p.valor, 0);
  const valorRestante = Math.max(0, totalLiquido - totalJaPago);
  const troco = Math.max(0, totalJaPago - totalLiquido);

  // 1. Check Active Session
  const { data: sessao, isLoading: loadingSessao } = useQuery<Sessao>({
    queryKey: ['sessao-ativa'],
    queryFn: async () => {
      try {
        const resp = await api.get('/sessoes-caixa/ativa/');
        return resp.data;
      } catch {
        return null;
      }
    },
    staleTime: Infinity, // Só recarrega se invalidado
  });

  // 2. Fetch Active Sale for Session
  const { data: vendaAberta } = useQuery({
    queryKey: ['venda-aberta', sessao?.id, resumeVendaId],
    queryFn: async () => {
      if (!sessao) return null;

      // Se houver um ID específico para retomar
      if (resumeVendaId) {
        try {
          const { data } = await api.get(`/vendas/${resumeVendaId}/`);
          return data;
        } catch {
          toast.error('Não foi possível carregar a venda solicitada.');
        }
      }

      // Fallback: carregar a primeira venda aberta da sessão
      const { data } = await api.get('/vendas/', { params: { sessao: sessao.id, status: 'EM_ABERTO' } });
      const results = data.results || data;
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!sessao,
  });

  useEffect(() => {
    if (vendaAberta) {
      setVenda(vendaAberta);
      setCarrinho(vendaAberta.itens.map((i: any) => ({
        id: i.id,
        produto_id: i.produto?.id || i.produto,
        nome: i.produto?.nome || 'Produto sem nome',
        quantidade: parseFloat(i.quantidade),
        preco_unitario: parseFloat(i.preco_unitario),
        subtotal: parseFloat(i.subtotal),
        unidade: i.produto?.unidade_medida || 'UN'
      })));
    }
  }, [vendaAberta]);

  // Mutations
  const abrirCaixaMutation = useMutation({
    mutationFn: (fundo: number) => api.post('/sessoes-caixa/', { fundo_inicial: fundo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessao-ativa'] });
      setTimeout(() => buscaRef.current?.focus(), 200);
    },
  });

  const fecharCaixaMutation = useMutation({
    mutationFn: (valor: number) => api.post(`/sessoes-caixa/${sessao?.id}/fechar/`, { valor_contado: valor }),
    onSuccess: () => {
      toast.success('Caixa fechado com sucesso!');
      setModalFecharCaixaOpen(false);
      setValorContado('');
      queryClient.invalidateQueries({ queryKey: ['sessao-ativa'] });
      setCarrinho([]);
      setVenda(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.erro || 'Erro ao fechar o caixa.');
    }
  });

  const removerItemMutation = useMutation({
    mutationFn: async ({ itemId, itemSubtotal }: { itemId: number | string, itemSubtotal: number }) => {
      await api.delete(`/venda-itens/${itemId}/`);
      // Atualiza total da venda
      if (venda) {
        const novoTotal = Math.max(0, Number(venda.total) - itemSubtotal);
        await api.patch(`/vendas/${venda.id}/`, { total: novoTotal });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venda-aberta'] });
    },
    onError: () => toast.error('Erro ao remover item.'),
  });

  const criarVendaMutation = useMutation({
    mutationFn: (sessaoId: string) => api.post('/vendas/', { sessao: sessaoId, total: 0 }),
  });

  const adicionarItemMutation = useMutation({
    mutationFn: async ({ vendaId, produto, qty }: { vendaId: string, produto: Produto, qty: number }) => {
      const preco = Number(produto.preco_venda);
      const { data: item } = await api.post('/venda-itens/', {
        venda: vendaId,
        produto: produto.id,
        quantidade: qty,
        preco_unitario: preco,
        subtotal: preco * qty
      });
      return item;
    },
  });

  const finalizarVendaMutation = useMutation({
    mutationFn: async () => {
      const respVenda = await api.post(`/vendas/${venda?.id}/finalizar/`, {
        pagamentos: pagamentosRealizados,
        cliente: clienteId,
        desconto: valorDescontoReal
      });

      // Salva os dados da venda finalizada para o compartilhamento
      console.log('VENDA FINALIZADA (SERVER RESPONSE):', respVenda.data);
      setPrintData({
        ...respVenda.data,
        carrinho: [...carrinho],
        pagamentosRealizados: [...pagamentosRealizados],
        total,
        troco,
        dataHora: new Date().toLocaleString('pt-BR')
      });

      return respVenda;
    },
    onSuccess: (respVenda) => {
      toast.success('Venda finalizada!');
      setShowPagamento(false);

      // Sempre prepara os dados de impressão/compartilhamento e exibe o modal de sucesso
      setPrintData({
        ...respVenda.data,
        carrinho: [...carrinho],
        pagamentosRealizados: [...pagamentosRealizados],
        total,
        troco,
        dataHora: new Date().toLocaleString('pt-BR')
      });
      setShowPrintModal(true);

      queryClient.invalidateQueries({ queryKey: ['venda-aberta'] });
      setPagamentosRealizados([]);
      setCarrinho([]);
      setVenda(null);
      setClienteId(null);
      setBuscaCliente('Consumidor Final');
      setShowClienteDropdown(false);
      setDesconto(0);
      setTipoDesconto('VALOR');
      setTimeout(() => buscaRef.current?.focus(), 100);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.erro || 'Erro ao finalizar venda.');
    }
  });


  // Handlers
  const handlePrintUSB = async () => {
    if (!printData) return;

    try {
      const isOrcamento = printData.status === 'ORCAMENTO';
      let cupom = ` CONVENIENCIA SAO FRANCISCO\n`;
      cupom += isOrcamento ? `        ORCAMENTO\n` : `   Comprovante de Venda\n`;
      cupom += `--------------------------------\n`;
      cupom += `Data: ${printData.dataHora}\n`;
      cupom += `${isOrcamento ? 'Orcamento' : 'Venda'}: #${printData.id || 'N/A'}\n`;
      cupom += `--------------------------------\n`;

      printData.carrinho.forEach((item: any) => {
        const nome = (item.nome || 'Item').substring(0, 18).padEnd(18, ' ');
        const totalItem = Number(item.subtotal || 0).toFixed(2).padStart(8, ' ');
        cupom += `${nome} ${totalItem}\n`;
        cupom += `  ${Number(item.quantidade || 0).toFixed(3)} x ${Number(item.preco_unitario || 0).toFixed(2)}\n`;
      });

      cupom += `--------------------------------\n`;
      cupom += `SUBTOTAL:       R$ ${Number(printData.total || 0).toFixed(2).padStart(10, ' ')}\n`;
      if (printData.desconto > 0) {
        cupom += `DESCONTO:     - R$ ${Number(printData.desconto).toFixed(2).padStart(10, ' ')}\n`;
      }
      const totalLiq = Number(printData.total || 0) - Number(printData.desconto || 0);
      cupom += `TOTAL:          R$ ${totalLiq.toFixed(2).padStart(10, ' ')}\n`;
      cupom += `--------------------------------\n`;

      cupom += `       OBRIGADO! \n`;

      if (printData.id_externo) {
        const publicUrl = (import.meta as any).env.VITE_PUBLIC_URL;
        const apiBase = publicUrl || ((import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '');
        const qrUrl = `${apiBase}/api/comprovante/${printData.id_externo}/`;
        await thermalPrinter.printWithQRCode(cupom, qrUrl);
      } else {
        await thermalPrinter.print(cupom);
      }

      toast.success('Imprimindo via USB...');
    } catch (error) {
      console.error(error);
      toast.error('Impressora USB não conectada. Clique no ícone de impressora no topo.');
    }
  };

  const handleConnectPrinter = async () => {
    try {
      await thermalPrinter.requestDevice();
      toast.success('Impressora USB Conectada!');
    } catch {
      toast.error('Falha ao conectar impressora.');
    }
  };

  const handleAbrirCaixa = () => {
    abrirCaixaMutation.mutate(parseFloat(fundoInicial || '0'));
  };

  const handleEditProduct = async (item: ItemCarrinho) => {
    try {
      const { data } = await api.get(`/produtos/${item.produto_id}/`);
      setEditingProduct(data);
      setShowEditModal(true);
    } catch {
      toast.error('Erro ao carregar dados do produto.');
    }
  };

  const handleEditSuccess = async () => {
    if (!editingProduct) return;

    try {
      const { data: updatedProd } = await api.get(`/produtos/${editingProduct.id}/`);

      // Atualiza o carrinho local
      setCarrinho(prev => prev.map(item => {
        if (item.produto_id === updatedProd.id) {
          const novaPreco = Number(updatedProd.preco_venda);
          return {
            ...item,
            nome: updatedProd.nome,
            preco_unitario: novaPreco,
            subtotal: item.quantidade * novaPreco
          };
        }
        return item;
      }));

      // Atualiza os itens no servidor
      const itensToUpdate = carrinho.filter(i => i.produto_id === updatedProd.id);
      for (const item of itensToUpdate) {
        if (item.id) {
          const novaPreco = Number(updatedProd.preco_venda);
          await api.patch(`/venda-itens/${item.id}/`, {
            preco_unitario: novaPreco,
            subtotal: item.quantidade * novaPreco
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['venda-aberta'] });
      toast.success('Produto e carrinho atualizados!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoverItem = (item: typeof carrinho[0], idx: number) => {
    if (item.id) {
      // Item persistido no servidor — remove via API
      removerItemMutation.mutate({ itemId: item.id, itemSubtotal: item.subtotal });
    }
    // Remove localmente imediatamente para UX fluida
    setCarrinho(prev => prev.filter((_, i) => i !== idx));
    if (venda) {
      // O total será recalculado automaticamente no servidor
      // Apenas atualizamos o estado local para refletir na UI
      setVenda(prev => prev ? { ...prev } : prev);
    }
  };

  const handleAdicionarItem = useCallback(async (produto: Produto, qtyOverride?: number) => {
    if (isAdding) return;
    setIsAdding(true);
    setProductAddingId(produto.id);

    try {
      let currentVenda = venda;
      if (!currentVenda && sessao) {
         const resp = await criarVendaMutation.mutateAsync(sessao.id);
         currentVenda = resp.data;
         setVenda(currentVenda);
      }

      const quantityToAdd = qtyOverride || qtyMultiplier || 1;

      if (currentVenda) {
          await adicionarItemMutation.mutateAsync({
            vendaId: currentVenda.id,
            produto,
            qty: quantityToAdd
          });

          setCarrinho(prev => {
              const idx = prev.findIndex(i => i.produto_id === produto.id);
              const preco = Number(produto.preco_venda);
              if (idx >= 0) {
                const novo = [...prev];
                const novaQty = novo[idx].quantidade + quantityToAdd;
                novo[idx] = {
                   ...novo[idx],
                   quantidade: novaQty,
                   subtotal: novaQty * novo[idx].preco_unitario
                };
                return novo;
              }
              return [...prev, {
                produto_id: produto.id,
                nome: produto.nome,
                quantidade: quantityToAdd,
                preco_unitario: preco,
                subtotal: preco * quantityToAdd,
                unidade: produto.unidade_medida
              }];
          });

          setBusca('');
          setResultados([]);
          setSelectedIndex(0);
          setQtyMultiplier(1);
          await queryClient.invalidateQueries({ queryKey: ['venda-aberta'] });
        }
      } catch {
          toast.error('Erro ao adicionar item.');
      } finally {
        setIsAdding(false);
        setProductAddingId(null);
      }
    }, [isAdding, venda, sessao, adicionarItemMutation, criarVendaMutation, qtyMultiplier, queryClient]);

  const handleBusca = useCallback(async (q: string) => {
    setBusca(q);

    // Suporte ao padrão QTY*SEARCH (ex: 3*COPO)
    let searchTerm = q;
    let multiplier = 1;

    if (q.includes('*')) {
      const [qtyPart, ...rest] = q.split('*');
      const parsedQty = parseFloat(qtyPart);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        multiplier = parsedQty;
        searchTerm = rest.join('*');
      }
    }

    searchTerm = searchTerm.trim();
    setQtyMultiplier(multiplier);

    if (!searchTerm) {
      setResultados([]);
      setSelectedIndex(0);
      return;
    }

    try {
      const { data } = await api.get('/produtos/busca-pdv/', { params: { q: searchTerm } });
      setResultados(data);
      setSelectedIndex(0);

      // AUTO-ADD: Se retornar exatamente 1 item e o termo de busca for numérico (padrão de código de barras)
      const isBarcode = /^\d+$/.test(searchTerm);
      const now = Date.now();

      // Trava de 1 segundo para o MESMO código ou se já estiver processando
      if (data.length === 1 && isBarcode) {
        if (isProcessingScanRef.current) return;
        if (lastScanRef.current.code === searchTerm && (now - lastScanRef.current.time) < 1000) {
          return;
        }

        lastScanRef.current = { code: searchTerm, time: now };
        isProcessingScanRef.current = true;

        setBusca(''); // Limpa o campo imediatamente
        handleAdicionarItem(data[0], multiplier);

        // Libera o processamento após um pequeno delay
        setTimeout(() => {
          isProcessingScanRef.current = false;
        }, 500);
      }
    } catch {
      setResultados([]);
    }
  }, [handleAdicionarItem]);

  const handleAddPagamento = () => {
    const valor = parseFloat(valorPago || '0');
    if (valor <= 0) return;
    setPagamentosRealizados(prev => [...prev, { forma: formaPagto, valor }]);
    setValorPago('');
    valorPagoRef.current?.focus();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (carrinho.length > 0) {
           setShowPagamento(true);
           setValorPago(valorRestante.toFixed(2));
           setTimeout(() => valorPagoRef.current?.focus(), 100);
        }
      }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('search'); buscaRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [carrinho, valorRestante]);

  if (loadingSessao) return <div className="loading">Iniciando terminal de venda...</div>;

  // Tela de Abertura de Caixa
  if (!sessao) {
    return (
      <div className="login-page">
         <div className="login-card animate-in" style={{ textAlign: 'center' }}>
            <div style={{ padding: 20, background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Store size={40} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Abertura de Caixa</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Informe o fundo de reserva para iniciar o expediente.</p>

            <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" htmlFor="opening-balance">Fundo Inicial (R$)</label>
                <input
                  id="opening-balance"
                  className="input"
                  type="number"
                  step="0.01"
                  autoFocus
                  value={fundoInicial}
                  onChange={e => setFundoInicial(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAbrirCaixa()}
                  style={{ textAlign: 'center', fontSize: '1.5rem', height: 60, fontWeight: 700 }}
                  placeholder="0,00"
                />
            </div>
            <button className="btn btn-primary" onClick={handleAbrirCaixa} style={{ width: '100%', padding: 16, fontSize: '1rem' }}>
                Iniciar Vendas
                <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ width: '100%', marginTop: 12 }}>Voltar ao Painel</button>
         </div>
      </div>
    );
  }

  return (
    <div className="pdv-container">
      {/* HEADER */}
      <header className="pdv-header" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'var(--accent)', color: 'white', padding: 4, borderRadius: 6 }}><Store size={16} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.5px' }} className="pdv-header-logo">
            <img src="/logo-conveniencia-sao-francisco.png" alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
            São Francisco <span className="text-accent">PDV</span>
          </div>
          {venda && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>
              #{String(venda.id).slice(-4).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Menu de Ações (Oculto em telas muito pequenas, ou em dropdown futuramente) */}
          <div className="pdv-actions-desktop" style={{ display: 'flex', gap: 4 }}>
            <button aria-label="Registrar sangria" className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', color: 'var(--accent-yellow)' }} onClick={() => { setCashOpType('SANGRIA'); setShowCashOp(true); }}>
              <Minus size={14} />
              <span className="hide-mobile">Sangria</span>
            </button>
            <button aria-label="Registrar suprimento" className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', color: 'var(--accent-green)' }} onClick={() => { setCashOpType('SUPRIMENTO'); setShowCashOp(true); }}>
              <Plus size={14} />
              <span className="hide-mobile">Suprimento</span>
            </button>
            <button aria-label="Cancelar venda atual" className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', color: 'var(--accent-red)' }} onClick={() => setModalCancelarVendaOpen(true)}>
              <Trash2 size={14} />
              <span className="hide-mobile">Cancelar</span>
            </button>
            <button aria-label="Fechar caixa" className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', color: 'var(--accent-yellow)' }} onClick={() => setModalFecharCaixaOpen(true)}>
              <Lock size={14} />
              <span className="hide-mobile">Fechar Caixa</span>
            </button>
          </div>

          <button aria-label="Sair do PDV" className="btn btn-ghost btn-sm pdv-header-icon-button" onClick={() => navigate('/dashboard')}>
             <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="pdv-body">
        {/* BUSCA DE PRODUTOS */}
        <section className={`pdv-search-column ${activeTab === 'search' ? 'active' : ''}`}>
           <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                ref={buscaRef}
                className="input"
                placeholder="Buscar produto... (F3)"
                style={{ height: 44, paddingLeft: 40, fontSize: '0.95rem', borderRadius: 10 }}
                value={busca}
                onChange={e => handleBusca(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, resultados.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (resultados.length > 0) {
                      handleAdicionarItem(resultados[selectedIndex]);
                    }
                  }
                }}
                autoFocus
              />
           </div>

           <div style={{ flex: 1, overflowY: 'auto' }}>
              {resultados.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {resultados.map((p, i) => (
                    <div
                      key={p.id}
                      className="card animate-in"
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: selectedIndex === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: selectedIndex === i ? 'var(--bg-hover)' : 'transparent'
                      }}
                      onClick={() => handleAdicionarItem(p)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleAdicionarItem(p);
                        }
                      }}
                    >
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>{p.nome}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.unidade_medida || 'UN'} · {p.codigo_legado || ''}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-green)' }}>R$ {Number(p.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          {productAddingId === p.id ? (
                            <Loader2 size={16} className="animate-spin text-accent" />
                          ) : (
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>+ ADICIONAR</div>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
              ) : busca ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  <p>Não encontrado.</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, opacity: 0.2 }}>
                   <ShoppingCart size={40} style={{ margin: '0 auto 12px' }} />
                   <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>PDV Pronto para Venda</p>
                </div>
              )}
           </div>
        </section>

        {/* CARRINHO / CUPOM */}
        <section className={`pdv-cart-column ${activeTab === 'cart' ? 'active' : ''}`}>
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                 <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>CARRINHO</h3>
                 <span className="badge badge-blue">{carrinho.length} ITENS</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                 {carrinho.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Carrinho vazio
                    </div>
                 ) : (
                    carrinho.map((item, idx) => (
                       <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  fontSize: '0.6rem', fontWeight: 800,
                                  background: 'rgba(99,102,241,0.15)',
                                  color: 'var(--accent)',
                                  borderRadius: 4, padding: '1px 5px',
                                  minWidth: 22, textAlign: 'center',
                                  letterSpacing: '0.5px',
                                  flexShrink: 0
                                }}>#{idx + 1}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.nome}</span>
                             </div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 28 }}>{item.quantidade} x R$ {item.preco_unitario.toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                             <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>R$ {item.subtotal.toFixed(2)}</div>
                             <button
                                type="button"
                                className="pdv-item-action"
                                onClick={() => handleEditProduct(item)}
                                title="Editar Produto"
                                aria-label={`Editar ${item.nome}`}
                              >
                                <Edit3 size={14} />
                              </button>
                             <button
                                type="button"
                                className="pdv-item-action danger"
                                onClick={() => handleRemoverItem(item, idx)}
                                title="Remover"
                                aria-label={`Remover ${item.nome}`}
                              >
                                <Trash2 size={14} />
                              </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px dashed var(--border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-green)', letterSpacing: '-1px' }}>
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                 </div>

                 <div style={{ display: 'flex', gap: 8 }}>
                    <button
                       className="btn btn-primary"
                       style={{ flex: 1, height: 56, fontSize: '1rem', fontWeight: 800 }}
                       onClick={() => {
                         if (isMobile && activeTab === 'search') {
                            setActiveTab('cart');
                         } else {
                            setShowPagamento(true);
                         }
                       }}
                       disabled={carrinho.length === 0}
                    >
                       {isMobile && activeTab === 'search' ? 'VER CARRINHO' : 'PAGAR (F2)'}
                    </button>
                 </div>
              </div>
           </div>
        </section>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="pdv-mobile-nav">
         <button className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('search')}>
            <Search size={18} />
            Produtos
         </button>
         <button className={`btn ${activeTab === 'cart' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('cart')} style={{ position: 'relative' }}>
            <ShoppingCart size={18} />
            Carrinho
            {carrinho.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent-red)', color: 'white', fontSize: '10px', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {carrinho.length}
              </span>
            )}
         </button>
      </nav>

      {/* MODAL DE PAGAMENTO */}
      {showPagamento && (
        <Modal
          onClose={() => setShowPagamento(false)}
          labelledBy="pdv-payment-title"
          overlayClassName="pdv-payment-overlay"
          panelClassName="card animate-in modal-panel modal-panel-lg pdv-payment-modal"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
               <h2 id="pdv-payment-title" style={{ fontSize: '1.5rem', fontWeight: 900 }}>Finalização de Venda</h2>
               <button onClick={() => setShowPagamento(false)} className="btn-icon" aria-label="Fechar pagamento"><X size={24} /></button>
            </div>

            <div className="pdv-payment-grid">

                {/* Coluna Esquerda: Lançamento de Pagamento */}
                <div style={{ flex: 1 }}>
                   <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                      <label className="form-label" htmlFor="payment-customer" style={{ fontSize: '0.75rem' }}>Identificar Cliente</label>
                      <div className="search-input-wrapper" style={{ margin: 0 }}>
                         <Search size={16} className="search-icon" />
                         <input
                            id="payment-customer"
                            className="input"
                            style={{ height: 44, borderRadius: 10, paddingLeft: 36 }}
                            placeholder="Pesquisar cliente..."
                            value={buscaCliente}
                            onChange={e => {
                               setBuscaCliente(e.target.value);
                               setShowClienteDropdown(true);
                            }}
                            onFocus={e => {
                               if (buscaCliente === 'Consumidor Final') e.target.select();
                               setShowClienteDropdown(true);
                            }}
                         />
                         {clienteId && (
                            <button
                              onClick={() => {
                                 setClienteId(null);
                                 setBuscaCliente('Consumidor Final');
                              }}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                               <X size={16} className="text-muted" />
                            </button>
                         )}
                      </div>

                      {showClienteDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                        }}>
                           <div
                             style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                             onClick={() => {
                                setClienteId(null);
                                setBuscaCliente('Consumidor Final');
                                setShowClienteDropdown(false);
                             }}
                           >
                             Consumidor Final
                           </div>
                           {(clientes || [])
                            .filter((c: any) => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
                            .map((c: any) => (
                              <div
                                key={c.id}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                                onClick={() => {
                                   setClienteId(c.id);
                                   setBuscaCliente(c.nome);
                                   setShowClienteDropdown(false);
                                }}
                              >
                                {c.nome}
                              </div>
                           ))}
                        </div>
                      )}
                   </div>

                   <div className="form-group" style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label className="form-label" htmlFor="payment-discount" style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginBottom: 0 }}>Desconto</label>
                        <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: 20, padding: 2 }}>
                           <button
                             type="button"
                             className={`btn btn-xs ${tipoDesconto === 'VALOR' ? 'btn-primary' : ''}`}
                             aria-pressed={tipoDesconto === 'VALOR'}
                             onClick={() => setTipoDesconto('VALOR')}
                             style={{ borderRadius: 18, padding: '2px 8px', height: 24, fontSize: '0.65rem', border: 'none' }}
                           >R$</button>
                           <button
                             type="button"
                             className={`btn btn-xs ${tipoDesconto === 'PERCENTUAL' ? 'btn-primary' : ''}`}
                             aria-pressed={tipoDesconto === 'PERCENTUAL'}
                             onClick={() => setTipoDesconto('PERCENTUAL')}
                             style={{ borderRadius: 18, padding: '2px 8px', height: 24, fontSize: '0.65rem', border: 'none' }}
                           >%</button>
                        </div>
                      </div>
                      <input
                        id="payment-discount"
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder={tipoDesconto === 'VALOR' ? '0,00' : '0%'}
                        style={{ height: 50, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}
                        value={desconto || ''}
                        onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                      />
                   </div>

                   <div className="form-group" style={{ marginBottom: 0 }}>
                      <span id="payment-method-label" className="form-label" style={{ fontSize: '0.75rem' }}>Forma de Pagamento</span>
                      <div role="group" aria-labelledby="payment-method-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                         {FORMAS_PAGAMENTO.map(f => (
                           <button
                             key={f.key}
                             type="button"
                             className="payment-method-button"
                             aria-pressed={formaPagto === f.key}
                             onClick={() => setFormaPagto(f.key)}
                             style={{
                               display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px', borderRadius: 8, border: '1px solid var(--border)',
                               background: formaPagto === f.key ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                               borderColor: formaPagto === f.key ? 'var(--accent)' : 'var(--border)',
                               color: formaPagto === f.key ? 'var(--accent)' : 'var(--text-primary)',
                               cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem'
                             }}
                            >
                             <f.icon size={14} />
                             {f.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="form-group">
                      <label className="form-label" htmlFor="payment-value" style={{ fontSize: '0.75rem' }}>Valor a Receber</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                         <input
                           id="payment-value"
                           ref={valorPagoRef}
                           className="input"
                           type="number"
                           step="0.01"
                           value={valorPago}
                           onChange={e => setValorPago(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleAddPagamento()}
                           style={{ height: 48, fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                         />
                         <button className="btn btn-primary" onClick={handleAddPagamento} style={{ padding: '0 16px' }}>OK</button>
                      </div>
                   </div>

                   {/* Lista de Pagamentos já feitos */}
                   {pagamentosRealizados.length > 0 && (
                     <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        {pagamentosRealizados.map((p, i) => (
                           <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{p.forma}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                 <strong>R$ {p.valor.toFixed(2)}</strong>
                                 <button type="button" className="pdv-item-action danger" aria-label={`Remover pagamento ${p.forma}`} onClick={() => setPagamentosRealizados(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                              </div>
                           </div>
                        ))}
                     </div>
                   )}
                </div>

                {/* Coluna Direita: Resumo */}
                <div className="pdv-payment-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                       <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                       <span style={{ fontWeight: 600 }}>R$ {total.toFixed(2)}</span>
                    </div>
                    {valorDescontoReal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--accent-red)' }}>
                        <span>Desconto {tipoDesconto === 'PERCENTUAL' ? `(${desconto}%)` : ''}:</span>
                        <span>- R$ {valorDescontoReal.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                       <span style={{ fontWeight: 800 }}>TOTAL LÍQUIDO:</span>
                       <span style={{ fontWeight: 900, color: 'var(--accent-green)', fontSize: '1.5rem' }}>R$ {totalLiquido.toFixed(2)}</span>
                    </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="kpi-label">RECEBIDO</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-green)' }}>R$ {totalJaPago.toFixed(2)}</div>
                   </div>
                   <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      {valorRestante > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="kpi-label" style={{ color: 'var(--accent-red)' }}>FALTA</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-red)' }}>R$ {valorRestante.toFixed(2)}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="kpi-label" style={{ color: 'var(--accent-green)' }}>TROCO</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-green)' }}>R$ {troco.toFixed(2)}</div>
                        </div>
                      )}
                   </div>
                </div>
            </div>

            <div className={`pdv-payment-actions${isMobile ? ' mobile' : ''}`}>
               <button className="btn btn-primary" style={{ flex: 1, height: 50, fontSize: '1rem', fontWeight: 800, background: 'var(--accent-green)' }}
                 onClick={() => finalizarVendaMutation.mutate()}
                 disabled={totalJaPago < totalLiquido - 0.05 || finalizarVendaMutation.isPending}
               >
                  <CheckCircle2 size={20} />
                  CONCLUIR VENDA
               </button>
            </div>
        </Modal>
      )}

      {showCashOp && sessao && (
        <CashOpsModal
          sessaoId={sessao.id}
          tipo={cashOpType}
          onClose={() => setShowCashOp(false)}
        />
      )}

      {modalFecharCaixaOpen && (
        <Modal
          onClose={() => setModalFecharCaixaOpen(false)}
          labelledBy="cash-closing-title"
          describedBy="cash-closing-description"
          panelClassName="modal-content modal-panel-sm"
        >
            <div className="modal-header">
              <div>
                <h2 id="cash-closing-title" className="modal-title">Fechar caixa</h2>
                <p id="cash-closing-description" className="modal-subtitle">Faça a conferência do dinheiro físico antes de encerrar.</p>
              </div>
              <button className="btn-icon" onClick={() => setModalFecharCaixaOpen(false)} aria-label="Fechar modal">
                <X size={20} />
              </button>
            </div>
            <div className="cash-closing-summary">
              <div><span>Fundo inicial</span><strong>R$ {Number(sessao.fundo_inicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div><span>Saldo esperado em dinheiro</span><strong>R$ {Number(sessao.saldo_final_calculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cash-closing-value">Valor contado no caixa (R$) *</label>
              <input id="cash-closing-value" className="input input-emphasis" type="number" min="0" step="0.01" autoFocus value={valorContado} onChange={e => setValorContado(e.target.value)} placeholder="0,00" />
              {valorContado !== '' && <p className="field-hint">Diferença: <strong className={Number(valorContado) - Number(sessao.saldo_final_calculado || 0) === 0 ? 'text-success' : 'text-danger'}>R$ {(Number(valorContado) - Number(sessao.saldo_final_calculado || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalFecharCaixaOpen(false)}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={() => fecharCaixaMutation.mutate(Number(valorContado))}
                disabled={valorContado === '' || Number(valorContado) < 0 || fecharCaixaMutation.isPending}
              >
                {fecharCaixaMutation.isPending ? 'Fechando...' : 'Conferir e fechar'}
              </button>
            </div>
        </Modal>
      )}

      {modalCancelarVendaOpen && (
        <Modal
          onClose={() => setModalCancelarVendaOpen(false)}
          labelledBy="cancel-sale-title"
          describedBy="cancel-sale-description"
          panelClassName="modal-content modal-panel-sm modal-text-center"
        >
             <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
               <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--accent-red)' }}>
                  <AlertTriangle size={32} />
               </div>
             </div>
             <h3 id="cancel-sale-title" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>Cancelar Venda?</h3>
             <p id="cancel-sale-description" style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
               A venda atual será descartada e todos os itens serão removidos. Esta ação não pode ser desfeita.
             </p>
             <div style={{ display: 'flex', gap: 10 }}>
               <button data-modal-initial-focus className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModalCancelarVendaOpen(false)}>
                 Voltar
               </button>
               <button className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-red)' }} onClick={() => {
                 setCarrinho([]);
                 setVenda(null);
                 setPagamentosRealizados([]);
                 setBuscaCliente('Consumidor Final');
                 setClienteId(null);
                 setModalCancelarVendaOpen(false);
                 setActiveTab('search');
                 buscaRef.current?.focus();
               }}>
                 Sim, Cancelar
               </button>
             </div>
        </Modal>
      )}

      {showPrintModal && (
        <Modal
          onClose={() => { setShowPrintModal(false); setPrintData(null); }}
          labelledBy="print-sale-title"
          describedBy="print-sale-description"
          overlayClassName="modal-overlay-raised"
          panelClassName="modal-content animate-in modal-panel-md modal-text-center pdv-print-modal"
        >
             <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
               <div style={{ padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--accent)' }}>
                  <FileText size={32} />
               </div>
             </div>
             <h3 id="print-sale-title" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>Venda Concluída!</h3>
             <p id="print-sale-description" style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.9rem' }}>
               Deseja imprimir o comprovante desta venda?
             </p>
             <button
                onClick={handleConnectPrinter}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 24px' }}
              >
                <Printer size={14} />
                Configurar Impressora USB
              </button>
             <div style={{ display: 'flex', gap: 10 }}>
               <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {
                 setShowPrintModal(false);
                 setPrintData(null);
               }}>
                 Fechar
               </button>
               <button className="btn btn-primary" style={{ flex: 1, background: '#10b981' }} onClick={handlePrintUSB}>
                 <Printer size={18} />
                 Imprimir
               </button>
             </div>
        </Modal>
      )}
      {showEditModal && editingProduct && (
        <ProdutoModal
          produto={editingProduct}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
