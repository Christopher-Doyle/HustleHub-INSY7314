// TEMPORARY SCAFFOLD — see AuthContext.jsx. Person 1 owns client/src/auth/*.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ fullName, email, password, role });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.details?.join(' ') || err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <div className="card card-narrow"><p className="form-success">Account created. Redirecting to login…</p></div>;

  return (
    <div className="card card-narrow">
      <p className="eyebrow">Create your account</p>
      <h1>Register</h1>
      <p className="page-intro">Choose your role and start using the marketplace.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="register-name">Full name</label>
        <input id="register-name" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />

        <label htmlFor="register-email">Email</label>
        <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />

        <label htmlFor="register-password">Password (12+ characters)</label>
        <input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={12} autoComplete="new-password" />

        <fieldset>
          <legend>I am a…</legend>
          <label><input type="radio" name="role" value="client" checked={role === 'client'} onChange={() => setRole('client')} /> Client (hires freelancers)</label>
          <label><input type="radio" name="role" value="freelancer" checked={role === 'freelancer'} onChange={() => setRole('freelancer')} /> Freelancer (offers gigs)</label>
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Register'}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
