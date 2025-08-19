import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, MessageCircle } from "lucide-react";

// AI Assistant Bear Mascot Component - Full body
const AIBear = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 32 40" className={className}>
    {/* Bear ears */}
    <circle cx="9" cy="7" r="3" fill="#8B5CF6" />
    <circle cx="23" cy="7" r="3" fill="#8B5CF6" />
    <circle cx="9" cy="7" r="2" fill="#A78BFA" />
    <circle cx="23" cy="7" r="2" fill="#A78BFA" />
    
    {/* Bear head */}
    <circle cx="16" cy="14" r="8" fill="#8B5CF6" />
    <circle cx="16" cy="14" r="7" fill="#A78BFA" />
    
    {/* Eyes */}
    <circle cx="12.5" cy="12" r="1.2" fill="#1F2937" />
    <circle cx="19.5" cy="12" r="1.2" fill="#1F2937" />
    <circle cx="12.8" cy="11.7" r="0.4" fill="white" />
    <circle cx="19.8" cy="11.7" r="0.4" fill="white" />
    
    {/* Nose */}
    <ellipse cx="16" cy="15.5" rx="1" ry="0.6" fill="#1F2937" />
    
    {/* Mouth */}
    <path d="M 13.5 17 Q 16 18.5 18.5 17" stroke="#1F2937" strokeWidth="1" fill="none" strokeLinecap="round" />
    
    {/* Brick pattern on forehead */}
    <rect x="13" y="9" width="6" height="2" fill="#DC2626" rx="0.3" />
    <rect x="12" y="11" width="3" height="1.5" fill="#DC2626" rx="0.2" />
    <rect x="17" y="11" width="3" height="1.5" fill="#DC2626" rx="0.2" />
    
    {/* Body */}
    <ellipse cx="16" cy="28" rx="6" ry="8" fill="#8B5CF6" />
    <ellipse cx="16" cy="28" rx="5" ry="7" fill="#A78BFA" />
    
    {/* Arms */}
    <ellipse cx="9" cy="25" rx="2.5" ry="4" fill="#8B5CF6" />
    <ellipse cx="23" cy="25" rx="2.5" ry="4" fill="#8B5CF6" />
    <circle cx="9" cy="29" r="2" fill="#A78BFA" />
    <circle cx="23" cy="29" r="2" fill="#A78BFA" />
    
    {/* Legs */}
    <ellipse cx="12" cy="36" rx="2" ry="3" fill="#8B5CF6" />
    <ellipse cx="20" cy="36" rx="2" ry="3" fill="#8B5CF6" />
    <ellipse cx="12" cy="38" rx="2.5" ry="1.5" fill="#A78BFA" />
    <ellipse cx="20" cy="38" rx="2.5" ry="1.5" fill="#A78BFA" />
    
    {/* Belly accent */}
    <ellipse cx="16" cy="28" rx="3" ry="5" fill="#C4B5FD" opacity="0.6" />
  </svg>
);

type Msg = { role: "user" | "assistant"; content: string };
type Tool = { name: "open"; page: string; params?: { id?: string; tab?: string; modal?: string } };

