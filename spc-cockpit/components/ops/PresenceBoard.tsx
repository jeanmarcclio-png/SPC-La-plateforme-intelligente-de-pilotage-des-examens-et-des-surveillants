"use client";

import { useTransition } from "react";
import type { Affectation, Surveillant, Presence } from "@/lib/operations/types";
import { setPresence } from "@/app/actions/affectations";
import { showToast } from "@/components/Toast";
import { CheckCircle2, XCircle } from "lucide-react";

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

export function PresenceBoard({
  affectations,
  surveillants,
}: {
  affectations: Affectation[];
  surveillants: Surveillant[];
}) {
  const [pending, startTransition] = useTransition();
  const survById = new Map(surveillants.map((s) => [s.id, s]));
  const confirmes = affectations.filter((a) => a.presence !== "En attente").length;

  function marquer(a: Affectation, presence: Presence) {
    const nom = survById.get(a.surveillantId)?.nom ?? "surveillant";
    startTransition(async () => {
      const result = await setPresence(a.id, presence);
      if (result.error) showToast(result.error, "error");
      else showToast(`${nom} : ${presence.toLowerCase()}`);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-gray-900">Émargement de l&apos;équipe</h2>
        <span className="text-[11px] font-bold border border-gray-200 text-gray-500 rounded-full px-2.5 py-1">
          {confirmes}/{affectations.length} confirmés
        </span>
      </div>
      {affectations.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-gray-400">Aucun surveillant affecté à la session active.</p>
      ) : (
        <div>
          {affectations.map((a, i) => {
            const s = survById.get(a.surveillantId);
            const p = a.presence;
            return (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 transition-colors ${
                  p === "Présent" ? "bg-emerald-50/40" : p === "Absent" ? "bg-red-50/40" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11.5px] font-bold text-white flex-shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {(s?.nom ?? "??").split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-gray-900 truncate">{s?.nom ?? `Surveillant #${a.surveillantId}`}</div>
                    <div className="text-[11.5px] text-gray-400">{a.roleMission ?? s?.role ?? ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className={`text-[12px] font-bold ${p === "Présent" ? "text-emerald-600" : p === "Absent" ? "text-red-500" : "text-gray-400"}`}>
                    {p}
                  </span>
                  <button
                    onClick={() => marquer(a, "Présent")}
                    disabled={pending}
                    aria-pressed={p === "Présent"}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-bold border transition-colors disabled:opacity-40 ${
                      p === "Présent"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                    Présent
                  </button>
                  <button
                    onClick={() => marquer(a, "Absent")}
                    disabled={pending}
                    aria-pressed={p === "Absent"}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-bold border transition-colors disabled:opacity-40 ${
                      p === "Absent"
                        ? "bg-red-500 border-red-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-500"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden />
                    Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
