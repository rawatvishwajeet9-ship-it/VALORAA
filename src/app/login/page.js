'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/actions/authActions';
import {
  Activity,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal selection ('patient' | 'doctor' | 'admin')
  const initialPortal = searchParams.get('portal') || searchParams.get('role') || 'patient';
  const [portal, setPortal] = useState(initialPortal);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load remembered credentials & saved accounts on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedLogin = localStorage.getItem('valora_remembered_login');
        if (storedLogin) {
          const parsed = JSON.parse(storedLogin);
          if (parsed?.email) {
            setEmail(parsed.email);
            if (parsed?.portal && ['patient', 'doctor', 'admin'].includes(parsed.portal)) {
              setPortal(parsed.portal);
            }
          }
        }
        const accounts = JSON.parse(localStorage.getItem('valora_saved_accounts') || '[]');
        if (Array.isArray(accounts)) {
          setSavedAccounts(accounts);
        }
      } catch (err) {
        console.error('Failed to parse remembered login:', err);
      }
    }
  }, []);

  useEffect(() => {
    const p = searchParams.get('portal') || searchParams.get('role');
    if (p && ['patient', 'doctor', 'admin'].includes(p)) {
      setPortal(p);
    }
  }, [searchParams]);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    setError('');
  };

  const handleSelectSavedAccount = (acc) => {
    setEmail(acc.email);
    if (acc.role && ['patient', 'doctor', 'admin'].includes(acc.role)) {
      setPortal(acc.role);
    }
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('expectedRole', portal);

    const result = await loginUser(formData);

    if (result.success) {
      if (typeof window !== 'undefined') {
        try {
          if (rememberMe) {
            localStorage.setItem(
              'valora_remembered_login',
              JSON.stringify({ email, portal, name: result.user.name })
            );
            const currentAccounts = JSON.parse(localStorage.getItem('valora_saved_accounts') || '[]');
            const updated = [
              { email, name: result.user.name, role: result.user.role, lastUsed: Date.now() },
              ...currentAccounts.filter((a) => a.email !== email),
            ].slice(0, 5);
            localStorage.setItem('valora_saved_accounts', JSON.stringify(updated));
          } else {
            localStorage.removeItem('valora_remembered_login');
          }
        } catch (e) {}
      }

      const role = result.user.role;
      if (role === 'doctor') {
        window.location.href = '/doctor/dashboard';
      } else if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/patient/dashboard';
      }
    } else {
      setError(result.error || 'Failed to authenticate');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 items-center justify-center shadow-lg shadow-teal-500/20 mb-2">
          <Activity className="w-7 h-7 text-white stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sign In to VALORA</h2>
        <p className="text-xs text-slate-500">Access your healthcare portal, consultations, and medical records</p>
      </div>

      {/* Role / Portal Switcher Tabs */}
      <div className="p-1 bg-slate-200/80 rounded-2xl grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => handlePortalSwitch('patient')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
            portal === 'patient'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Patient</span>
        </button>

        <button
          type="button"
          onClick={() => handlePortalSwitch('doctor')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
            portal === 'doctor'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Doctor</span>
        </button>

        <button
          type="button"
          onClick={() => handlePortalSwitch('admin')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
            portal === 'admin'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>

      {/* Portal Indicator Banner */}
      <div
        className={`px-3.5 py-2 rounded-xl border text-xs flex items-center justify-between ${
          portal === 'doctor'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            : portal === 'admin'
            ? 'bg-purple-50/70 border-purple-200 text-purple-800'
            : 'bg-teal-50/70 border-teal-200 text-teal-800'
        }`}
      >
        <span className="font-semibold">
          Logging into: <strong className="uppercase">{portal} Portal</strong>
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current">
          {portal === 'doctor' ? 'Practitioner Only' : portal === 'admin' ? 'Administrative Only' : 'Patient Access'}
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {/* Quick Portal Switch helper button if role mismatch */}
          {error.includes('switch to the Doctor Portal') && (
            <button
              type="button"
              onClick={() => handlePortalSwitch('doctor')}
              className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Switch to Doctor Portal Now</span>
            </button>
          )}
          {error.includes('switch to the Patient Portal') && (
            <button
              type="button"
              onClick={() => handlePortalSwitch('patient')}
              className="mt-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Switch to Patient Portal Now</span>
            </button>
          )}
        </div>
      )}

      {/* Recent Saved Accounts Quick Selector */}
      {savedAccounts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>Saved Accounts on this device</span>
            <span className="text-[10px] text-teal-600 font-bold lowercase">click to fill</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {savedAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectSavedAccount(acc)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all ${
                  email === acc.email
                    ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold ring-1 ring-teal-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{acc.name ? acc.name.split(' ')[0] : acc.email.split('@')[0]}</span>
                <span className="text-[10px] text-slate-400">({acc.role || 'user'})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleLogin}
        method="POST"
        action="#"
        autoComplete="on"
        className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
      >
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username email"
              list="valora-suggested-emails"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {/* HTML5 Datalist for automatic browser suggestions */}
            <datalist id="valora-suggested-emails">
              {savedAccounts.map((acc) => (
                <option key={acc.email} value={acc.email}>
                  {acc.name ? `${acc.name} (${acc.role?.toUpperCase()})` : acc.email}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <span className="text-[11px] text-slate-400">Enter your credentials</span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {/* Show/Hide Password Eye Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 accent-teal-600"
            />
            <span className="text-xs text-slate-600 font-medium">Remember my login details on this device</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            'Authenticating...'
          ) : (
            <>
              <span>Sign In as {portal === 'doctor' ? 'Doctor' : portal === 'admin' ? 'Administrator' : 'Patient'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href={portal === 'doctor' ? '/register?role=doctor' : '/register?role=patient'}
              className="font-bold text-teal-600 hover:text-teal-700"
            >
              Register here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading portal login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
