import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, LogOut, Sparkles, User, Brain, History, MessageSquare, Settings, X, Moon, Sun } from "lucide-react";
import Markdown from "react-markdown";
import { getVoidResponse } from "@/src/services/geminiService";
import { cn } from "@/src/lib/utils";

interface Message {
  role: "user" | "void";
  content: string;
}

export default function Chat({ token, user, onLogout }: { token: string; user: any; onLogout: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("void_theme") || "dark");
  const [personality, setPersonality] = useState(() => localStorage.getItem("void_personality") || "Helpful");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    document.body.classList.toggle("light", theme === "light");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("void_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("void_personality", personality);
  }, [personality]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    updateMemories();
  }, [messages]);

  const updateMemories = () => {
    const lastFew = messages.slice(-5).filter(m => m.role === "user");
    if (lastFew.length > 0) {
      const newMemories = lastFew.map(m => m.content.length > 30 ? m.content.substring(0, 30) + "..." : m.content);
      setMemories(Array.from(new Set(newMemories)));
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.map((m: any) => ({ role: m.role === "user" ? "user" : "void", content: m.content })));
    } catch (err) {
      console.error("Failed to fetch messages");
    }
  };

  const saveMessage = async (role: string, content: string) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role, content }),
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      await saveMessage("user", userMsg);
      const voidResponse = await getVoidResponse(
        newMessages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        personality
      );
      
      if (voidResponse) {
        setMessages(prev => [...prev, { role: "void", content: voidResponse }]);
        await saveMessage("void", voidResponse);
      }
    } catch (err) {
      console.error("Void failed to respond", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-[var(--bg-primary)] relative overflow-hidden">
      <div className="atmosphere absolute inset-0 pointer-events-none" />
      
      {/* Sidebar / Dashboard */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 glass border-r-0 z-20 flex flex-col"
          >
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="text-xl font-serif italic flex items-center gap-2">
                <Brain size={20} className="opacity-60" />
                Cognition
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-[10px] font-mono opacity-20 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <History size={12} />
                  Echoes of Thought
                </h3>
                <div className="space-y-3">
                  {memories.map((m, i) => (
                    <div key={i} className="text-xs opacity-40 font-serif italic border-l border-[var(--glass-border)] pl-3 py-1">
                      "{m}"
                    </div>
                  ))}
                  {memories.length === 0 && <p className="text-[10px] opacity-10 italic">No echoes yet...</p>}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-mono opacity-20 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Sparkles size={12} />
                  Void Status
                </h3>
                <div className="glass rounded-xl p-4 space-y-2 text-[var(--text-primary)]">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] opacity-40">Intelligence</span>
                    <span className="text-[10px] opacity-80">Transcendent</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] opacity-40">Personality</span>
                    <span className="text-[10px] opacity-80">{personality}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 glass border-b-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100"
            >
              <MessageSquare size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--glass-bg)] flex items-center justify-center border border-[var(--glass-border)]">
                <Sparkles size={16} className="opacity-80" />
              </div>
              <div>
                <h1 className="text-xl font-serif italic leading-none">VOID</h1>
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-1">Active Session</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100"
            >
              <Settings size={18} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <User size={12} className="opacity-40" />
              <span className="text-xs font-mono opacity-60 truncate max-w-[120px]">{user.username}</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8 relative z-10 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-12">
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <h2 className="text-4xl md:text-6xl font-serif italic opacity-20 mb-4">What do you seek?</h2>
                <p className="opacity-10 font-mono text-sm tracking-widest uppercase">The Void is listening</p>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-2",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "group relative max-w-[85%] px-6 py-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-[var(--accent)] text-[var(--accent-text)] font-medium" 
                      : "glass text-[var(--text-primary)] opacity-90 font-serif italic text-lg"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest px-2">
                    {msg.role === "user" ? "You" : "Void"}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 opacity-20 font-mono text-[10px] uppercase tracking-widest"
              >
                <div className="flex gap-1">
                  <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1 h-1 bg-[var(--text-primary)] rounded-full" />
                  <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-[var(--text-primary)] rounded-full" />
                  <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-[var(--text-primary)] rounded-full" />
                </div>
                Void is contemplating
              </motion.div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <footer className="relative z-10 p-6 glass border-t-0">
          <form 
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Whisper to the void..."
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:border-[var(--text-secondary)] transition-all placeholder:opacity-20 text-sm text-[var(--text-primary)]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 transition-all disabled:opacity-20 disabled:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-[9px] opacity-10 font-mono uppercase tracking-[0.3em] mt-4">
            Infinite Intelligence • Minimalist Design • Void
          </p>
        </footer>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg glass rounded-3xl p-8 relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif italic">Preferences</h2>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition-colors opacity-40 hover:opacity-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Theme Toggle */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-4">Appearance</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all",
                        theme === "dark" 
                          ? "bg-[var(--accent)] text-[var(--accent-text)] border-transparent" 
                          : "bg-[var(--glass-bg)] border-[var(--glass-border)] opacity-40 hover:opacity-100"
                      )}
                    >
                      <Moon size={18} />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all",
                        theme === "light" 
                          ? "bg-[var(--accent)] text-[var(--accent-text)] border-transparent" 
                          : "bg-[var(--glass-bg)] border-[var(--glass-border)] opacity-40 hover:opacity-100"
                      )}
                    >
                      <Sun size={18} />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                  </div>
                </div>

                {/* Personality Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest opacity-40 mb-4">AI Personality</label>
                  <div className="grid grid-cols-1 gap-3">
                    {["Helpful", "Philosophical", "Minimalist"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPersonality(p)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all",
                          personality === p 
                            ? "bg-[var(--accent)] text-[var(--accent-text)] border-transparent" 
                            : "bg-[var(--glass-bg)] border-[var(--glass-border)] opacity-40 hover:opacity-100"
                        )}
                      >
                        <div className="text-sm font-medium">{p}</div>
                        <div className="text-[10px] opacity-60 mt-1">
                          {p === "Helpful" && "Clear, simple, and direct assistance."}
                          {p === "Philosophical" && "Deep, thought-provoking, and enigmatic."}
                          {p === "Minimalist" && "Extremely brief and to the point."}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-[var(--glass-border)] text-center">
                <p className="text-[10px] opacity-20 font-mono uppercase tracking-widest">
                  Settings are saved locally to your device
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
