"use client";

import { useState, useTransition } from "react";
import { getEmailLogs } from "@/app/actions/emails";

type Log = { id: string; type: string; subject: string; sent_at: string; status: string };

const typeLabels: Record<string, string> = {
  j0: "J+0", j3: "J+3", j7: "J+7", j15: "J+15",
};

const statusColors: Record<string, string> = {
  sent: "bg-green-50 text-green-600",
  simulated: "bg-gray-100 text-gray-500",
  failed: "bg-red-50 text-red-500",
};

export function EmailHistoryButton({ prospectId, prospectNom }: { prospectId: string; prospectNom: string }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (!loaded) {
      startTransition(async () => {
        const data = await getEmailLogs(prospectId);
        setLogs(data as Log[]);
        setLoaded(true);
      });
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[11px] text-gray-400 hover:text-[#1a6b7e] hover:underline"
      >
        Historique
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[14px] font-bold text-gray-900">Historique emails</div>
                <div className="text-[11.5px] text-gray-400">{prospectNom}</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            {!loaded ? (
              <div className="py-8 text-center text-[13px] text-gray-400">Chargement…</div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-gray-400">Aucun email envoyé pour ce prospect.</div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <span className="text-[11px] font-bold text-white bg-[#1a6b7e] px-2 py-0.5 rounded-full flex-shrink-0">
                      {typeLabels[log.type] ?? log.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-gray-800 truncate">{log.subject}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(log.sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[log.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {log.status === "sent" ? "Envoyé" : log.status === "simulated" ? "Simulé" : "Erreur"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
