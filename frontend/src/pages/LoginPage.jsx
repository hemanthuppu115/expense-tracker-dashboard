import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }} />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-white shadow-glow"
            style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
            $
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-white/50 text-sm mt-2">Sign in to your account</p>
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
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                className="input" placeholder="you@example.com"
                value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required
                className="input" placeholder="••••••••"
                value={form.password} onChange={handleChange} />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-4">
            No account?{' '}
            <Link to="/signup" className="text-brand-300 hover:text-white font-semibold transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo credentials box */}
          <div className="mt-5 rounded-xl p-3 border border-white/10" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <p className="text-xs text-center text-white/40 mb-1 uppercase tracking-wider font-semibold">Demo credentials</p>
            <p className="text-xs text-center text-white/70 font-mono">demo@example.com</p>
            <p className="text-xs text-center text-white/70 font-mono">password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
