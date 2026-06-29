"use client";

import { useState, useRef, useEffect } from "react";
import { useTenant } from "@/lib/tenant/TenantContext";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS_BY_SECTEUR: Record<string, string[]> = {
  examens: [
    "Quels sont mes 3 prospects prioritaires ?",
    "Pourquoi mon score BANT est-il faible ?",
    "Rédige un email de relance pour un IFSI",
    "Quels établissements dois-je rappeler aujourd'hui ?",
  ],
  conseil: [
    "Quels sont mes 3 clients à fort potentiel ?",
    "Comment améliorer mon taux de conversion ?",
    "Rédige une proposition pour une mission de conseil",
    "Quels clients dois-je relancer cette semaine ?",
  ],
  securite: [
    "Quels sites prioritaires dois-je cibler ?",
    "Analyse mon pipeline sécurité",
    "Rédige un email pour un directeur de site",
    "Quels prospects sont prêts à signer ?",
  ],
  btp: [
    "Quels chantiers dois-je prioriser ?",
    "Analyse mon pipeline travaux",
    "Rédige une offre pour un maître d'ouvrage",
    "Quels prospects sont en phase de décision ?",
  ],
  rh: [
    "Quelles entreprises ont le plus fort besoin RH ?",
    "Analyse mon pipeline recrutement",
    "Rédige un email pour un DRH",
    "Quels clients dois-je rappeler aujourd'hui ?",
  ],
};

export function CopiloteDrawer() {
  const { config } = useTenant();
  const accent = config.couleur;
  const suggestions = SUGGESTIONS_BY_SECTEUR[config.secteur] ?? SUGGESTIONS_BY_SECTEUR.examens;

  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Mode Décision : écouter les actions pré-remplies depuis les cartes prospect
  useEffect(() => {
    function onCopiloteOpen(e: Event) {
      const prefill = (e as CustomEvent<string>).detail;
      setOpen(true);
      if (prefill) setTimeout(() => send(prefill), 120);
    }
    window.addEventListener("copilote:open", onCopiloteOpen);
    return () => window.removeEventListener("copilote:open", onCopiloteOpen);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/copilote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, secteur: config.secteur }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        let detail = "";
        try { detail = JSON.parse(body).error ?? ""; } catch { detail = body.slice(0, 200); }
        throw new Error(detail || `Erreur API (${res.status})`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            const delta = parsed.delta?.text ?? "";
            if (delta) {
              assistantText += delta;
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected token") throw e;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Desktop floating button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full shadow-lg items-center justify-center text-white text-lg"
        style={{ background: accent }}
        aria-label="Copilote IA"
      >
        🤖
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Copilote IA JMC"
          className="fixed bottom-0 right-0 z-50 flex flex-col bg-white shadow-2xl
          w-full h-[88vh] rounded-t-2xl
          md:w-[420px] md:h-[620px] md:rounded-2xl md:bottom-20 md:right-6"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: accent }}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🤖</span>
              <div>
                <div className="text-[13px] font-bold text-white">Copilote JMC</div>
                <div className="text-[11px] text-white/70">Alimenté par Claude · {config.nom}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  aria-label="Effacer la conversation"
                  title="Nouvelle conversation"
                  className="text-[11px] text-white/60 hover:text-white border border-white/20 rounded-lg px-2 py-1 transition-colors"
                >
                  Effacer
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Fermer le copilote" className="text-white/70 hover:text-white text-xl leading-none">×</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-3 text-[12.5px] text-gray-600">
                  Bonjour ! Je suis votre copilote {config.nom}. Posez-moi n&apos;importe quelle question sur votre pipeline, vos {config.vocabulaire.ressource.toLowerCase()}s ou vos priorités.
                </div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suggestions</div>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-700 transition-colors hover:bg-gray-50"
                      style={{ borderColor: "inherit" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.backgroundColor = `${accent}10`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.backgroundColor = ""; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-xl text-[12.5px] leading-relaxed whitespace-pre-wrap
                  ${m.role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                  style={m.role === "user" ? { background: accent } : {}}
                >
                  {m.content || <span className="opacity-50">…</span>}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-3 py-2.5 text-[12.5px] text-gray-400">…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Posez votre question…"
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] outline-none disabled:opacity-50"
                onFocus={(e) => { e.currentTarget.style.borderColor = accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="px-3 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40"
                style={{ background: accent }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
