import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, MessageCircle } from "lucide-react";

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
    { role: "assistant", content: "Hei! Jeg er ForhandlerPRO-assistenten. Spør meg hvor du finner ting, eller hvordan du gjør noe – jeg kan også åpne riktig side for deg." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();
  const lastToolRef = useRef<Tool | null>(null);

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
        window.dispatchEvent(new CustomEvent("assistant:action", { detail: data.tool }));
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
            <MessageCircle className="w-5 h-5 text-blue-600" />
            ForhandlerPRO-assistent
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