import React, { useState, useEffect } from 'react';
import { ShieldAlert, User, Key, ArrowRight } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '@/src/services/api';
// @ts-ignore
import logoImg from '../assets/images/Logo.png';

interface LoginProps {
  onLoginSuccess: (user: UserType) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inactivityAlert, setInactivityAlert] = useState<boolean>(false);

  useEffect(() => {
    const reason = localStorage.getItem('pos_logout_reason');
    if (reason === 'inactivity') {
      setInactivityAlert(true);
      localStorage.removeItem('pos_logout_reason');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await api.login(username, password);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Server connection error. Ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF7E5] px-4 py-12 relative font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-amber-100 relative overflow-hidden">
        {/* Subtle branding accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#B25712]"></div>
        <div>
          {/* Five Gold Stars Logo matching user reference */}
          <div className="flex justify-center mb-5">
            <div className="bg-white w-20 h-20 rounded-2xl border border-amber-100 flex items-center justify-center shadow-md p-2.5 hover:scale-105 transition-transform duration-300">
              <img 
                src={logoImg} 
                className="w-full h-full object-contain rounded-lg" 
                alt="High Quality Enterprise Logo" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>
          <h2 className="text-center text-xl font-black text-slate-900 tracking-tight uppercase">
            High Quality Enterprise
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500 font-medium tracking-wide">
            Private POS Sales Terminal Operator Login
          </p>
        </div>

        {inactivityAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide text-amber-700 text-[10px]">Session Terminated</p>
              <p className="mt-1 leading-relaxed font-semibold">Logged out automatically due to 10 minutes of inactivity to secure the terminal.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-800">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide text-red-600 text-[10px]">Access Refused</p>
              <p className="mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Username Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Operator Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B25712] focus:border-[#B25712] transition-all font-semibold"
                placeholder="e.g. admin"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Security PIN / Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B25712] focus:border-[#B25712] transition-all font-semibold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#B25712] hover:brightness-95 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md border border-[#B25712] cursor-pointer"
          >
            {isLoading ? 'Verifying...' : 'Authenticate'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Secure Warning Label */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center text-[9px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
          🔒 Strictly Restricted: Authorized Personnel Only
        </div>

        {/* Default Credential Hints for testing convenience */}
        <div className="bg-[#FEF7E5]/50 p-4 rounded-xl border border-amber-100/50 text-[10px] font-mono text-slate-500 flex flex-col gap-1.5 shadow-inner">
          <p className="font-extrabold text-[#B25712] uppercase tracking-widest text-center border-b border-amber-100 pb-2 mb-1.5">
            HQ SYSTEM OPERATOR DIRECTORY
          </p>
          <div className="flex justify-between">
            <span>Admin Username:</span>
            <span className="text-[#CC9900] font-bold">admin</span>
          </div>
          <div className="flex justify-between">
            <span>Admin Password:</span>
            <span className="text-[#CC9900] font-bold">admin123</span>
          </div>
          <div className="flex justify-between border-t border-amber-100 pt-1.5 mt-1">
            <span>Seeded Cashier:</span>
            <span className="text-slate-600 font-bold">cashier</span>
          </div>
          <div className="flex justify-between">
            <span>Seeded Password:</span>
            <span className="text-slate-600 font-bold">cashier123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
