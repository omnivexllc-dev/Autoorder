import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Incorrect password.');
      }
    } catch (err) {
      setError('Server error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div id="login-card" className="w-full max-w-md bg-white rounded-xl shadow-md border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div id="login-header" className="text-center space-y-2">
          <div id="login-icon-box" className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 mb-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 id="login-title" className="text-2xl font-bold tracking-tight text-slate-800">
            OrderConfirm AI
          </h1>
          <p id="login-subtitle" className="text-sm text-slate-500">
            Admin Authentication Panel
          </p>
        </div>

        {/* Form */}
        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="password-field-container" className="space-y-1">
            <label id="password-label" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Admin Password
            </label>
            <div id="password-input-wrapper" className="relative rounded-lg shadow-sm">
              <div id="key-icon-wrapper" className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all text-sm"
              />
              <button
                id="toggle-password-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div id="login-error-alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all flex items-center justify-center shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Notice */}
        <div id="login-notice" className="text-center">
          <p className="text-xs text-slate-500">
            Default password is <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 border border-slate-200 font-mono">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
