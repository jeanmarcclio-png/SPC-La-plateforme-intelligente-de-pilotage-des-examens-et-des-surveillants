"use client";

import { useState, useTransition } from "react";
import { sendProspectEmail } from "@/app/actions/emails";

export function EmailSequenceButton({ prospectId, prospectNom, email }: { prospectId: string; prospectNom: string; email?: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sequences = [
    { label: "Email J+0 — Premier contact", type: "j0" },
    { label: "Relance J+3 — Suivi", type: "j3" },
    { label: "Relance J+7 — Valeur ajoutée", type: "j7" },
    { label: "Relance J+15 — Dernière tentative", type: "j15" },
  ];

  function handleSend(type: string) {
    setError("");
    startTransition(async () => {
      try {
        await sendProspectEmail(prospectId, type);
        setSent(true);
        setTimeout(() => { setSent(false); setOpen(false); }, 2000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur d'envoi");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-[#4a90d9] hover:text-[var(--color-primary)] hover:underline"
      >
        Email →
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] max-w-[95vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-bold text-gray-900">Envoyer un email</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="text-[12px] text-gray-500 mb-4">
              Prospect : <span className="font-semibold text-gray-800">{prospectNom}</span>
              {email && <><br /><span className="text-[11px]">{email}</span></>}
            </div>
            {sent ? (
              <div className="text-center py-4 text-green-600 font-semibold text-[13px]">Email envoyé ✓</div>
            ) : (
              <div className="space-y-2">
                {sequences.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => handleSend(s.type)}
                    disabled={pending}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-xl hover:border-[#4a90d9] hover:bg-blue-50 transition-colors disabled:opacity-50 group"
                  >
                    <div className="text-[12.5px] font-semibold text-gray-800 group-hover:text-[var(--color-primary)]">{s.label}</div>
                  </button>
                ))}
              </div>
            )}
            {error && <div className="mt-3 text-[11px] text-red-500">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
