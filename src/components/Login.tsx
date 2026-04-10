import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, X } from 'lucide-react';

export function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      const data = await res.json().catch(() => ({ error: 'Server returned an invalid response' }));
      if (!res.ok) throw new Error(data.error || 'Login failed');

      authLogin(data.token, data.user);
      
      // Role-based redirection
      if (data.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        // Redirect to intended page or dashboard for customers
        navigate(from || "/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center relative"
            >
              <button 
                onClick={() => setError('')}
                className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <XCircle className="text-red-600" size={32} />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Login Failed</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              
              <button
                onClick={() => setError('')}
                className="w-full py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Try Again
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter uppercase">Welcome Back</h2>
          <p className="mt-2 text-gray-500">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Email, Phone or Username
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="Enter your credentials"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-500">Don't have an account? </span>
            <Link to="/signup" className="font-bold hover:underline">Sign up for free</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
