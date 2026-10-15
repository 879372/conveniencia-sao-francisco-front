import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

function ModalHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir modal</button>
      {open && (
        <Modal
          onClose={() => { setOpen(false); onClose(); }}
          labelledBy="test-modal-title"
        >
          <h2 id="test-modal-title">Modal acessível</h2>
          <button data-modal-initial-focus>Cancelar</button>
          <button>Confirmar</button>
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  it('entra no foco, fecha com Escape e restaura o foco anterior', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);

    const opener = screen.getByRole('button', { name: 'Abrir modal' });
    await user.click(opener);

    expect(screen.getByRole('dialog', { name: 'Modal acessível' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
