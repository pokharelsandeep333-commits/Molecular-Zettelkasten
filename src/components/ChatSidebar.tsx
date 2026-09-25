import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, Plus, Aperture, Network, ChevronRight, History, Trash2, Cloud, X, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// PrismAsync loads each language grammar on first use instead of bundling ~300 up front.
import { PrismAsync as Prism } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Mermaid } from './Mermaid';
import { convertWikilinks, isWikilink, wikilinkTarget, CopyButton, codeBlockInfo } from './MarkdownRenderer';
import { useAuth } from '@/context/AuthContext';
import { authFetch, authFetchJson } from '@/lib/authFetch';
import { readJson, writeStorage } from '@/lib/storage';
import { saveChatSessionsToCloud, subscribeToChatSessions } from '@/lib/firestoreChat';

const SESSIONS_STORAGE_KEY = 'mz_chat_sessions';
const MAX_SESSIONS = 50;
// All sessions live in one Firestore document, which is capped at 1 MiB.
const MAX_SESSIONS_BYTES = 800_000;

const newId = () => crypto.randomUUID();
// Helper keeps Date.now() out of render for the react-hooks/purity lint rule.
const getNow = () => Date.now();

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  interactionId?: string | null;
  updatedAt: number;
}

interface SimilarNote {
  uniqueId: string;
  key: string;
  rawKey: string;
  score: number;
}

interface ChatSidebarProps {
  onNodeClick: (slug: string) => void;
  setIsChatVisible: (v: boolean) => void;
  activeNoteSlug?: string | null;
  /** True when the panel floats over the note (phones, tablets, small laptops). */
  isOverlay?: boolean;
}

const emptySession = (): ChatSession => ({ id: newId(), title: 'New Chat', messages: [], updatedAt: getNow() });

