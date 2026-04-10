import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';

export function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (!formData.email) return setError('Email is required to send OTP');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return setError('Please enter a valid email address');
    }
    
    setSendingOtp(true);
    setTakingLonger(false);
    setError('');
    setSuccess('');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('OTP request timed out after 60s - forcing state reset');
      controller.abort();
      setSendingOtp(false);
      setTakingLonger(false);
      setError('The email server is taking too long to respond. Please check your inbox (and spam folder) in a moment, or try again.');
    }, 60000); // 60 seconds timeout

    const longerId = setTimeout(() => {
      console.log('OTP request taking longer than 5s...');
      setTakingLonger(true);
    }, 5000); // 5 seconds

    try {
      console.log('Sending OTP request to server...');
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      clearTimeout(longerId);
      setTakingLonger(false);
      console.log('OTP response status:', res.status);
      
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Server returned an invalid response. This usually happens when the server is down or returning an error page.');
      }
      console.log('OTP response data:', data);
      
      if (!res.ok) {
        if (data.debugOtp) {
          setOtpSent(true);
          setError(`${data.error}. [DEBUG MODE] Your OTP is: ${data.debugOtp}`);
          return;
        }
        throw new Error(data.error || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      if (data.debugOtp) {
        setSuccess(`[DEBUG MODE] Your OTP is: ${data.debugOtp}`);
      } else {
        setSuccess('OTP sent to your email. Please check your inbox and spam folder.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection or try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      console.log('OTP sending process finished');
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!/^01[3-9]\d{8}$/.test(formData.phone)) {
      return setError('Please enter a valid Bangladeshi phone number');
    }

    if (!formData.otp) {
      return setError('Please enter the OTP sent to your email');
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('Signup request timed out');
      controller.abort();
    }, 15000);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          otp: formData.otp
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Server returned an invalid response. This usually happens when the server is down or returning an error page.');
      }
      
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      authLogin(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Signup request timed out. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter">CREATE ACCOUNT</h2>
          <p className="mt-2 text-gray-500">Join our community of fashion lovers</p>
        </div>

        {error && (
          <div className="p-4 rounded-lg text-sm font-medium bg-red-50 text-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg text-sm font-medium bg-green-50 text-green-600">
            {success}
          </div>
        )}

        {takingLonger && sendingOtp && (
          <div className="p-4 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 animate-pulse">
            The email server is responding slowly. Please wait a moment...
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
              <input
                name="phone"
                type="tel"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="017XXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <div className="flex gap-2">
                <input
                  name="email"
                  type="email"
                  required
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !formData.email}
                  className="px-4 py-2 bg-gray-100 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50 transition-all"
                >
                  {sendingOtp ? 'SENDING...' : otpSent ? 'RESEND' : 'SEND OTP'}
                </button>
              </div>
            </div>
            {otpSent && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">OTP Code</label>
                <input
                  name="otp"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="123456"
                  value={formData.otp}
                  onChange={handleChange}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !otpSent}
            className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
          </button>

          <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest px-4">
            By signing up, you agree to our <Link to="/terms" className="underline hover:text-black">Terms and Conditions</Link>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link to="/login" className="font-bold hover:underline">Sign in</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
