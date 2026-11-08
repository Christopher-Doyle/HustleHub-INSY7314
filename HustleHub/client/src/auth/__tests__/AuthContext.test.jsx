import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { getSession, setSession, clearSession } from '../../services/session.js';

vi.mock('../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {}
}));

function Consumer() {
  const auth = useAuth();
  return <button onClick={() => auth.logout()}>Logout {auth.user?.fullName}</button>;
}

beforeEach(() => { vi.clearAllMocks(); clearSession(); });

describe('AuthContext logout', () => {
  test('calls authenticated server logout before clearing the browser session', async () => {
    const user = { id: 'u1', fullName: 'Test Freelancer', role: 'freelancer' };
    setSession('signed.jwt.value', user);
    apiClient.get.mockResolvedValue({ user });
    apiClient.post.mockResolvedValue({});
    render(<AuthProvider><Consumer /></AuthProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /logout test freelancer/i }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout'));
    expect(getSession().token).toBeNull();
  });

  test('clears local credentials even when the logout request cannot reach the API', async () => {
    const user = { id: 'u2', fullName: 'Offline Client', role: 'client' };
    setSession('signed.jwt.value', user);
    apiClient.get.mockResolvedValue({ user });
    apiClient.post.mockRejectedValue(new Error('offline'));
    render(<AuthProvider><Consumer /></AuthProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /logout offline client/i }));
    await waitFor(() => expect(getSession().token).toBeNull());
  });
});
