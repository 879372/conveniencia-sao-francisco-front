import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileInput,
  Wallet,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
  History,
  Boxes
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', Icon: LayoutDashboard, to: '/dashboard', section: 'PRINCIPAL' },
  { label: 'Histórico Vendas', Icon: History, to: '/vendas', section: null },
  { label: 'PDV / Caixa', Icon: ShoppingCart, to: '/pdv', section: null, external: true },
  { label: 'Produtos', Icon: Package, to: '/produtos', section: 'CADASTROS' },
  { label: 'Estoque', Icon: Boxes, to: '/estoque', section: null },
  { label: 'Grupos / Categorias', Icon: Package, to: '/produtos/grupos', section: null },
  { label: 'Clientes', Icon: Users, to: '/clientes', section: null },
  { label: 'Compras / Entradas', Icon: FileInput, to: '/compras', section: 'OPERACIONAL' },
  { label: 'Financeiro', Icon: Wallet, to: '/financeiro', section: null },
  { label: 'Relatórios', Icon: BarChart3, to: '/relatorios', section: null },
];

export default function Layout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fechar sidebar ao trocar de rota (mobile), removido useEffect para evitar cascading render
  // Agora fechamos a sidebar diretamente no clique dos itens de navegação

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout">
      {/* Mobile Hamburger */}
      <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={closeSidebar}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">
            <img src="/logo-conveniencia-sao-francisco.png" alt="Conveniência São Francisco" />
            <span>Conveniência <strong>São Francisco</strong></span>
          </div>
          <button className="sidebar-close" onClick={closeSidebar} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => {
            // Verifica se este item inicia uma nova seção
            // Busca a última seção definida em itens anteriores
            let lastSection = '';
            for (let i = 0; i < index; i++) {
              if (navItems[i].section) lastSection = navItems[i].section;
            }

            const isNewSection = item.section && item.section !== lastSection;

            return (
              <div key={item.to}>
                {isNewSection && <div className="nav-section">{item.section}</div>}
                {item.external ? (
                  <a className="nav-item" href={item.to} target="_blank" rel="noreferrer" onClick={closeSidebar}>
                    <item.Icon className="nav-icon" size={18} />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <NavLink
                    to={item.to}
                    onClick={closeSidebar}
                    end={item.to === '/produtos'} // Evita que Produtos fique ativo quando estiver em sub-rotas como /produtos/grupos
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <item.Icon className="nav-icon" size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile / Logout Footer */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '0 8px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'white'
            }}>
              <User size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'Usuário'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operador</div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: 8, border: '1px solid var(--border)' }}
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
