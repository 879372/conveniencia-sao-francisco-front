import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to extract a friendly error message from complex API responses
const extractErrorMessage = (data: any): string => {
  if (typeof data === 'string') return data;

  // Handle APIs/DRF style: { "message": { "field": ["error"] } }
  if (data?.message && typeof data.message === 'object') {
    const messages = Object.values(data.message).flat();
    return messages.join(' ') || 'Dados inválidos';
  }

  // Handle { "error": "message" }
  if (data?.error && typeof data.error === 'string') return data.error;

  // Handle { "detail": "message" }
  if (data?.detail && typeof data.detail === 'string') return data.detail;

  // Handle { "non_field_errors": ["message"] }
  if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
    return data.non_field_errors.join(' ');
  }

  return 'Erro na comunicação com o servidor';
};

// Request interceptor: injects access token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}` ;
  }
  return config;
});

// Renovação única compartilhada: se várias requisições recebem 401 ao mesmo
// tempo, todas esperam a mesma renovação em vez de disparar várias.
let renovacaoEmAndamento: Promise<string> | null = null;

const encerrarSessao = () => {
  localStorage.clear();
  window.location.href = '/login';
};

export const renovarToken = () => {
  if (!renovacaoEmAndamento) {
    const refreshToken = localStorage.getItem('refresh_token');
    renovacaoEmAndamento = (async () => {
      if (!refreshToken) throw new Error('Sem refresh token');
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
      localStorage.setItem('access_token', data.access);
      // Com ROTATE_REFRESH_TOKENS o backend devolve um refresh novo (validade
      // renovada). Sem salvar, a sessão vencia no prazo do refresh original.
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return data.access as string;
    })().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
};

// Response interceptor: handles silent refresh and 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthCall = String(originalRequest?.url || '').includes('/auth/');

    // 1. Silent Refresh for 401s
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;

      if (!localStorage.getItem('refresh_token')) {
        encerrarSessao();
        return Promise.reject(error);
      }

      try {
        const access = await renovarToken();
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Só desloga quando o servidor recusa o refresh (expirado/inválido).
        // Falha de rede ou servidor fora do ar mantém o login.
        const status = refreshError?.response?.status;
        if (status === 401 || status === 400 || refreshError?.message === 'Sem refresh token') {
          encerrarSessao();
        } else {
          toast.error('Sem conexão com o servidor.', {
            description: 'Verifique a internet e tente novamente.',
            duration: 5000,
          });
        }
        return Promise.reject(error);
      }
    }

    // 2. Global Error Feedback (Toasts)
    if (error.response?.status !== 401) {
      const message = extractErrorMessage(error.response?.data);

      toast.error(message, {
        description: 'Verifique os dados ou contate o suporte.',
        duration: 5000,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
