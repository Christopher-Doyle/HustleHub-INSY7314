import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GigForm from '../GigForm.jsx';

async function fillValid(user) {
  await user.type(screen.getByLabelText('Title'), 'Logo design');
  await user.selectOptions(screen.getByLabelText('Category'), 'Design');
  await user.type(screen.getByLabelText('Price (ZAR)'), '150.50');
  await user.type(screen.getByLabelText('Description'), 'A clean modern logo for your brand.');
}

describe('GigForm', () => {
  it('shows an error next to every invalid field and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(screen.getByText('Title must be 3–120 characters.')).toBeInTheDocument();
    expect(screen.getByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText('Enter a price.')).toBeInTheDocument();
    expect(screen.getByText('Description must be 10–2000 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the user edits that field', async () => {
    const user = userEvent.setup();
    render(<GigForm submitLabel="Create gig" onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create gig' }));
    expect(screen.getByText('Enter a price.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Price (ZAR)'), '5');
    expect(screen.queryByText('Enter a price.')).toBeNull();
  });

  it('rejects a negative or malformed price before calling the API', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} />);
    await fillValid(user);
    const price = screen.getByLabelText('Price (ZAR)');
    await user.clear(price);
    await user.type(price, '-20');
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(screen.getByText(/Price must be a number/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a trimmed payload with a numeric price when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Logo design',
      description: 'A clean modern logo for your brand.',
      category: 'Design',
      price: 150.5
    });
  });

  it('disables the button while saving so the form cannot be submitted twice', async () => {
    const user = userEvent.setup();
    let finish;
    const onSubmit = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    render(<GigForm submitLabel="Create gig" onSubmit={onSubmit} />);
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Create gig' }));
    const saving = await screen.findByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    await user.click(saving);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    finish();
    expect(await screen.findByRole('button', { name: 'Create gig' })).toBeEnabled();
  });

  it('shows server field errors and a form-level message when saving fails', async () => {
    const user = userEvent.setup();
    const failure = Object.assign(new Error('Please correct the highlighted fields and try again.'), {
      fieldErrors: { price: 'Price must be between 0 and 1000000.' }
    });
    render(<GigForm submitLabel="Create gig" onSubmit={vi.fn().mockRejectedValue(failure)} />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(await screen.findByText('Price must be between 0 and 1000000.')).toBeInTheDocument();
    expect(screen.getByText('Please correct the highlighted fields and try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (ZAR)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('pre-fills values for editing and keeps a non-standard existing category selectable', () => {
    render(
      <GigForm
        submitLabel="Save changes"
        onSubmit={vi.fn()}
        initialValues={{ title: 'Old title', description: 'Old description text', category: 'Legacy', price: '20' }}
      />
    );
    expect(screen.getByLabelText('Title')).toHaveValue('Old title');
    expect(screen.getByLabelText('Price (ZAR)')).toHaveValue('20');
    expect(screen.getByLabelText('Category')).toHaveValue('Legacy');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
