import React, { useState } from 'react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: "Hi! I'm Digi, the facility assistant. How can I help you today?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'ai', text: "I'm a bit overwhelmed by the traffic! Please wait a moment and try again." }]);
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      // 🚀 THIS IS THE FIX FOR THE EMPTY BUBBLE
      if (!res.ok) {
         setMessages(prev => [...prev, { role: 'ai', text: `Backend Error: ${data.error}. Check your Node.js terminal!` }]);
         setIsLoading(false);
         return;
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, my network connection dropped. Is the Node server running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200">
          <div className="p-4 bg-[#11112b] text-white font-bold rounded-t-2xl flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              Digi Assistant
            </span>
            <button onClick={() => setIsOpen(false)} className="hover:text-slate-300">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm p-3 rounded-xl shadow-sm ${m.role === 'user' ? 'bg-violet-500 text-white ml-auto w-3/4 rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 w-5/6 rounded-bl-none'}`}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="text-sm p-3 bg-white border border-slate-100 text-slate-400 w-1/2 rounded-xl rounded-bl-none shadow-sm">
                Typing...
              </div>
            )}
          </div>
          <div className="p-3 border-t bg-white rounded-b-2xl flex gap-2">
            <input 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-violet-400" 
              placeholder="Ask me anything..."
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} disabled={isLoading} className="bg-violet-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-violet-600 disabled:opacity-50">
              Send
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-[#11112b] hover:bg-violet-600 transition-colors text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl border-4 border-white">
          💬
        </button>
      )}
    </div>
  );
};

export default Chatbot;