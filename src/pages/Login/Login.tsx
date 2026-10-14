import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      // Simplificando feedback conforme pedido: apenas um alert básico se falhar feio
      console.error('Erro no login:', err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <img src="/logo-conveniencia-sao-francisco.png" alt="Logo Conveniência São Francisco" style={{ width: 112, height: 112, borderRadius: '20px', objectFit: 'cover', boxShadow: '0 12px 30px rgba(146, 92, 18, 0.18)' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-1px' }}>
            Conveniência <span style={{ color: 'var(--accent)' }}>São Francisco</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Acesso ao sistema de gestão e PDV
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              className="input"
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Senha</label>
            <input
              className="input"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
          >
            Entrar no Sistema
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            &copy; 2026 Conveniência São Francisco
          </p>
        </div>
      </div>
    </div>
  );
}
