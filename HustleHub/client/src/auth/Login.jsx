// TEMPORARY SCAFFOLD — see AuthContext.jsx. Person 1 owns client/src/auth/*.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'freelancer' ? '/freelancer/bookings' : '/bookings/mine');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card card-narrow">
      <p className="eyebrow">Welcome back</p>
      <h1>Log in</h1>
      <p className="page-intro">Access your HustleHub+ workspace securely.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p>No account? <Link to="/register">Register</Link></p>
    </div>
  );
}