export default function AssistantBubble({
  userRole = "SELGER",
  activeCompanyId,
  userId,
}: { 
  userRole?: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED"; 
  activeCompanyId?: string;
  userId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hei! Jeg er AI Assistenten. Spør meg hvor du finner ting, eller hvordan du gjør noe – jeg kan også åpne riktig side for deg." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();
  const lastToolRef = useRef<Tool | null>(null);
  const [pendingTool, setPendingTool] = useState<any>(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [msgs, open]);

  // Listen for action events
  useEffect(() => {
    function onAction(e: CustomEvent) {
      const tool = e.detail as Tool;
      if (!tool) return;
      
      if (tool.name === "open" && tool.page) {
        // Convert hash routes to regular routes
        const route = tool.page.replace('#', '');
        setLocation(route);
        
        // Handle modal/tab params if needed
        if (tool.params?.modal) {
          // Dispatch event to open modal
          window.dispatchEvent(new CustomEvent("open:modal", { 
            detail: { modal: tool.params.modal, id: tool.params.id } 
          }));
        }
      }
    }
    
    window.addEventListener("assistant:action", onAction as EventListener);
    return () => window.removeEventListener("assistant:action", onAction as EventListener);
  }, [setLocation]);

  // Handle "ja/yes" responses to execute last tool
  useEffect(() => {
    const lower = input.trim().toLowerCase();
    if (["ja", "ja takk", "åpne", "gjør det", "please", "yes", "ok"].includes(lower) && lastToolRef.current) {
      window.dispatchEvent(new CustomEvent("assistant:action", { detail: lastToolRef.current }));
      setInput("");
      setMsgs(msgs => [...msgs, 
        { role: "user", content: input },
        { role: "assistant", content: "Åpner siden for deg!" }
      ]);
      lastToolRef.current = null;
    }
  }, [input]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: newMsgs,
          hints: { 
            role: userRole, 
            activeCompanyId: activeCompanyId || 'default-company',
            currentRoute: location,
            userId: userId
          }
        })
      });
      
      const data = await res.json();
      
      if (data?.tool) {
        lastToolRef.current = data.tool; // Remember last tool for "ja" responses
        if (data.tool.auto) {
          window.dispatchEvent(new CustomEvent("assistant:action", { detail: data.tool }));
        } else {
          setPendingTool(data.tool);
        }
      }
      
      if (data?.reply) {
        setMsgs(m => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setMsgs(m => [...m, { role: "assistant", content: "Beklager, noe gikk galt. Prøv igjen senere." }]);
    } finally {
      setLoading(false);
    }
  }

  // Contextual quick replies based on current route
  const quickReplies = ((): string[] => {
    const route = (location || "").toLowerCase();
    if (route.includes("cars")) return ["Hvordan justere pris?", "Hva betyr marginchippen?", "Lag lagret visning"];
    if (route.includes("contracts")) return ["Legg til innbytte", "Send til e-sign", "Eksporter PDF"];
    if (route.includes("customers")) return ["Opprett oppfølging", "Siste kontakt / Hot/Warm/Cold", "Åpne kundeprofil"];
    if (route.includes("activities")) return ["Hva betyr varsler?", "Hvordan løse aktivitet?", "Se oppfølginger"];
    if (route.includes("settings")) return ["Inviter bruker", "Endre rolle", "Se team"];
    return ["Hvor endrer jeg pris?", "Hvordan inviterer jeg bruker?", "Vis varsler/aktiviteter"];
  })();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 rounded-full px-5 py-3 shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:scale-105 flex items-center gap-2"
        aria-label="Åpne assistent"
        data-testid="assistant-bubble-button"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Hjelp</span>
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 flex flex-col">
          <div className="text-lg font-semibold mb-3 text-slate-900 dark:text-white flex items-center gap-2">
            <AIBear className="w-6 h-6" />
            AI Assistent
          </div>

          {/* Quick replies */}
          <div className="flex gap-2 flex-wrap mb-3">
            {quickReplies.map((q, i) => (
              <button
                key={i}
                className="text-xs rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                onClick={() => { 
                  setInput(q); 
                  setTimeout(() => {
                    const btn = document.querySelector('[data-testid="assistant-send-button"]') as HTMLButtonElement;
                    btn?.click();
                  }, 100);
                }}
                data-testid={`quick-reply-${i}`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3 min-h-[200px]">
            {msgs.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "assistant" 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Pending tool confirm button */}
          {pendingTool && (
            <div className="mb-3 flex justify-start">
              <button
                className="text-xs rounded-full px-3 py-1 bg-blue-500/80 hover:bg-blue-500 text-white transition-colors"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("assistant:action", { detail: pendingTool }));
                  setPendingTool(null);
                }}
                data-testid="assistant-confirm-button"
              >
                {pendingTool.label ?? "Åpne"}
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
            <input
              className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='Spør f.eks. "Hvor endrer jeg pris?"'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && send()}
              disabled={loading}
              data-testid="assistant-input"
            />
            <button 
              onClick={send} 
              disabled={loading || !input.trim()}
              className="rounded-xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-medium transition-colors"
              data-testid="assistant-send-button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}