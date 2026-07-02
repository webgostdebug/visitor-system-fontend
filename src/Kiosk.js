import React, { useState, useEffect, useRef } from 'react';
import Chatbot from './components/Chatbot';

const Kiosk = ({ setCurrentView }) => {
  const [formData, setFormData] = useState({
    visitorName: '', mobile: '', email: '', address: '',
    company: '', idProofType: 'Aadhaar', idProofNumber: '',
    hostName: '', purpose: '', checkInTime: ''
  });
  
  const [photo, setPhoto] = useState(null); 
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  
  const [showHostDropdown, setShowHostDropdown] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const purposes = ['Meeting', 'Interview', 'Delivery', 'Vendor', 'Other'];
  const idTypes = ['Aadhaar', 'PAN Card', 'Driving License', 'Passport', 'Other'];

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('https://visitor-system-backend-c9iz.onrender.com/api/employees');
        const data = await response.json();
        setAllEmployees(data);
        
        const uniqueDepts = [...new Set(data.map(emp => emp.department).filter(Boolean))];
        setDepartments(uniqueDepts);
      } catch (error) {
        console.error("Failed to fetch employees for kiosk:", error);
      }
    };
    fetchEmployees();
  }, []);

  const handleMobileChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      setFormData({ ...formData, mobile: numericValue });
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Could not access your webcam.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const imageBase64 = canvasRef.current.toDataURL('image/jpeg');
      setPhoto(imageBase64);
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.visitorName || !formData.mobile || !formData.hostName || !formData.purpose) {
      alert('Please fill out Name, Mobile, Host, and Purpose of visit.');
      return;
    }

    if (formData.mobile.length !== 10) {
      alert('Mobile number must be exactly 10 digits long.');
      return;
    }

    if (formData.email) {
      const emailLower = formData.email.toLowerCase().trim();
      if (!emailLower.endsWith('@gmail.com')) {
        alert('Security policy requires a valid Gmail address (ending with @gmail.com).');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://visitor-system-backend-c9iz.onrender.com/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, photo }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert('Server Error: ' + (data.error || 'Failed to register check-in.'));
      }
    } catch (err) {
      console.error("Network Error:", err);
      alert('Could not reach the Node.js server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      visitorName: '', mobile: '', email: '', address: '',
      company: '', idProofType: 'Aadhaar', idProofNumber: '',
      hostName: '', purpose: '', chekckInTime: ''
    });
    setPhoto(null);
    setIsSubmitted(false);
    setSelectedDept(''); 
    setShowHostDropdown(false);
  };

  const inputStyle = "w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 text-sm transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50";
  const labelStyle = "block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2";

  const availableHosts = allEmployees.filter(emp => emp.department === selectedDept);
  const filteredHosts = availableHosts.filter(emp => 
    emp.employeeName.toLowerCase().includes(formData.hostName.toLowerCase())
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] p-6 h-screen font-sans relative">
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100/50 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-4xl font-bold shadow-sm border border-amber-100">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request Sent</h2>
            <p className="text-slate-400 mt-2 font-medium leading-relaxed">
              Please wait in the lobby. You will be notified via email once your host approves the visit.
            </p>
          </div>
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 text-left space-y-4 relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 font-bold rounded-bl-xl shadow-sm">PENDING</div>
            {photo && <img src={photo} alt="Visitor" className="w-24 h-24 object-cover rounded-2xl border border-slate-200 mx-auto shadow-sm" />}
            <div>
              <label className={labelStyle}>Visitor</label>
              <p className="text-xl font-black text-slate-800">{formData.visitorName}</p>
            </div>
            <div>
              <label className={labelStyle}>Meeting With</label>
              <p className="text-base font-bold text-violet-600">{formData.hostName}</p>
            </div>
          </div>
          <button onClick={handleReset} className="w-full bg-[#11112b] text-white p-4 rounded-xl font-bold text-base shadow-md hover:bg-slate-800 transition-colors tracking-wide">
            Done & Return to Home
          </button>
        </div>
        
        {/* 🚀 CHATBOT RENDERED ON SUCCESS SCREEN */}
        <Chatbot />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 flex flex-col items-center justify-center relative font-sans">
      
      <div className="bg-white p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-4xl w-full space-y-8 my-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50 rounded-full blur-3xl -z-10 opacity-60 translate-x-1/2 -translate-y-1/2"></div>

        <div className="text-center z-10 relative">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
             <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 shadow-sm border border-violet-200/50">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
             </div>
             Visitor Registration
          </h1>
          <p className="text-slate-400 text-sm mt-3 font-medium">Please fill in details and take a verification snapshot</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8 z-10 relative">
          <div className="md:col-span-2 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelStyle}>Full Name *</label>
                <input type="text" required placeholder="John Doe" value={formData.visitorName} onChange={(e) => setFormData({...formData, visitorName: e.target.value})} disabled={isSubmitting} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Mobile Number *</label>
                <input type="text" required placeholder="9876543210" value={formData.mobile} onChange={handleMobileChange} disabled={isSubmitting} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Email Address</label>
                <input type="text" placeholder="john@gmail.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={isSubmitting} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Company</label>
                <input type="text" placeholder="Acme Corp" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} disabled={isSubmitting} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>ID Proof Type</label>
                <select value={formData.idProofType} onChange={(e) => setFormData({...formData, idProofType: e.target.value})} disabled={isSubmitting} className={inputStyle}>
                  {idTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelStyle}>ID Proof Number</label>
                <input type="text" placeholder="ID Number" value={formData.idProofNumber} onChange={(e) => setFormData({...formData, idProofNumber: e.target.value})} disabled={isSubmitting} className={inputStyle} />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelStyle}>Address</label>
              <input type="text" placeholder="City, State" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={isSubmitting} className={inputStyle} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <div>
                <label className={labelStyle}>Department *</label>
                <select 
                  required
                  value={selectedDept} 
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setFormData({ ...formData, hostName: '' }); 
                  }}
                  disabled={isSubmitting}
                  className={inputStyle}
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className={labelStyle}>Who Are You Meeting? *</label>
                <input 
                  required
                  type="text"
                  autoComplete="off"
                  disabled={!selectedDept || isSubmitting} 
                  placeholder={selectedDept ? "Type to search host..." : "Select Dept First"}
                  value={formData.hostName} 
                  onChange={(e) => {
                    setFormData({...formData, hostName: e.target.value});
                    setShowHostDropdown(true);
                  }} 
                  onFocus={() => setShowHostDropdown(true)}
                  onBlur={() => setShowHostDropdown(false)}
                  className={inputStyle}
                />
                
                {showHostDropdown && selectedDept && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] max-h-48 overflow-y-auto">
                    {filteredHosts.length > 0 ? (
                      filteredHosts.map(emp => (
                        <div 
                          key={emp.id} 
                          className="p-3 hover:bg-violet-50 text-sm font-medium text-slate-700 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault(); 
                            setFormData({...formData, hostName: emp.employeeName});
                            setShowHostDropdown(false);
                          }}
                        >
                          {emp.employeeName}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-slate-400 italic text-center">No host found matching "{formData.hostName}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1 mt-5">
              <label className={labelStyle}>Purpose *</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {purposes.map((p) => (
                  <button key={p} type="button" disabled={isSubmitting} onClick={() => setFormData({...formData, purpose: p})} className={`p-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${formData.purpose === p ? 'border-violet-500 bg-violet-500 text-white shadow-violet-200/50 scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label className={labelStyle}>Expected Check-In Time *</label>
              <input 
                type="time" 
                required 
                value={formData.checkInTime} 
                onChange={(e) => setFormData({...formData, checkInTime: e.target.value})} 
                className={inputStyle} 
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-50/50 border border-slate-200 rounded-3xl p-6 space-y-5 shadow-inner">
            <label className={`${labelStyle} mb-0`}>Security Photo</label>
            <div className="w-[200px] h-[200px] bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 relative shadow-sm">
              {isCameraActive && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />}
              {photo && !isCameraActive && <img src={photo} alt="Captured" className="w-full h-full object-cover" />}
              {!isCameraActive && !photo && <span className="text-slate-400 text-xs font-medium text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm">[ Camera Paused ]</span>}
            </div>
            <canvas ref={canvasRef} width="300" height="300" className="hidden" />
            <button type="button" disabled={isSubmitting} onClick={isCameraActive ? capturePhoto : startCamera} className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isCameraActive ? '⚡ Capture Snapshot' : '📸 Enable Camera'}
            </button>
          </div>

          <div className="md:col-span-3 pt-6 mt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white p-4 rounded-xl font-bold text-lg shadow-lg transition-all tracking-wide flex items-center justify-center gap-3
                ${isSubmitting ? 'bg-violet-400 cursor-wait' : 'bg-violet-500 hover:bg-violet-600 hover:shadow-violet-200/50 hover:-translate-y-0.5'}
              `}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Check-In...
                </>
              ) : 'Register Check-In'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 🚀 CHATBOT RENDERED ON MAIN FORM SCREEN */}
      <Chatbot />
    </div>
  );
};

export default Kiosk;