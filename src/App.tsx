import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Produtos from './pages/Produtos/Produtos.tsx';
import Grupos from './pages/Produtos/Grupos.tsx';
import Clientes from './pages/Clientes/Clientes.tsx';
import PDV from './pages/PDV/PDV.tsx';
import Financeiro from './pages/Financeiro/Financeiro.tsx';
import Compras from './pages/Compras/Compras.tsx';
import Relatorios from './pages/Relatorios/Relatorios.tsx';
import Vendas from './pages/Vendas/Vendas.tsx';
import './index.css';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="produtos/grupos" element={<Grupos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="compras" element={<Compras />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="vendas" element={<Vendas />} />
        </Route>

        <Route path="/pdv" element={<PrivateRoute><PDV /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
