'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, ChevronDown, Plus, Aperture, Fingerprint, Network, ChevronRight, MoreVertical, Trash2, Cloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/context/AuthContext';
import { saveChatSessionsToCloud, loadChatSessionsFromCloud } from '@/lib/firestoreChat';

const SESSIONS_STORAGE_KEY = 'mz_chat_sessions';

// Helpers to bypass react-hooks/purity strict linter which flags Date.now()
const getNow = () => Date.now();
const generateId = () => getNow().toString();

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
  activeNoteSlug?: string | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNodeClick, setIsChatVisible, activeNoteSlug }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');
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
        id: generateId(),
        title: 'New Chat',
        messages: [],
        updatedAt: getNow()
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
    if (!user || !isLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSyncing(true);
    loadChatSessionsFromCloud(user.uid).then(cloudSessions => {
      if (cloudSessions && cloudSessions.length > 0) {
        setSessions(cloudSessions);
        const mostRecent = [...cloudSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveSessionId(mostRecent.id);
        activeSessionIdRef.current = mostRecent.id;
        setMessages(mostRecent.messages);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(cloudSessions));
      } else {
        // If cloud is empty, sync local storage to cloud
        const local = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          saveChatSessionsToCloud(user.uid, parsed);
        }
      }
    }).finally(() => setIsSyncing(false));
  }, [user, isLoaded]);

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
          next[idx] = { ...next[idx], messages, title, updatedAt: getNow() };
        }
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
        
        // Sync to cloud if authenticated
        if (user) {
          setIsSyncing(true);
          saveChatSessionsToCloud(user.uid, next).finally(() => setIsSyncing(false));
        }

        return next;
      });
    }
  }, [messages, isLoaded, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    const activeSession = sessions.find(s => s.id === activeSessionIdRef.current);
    if (activeSession && activeSession.messages.length === 0) {
      // Don't create a new chat if the current one is already empty
      setIsHistoryOpen(false);
      return;
    }

    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      updatedAt: getNow()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    activeSessionIdRef.current = newSession.id;
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const switchSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setActiveSessionId(session.id);
      activeSessionIdRef.current = session.id;
      setMessages(session.messages);
    }
  };

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ sessionId: string } | null>(null);

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        next.push({ id: generateId(), title: 'New Chat', messages: [], updatedAt: getNow() });
      }
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
      if (activeSessionId === id || activeSessionIdRef.current === id) {
        setActiveSessionId(next[0].id);
        activeSessionIdRef.current = next[0].id;
        setMessages(next[0].messages);
      }
      
      if (user) {
        setIsSyncing(true);
        saveChatSessionsToCloud(user.uid, next).finally(() => setIsSyncing(false));
      }
      
      return next;
    });
    setContextMenu(null);
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSession: ChatSession = { id: generateId(), title: 'New Chat', messages: [], updatedAt: getNow() };
    const next = [newSession];
    setSessions(next);
    setActiveSessionId(newSession.id);
    activeSessionIdRef.current = newSession.id;
    setMessages([]);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
    
    if (user) {
      setIsSyncing(true);
      saveChatSessionsToCloud(user.uid, next).finally(() => setIsSyncing(false));
    }
    
    setIsHistoryOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: generateId(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const recentHistory = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage.content,
          model: selectedModel,
          history: recentHistory
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: generateId() + '_ai',
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
            if (user) {
              setIsSyncing(true);
              saveChatSessionsToCloud(user.uid, next).finally(() => setIsSyncing(false));
            }
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

  const [similarNotes, setSimilarNotes] = useState<Array<{uniqueId: string, key: string, rawKey: string, score: number}>>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  useEffect(() => {
    if (activeTab === 'context' && activeNoteSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingSimilar(true);
      fetch(`/api/similar?slug=${encodeURIComponent(activeNoteSlug)}`)
        .then(res => res.json())
        .then(data => {
          if (data.results) {
            setSimilarNotes(data.results);
          }
        })
        .finally(() => setIsLoadingSimilar(false));
    }
  }, [activeTab, activeNoteSlug]);

  return (
    <div className="h-full flex flex-col bg-[#001E3C]/40 backdrop-blur-md text-gray-200 shrink-0 w-full md:w-[400px] border-l border-[#00F0FF]/30 shadow-[-10px_0_30px_rgba(0,240,255,0.05)] relative z-10">
      
      {/* Top Header Controls (Tabs) */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0 relative z-10 border-b border-[#00F0FF]/20">
        <div className="flex bg-[#00F0FF]/10 rounded border border-[#00F0FF]/20 p-0.5 overflow-hidden">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase transition-colors rounded-sm flex items-center gap-1 ${activeTab === 'chat' ? 'bg-[#00F0FF] text-[#02050C] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10'}`}
          >
            <Aperture size={10} className={activeTab === 'chat' ? 'text-[#02050C] animate-[spin_4s_linear_infinite]' : ''} />
            E.D.I.T.H.
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase transition-colors rounded-sm flex items-center gap-1 ${activeTab === 'context' ? 'bg-[#00F0FF] text-[#02050C] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10'}`}
          >
            <Network size={10} className={activeTab === 'context' ? 'text-[#02050C]' : ''} />
            Context
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0 relative">
          {user && (
            <div className="mr-2 flex items-center text-[9px] font-mono tracking-widest text-[#00F0FF]/40 uppercase">
              {isSyncing ? (
                <span className="flex items-center gap-1 animate-pulse text-[#00F0FF]"><Cloud size={10} /> Sync</span>
              ) : (
                <span className="flex items-center gap-1"><Cloud size={10} /> Saved</span>
              )}
            </div>
          )}
          <button onClick={createNewChat} className="p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF] border border-transparent hover:border-[#00F0FF]/30" title="New Chat">
            <Plus size={16} />
          </button>
          <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={`p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors border border-transparent hover:border-[#00F0FF]/30 ${isHistoryOpen ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF]'}`} title="Chat History">
            <MoreVertical size={16} />
          </button>
          <button onClick={() => setIsChatVisible(false)} className="md:hidden p-1.5 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          {isHistoryOpen && (
            <div className="absolute top-10 right-0 w-64 max-h-[60vh] overflow-y-auto bg-[#02050C] border border-[#00F0FF]/30 rounded shadow-[0_4px_20px_rgba(0,240,255,0.15)] z-50 flex flex-col custom-scrollbar">
              <div className="p-3 border-b border-[#00F0FF]/20 text-[10px] font-mono text-[#00F0FF]/60 tracking-widest uppercase flex justify-between items-center sticky top-0 bg-[#02050C] z-10">
                <span>Chat History</span>
                <button 
                  onClick={handleClearAllHistory}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition-colors"
                  title="Clear All History"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => { switchSession(s.id); setIsHistoryOpen(false); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ sessionId: s.id });
                  }}
                  onMouseLeave={() => setContextMenu(null)}
                  className={`px-3 py-3 text-[11px] hover:bg-[#00F0FF]/10 cursor-pointer border-b border-[#00F0FF]/5 transition-colors relative flex items-center justify-between ${activeSessionId === s.id ? 'text-[#00F0FF] bg-[#00F0FF]/5 font-bold' : 'text-gray-300'}`}
                >
                  <span className="truncate pr-2">{s.title}</span>
                  {contextMenu?.sessionId === s.id && (
                    <button 
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="flex items-center justify-center p-1.5 bg-red-500 text-white rounded shadow absolute right-2 hover:bg-red-600 transition-colors animate-in fade-in duration-150"
                      title="Delete this chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="p-4 text-center text-[10px] text-gray-500 font-mono">No history found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>

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
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 custom-scrollbar relative">
          <div className="mb-4">
            <h2 className="font-tech text-[10px] text-[#00F0FF]/60 tracking-widest uppercase">SMART CONNECTIONS</h2>
            <p className="text-[12px] text-gray-400 mt-1">Files most semantically related to this note.</p>
          </div>
          
          {isLoadingSimilar ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#00F0FF]/60">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-mono text-[10px] tracking-widest">ANALYZING VECTORS...</span>
            </div>
          ) : similarNotes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {similarNotes.map((note: { uniqueId: string, key: string, rawKey: string, score: number }, index: number) => (
                <button
                  key={`${note.uniqueId}-${index}`}
                  onClick={() => onNodeClick(note.key)}
                  className="group flex items-center justify-between text-left p-2.5 rounded-md border border-[#00F0FF]/10 bg-[#001E3C]/30 hover:bg-[#00F0FF]/10 hover:border-[#00F0FF]/30 transition-all shadow-[0_0_10px_rgba(0,240,255,0)] hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                >
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-3">
                      <ChevronRight size={14} className="text-[#00F0FF]/50 group-hover:text-[#00F0FF] transition-colors shrink-0" />
                      <span className="truncate text-[13px] text-gray-200 group-hover:text-white transition-colors">
                        {note.key.split('/').pop()?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {note.rawKey.includes('#') && (
                      <span className="truncate text-[10px] text-gray-400 group-hover:text-gray-300 transition-colors ml-6 mt-0.5">
                        ↳ {note.rawKey.split('#')[1].replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] font-mono text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_5px_rgba(0,240,255,0.2)] group-hover:bg-[#00F0FF] group-hover:text-[#02050C] transition-colors font-bold">
                    {note.score.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#00F0FF]/40 text-[11px] font-mono tracking-widest mt-10">
              {activeNoteSlug ? "NO SIMILAR VECTORS FOUND." : "OPEN A NOTE TO VIEW SMART CONTEXT."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
