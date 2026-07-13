'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { Sparkles, Send, Loader2, Trash2, Plus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CHAT_STORAGE_KEY = 'mz_chat_history'; // We'll store a single session array for legacy but transition to object
const SESSIONS_STORAGE_KEY = 'mz_chat_sessions';

export interface ChatSession {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  updatedAt: number;
}

interface ChatSidebarProps {
  onNodeClick: (slug: string) => void;
  setIsChatVisible: (v: boolean) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNodeClick, setIsChatVisible }) => {
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const { messages, setMessages, input, setInput, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: { model: selectedModel },
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const activeSessionIdRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    let loadedSessions: ChatSession[] = [];
    const savedSessionsStr = localStorage.getItem(SESSIONS_STORAGE_KEY);
    
    if (savedSessionsStr) {
      try {
        loadedSessions = JSON.parse(savedSessionsStr);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    } else {
      // Legacy migration
      const legacyChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (legacyChat) {
        try {
          const parsed = JSON.parse(legacyChat);
          if (parsed && parsed.length > 0) {
            loadedSessions = [{
              id: 'legacy-session',
              title: 'Previous Chat',
              messages: parsed,
              updatedAt: Date.now()
            }];
          }
        } catch {
          // empty
        }
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

    // eslint-disable-next-line
    setSessions(loadedSessions);
    
    // Pick the most recent session
    const mostRecent = [...loadedSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    setActiveSessionId(mostRecent.id);
    activeSessionIdRef.current = mostRecent.id;
    setMessages(mostRecent.messages);
    setIsLoaded(true);
  }, [setMessages]);

  // Save to local storage when messages change
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
  }, [messages, isLoaded]); // Intentionally omitting activeSessionId to prevent sync races

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

  const deleteCurrentChat = () => {
    if (confirm('Are you sure you want to delete this chat history?')) {
      setSessions(prev => {
        const next = prev.filter(s => s.id !== activeSessionId);
        if (next.length === 0) {
          const newSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            updatedAt: Date.now()
          };
          next.push(newSession);
        }
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
        
        const nextActive = next[0];
        setActiveSessionId(nextActive.id);
        activeSessionIdRef.current = nextActive.id;
        setMessages(nextActive.messages);
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:relative md:w-[350px] z-50 md:z-0 h-full flex flex-col bg-surface-container-lowest border-l border-whisper-border shrink-0 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none">
      
      {/* Header */}
      <div className="h-12 border-b border-whisper-border flex items-center justify-between px-4 shrink-0 bg-surface-container/50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-electric-cyan" />
          <h2 className="font-tech tracking-widest text-sm text-electric-cyan uppercase">O.R.I.O.N.</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={createNewChat}
            className="text-muted-steel hover:text-electric-cyan transition-colors p-1"
            title="New Chat"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={deleteCurrentChat}
            className="text-muted-steel hover:text-red-400 transition-colors p-1 ml-1"
            title="Delete Chat"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => setIsChatVisible(false)}
            className="md:hidden text-muted-steel hover:text-electric-cyan transition-colors p-1 ml-1"
            title="Close O.R.I.O.N."
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      {/* Session and Model Selectors */}
      <div className="px-4 py-2 bg-abyssal-bg border-b border-whisper-border flex flex-col gap-2 shrink-0">
        {sessions.length > 0 && (
          <div className="flex items-center">
            <MessageSquare size={14} className="text-muted-steel mr-2" />
            <select 
              value={activeSessionId}
              onChange={(e) => switchSession(e.target.value)}
              className="bg-transparent text-xs text-on-surface-variant focus:outline-none cursor-pointer flex-1 w-full truncate"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-surface-container text-on-surface">
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center">
          <Sparkles size={14} className="text-muted-steel mr-2" />
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-xs text-on-surface-variant focus:outline-none cursor-pointer flex-1 w-full"
          >
            <option value="gemini-3.5-flash" className="bg-surface-container text-on-surface">Gemini 3.5 Flash (Fast)</option>
            <option value="gemini-1.5-pro" className="bg-surface-container text-on-surface">Gemini 1.5 Pro (Advanced)</option>
            <option value="gemini-1.5-flash" className="bg-surface-container text-on-surface">Gemini 1.5 Flash (Legacy)</option>
          </select>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {messages.length === 0 && (
          <div className="flex flex-col gap-1 max-w-[90%]">
            <span className="text-[10px] text-muted-steel font-mono px-1">O.R.I.O.N.</span>
            <div className="bg-surface-container border border-whisper-border rounded-lg rounded-tl-none p-3 text-sm text-on-surface-variant leading-relaxed">
              System Online. I am O.R.I.O.N. How can I assist you with The Arc Vault today?
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-muted-steel font-mono px-1">
              {m.role === 'user' ? 'You' : 'O.R.I.O.N.'}
            </span>
            <div className={`p-3 text-sm leading-relaxed max-w-[90%] ${
              m.role === 'user' 
                ? 'bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan rounded-lg rounded-tr-none'
                : 'bg-surface-container border border-whisper-border text-on-surface-variant rounded-lg rounded-tl-none prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-surface-container-high'
            }`}>
              {m.role === 'user' ? (
                m.content
              ) : (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => {
                      // Check if it's our custom internal note citation (rendered as a link to #slug)
                      if (href?.startsWith('#')) {
                        const slug = decodeURIComponent(href.replace('#', ''));
                        return (
                          <button
                            onClick={() => onNodeClick(slug)}
                            className="text-electric-cyan hover:underline inline-flex items-center mx-1 font-medium bg-abyssal-bg px-1.5 py-0.5 rounded border border-electric-cyan/20 cursor-pointer"
                          >
                            {children}
                          </button>
                        );
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-electric-cyan hover:underline">{children}</a>;
                    }
                  }}
                >
                  {/* Pre-process the content to convert [[Note Name]] to markdown links [Note Name](#Note%20Name) */}
                  {m.content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
                    // This is a naive slugification to match how we look up notes.
                    // If the user clicks it, we pass the title back to page.tsx which might need to search for it,
                    // but for simplicity we assume the title matches the slug's basename.
                    // We'll pass the exact title and let page.tsx handle opening it.
                    return `[${title}](#${encodeURIComponent(title)})`;
                  })}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        
        {error && (
          <div className="flex flex-col gap-1 max-w-[90%] self-start">
            <span className="text-[10px] text-red-400 font-mono px-1">SYSTEM ERROR</span>
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm leading-relaxed">
              {error.message}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-steel text-xs font-mono mt-2">
            <Loader2 size={12} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-surface-container/50 border-t border-whisper-border shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input || ''}
            onChange={(e) => {
              if (handleInputChange) {
                handleInputChange(e);
              } else {
                setInput(e.target.value);
              }
            }}
            disabled={isLoading}
            placeholder="Ask about your vault..."
            className="w-full bg-surface-container-high border border-whisper-border rounded-lg py-2.5 pl-4 pr-10 text-sm text-on-surface placeholder:text-muted-steel focus:outline-none focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan transition-all disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input?.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-steel hover:text-electric-cyan transition-colors p-1 disabled:opacity-50 disabled:hover:text-muted-steel cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
};