/** Newest first, at most MAX_SESSIONS, and small enough for a single Firestore document. */
function trimSessions(sessions: ChatSession[]): ChatSession[] {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
  while (sorted.length > 1 && JSON.stringify(sorted).length > MAX_SESSIONS_BYTES) sorted.pop();
  return sorted;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNodeClick, setIsChatVisible, activeNoteSlug, isOverlay = false }) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');

  // Sessions are the single source of truth; the visible messages are derived from them.
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = readJson<ChatSession[]>(SESSIONS_STORAGE_KEY, []);
    return Array.isArray(saved) && saved.length > 0 ? saved : [emptySession()];
  });
  const sessionsRef = useRef(sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id,
  );
  const activeSessionIdRef = useRef(activeSessionId);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];

  const selectSession = useCallback((id: string) => {
    activeSessionIdRef.current = id;
    setActiveSessionId(id);
  }, []);

  /** Apply a change to the sessions and persist it once (locally and to Firestore). */
  const commitSessions = useCallback((update: (prev: ChatSession[]) => ChatSession[]) => {
    const next = trimSessions(update(sessionsRef.current));
    sessionsRef.current = next;
    setSessions(next);
    writeStorage(SESSIONS_STORAGE_KEY, JSON.stringify(next));
    if (!next.some(s => s.id === activeSessionIdRef.current)) selectSession(next[0].id);
    if (user) {
      setIsSyncing(true);
      saveChatSessionsToCloud(user.uid, next).finally(() => setIsSyncing(false));
    }
  }, [user, selectSession]);

  // Cloud sync: Firestore is authoritative once it has data.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the subscription starting
    setIsSyncing(true);
    const unsubscribe = subscribeToChatSessions(user.uid, (cloudSessions) => {
      if (cloudSessions.length > 0) {
        sessionsRef.current = cloudSessions;
        setSessions(cloudSessions);
        writeStorage(SESSIONS_STORAGE_KEY, JSON.stringify(cloudSessions));
        if (!cloudSessions.some(s => s.id === activeSessionIdRef.current)) {
          selectSession([...cloudSessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
        }
      }
      setIsSyncing(false);
    }, () => setIsSyncing(false));
    return () => unsubscribe();
  }, [user, selectSession]);

  // Escape closes the panel, unless a dialog (search, diagram) is open and should close first.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      if (isHistoryOpen) setIsHistoryOpen(false);
      else setIsChatVisible(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsChatVisible, isHistoryOpen]);

  // Close the history menu on outside click/tap.
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setIsHistoryOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [isHistoryOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = () => {
    setIsHistoryOpen(false);
    // Don't create a new chat if the current one is already empty
    if (activeSession && activeSession.messages.length === 0) return;
    const session = emptySession();
    commitSessions(prev => [session, ...prev]);
    selectSession(session.id);
    setError(null);
  };

  const handleDeleteSession = (id: string) => {
    commitSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      return next.length > 0 ? next : [emptySession()];
    });
  };

  const handleClearAllHistory = () => {
    if (!window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) return;
    const session = emptySession();
    commitSessions(() => [session]);
    selectSession(session.id);
    setIsHistoryOpen(false);
  };

  const resizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Pin the reply to the session that asked, even if the user switches chats meanwhile.
    const sessionId = activeSessionIdRef.current;
    const recentHistory = (sessionsRef.current.find(s => s.id === sessionId)?.messages ?? [])
      .slice(-4)
      .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: text };

    commitSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      messages: [...s.messages, userMessage],
      title: s.messages.length === 0 ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : s.title,
      updatedAt: getNow(),
    }));

    setInput('');
    requestAnimationFrame(() => resizeTextarea(textareaRef.current));
    setIsLoading(true);
    setError(null);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, history: recentHistory }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to fetch response');

      const aiMessage: ChatMessage = { id: newId(), role: 'assistant', content: String(data.text ?? '') };
      commitSessions(prev => prev.map(s => s.id !== sessionId ? s : {
        ...s,
        messages: [...s.messages, aiMessage],
        updatedAt: getNow(),
      }));

      if (activeSessionIdRef.current === sessionId) {
        setTimeout(() => {
          document.getElementById(`msg-${aiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    } catch (err: unknown) {
      if (activeSessionIdRef.current === sessionId) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [similarNotes, setSimilarNotes] = useState<SimilarNote[]>([]);
  const [similarState, setSimilarState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (activeTab !== 'context' || !activeNoteSlug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the request below
    setSimilarState('loading');
    authFetchJson<{ results?: SimilarNote[] }>(`/api/similar?slug=${encodeURIComponent(activeNoteSlug)}`)
      .then(data => {
        if (cancelled) return;
        setSimilarNotes(data.results ?? []);
        setSimilarState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setSimilarNotes([]);
        setSimilarState('error');
      });
    return () => { cancelled = true; };
  }, [activeTab, activeNoteSlug]);

  const firstName = (user?.displayName?.split(' ')[0] || 'Operator').toUpperCase();

  return (
    <div className="h-full flex flex-col bg-[#001E3C]/40 backdrop-blur-md text-gray-200 w-full border-l border-[#00F0FF]/30 shadow-[-10px_0_30px_rgba(0,240,255,0.05)] relative z-10 pt-[env(safe-area-inset-top)]">

      {/* Top Header Controls (Tabs) */}
      <div className="h-14 flex items-center justify-between gap-2 px-3 sm:px-4 shrink-0 relative z-20 border-b border-[#00F0FF]/20">
        <div className="flex bg-[#00F0FF]/10 rounded border border-[#00F0FF]/20 p-0.5 overflow-hidden" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            className={`px-2 min-[360px]:px-3 py-1.5 text-[10px] font-mono tracking-wider min-[360px]:tracking-widest uppercase transition-colors rounded-sm flex items-center gap-1 ${activeTab === 'chat' ? 'bg-[#00F0FF] text-[#02050C] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10'}`}
          >
            <Aperture size={10} className={activeTab === 'chat' ? 'text-[#02050C] animate-[spin_4s_linear_infinite]' : ''} />
            E.D.I.T.H.
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'context'}
            onClick={() => setActiveTab('context')}
            className={`px-2 min-[360px]:px-3 py-1.5 text-[10px] font-mono tracking-wider min-[360px]:tracking-widest uppercase transition-colors rounded-sm flex items-center gap-1 ${activeTab === 'context' ? 'bg-[#00F0FF] text-[#02050C] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10'}`}
          >
            <Network size={10} className={activeTab === 'context' ? 'text-[#02050C]' : ''} />
            Context
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={historyRef}>
          {user && (
            <div className="mr-1 sm:mr-2 hidden min-[360px]:flex items-center text-[9px] font-mono tracking-widest text-[#00F0FF]/40 uppercase" aria-live="polite">
              {isSyncing ? (
                <span className="flex items-center gap-1 animate-pulse text-[#00F0FF]"><Cloud size={10} /> Sync</span>
              ) : (
                <span className="flex items-center gap-1"><Cloud size={10} /> Saved</span>
              )}
            </div>
          )}
          <button onClick={createNewChat} className="p-2 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF] border border-transparent hover:border-[#00F0FF]/30" title="New Chat" aria-label="New chat">
            <Plus size={16} />
          </button>
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`p-2 hover:bg-[#00F0FF]/10 rounded transition-colors border border-transparent hover:border-[#00F0FF]/30 ${isHistoryOpen ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'text-[#00F0FF]/60 hover:text-[#00F0FF]'}`}
            title="Chat History"
            aria-label="Chat history"
            aria-expanded={isHistoryOpen}
          >
            <History size={16} />
          </button>
          {isOverlay && (
            <button onClick={() => setIsChatVisible(false)} className="p-2 hover:bg-[#00F0FF]/10 rounded transition-colors text-[#00F0FF]/60 hover:text-[#00F0FF]" aria-label="Close assistant">
              <X size={16} />
            </button>
          )}

          {isHistoryOpen && (
            <div className="absolute top-11 right-0 w-[min(18rem,calc(100vw-1.5rem))] max-h-[60dvh] overflow-y-auto overscroll-contain bg-[#02050C] border border-[#00F0FF]/30 rounded shadow-[0_4px_20px_rgba(0,240,255,0.15)] z-50 flex flex-col custom-scrollbar">
              <div className="p-3 border-b border-[#00F0FF]/20 text-[10px] font-mono text-[#00F0FF]/60 tracking-widest uppercase flex justify-between items-center sticky top-0 bg-[#02050C] z-10">
                <span>Chat History</span>
                <button
                  onClick={handleClearAllHistory}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                  title="Clear All History"
                  aria-label="Clear all chat history"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`group text-[12px] hover:bg-[#00F0FF]/10 border-b border-[#00F0FF]/5 transition-colors flex items-center ${activeSessionId === s.id ? 'text-[#00F0FF] bg-[#00F0FF]/5 font-bold' : 'text-gray-300'}`}
                >
                  <button
                    onClick={() => { selectSession(s.id); setError(null); setIsHistoryOpen(false); }}
                    className="flex-1 min-w-0 text-left px-3 py-3"
                  >
                    <span className="block truncate">{s.title}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="shrink-0 mr-2 p-1.5 rounded text-red-400/80 hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 touch-visible transition-all"
                    title="Delete this chat"
                    aria-label={`Delete chat ${s.title}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 flex flex-col gap-6 custom-scrollbar relative" aria-live="polite">

            {messages.length === 0 && (
              <div className="flex flex-col mt-2 px-1">
                <h1 className="text-[22px] sm:text-[24px] font-tech font-bold leading-tight tracking-widest uppercase shrink-0">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-white">HELLO, {firstName}.</span>
                  <br />
                  <span className="text-[#00F0FF]/70 text-lg font-normal">I AM E.D.I.T.H.</span>
                  <br />
                  <span className="text-[11px] font-mono tracking-widest text-[#00F0FF]/50 mt-1 block">AWAITING YOUR DIRECTIVE.</span>
                </h1>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} id={`msg-${m.id}`} className="flex gap-4">
                {m.role === 'user' ? (
                  <div className="w-full flex justify-end">
                    <div className="bg-[#00F0FF]/10 text-white border border-[#00F0FF]/40 rounded-md px-4 sm:px-5 py-3 max-w-[85%] text-[15px] leading-relaxed shadow-[0_0_10px_rgba(0,240,255,0.1)] whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-sm bg-[#00F0FF]/20 border border-[#00F0FF]/50 hidden min-[380px]:flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                      <Aperture size={16} className="text-[#00F0FF]" />
                    </div>
                    <div className="flex-1 min-w-0 text-white/90 text-[15px] leading-relaxed break-words [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_table]:block [&_table]:overflow-x-auto [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code: ({ className, children, ...props }) => {
                            const { isBlock, language, codeString } = codeBlockInfo(className, children);

                            if (!isBlock) {
                              return (
                                <code className="bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded px-1.5 py-0.5 text-[#00F0FF] font-mono text-xs break-words" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            if (language === 'mermaid') {
                              return <Mermaid chart={codeString} />;
                            }

                            return (
                              <div className="relative group mb-4 mt-2">
                                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 touch-visible transition-opacity">
                                  <CopyButton
                                    text={codeString}
                                    className="bg-[#02050C] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#02050C] border border-[#00F0FF]/50 rounded px-2 py-1 text-[10px] font-tech transition-colors shadow-sm"
                                  />
                                </div>
                                <Prism
                                  language={language}
                                  style={vscDarkPlus}
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(0, 240, 255, 0.3)',
                                    backgroundColor: '#02050C',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                >
                                  {codeString}
                                </Prism>
                              </div>
                            );
                          },
                          a: ({ href, children }) => {
                            if (isWikilink(href)) {
                              const slug = wikilinkTarget(href);
                              return (
                                <button
                                  type="button"
                                  onClick={() => slug && onNodeClick(slug)}
                                  className="text-[#02050C] hover:bg-white bg-[#00F0FF] px-1.5 py-0.5 rounded-sm transition-colors inline-flex items-center font-bold text-[11px] tracking-widest uppercase mx-1 my-0.5 text-left"
                                >
                                  [{children}]
                                </button>
                              );
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline underline-offset-4 break-all">{children}</a>;
                          }
                        }}
                      >
                        {convertWikilinks(m.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="flex gap-3 text-red-400 bg-red-950/50 border border-red-500/50 p-4 rounded-md" role="alert">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div className="text-[15px] break-words">{error}</div>
              </div>
            )}

            {isLoading && (
              <div className="flex gap-3" role="status">
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
          <div className="px-3 sm:px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] bg-transparent shrink-0">
            <form onSubmit={handleSubmit} className="relative flex items-end bg-[#02050C]/80 border border-[#00F0FF]/30 rounded-sm py-1 px-2 pr-2 transition-all focus-within:border-[#00F0FF] focus-within:shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea(e.target);
                }}
                onKeyDown={(e) => {
                  // On touch keyboards Enter inserts a newline; the send button submits.
                  const isTouch = window.matchMedia('(pointer: coarse)').matches;
                  if (e.key === 'Enter' && !e.shiftKey && !isTouch && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isLoading}
                placeholder="AWAITING DIRECTIVE..."
                aria-label="Message E.D.I.T.H."
                rows={1}
                maxLength={4000}
                enterKeyHint="send"
                // 16px on phones stops iOS Safari zooming in on focus.
                className="w-full bg-transparent border-none py-1.5 px-2 text-base md:text-[12px] text-[#00F0FF] placeholder:text-[#00F0FF]/30 focus:outline-none resize-none max-h-[200px] custom-scrollbar font-mono md:uppercase tracking-wide leading-relaxed"
                style={{ minHeight: '32px' }}
              />

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="shrink-0 p-2 mb-0.5 rounded-sm text-[#00F0FF]/60 hover:text-[#02050C] hover:bg-[#00F0FF] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#00F0FF]/60 transition-all ml-1"
                aria-label="Send message"
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2 custom-scrollbar relative">
          <div className="mb-4">
            <h2 className="font-tech text-[10px] text-[#00F0FF]/60 tracking-widest uppercase">SMART CONNECTIONS</h2>
            <p className="text-[12px] text-gray-400 mt-1">Files most semantically related to this note.</p>
          </div>

          {!activeNoteSlug ? (
            <div className="text-center text-[#00F0FF]/40 text-[11px] font-mono tracking-widest mt-10">OPEN A NOTE TO VIEW SMART CONTEXT.</div>
          ) : similarState === 'loading' ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#00F0FF]/60" role="status">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-mono text-[10px] tracking-widest">ANALYZING VECTORS...</span>
            </div>
          ) : similarState === 'error' ? (
            <div className="text-center text-red-300/80 text-[11px] font-mono tracking-widest mt-10" role="alert">COULD NOT LOAD RELATED NOTES.</div>
          ) : similarNotes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {similarNotes.map((note, index) => (
                <button
                  key={`${note.uniqueId}-${index}`}
                  onClick={() => onNodeClick(note.key)}
                  className="group flex items-center justify-between gap-2 text-left p-2.5 rounded-md border border-[#00F0FF]/10 bg-[#001E3C]/30 hover:bg-[#00F0FF]/10 hover:border-[#00F0FF]/30 transition-all shadow-[0_0_10px_rgba(0,240,255,0)] hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                >
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
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
            <div className="text-center text-[#00F0FF]/40 text-[11px] font-mono tracking-widest mt-10">NO SIMILAR VECTORS FOUND.</div>
          )}
        </div>
      )}
    </div>
  );
};
