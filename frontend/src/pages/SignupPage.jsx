import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-8">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #14b8a6, transparent)', animationDelay: '1.5s' }} />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-white shadow-glow"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
            $
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-white/50 text-sm mt-2">Start tracking your expenses today</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" type="text" required className="input"
                placeholder="Alex Smith" value={form.name} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input"
                placeholder="you@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required className="input"
                placeholder="Min. 8 characters" value={form.password} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" required className="input"
                placeholder="••••••••" value={form.confirm} onChange={handleChange} />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Creating account…</>
                : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-300 hover:text-white font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
