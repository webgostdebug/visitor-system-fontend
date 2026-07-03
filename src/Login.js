import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://visitor-system-backend-c9iz.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode, pin: pin })
      });
      const data = await response.json();

      if (response.ok) {
        onLogin(selectedMode);
        navigate(selectedMode === 'admin' ? '/dashboard' : '/kiosk');
      } else {
        setError(data.error || 'Invalid PIN code.');
        setPin('');
      }
    } catch (err) {
      setError('Could not connect to the authentication server.');
      setPin('');
    }
  };

  // Glassmorphism card style
  const cardStyle = "bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] flex flex-col items-center text-center cursor-pointer hover:bg-white/10 hover:border-violet-500/50 transition-all group";

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-6 font-sans text-white relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[120px] -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[120px] -z-10 -translate-x-1/3 translate-y-1/3"></div>

      <div className="mb-12 text-center z-10">
        <h1 className="text-4xl font-black tracking-tight flex items-center justify-center gap-2">
          Digi<span className="text-violet-400 italic font-light">Entry</span>
        </h1>
        <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">Facility Access & Security System</p>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {!selectedMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div onClick={() => setSelectedMode('admin')} className={cardStyle}>
              <div className="w-16 h-16 bg-violet-500/20 text-violet-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Admin Dashboard</h2>
              <p className="text-sm text-slate-400">Manage visitors, oversee exits, and register new host employees.</p>
            </div>

            <div onClick={() => setSelectedMode('kiosk')} className={cardStyle}>
              <div className="w-16 h-16 bg-blue-500/20 text-blue-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Visitor Registration</h2>
              <p className="text-sm text-slate-400">Lock terminal into the standalone Visitor Registration screen.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
            <button 
              onClick={() => { setSelectedMode(null); setPin(''); setError(''); }}
              className="text-slate-400 hover:text-violet-300 font-bold transition-colors flex items-center gap-2 mb-8 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Back to Selection
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mb-2">
                {selectedMode === 'admin' ? 'Dashboard Access' : 'Terminal Setup'}
              </h2>
              <p className="text-sm text-slate-400">Enter your 4-digit security PIN to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <input 
                type="password" 
                autoFocus
                maxLength="4"
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                className={`w-full p-4 bg-white/5 border ${error ? 'border-rose-500' : 'border-white/10'} rounded-2xl text-center text-3xl tracking-[1em] font-black text-white transition-all focus:outline-none focus:border-violet-500`}
              />
              {error && <p className="text-rose-400 text-xs font-bold text-center">{error}</p>}
              
              <button 
                type="submit" 
                disabled={pin.length !== 4}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
              >
                Authenticate
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;