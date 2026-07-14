'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, ChevronDown, Plus, MoreVertical, Aperture, Fingerprint } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SESSIONS_STORAGE_KEY = 'mz_chat_sessions';

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{ id: string; role: string; content: string }>;
  interactionId?: string | null;
  updatedAt: number;
}

interface ChatSidebarProps {
  onNodeClick: (slug: string) => void;
  setIsChatVisible: (v: boolean) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNodeClick, setIsChatVisible }) => {
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  // Manual State Replacement for useChat
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const activeSessionIdRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let loadedSessions: ChatSession[] = [];
    const savedSessionsStr = localStorage.getItem(SESSIONS_STORAGE_KEY);
    
    if (savedSessionsStr) {
      try {
        loadedSessions = JSON.parse(savedSessionsStr);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }

    if (loadedSessions.length === 0) {
      loadedSessions = [{
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        updatedAt: Date.now()
      }];
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(loadedSessions);
    
    const mostRecent = [...loadedSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
     
    setActiveSessionId(mostRecent.id);
    activeSessionIdRef.current = mostRecent.id;
     
    setMessages(mostRecent.messages);
     
    setIsLoaded(true);
  }, [setMessages]);

  useEffect(() => {
    if (isLoaded && activeSessionIdRef.current) {
      setSessions(prev => {
        const next = [...prev];
        const currentId = activeSessionIdRef.current;
        const idx = next.findIndex(s => s.id === currentId);
        
        let title = 'New Chat';
        if (messages.length > 0) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }

        if (idx !== -1) {
          next[idx] = { ...next[idx], messages, title, updatedAt: Date.now() };
        }
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [messages, isLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    activeSessionIdRef.current = newSession.id;
    setMessages([]);
  };

  const switchSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(session.id);
      activeSessionIdRef.current = session.id;
      setMessages(session.messages);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const activeSession = sessions.find(s => s.id === activeSessionIdRef.current);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage.content,
          model: selectedModel,
          previous_interaction_id: activeSession?.interactionId || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.text
      }]);

      if (data.interactionId) {
        setSessions(prev => {
          const next = [...prev];
          const idx = next.findIndex(s => s.id === activeSessionIdRef.current);
          if (idx !== -1) {
            next[idx] = { ...next[idx], interactionId: data.interactionId };
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
          }
          return next;
        });
      }

    } catch (err: unknown) {
      const e = err as Error;
      setError({ message: e.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#001E3C]/40 backdrop-blur-md text-gray-200 shrink-0 w-[400px] border-l border-[#00F0FF]/30 shadow-[-10px_0_30px_rgba(0,240,255,0.05)] relative z-10">
      
      {/* Top Header Controls (Unique EDITH style) */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0 relative z-10 border-b border-[#00F0FF]/20">

        {/* Active Session (Moved into header) */}
        <div className="flex-1 min-w-0 mr-2">
          {sessions.length > 0 && (
            <div className="relative flex items-center">
              <select 
                value={activeSessionId}
                onChange={(e) => switchSession(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#00F0FF] focus:outline-none cursor-pointer w-full border-none font-mono tracking-widest uppercase appearance-none hover:bg-[#00F0FF]/5 rounded py-1 px-2 transition-colors truncate"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#02050C] text-[#00F0FF]">
                    {s.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="text-[#00F0FF]/50 absolute right-2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={createNewChat} className="p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF] border border-transparent hover:border-[#00F0FF]/30" title="New Chat">
            <Plus size={16} />
          </button>
          <button className="p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF] border border-transparent hover:border-[#00F0FF]/30">
            <MoreVertical size={16} />
          </button>
          <button onClick={() => setIsChatVisible(false)} className="md:hidden p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 custom-scrollbar relative">
        
        {messages.length === 0 && (
          <div className="flex flex-col mt-2 px-1 h-full">
            <h1 className="text-[24px] font-tech font-bold leading-tight tracking-widest uppercase shrink-0">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-white">HELLO, SANDEEP.</span>
              <br />
              <span className="text-[#00F0FF]/70 text-lg font-normal">I AM E.D.I.T.H.</span>
              <br />
              <span className="text-[11px] font-mono tracking-widest text-[#00F0FF]/50 mt-1 block">AWAITING YOUR DIRECTIVE.</span>
            </h1>
            
            {/* E.D.I.T.H. Crisp Glowing Logo */}
            <div className="flex-1 flex items-center justify-center pointer-events-none pb-10 mt-8">
              <div className="relative flex items-center justify-center opacity-60">
                {/* Outer Ring */}
                <div className="absolute w-[240px] h-[240px] border border-[#00F0FF]/80 rounded-full animate-[spin_40s_linear_infinite] shadow-[0_0_15px_rgba(0,240,255,0.2)_inset,0_0_15px_rgba(0,240,255,0.2)]" />
                {/* Middle Dashed Ring */}
                <div className="absolute w-[220px] h-[220px] border-2 border-[#00F0FF]/60 border-dashed rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                {/* Inner Thick Ring */}
                <div className="absolute w-[160px] h-[160px] border-2 border-[#00F0FF]/90 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.4)]" />
                {/* Core Background Glow */}
                <div className="absolute w-[120px] h-[120px] bg-[#00F0FF]/10 rounded-full blur-xl animate-pulse" />
                
                {/* Crisp Icons */}
                <Aperture size={90} className="text-[#00F0FF] animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" strokeWidth={1.5} />
                <Fingerprint size={45} className="text-[#00F0FF] absolute drop-shadow-[0_0_8px_rgba(0,240,255,1)]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => {
          return (
            <div key={m.id} className="flex gap-4">
              {m.role === 'user' ? (
                <div className="w-full flex justify-end">
                  <div className="bg-[#00F0FF]/10 text-white border border-[#00F0FF]/40 rounded-md px-5 py-3 max-w-[85%] text-[15px] leading-relaxed shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="w-full flex gap-3">
                  <div className="w-8 h-8 rounded-sm bg-[#00F0FF]/20 border border-[#00F0FF]/50 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    <Aperture size={16} className="text-[#00F0FF]" />
                  </div>
                  <div className="flex-1 text-white/90 text-[15px] leading-relaxed prose prose-invert max-w-full prose-p:leading-relaxed prose-pre:bg-[#02050C] prose-pre:border prose-pre:border-[#00F0FF]/30 prose-pre:rounded-md">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => {
                          if (href?.startsWith('#')) {
                            const slug = decodeURIComponent(href.replace('#', ''));
                            return (
                              <button
                                onClick={() => onNodeClick(slug)}
                                className="text-[#02050C] hover:bg-white bg-[#00F0FF] px-1.5 py-0.5 rounded-sm transition-colors inline-flex items-center font-bold text-[11px] tracking-widest uppercase mx-1"
                              >
                                [{children}]
                              </button>
                            );
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline underline-offset-4">{children}</a>;
                        }
                      }}
                    >
                      {m.content.replace(/\[\[([^\]]+)\]\]/g, (match: string, title: string) => {
                        return `[${title}](#${encodeURIComponent(title)})`;
                      })}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {error && (
          <div className="flex gap-3 text-red-400 bg-red-950/50 border border-red-500/50 p-4 rounded-md">
            <div className="shrink-0">⚠️</div>
            <div className="text-[15px]">{error.message}</div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#00F0FF]/20 border border-[#00F0FF]/50 flex items-center justify-center shrink-0 animate-pulse">
              <Aperture size={16} className="text-[#00F0FF]" />
            </div>
            <div className="flex items-center text-[#00F0FF]/60 text-xs font-mono uppercase tracking-widest">
              <Loader2 size={16} className="animate-spin mr-2" /> Processing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="px-4 pb-4 pt-2 bg-transparent shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center bg-[#02050C]/80 border border-[#00F0FF]/30 rounded-sm py-1 px-2 pr-2 transition-all focus-within:border-[#00F0FF] focus-within:shadow-[0_0_15px_rgba(0,240,255,0.15)]">
          <textarea
            value={input || ''}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            placeholder="AWAITING DIRECTIVE..."
            rows={1}
            className="w-full bg-transparent border-none py-1.5 px-2 text-[12px] text-[#00F0FF] placeholder:text-[#00F0FF]/30 focus:outline-none resize-none max-h-[200px] custom-scrollbar font-mono uppercase tracking-wide leading-relaxed"
            style={{ minHeight: '32px' }}
          />
          {/* Model Selector (Inside Input, Left of Send) */}
          <div className="relative shrink-0 ml-1">
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setIsModelDropdownOpen(!isModelDropdownOpen); }}
              className="flex items-center gap-1 hover:bg-[#00F0FF]/10 px-1.5 py-1 rounded transition-all text-[9px] font-mono tracking-widest text-[#00F0FF]/40 hover:text-[#00F0FF]/80"
              title="Select Model"
            >
              <span>{selectedModel === 'gemini-3.5-flash' ? '3.5' : '2.5'}</span>
              <ChevronDown size={10} />
            </button>
            
            {isModelDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-32 bg-[#02050C] border border-[#00F0FF]/30 rounded shadow-[0_-4px_20px_rgba(0,240,255,0.15)] overflow-hidden z-50">
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSelectedModel('gemini-3.5-flash'); setIsModelDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#00F0FF]/20 text-[10px] text-[#00F0FF] font-mono tracking-widest uppercase transition-colors"
                >
                  3.5 Flash
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setSelectedModel('gemini-2.5-flash'); setIsModelDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#00F0FF]/20 text-[10px] text-[#00F0FF] font-mono tracking-widest uppercase transition-colors"
                >
                  2.5 Flash
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !input?.trim()}
            className="shrink-0 p-1.5 rounded-sm text-[#00F0FF]/60 hover:text-[#02050C] hover:bg-[#00F0FF] disabled:opacity-30 disabled:hover:bg-transparent transition-all ml-1"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="text-center mt-2 text-[9px] text-[#00F0FF]/40 font-mono tracking-wider uppercase leading-tight">
          E.D.I.T.H. MAY DISPLAY INACCURATE INFO, DOUBLE-CHECK RESPONSES.
        </div>
      </div>
    </div>
  );
};
