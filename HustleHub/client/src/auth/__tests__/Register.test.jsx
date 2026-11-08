import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Register from '../Register.jsx';
import { AuthProvider } from '../AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { clearSession } from '../../services/session.js';

vi.mock('../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
  }
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<p>Landed on /login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function fillAndSubmit(user, { role = 'client' } = {}) {
  await user.type(screen.getByLabelText('Full name'), 'New Person');
  await user.type(screen.getByLabelText('Email'), 'new.person@example.test');
  await user.type(screen.getByLabelText(/Password/), 'Twelve-Characters!');
  if (role === 'freelancer') await user.click(screen.getByRole('radio', { name: /^freelancer/i }));
  await user.click(screen.getByRole('button', { name: 'Register' }));
}

beforeEach(() => { vi.clearAllMocks(); clearSession(); });

describe('Register', () => {
  test('a successful registration shows a confirmation and redirects to login', async () => {
    apiClient.post.mockResolvedValueOnce({ user: { id: 'c1', fullName: 'New Person', role: 'client' } });
    const user = userEvent.setup();
    renderRegister();

    await fillAndSubmit(user);

    expect(await screen.findByText('Account created. Redirecting to login…')).toBeInTheDocument();
    expect(await screen.findByText('Landed on /login', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
      fullName: 'New Person', email: 'new.person@example.test', password: 'Twelve-Characters!', role: 'client'
    });
  });

  test('a duplicate email shows the server-side validation message instead of a generic failure', async () => {
    const { ApiRequestError } = await import('../../lib/apiClient.js');
    apiClient.post.mockRejectedValueOnce(
      new ApiRequestError(409, 'EMAIL_IN_USE', 'An account with that email already exists.')
    );
    const user = userEvent.setup();
    renderRegister();

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with that email already exists.');
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  });

  test('field-level validation details from the server are joined into one message', async () => {
    const { ApiRequestError } = await import('../../lib/apiClient.js');
    apiClient.post.mockRejectedValueOnce(
      new ApiRequestError(400, 'VALIDATION_ERROR', 'Registration failed.', ['Password must be at least 12 characters.'])
    );
    const user = userEvent.setup();
    renderRegister();

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 12 characters.');
  });

  test('registering as a freelancer sends the freelancer role', async () => {
    apiClient.post.mockResolvedValueOnce({ user: { id: 'f1', fullName: 'New Person', role: 'freelancer' } });
    const user = userEvent.setup();
    renderRegister();

    await fillAndSubmit(user, { role: 'freelancer' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ role: 'freelancer' }));
  });
});
