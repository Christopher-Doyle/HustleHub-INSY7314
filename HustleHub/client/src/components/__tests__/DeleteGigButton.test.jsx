import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('../../services/gigApi.js', () => ({ deleteGig: vi.fn() }));
import { deleteGig } from '../../services/gigApi.js';
import DeleteGigButton from '../DeleteGigButton.jsx';

const gig = { id: 'gig1', title: 'Logo design' };

afterEach(() => vi.clearAllMocks());

describe('DeleteGigButton', () => {
  it('asks for confirmation first and does nothing until confirmed', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(<DeleteGigButton gig={gig} onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: 'Delete Logo design' }));
    expect(screen.getByText('Delete this gig permanently?')).toBeInTheDocument();
    expect(deleteGig).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('cancel closes the confirmation without deleting', async () => {
    const user = userEvent.setup();
    render(<DeleteGigButton gig={gig} onDeleted={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Delete Logo design' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete this gig permanently?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete Logo design' })).toBeInTheDocument();
    expect(deleteGig).not.toHaveBeenCalled();
  });

  it('confirming deletes the right gig and notifies the parent', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    deleteGig.mockResolvedValue(null);
    render(<DeleteGigButton gig={gig} onDeleted={onDeleted} />);
    await user.click(screen.getByRole('button', { name: 'Delete Logo design' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(gig));
    expect(deleteGig).toHaveBeenCalledTimes(1);
    expect(deleteGig).toHaveBeenCalledWith('gig1');
  });

  it('shows the friendly error and does not notify the parent when deletion fails', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    deleteGig.mockRejectedValue(new Error('You do not have permission to do that.'));
    render(<DeleteGigButton gig={gig} onDeleted={onDeleted} />);
    await user.click(screen.getByRole('button', { name: 'Delete Logo design' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('You do not have permission to do that.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeEnabled();
  });
});
