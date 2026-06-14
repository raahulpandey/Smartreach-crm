import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      login(token, user);
      toast(`Welcome back, ${user.name}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || 'Invalid credentials. Please verify your entries.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-white select-none font-sans">
      {/* Left side: Brand Section (50%) */}
      <div className="md:w-1/2 bg-slate-50 border-r border-slate-200 p-12 flex flex-col justify-between hidden md:flex">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles className="h-6 w-6 font-bold" />
            <span className="font-extrabold text-base tracking-tight text-slate-900">SmartReach CRM</span>
          </div>
          
          <div className="pt-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Reach the right customers <br /> at the right time.
            </h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">
              Direct-to-consumer CRM built for modern internet brands. Synchronize customer logs, group cohorts, and dispatch messaging campaigns.
            </p>
          </div>
        </div>

        {/* Clean Illustration Panel */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-sm mx-auto w-full">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
            <span>Conversion Analytics</span>
            <span className="text-blue-600 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Active
            </span>
          </div>
          <div className="flex items-end gap-2 h-20 pt-2 border-b border-slate-100">
            <div className="w-full bg-blue-100 h-[30%] rounded" />
            <div className="w-full bg-blue-200 h-[45%] rounded" />
            <div className="w-full bg-blue-100 h-[25%] rounded" />
            <div className="w-full bg-blue-300 h-[60%] rounded" />
            <div className="w-full bg-blue-600 h-[85%] rounded" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-blue-600" /> 100% Deliverability</span>
            <span className="font-bold text-slate-900">+$12,450 Today</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-medium">
          Powered by SmartReach Enterprise Sandbox
        </div>
      </div>

      {/* Right side: Login form (50%) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-white">
        <div className="w-full max-w-[420px] p-10 border border-slate-200 shadow-xl rounded-2xl space-y-6">
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Account Login</h3>
            <p className="text-xs text-slate-400">Please enter workspace credentials to continue</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="admin@smartreach.ai"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Please wait...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          {/* Quick sandbox logins */}
          <div className="p-3 bg-slate-50 border border-slate-150 rounded text-[10px] text-slate-550 space-y-1 select-text">
            <span className="font-semibold text-slate-700 block">💡 Quick Login Credentials:</span>
            <p>Email: <span className="font-bold text-slate-900">admin@smartreach.ai</span></p>
            <p>Password: <span className="font-bold text-slate-900">admin123</span></p>
          </div>

          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            New to SmartReach?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
