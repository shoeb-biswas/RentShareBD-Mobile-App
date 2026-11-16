import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

export function LoginPage() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot/Reset Password Mode
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'landlord') navigate('/landlord');
      else navigate('/tenant');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      showToast(res.message, 'info');
      setMode('reset');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      showToast('Password reset successfully. You can now sign in.', 'success');
      setMode('login');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-7">
          {mode === 'login' && (
            <>
              <h1 className="font-display text-2xl font-bold text-slate-900">Sign In</h1>
              <p className="text-sm text-slate-600 mt-1">
                Access your RentShare BD tenant, landlord, or admin workspace.
              </p>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="login-email">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="login-pass">
                    Password
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[#4F46E5] hover:underline font-medium"
                >
                  Forgot password?
                </button>
                <Link to="/register" className="text-slate-600 hover:text-slate-900">
                  Create account
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Demonstration Accounts (Password: Demo1234!)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('simi@rentshare.bd')}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Demo Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('karim.landlord@rentshare.bd')}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Demo Landlord
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin@rentshare.bd')}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Demo Admin
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Forgot Password</h1>
              <p className="text-sm text-slate-600">
                Enter your registered email to generate a password reset token.
              </p>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
              >
                Generate Reset Token
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs text-slate-600 hover:underline"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Reset Password</h1>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Reset token"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono"
              />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
              >
                Save New Password
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export function RegisterPage() {
  const { register, refreshMe, showToast } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');
  const [submitting, setSubmitting] = useState(false);

  const [verifyToken, setVerifyToken] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await register({ email, password, fullName, phone, role });
      if (res.verificationToken) {
        setVerifyToken(res.verificationToken);
        setStep('verify');
      } else {
        navigate(role === 'landlord' ? '/landlord' : '/tenant');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verifyToken }),
      });
      await refreshMe();
      showToast('Email verified successfully!', 'success');
      navigate(role === 'landlord' ? '/landlord' : '/tenant');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-7">
          {step === 'form' ? (
            <>
              <h1 className="font-display text-2xl font-bold text-slate-900">Create Account</h1>
              <p className="text-sm text-slate-600 mt-1">
                Join RentShare BD as a Tenant / Student or Property Landlord.
              </p>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div>
                  <span className="block text-xs font-medium text-slate-700 mb-1.5">Account Role</span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRole('tenant')}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                        role === 'tenant' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Tenant / Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('landlord')}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                        role === 'landlord' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Landlord
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="reg-name">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ayesha Rahman"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="reg-email">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu.bd"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="reg-phone">
                    Phone Number
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+88017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="reg-pass">
                    Password
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-[#4F46E5] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-slate-900">Verify Your Email</h1>
              <p className="text-sm text-slate-600">
                Confirm the verification token below to mark your email as verified and boost your Trust Score.
              </p>
              <input
                type="text"
                required
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
              >
                Confirm Email Verification
              </button>
              <button
                type="button"
                onClick={() => navigate(role === 'landlord' ? '/landlord' : '/tenant')}
                className="w-full text-xs text-slate-600 hover:underline"
              >
                Skip for now
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
