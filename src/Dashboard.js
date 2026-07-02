import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import Swal from 'sweetalert2';
import { exportToCSV, exportToPDF } from './exportUtils';
import { motion, AnimatePresence } from 'framer-motion'; // 🚀 Added AnimatePresence

const Dashboard = () => {
  const navigate = useNavigate();

  const [filterMonth, setFilterMonth] = useState(''); // Stores '01', '02', etc.
  const [filterDate, setFilterDate] = useState('');   // Stores 'YYYY-MM-DD'
  const [filterStatus, setFilterStatus] = useState(''); // Stores 'EXITED', 'REJECTED', etc.

  // 🚀 ADMIN PROFILE STATES
  const [chartFilter, setChartFilter] = useState('Hourly');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [adminProfile, setAdminProfile] = useState({ 
    name: 'Raghul S', 
    email: 'raghulmythrii@gmail.com', 
    pin: '1234' 
  });

  // 🚀 CORE DASHBOARD STATES
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); 
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalToday: 0, currentlyInside: 0, checkedOut: 0, trends: null });
  const [recentVisits, setRecentVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [empForm, setEmpForm] = useState({ employeeName: '', department: '', email: '', phone: '' });

  const recentExitsRef = useRef(null);

  const fetchVisits = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const response = await fetch('https://visitor-system-backend-c9iz.onrender.com/api/visits');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setRecentVisits(data); 
        
        const now = new Date();
        const todayString = now.toDateString();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayString = yesterday.toDateString();

        const validData = data.filter(v => {
          const status = (v.status || '').toUpperCase();
          return status === 'CHECKED IN' || status === 'EXITED';
        });

        const todaysVisits = validData.filter(v => new Date(v.checkIn).toDateString() === todayString);
        const yesterdaysVisits = validData.filter(v => new Date(v.checkIn).toDateString() === yesterdayString);

        const todayIn = todaysVisits.length;
        const yesterdayIn = yesterdaysVisits.length;

        const todayOut = todaysVisits.filter(v => v.checkOut).length;
        const yesterdayOut = yesterdaysVisits.filter(v => v.checkOut).length;

        const currentlyInside = validData.filter(v => !v.checkOut).length;
        
        const yesterdayActiveAtThisTime = yesterdaysVisits.filter(v => {
           const checkInTime = new Date(v.checkIn);
           const checkOutTime = v.checkOut ? new Date(v.checkOut) : null;
           return checkInTime <= yesterday && (!checkOutTime || checkOutTime > yesterday);
        }).length;

        const getTrend = (todayVal, yestVal) => {
          if (yestVal === 0) return { value: todayVal > 0 ? 100 : 0, type: todayVal > 0 ? 'up' : 'neutral' };
          const diff = ((todayVal - yestVal) / yestVal) * 100;
          return { value: Math.abs(Math.round(diff)), type: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral' };
        };

        setStats({
          totalToday: todayIn,
          currentlyInside: currentlyInside,
          checkedOut: todayOut,
          trends: {
            in: getTrend(todayIn, yesterdayIn),
            out: getTrend(todayOut, yesterdayOut),
            current: getTrend(currentlyInside, yesterdayActiveAtThisTime)
          }
        });
      } else {
        console.error("fetchVisits returned non-array data:", data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/employees');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        console.error("fetchEmployees returned non-array data:", data);
      }
    } catch (error) {
      console.error("Failed to fetch corporate directory:", error);
    }
  };

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin');
        const data = await res.json();
        if (data) setAdminProfile({ name: data.name, email: data.email, pin: data.pin });
      } catch (err) { console.error(err); }
    };

    fetchVisits(false); 
    fetchEmployees();
    fetchAdminProfile(); 
    
    const interval = setInterval(() => {
      fetchVisits(true); 
      fetchEmployees(); 
    }, 5000);
    
    return () => clearInterval(interval);
  }, []); 

  const handleVisitorAction = async (id, action, visitor, reason = '') => {
    try {
      const response = await fetch(`http://localhost:5000/api/visits/status/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, visitorEmail: visitor.email, visitorName: visitor.visitorName, reason })
      });
      if (response.ok) {
        Swal.fire({ icon: 'success', title: `Visitor ${action}ed`, confirmButtonColor: '#8b5cf6', timer: 1500 });
        fetchVisits(true);
      } else {
        throw new Error('Action failed on server');
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Action failed.' });
    }
  };

  const handleCheckOut = async (id, name) => {
    const result = await Swal.fire({
      title: 'Check Out Visitor?',
      text: `Are you sure you want to log ${name} out of the facility?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#8b5cf6', 
      cancelButtonColor: '#94a3b8',  
      confirmButtonText: 'Yes, Check Out',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`http://localhost:5000/api/visits/${id}/checkout`, { method: 'PUT' });
        if (response.ok) {
          Swal.fire({ title: 'Checked Out!', text: `${name} has been successfully logged out.`, icon: 'success', confirmButtonColor: '#8b5cf6', timer: 2000, showConfirmButton: false });
          await fetchVisits(true);
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Could not process check-out.', confirmButtonColor: '#8b5cf6' });
        }
      } catch (error) {
        console.error("Checkout submission failure:", error);
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Could not connect to the server.', confirmButtonColor: '#8b5cf6' });
      }
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.employeeName || !empForm.department) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in both Name and Department.', confirmButtonColor: '#8b5cf6' });
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empForm)
      });
      if (response.ok) {
        setEmpForm({ employeeName: '', department: '', email: '', phone: '' });
        await fetchEmployees();
        Swal.fire({ icon: 'success', title: 'Added!', text: 'Staff Member registered successfully!', confirmButtonColor: '#8b5cf6', timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'Failed', text: 'Failed to submit profile.', confirmButtonColor: '#8b5cf6' });
      }
    } catch (error) {
      console.error("Employee add failure:", error);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    const result = await Swal.fire({
      title: 'Remove Host?',
      text: `Are you sure you want to delete ${name} from the system?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#8b5cf6', 
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`http://localhost:5000/api/employees/${id}`, { method: 'DELETE' });
        if (response.ok) {
          Swal.fire({ title: 'Deleted!', text: `${name} has been removed from the roster.`, icon: 'success', confirmButtonColor: '#8b5cf6', timer: 2000, showConfirmButton: false });
          fetchEmployees();
        } else {
          const data = await response.json();
          Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Could not delete employee.', confirmButtonColor: '#8b5cf6' });
        }
      } catch (error) {
        console.error("Delete execution error:", error);
        Swal.fire({ icon: 'error', title: 'Network Error', text: 'Could not connect to the server.', confirmButtonColor: '#8b5cf6' });
      }
    }
  };

  const query = searchQuery.toLowerCase().trim();

  const filteredActiveVisits = recentVisits.filter((visit) => {
    const status = (visit.status || '').toUpperCase();
    if (visit.checkOut || status !== 'CHECKED IN') return false;
    if (!query) return true;
    return visit.visitorName.toLowerCase().includes(query) || visit.hostName.toLowerCase().includes(query);
  });

  const filteredPendingVisits = recentVisits.filter((visit) => {
    if ((visit.status || '').toUpperCase() !== 'PENDING') return false;
    if (!query) return true;
    return visit.visitorName.toLowerCase().includes(query) || visit.hostName.toLowerCase().includes(query) || (visit.purpose || '').toLowerCase().includes(query);
  });

  const filteredHistoryVisits = recentVisits.filter(v => {
    let matchesDate = true;
    if (filterDate && v.checkIn) {
      const visitDateStr = new Date(v.checkIn).toISOString().split('T')[0];
      matchesDate = visitDateStr === filterDate;
    }

    let matchesMonth = true;
    if (filterMonth && v.checkIn) {
      const visitMonthStr = String(new Date(v.checkIn).getMonth() + 1).padStart(2, '0');
      matchesMonth = visitMonthStr === filterMonth;
    }

    let matchesStatus = true;
    if (filterStatus) {
      matchesStatus = (v.status || '').toUpperCase() === filterStatus.toUpperCase();
    }

    return matchesDate && matchesMonth && matchesStatus;
  });

  const filteredEmployees = employees.filter((emp) => {
    if (!query) return true;
    return emp.employeeName.toLowerCase().includes(query) || emp.department.toLowerCase().includes(query) || (emp.email || '').toLowerCase().includes(query);
  });

  const recentExits = recentVisits
    .filter(visit => visit.checkOut && new Date(visit.checkOut).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(b.checkOut) - new Date(a.checkOut))
    .slice(0, 4);

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-'; 
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    if (diffMs <= 0) return '0m';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const generateChartData = () => {
    const validVisits = recentVisits.filter(v => {
      const status = (v.status || '').toUpperCase();
      return status === 'CHECKED IN' || status === 'EXITED';
    });
    const now = new Date();

    if (chartFilter === 'Hourly') {
      const todayString = now.toDateString();
      const todaysVisits = validVisits.filter(v => new Date(v.checkIn).toDateString() === todayString);
      const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      return hours.map(hour => {
        const count = todaysVisits.filter(v => new Date(v.checkIn).getHours() === hour).length;
        const displayTime = hour > 12 ? `${hour-12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
        return { time: displayTime, visitors: count };
      });
    }

    if (chartFilter === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        return d;
      });
      return last7Days.map(date => {
        const count = validVisits.filter(v => new Date(v.checkIn).toDateString() === date.toDateString()).length;
        return { time: days[date.getDay()], visitors: count };
      });
    }

    if (chartFilter === 'Monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = now.getFullYear();
      return months.map((month, index) => {
        const count = validVisits.filter(v => {
          const date = new Date(v.checkIn);
          return date.getFullYear() === currentYear && date.getMonth() === index;
        }).length;
        return { time: month, visitors: count };
      });
    }

    if (chartFilter === 'Yearly') {
      const currentYear = now.getFullYear();
      const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
      return years.map(year => {
        const count = validVisits.filter(v => new Date(v.checkIn).getFullYear() === year).length;
        return { time: year.toString(), visitors: count };
      });
    }
    
    return [];
  };

  const renderTrendBadge = (trendData, themeClass) => {
    if (!trendData) return <div className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full self-start mb-4 animate-pulse">Syncing...</div>;
    if (trendData.type === 'neutral') return <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full self-start mb-4">Same as yest.</div>;
    return <div className={`${themeClass} text-[10px] font-bold px-2.5 py-1 rounded-full self-start mb-4`}>{trendData.value}% {trendData.type}</div>;
  };

  const chartData = generateChartData();
  const cardStyle = "bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100/50";

  return (
    <div className="flex h-screen bg-[#f8f9fc] font-sans select-none text-slate-800 relative">
      
      <aside className="w-[260px] bg-[#11112b] flex flex-col shrink-0 z-10 text-slate-300">
        <div className="p-8 text-3xl font-black tracking-tight text-white flex items-center gap-2">
          Digi<span className="text-violet-400 italic font-light">Entry</span>
        </div>
        
        <nav className="flex-1 mt-4 px-4 space-y-2 relative">
          <ul className="space-y-1">
            <li onClick={() => setActiveTab('overview')} className={`p-3.5 rounded-xl cursor-pointer font-medium transition-all flex items-center gap-4 ${activeTab === 'overview' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012-2h-2a2 2 0 01-2-2v-2z"></path></svg>
              Dashboard
            </li>
            
            <li onClick={() => setActiveTab('manage-visitors')} className={`p-3.5 rounded-xl cursor-pointer font-medium transition-all flex items-center gap-4 ${activeTab === 'manage-visitors' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              Manage Visitors
            </li>

            <li onClick={() => setActiveTab('employees')} className={`p-3.5 rounded-xl cursor-pointer font-medium transition-all flex items-center gap-4 ${activeTab === 'employees' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Manage Employees
            </li>

            <li onClick={() => {
                setActiveTab('overview');
                setTimeout(() => recentExitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }} 
              className="p-3.5 rounded-xl cursor-pointer font-medium transition-all flex items-center gap-4 hover:bg-white/5 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Recent Exits
            </li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        <header className="px-8 py-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm flex justify-between items-center shrink-0 z-10">
          <div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
               Good Morning, {adminProfile.name.split(' ')[0]} <span className="text-2xl">👋</span>
             </h1>
             <p className="text-sm text-slate-400 mt-1">Manage your visitors with DigiEntry by leveraging well-tested process.</p>
          </div>
          
          <div className="flex flex-1 justify-center px-12">
            <div className="relative w-full max-w-md">
              <svg className="w-4 h-4 absolute left-4 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" placeholder="Search Anything .." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm shadow-sm" />
            </div>
          </div>

          <div className="flex items-center gap-6 relative">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-white/60 p-2 rounded-xl transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                <img src={`https://ui-avatars.com/api/?name=${adminProfile.name.replace(' ', '+')}&background=e2e8f0&color=475569`} alt="Profile" />
              </div>
              <div>
                 <p className="text-sm font-bold text-slate-800 leading-tight">{adminProfile.name}</p>
                 <p className="text-[11px] text-slate-400 font-medium">Admin</p>
              </div>
              <svg className={`w-4 h-4 text-slate-400 ml-2 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-14 right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] py-2 z-50 overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowAdminSettings(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Account Settings
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button 
                    onClick={() => {
                      sessionStorage.removeItem('authMode');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Log Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {/* 🚀 ANIMATION 2: Smooth Tab Switching */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3 }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* 🚀 ANIMATION 3: Staggered Metric Cards */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.0 }} className={`${cardStyle} flex flex-col justify-between`}>
                    {renderTrendBadge(stats.trends?.in, "bg-violet-50 text-violet-600")}
                    <p className="text-xs text-slate-500 font-medium mb-1">Today Visitors In</p>
                    <div className="flex justify-between items-end">
                      <p className="text-4xl font-semibold text-slate-800">{isLoading ? '-' : stats.totalToday}</p>
                      <div className="flex gap-1 items-end h-8 opacity-70">
                         <div className="w-1.5 h-4 bg-violet-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-6 bg-violet-300 rounded-t-sm"></div>
                         <div className="w-1.5 h-8 bg-violet-600 rounded-t-sm"></div>
                         <div className="w-1.5 h-5 bg-violet-200 rounded-t-sm"></div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className={`${cardStyle} flex flex-col justify-between`}>
                    {renderTrendBadge(stats.trends?.out, "bg-rose-50 text-rose-500")}
                    <p className="text-xs text-slate-500 font-medium mb-1">Today Visitors Out</p>
                    <div className="flex justify-between items-end">
                      <p className="text-4xl font-semibold text-slate-800">{isLoading ? '-' : stats.checkedOut}</p>
                      <div className="flex gap-1 items-end h-8 opacity-70">
                         <div className="w-1.5 h-5 bg-rose-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-3 bg-rose-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-7 bg-rose-500 rounded-t-sm"></div>
                         <div className="w-1.5 h-4 bg-rose-200 rounded-t-sm"></div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className={`${cardStyle} flex flex-col justify-between`}>
                    {renderTrendBadge(stats.trends?.current, "bg-emerald-50 text-emerald-600")}
                    <p className="text-xs text-slate-500 font-medium mb-1">Today Visitors Current</p>
                    <div className="flex justify-between items-end">
                      <p className="text-4xl font-semibold text-slate-800">{isLoading ? '-' : stats.currentlyInside}</p>
                      <div className="flex gap-1 items-end h-8 opacity-70">
                         <div className="w-1.5 h-4 bg-emerald-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-8 bg-emerald-500 rounded-t-sm"></div>
                         <div className="w-1.5 h-5 bg-emerald-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-6 bg-emerald-200 rounded-t-sm"></div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className={`${cardStyle} flex flex-col justify-between`}>
                    <div className="bg-orange-50 text-orange-500 text-[10px] font-bold px-2.5 py-1 rounded-full self-start mb-4">Synced</div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Total Registered Hosts</p>
                    <div className="flex justify-between items-end">
                      <p className="text-4xl font-semibold text-slate-800">{employees.length}</p>
                      <div className="flex gap-1 items-end h-8 opacity-70">
                         <div className="w-1.5 h-6 bg-orange-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-4 bg-orange-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-5 bg-orange-200 rounded-t-sm"></div>
                         <div className="w-1.5 h-8 bg-orange-400 rounded-t-sm"></div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className={`${cardStyle} w-full pb-2 pr-0`}>
                  <div className="flex items-center justify-between mb-2 pr-6">
                    <h3 className="font-bold text-slate-800 text-lg">Statistics (Total Visitor)</h3>
                    
                    <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
                      <select 
                        value={chartFilter}
                        onChange={(e) => setChartFilter(e.target.value)}
                        className="appearance-none text-slate-500 text-xs px-3 py-1.5 pr-8 w-full h-full outline-none cursor-pointer bg-transparent relative z-10 font-medium"
                      >
                        <option value="Hourly">Hourly</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                      <svg className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  
                  <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                        <defs>
                          <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10}>
                           <Label 
                             value={chartFilter === 'Hourly' ? 'Time of Day' : chartFilter === 'Weekly' ? 'Day of Week' : chartFilter === 'Monthly' ? 'Month' : 'Year'} 
                             offset={-15} position="insideBottom" style={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                           />
                        </XAxis>
                        
                        <YAxis domain={[0, dataMax => Math.max(10, dataMax)]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10}>
                           <Label value="Visitor Volume" angle={-90} position="insideLeft" style={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                        </YAxis>
                        
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#8b5cf6' }}
                        />
                        <Area type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPurple)" activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  <div className={`${cardStyle} xl:col-span-2`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-800 text-lg">Active Visitors</h3>
                      <div className="flex gap-3">
                         <button onClick={() => window.open('/kiosk', '_blank')} className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                            + Add Visitor
                         </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-slate-400 text-xs font-medium border-b border-slate-100">
                            <th className="pb-4 font-medium">Arrival Time</th>
                            <th className="pb-4 font-medium">Visitor Name</th>
                            <th className="pb-4 font-medium">Host ID / Name</th>
                            <th className="pb-4 font-medium">Status</th>
                            <th className="pb-4 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {isLoading ? (
                            [1, 2].map((n) => (
                              <tr key={n} className="animate-pulse">
                                <td className="py-4"><div className="h-4 bg-slate-100 rounded-md w-16"></div></td>
                                <td className="py-4"><div className="h-4 bg-slate-100 rounded-md w-32"></div></td>
                                <td className="py-4"><div className="h-4 bg-slate-100 rounded-md w-24"></div></td>
                                <td className="py-4"><div className="h-6 bg-slate-100 rounded-md w-16"></div></td>
                                <td className="py-4 flex justify-end"><div className="h-8 bg-slate-100 rounded-lg w-8"></div></td>
                              </tr>
                            ))
                          ) : filteredActiveVisits.length > 0 ? (
                            filteredActiveVisits.map((visit) => (
                              <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 text-slate-500 font-medium">{new Date(visit.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                <td className="py-4 font-bold text-slate-800 flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs border border-slate-200 shrink-0">
                                      {visit.visitorName.charAt(0).toUpperCase()}
                                   </div>
                                   {visit.visitorName}
                                </td>
                                <td className="py-4 text-slate-600 font-medium">{visit.hostName}</td>
                                <td className="py-4">
                                   <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[11px] font-bold px-2.5 py-1 rounded-md">Inside Facility</span>
                                </td>
                                <td className="py-4 text-right">
                                   <button onClick={() => handleCheckOut(visit.id, visit.visitorName)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors border border-slate-100 hover:border-rose-100" title="Check Out">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                   </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-slate-400 font-medium text-sm">
                                {/* 🚀 ANIMATION 4: Floating Empty State */}
                                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                                  No active visitors inside the compound.
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-6 xl:col-span-1" ref={recentExitsRef}>
                    <div className={`${cardStyle}`}>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="font-bold text-slate-800 text-lg">Recent Exits</h3>
                        <span className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer">Today <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></span>
                      </div>
                      
                      <div className="space-y-4">
                        {isLoading ? (
                           <div className="h-20 bg-slate-100 animate-pulse rounded-xl"></div>
                        ) : recentExits.length > 0 ? (
                          recentExits.map((exit) => (
                            <div key={exit.id} className="flex justify-between items-center group cursor-default">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-bold border border-slate-200">
                                  {exit.visitorName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{exit.visitorName}</p>
                                  <p className="text-xs text-slate-400 font-medium mt-0.5">Left at {new Date(exit.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                              </div>
                              <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-400 py-4 font-medium text-center">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                              No departures logged yet.
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`${cardStyle} text-center py-8 bg-gradient-to-br from-white to-violet-50/30`}>
                       <h3 className="font-bold text-slate-800 text-xl mb-4">Invite a Host</h3>
                       <div className="bg-violet-50 border border-violet-200 border-dashed rounded-xl p-3 flex justify-between items-center mx-4 mb-4">
                          <span className="text-violet-600 font-mono text-sm font-bold tracking-widest">DIGI-AUTH-2026</span>
                          <button className="bg-violet-500 text-white text-xs px-3 py-1.5 rounded-md font-medium hover:bg-violet-600">Copy</button>
                       </div>
                       <p className="text-xs text-slate-400">Share this token to register new staff.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'manage-visitors' && (
              <motion.div 
                key="manage-visitors" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3 }} 
                className="space-y-6"
              >
                
                {/* APPROVAL QUEUE TABLE */}
                <div className={cardStyle}>
                  <h3 className="font-bold text-slate-800 text-lg mb-6">Visitor Approval Queue</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                          <th className="pb-4">Name</th>
                          <th className="pb-4">Host Employee</th>
                          <th className="pb-4">Purpose</th>
                          <th className="pb-4">Requested Time</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPendingVisits.map((v, index) => (
                          <motion.tr 
                            key={v.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="border-b border-slate-50"
                          >
                            <td className="py-4 font-semibold">{v.visitorName}</td>
                            <td className="py-4 text-violet-600 font-medium">{v.hostName}</td>
                            <td className="py-4">{v.purpose}</td>
                            
                            <td className="py-4 text-slate-600 font-medium">
                              {v.checkIn ? new Date(v.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>

                            <td className="py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">PENDING</span></td>
                            <td className="py-4 text-right">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedVisit(v)} 
                                className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium text-xs"
                              >
                                View
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                        {filteredPendingVisits.length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-10 text-center text-slate-400">
                              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                                No pending visitors found.
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* VISITOR HISTORY TABLE WITH EXPORT BUTTONS */}
                <div className={cardStyle}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Visitor History</h3>
                    
                    {/* FILTERS CONTAINER */}
                    <div className="flex flex-wrap items-center gap-3">
                      
                      <select
                        value={filterMonth}
                        onChange={(e) => {
                          setFilterMonth(e.target.value);
                          if(e.target.value) setFilterDate(''); 
                        }}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value="">All Months</option>
                        <option value="01">January</option>
                        <option value="02">February</option>
                        <option value="03">March</option>
                        <option value="04">April</option>
                        <option value="05">May</option>
                        <option value="06">June</option>
                        <option value="07">July</option>
                        <option value="08">August</option>
                        <option value="09">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>

                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                          setFilterDate(e.target.value);
                          if(e.target.value) setFilterMonth('');
                        }}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />

                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value="">All Statuses</option>
                        <option value="CHECKED IN">Checked In</option>
                        <option value="EXITED">Exited</option>
                        <option value="REJECTED">Rejected</option>
                      </select>

                      {(filterMonth || filterDate || filterStatus) && (
                        <button
                          onClick={() => { setFilterMonth(''); setFilterDate(''); setFilterStatus(''); }}
                          className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors px-2"
                        >
                          Reset
                        </button>
                      )}

                      <div className="h-5 w-[1px] bg-slate-200 hidden sm:block mx-1"></div>

                      <button 
                        onClick={() => exportToCSV(filteredHistoryVisits)} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        Export CSV
                      </button>
                      <button 
                        onClick={() => exportToPDF(filteredHistoryVisits)} 
                        className="bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                          <th className="pb-4">Name</th>
                          <th className="pb-4">Host Employee</th>
                          <th className="pb-4">Date</th>
                          <th className="pb-4">Check In</th>
                          <th className="pb-4">Check Out</th>
                          <th className="pb-4">Duration</th>
                          <th className="pb-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryVisits.map(v => (
                          <tr key={v.id} className="border-b border-slate-50">
                            <td className="py-4 font-semibold">{v.visitorName}</td>
                            <td className="py-4 text-slate-600 font-medium">{v.hostName}</td>
                            <td className="py-4 text-slate-500">{new Date(v.checkIn).toLocaleDateString()}</td>
                            
                            <td className="py-4 text-slate-500 font-medium">
                              {(v.status === 'CHECKED IN' || v.status === 'Exited') && v.checkIn 
                                ? new Date(v.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                : '-'}
                            </td>
                            <td className="py-4 text-slate-500 font-medium">
                              {v.checkOut 
                                ? new Date(v.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                : '-'}
                            </td>

                            <td className="py-4 text-slate-600 font-medium">
                              {calculateDuration(v.checkIn, v.checkOut)}
                            </td>
                            <td className="py-4">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase 
                                 ${(v.status || '').toUpperCase() === 'CHECKED IN' ? 'bg-emerald-100 text-emerald-700' : 
                                   (v.status || '').toUpperCase() === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 
                                   'bg-slate-100 text-slate-700'}`}>
                                  {v.status || 'UNKNOWN'}
                               </span>
                            </td>
                          </tr>
                        ))}
                        {filteredHistoryVisits.length === 0 && (
                          <tr>
                            <td colSpan="7" className="py-10 text-center text-slate-400">
                              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                                No visitor history found matching your filters.
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'employees' && (
              <motion.div 
                key="employees" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3 }} 
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
              >
                
                <div className={`${cardStyle} lg:col-span-1 space-y-6`}>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg tracking-tight">Onboard Employee</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Register corporate host tokens for Kiosk access authorization</p>
                  </div>
                  <form onSubmit={handleAddEmployee} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                      <input type="text" required placeholder="Jane Smith" value={empForm.employeeName} onChange={(e) => setEmpForm({...empForm, employeeName: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Department *</label>
                      <input type="text" required placeholder="Engineering / HR" value={empForm.department} onChange={(e) => setEmpForm({...empForm, department: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Corporate Email</label>
                      <input type="email" placeholder="janesmith@company.com" value={empForm.email} onChange={(e) => setEmpForm({...empForm, email: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Phone</label>
                      <input type="text" placeholder="555-0122" value={empForm.phone} onChange={(e) => setEmpForm({...empForm, phone: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm" />
                    </div>
                    <button type="submit" className="w-full bg-violet-500 text-white p-3 rounded-xl font-bold text-sm hover:bg-violet-600 shadow-md shadow-violet-200 transition-all mt-4">
                      Save New Host Profile
                    </button>
                  </form>
                </div>

                <div className={`${cardStyle} lg:col-span-2 overflow-hidden`}>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg tracking-tight">Active System Hosts</h3>
                      <p className="text-xs text-slate-400 mt-1.5">Corporate database roster synced to verification filters</p>
                    </div>
                    <span className="bg-slate-50 border border-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{employees.length} Staff</span>
                  </div>
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-sm table-auto">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 text-[11px] font-medium uppercase tracking-widest">
                          <th className="pb-4 font-medium">Host Employee Name</th>
                          <th className="pb-4 font-medium">Department</th>
                          <th className="pb-4 font-medium">Email</th>
                          <th className="pb-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 font-bold text-slate-800">{emp.employeeName}</td>
                              <td className="py-4 text-slate-500 font-medium">
                                <span className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md text-xs">{emp.department}</span>
                              </td>
                              <td className="py-4 text-slate-400 font-mono text-xs">{emp.email || 'N/A'}</td>
                              <td className="py-4 text-right">
                                 <button 
                                   onClick={() => handleDeleteEmployee(emp.id, emp.employeeName)} 
                                   className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors border border-slate-100 hover:border-rose-100" 
                                   title="Delete Host"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                 </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-slate-400 text-sm font-medium">
                              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                                No host structures seeded. Add one using the control form console panel.
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 🚀 ANIMATION 1: Spring Modals (Visitor Review) */}
      <AnimatePresence>
        {selectedVisit && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-slate-800 mb-5">Review Visitor</h3>
              
              <div className="space-y-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600">
                <p><strong className="text-slate-800">Name:</strong> {selectedVisit.visitorName}</p>
                <p><strong className="text-slate-800">Email:</strong> {selectedVisit.email || 'N/A'}</p>
                <p><strong className="text-slate-800">Host:</strong> {selectedVisit.hostName}</p>
                <p><strong className="text-slate-800">Purpose:</strong> {selectedVisit.purpose}</p>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rejection Reason (Optional)</label>
                <textarea 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 text-sm transition-all shadow-sm resize-none h-20"
                  placeholder="If rejecting, type the reason here..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  handleVisitorAction(selectedVisit.id, 'approve', selectedVisit);
                  setSelectedVisit(null);
                  setRejectionReason('');
                }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md shadow-emerald-200 transition-all">Approve</button>
                
                <button onClick={() => {
                  handleVisitorAction(selectedVisit.id, 'reject', selectedVisit, rejectionReason);
                  setSelectedVisit(null);
                  setRejectionReason('');
                }} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold shadow-md shadow-rose-200 transition-all">Reject</button>
                
                <button onClick={() => {
                  setSelectedVisit(null);
                  setRejectionReason('');
                }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🚀 ANIMATION 1: Spring Modals (Admin Settings) */}
      <AnimatePresence>
        {showAdminSettings && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">Admin Profile</h3>
              <p className="text-sm text-slate-500 mb-6">Update your dashboard credentials.</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch('http://localhost:5000/api/admin/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adminProfile)
                  });
                  
                  if (res.ok) {
                    setShowAdminSettings(false);
                    Swal.fire({ icon: 'success', title: 'Saved!', text: 'Your security profile has been updated.', confirmButtonColor: '#8b5cf6', timer: 2000, showConfirmButton: false });
                  } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Could not update profile.' });
                  }
                } catch (err) {
                  Swal.fire({ icon: 'error', title: 'Network Error', text: 'Server unreachable.' });
                }
              }} className="space-y-4">
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={adminProfile.name}
                    onChange={(e) => setAdminProfile({...adminProfile, name: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={adminProfile.email}
                    onChange={(e) => setAdminProfile({...adminProfile, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Security PIN</label>
                  <input 
                    type="password" 
                    maxLength="4"
                    value={adminProfile.pin}
                    onChange={(e) => setAdminProfile({...adminProfile, pin: e.target.value.replace(/\D/g, '')})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm tracking-widest font-bold transition-all shadow-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-3 rounded-xl font-bold shadow-md shadow-violet-200 transition-all">Save Changes</button>
                  <button type="button" onClick={() => setShowAdminSettings(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;