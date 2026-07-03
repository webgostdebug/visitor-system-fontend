import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 🚀 Accept the onLogin prop from App.js
const Login = ({ onLogin }) => {
  const navigate = useNavigate(); 
  const [selectedMode, setSelectedMode] = useState(null); 
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // 🚀 Ask the database if the PIN is correct
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
        setError(data.error || 'Invalid PIN code. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('Could not connect to the authentication server.');
      setPin('');
    }
  };

  const cardStyle = "bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-[0_15px_40px_rgb(139,92,246,0.1)] hover:border-violet-200 transition-all group";

  // Replace your Login.js return block with this high-end styling
return (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] font-sans text-white overflow-hidden relative">
    {/* Animated Background Glow */}
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-900/20 to-transparent"></div>
    
    <div className="flex w-full max-w-4xl bg-[#1a1a2e] rounded-3xl shadow-2xl overflow-hidden border border-white/5 z-10">
      
      {/* LEFT: Branding/Visual Side */}
      <div className="hidden md:flex w-1/2 bg-[#11112b] items-center justify-center p-12">
        <div className="text-center space-y-4">
           {/* Replace this with your project logo icon */}
           <div className="w-24 h-24 bg-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-violet-500/20">
             <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
           </div>
           <h2 className="text-3xl font-black tracking-tight">Digi<span className="text-violet-400 italic">Entry</span></h2>
           <p className="text-slate-400 text-sm">Next-Gen Facility Access System</p>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
        <h1 className="text-2xl font-bold mb-8">Welcome back!</h1>
        
        {/* Your existing PIN logic would go here, styled to be dark-mode friendly */}
        <div className="space-y-6">
          <p className="text-sm text-slate-400">Select your access mode to continue:</p>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setSelectedMode('admin')} className="p-4 rounded-xl bg-white/5 hover:bg-violet-600 transition-all font-bold">Admin</button>
             <button onClick={() => setSelectedMode('kiosk')} className="p-4 rounded-xl bg-white/5 hover:bg-violet-600 transition-all font-bold">Kiosk</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Login;