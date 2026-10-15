import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';

const dados = new Map<string, string>();

const erro = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError('erro', String(status), config, null, {
    status, statusText: '', headers: {}, config, data: {},
  });

// Servidor falso: só aceita o access token "novo".
const adaptador = vi.fn(async (config: InternalAxiosRequestConfig) => {
  if (config.headers.Authorization !== 'Bearer novo') throw erro(config, 401);
  return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
});

beforeEach(() => {
  dados.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => dados.set(k, v),
    removeItem: (k: string) => dados.delete(k),
    clear: () => dados.clear(),
  });
  dados.set('access_token', 'velho');
  dados.set('refresh_token', 'refresh-velho');
  api.defaults.adapter = adaptador;
  adaptador.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('renovação do login', () => {
  it('renova o access, salva o refresh novo e repete a requisição', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'novo', refresh: 'refresh-novo' } });

    const resp = await api.get('/vendas/');

    expect(resp.data).toEqual({ ok: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(dados.get('access_token')).toBe('novo');
    expect(dados.get('refresh_token')).toBe('refresh-novo');
  });

  it('faz uma única renovação para várias requisições vencidas ao mesmo tempo', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'novo', refresh: 'refresh-novo' } });

    await Promise.all([api.get('/a/'), api.get('/b/'), api.get('/c/')]);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('mantém o login quando a renovação falha por rede', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(api.get('/vendas/')).rejects.toBeTruthy();

    expect(dados.get('refresh_token')).toBe('refresh-velho');
  });

  it('desloga quando o servidor recusa o refresh', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('expirado', '401', undefined, null, {
        status: 401, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig, data: {},
      }),
    );

    await expect(api.get('/vendas/')).rejects.toBeTruthy();

    expect(dados.get('refresh_token')).toBeUndefined();
  });
});
