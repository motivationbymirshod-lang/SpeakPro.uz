
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface FeedbackWidgetProps {
  user: UserProfile;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim()) return;
      setLoading(true);

      try {
          await fetch('http://localhost:5000/api/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: user.email,
                  type: 'general',
                  message: message
              })
          });
          setSent(true);
          setTimeout(() => {
              setSent(false);
              setIsOpen(false);
              setMessage('');
          }, 2000);
      } catch (e) {
          alert("Sending failed. Check connection.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-full shadow-xl hover:scale-110 transition-transform group"
        title="Leave Feedback"
      >
          <div className="relative">
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
          </div>
      </button>

      {/* Modal / Popup */}
      {isOpen && (
          <div className="fixed bottom-20 right-4 z-50 w-80 glass-card bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-fade-in-up origin-bottom-right">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800 dark:text-white">Help us improve</h4>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
              </div>

              {sent ? (
                  <div className="py-8 text-center text-green-500 animate-pulse">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="font-bold">Thank You!</p>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit}>
                      <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Bug report, suggestion, or just thoughts..."
                          className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500 resize-none mb-3"
                          required
                      ></textarea>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                      >
                          {loading ? 'Sending...' : 'Send Feedback'}
                      </button>
                  </form>
              )}
          </div>
      )}
    </>
  );
};

export default FeedbackWidget;
