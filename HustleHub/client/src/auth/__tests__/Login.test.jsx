import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../Login.jsx';
import { AuthProvider } from '../AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { clearSession } from '../../services/session.js';

vi.mock('../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }
}));

function renderLogin(landingPath = '/bookings/mine') {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path={landingPath} element={<p>Landed on {landingPath}</p>} />
          <Route path="/freelancer/bookings" element={<p>Landed on /freelancer/bookings</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  apiClient.get.mockResolvedValue({ user: null }); // AuthProvider's mount check; no stored token here anyway.
});

describe('Login', () => {
  test('an invalid password shows an error and keeps the user on the login form', async () => {
    const { ApiRequestError } = await import('../../lib/apiClient.js');
    apiClient.post.mockRejectedValueOnce(new ApiRequestError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.'));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'nobody@example.test');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByText(/Landed on/)).toBeNull();
  });

  test('a successful client login navigates to My bookings', async () => {
    apiClient.post.mockResolvedValueOnce({
      token: 'jwt', user: { id: 'c1', fullName: 'Carl Client', role: 'client' }
    });
    const user = userEvent.setup();
    renderLogin('/bookings/mine');

    await user.type(screen.getByLabelText('Email'), 'carl@example.test');
    await user.type(screen.getByLabelText('Password'), 'Correct-horse-1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Landed on /bookings/mine')).toBeInTheDocument();
  });

  test('a successful freelancer login navigates to the freelancer bookings page', async () => {
    apiClient.post.mockResolvedValueOnce({
      token: 'jwt', user: { id: 'f1', fullName: 'Fay Freelancer', role: 'freelancer' }
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'fay@example.test');
    await user.type(screen.getByLabelText('Password'), 'Correct-horse-1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Landed on /freelancer/bookings')).toBeInTheDocument();
  });

  test('the submit button is disabled and relabelled while the request is in flight', async () => {
    let resolveLogin;
    apiClient.post.mockReturnValueOnce(new Promise(resolve => { resolveLogin = resolve; }));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'carl@example.test');
    await user.type(screen.getByLabelText('Password'), 'Correct-horse-1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    resolveLogin({ token: 'jwt', user: { id: 'c1', fullName: 'Carl Client', role: 'client' } });
    expect(await screen.findByText('Landed on /bookings/mine')).toBeInTheDocument();
  });
});
