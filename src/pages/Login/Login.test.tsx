import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ login: loginMock }),
}));

describe('Login', () => {
  beforeEach(() => loginMock.mockReset());

  it('associa os labels e exibe erro de autenticação acessível', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('unauthorized'));

    render(<MemoryRouter><Login /></MemoryRouter>);

    const username = screen.getByLabelText('Usuário');
    const password = screen.getByLabelText('Senha');

    await user.type(username, 'operador');
    await user.type(password, 'senha-incorreta');
    await user.click(screen.getByRole('button', { name: 'Entrar no Sistema' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar');
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
  });
});
