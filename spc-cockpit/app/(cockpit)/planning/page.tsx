export const dynamic = "force-dynamic";

import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getEcheances } from "@/lib/supabase/queries";
import { AddEcheanceButton, EcheanceActions } from "@/components/EcheanceModal";

type Slot = "Aujourd'hui" | "Demain" | "Cette semaine" | "Semaine prochaine" | "Plus tard" | "Passé";

function parseEcheanceDate(dateStr: string): Date {
  const parts = dateStr.split("/");
  if (parts.length >= 2) {
    const day   = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year  = parts.length >= 3 ? parseInt(parts[2]) : new Date().getFullYear();
    return new Date(year, month, day);
  }
  return new Date();
}

function getSlot(dateStr: string): Slot {
  const d = parseEcheanceDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return "Passé";
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff <= 7)  return "Cette semaine";
  if (diff <= 14) return "Semaine prochaine";
  return "Plus tard";
}

const SLOT_ORDER: Slot[] = ["Aujourd'hui", "Demain", "Cette semaine", "Semaine prochaine", "Plus tard", "Passé"];

const SLOT_IA: Record<Slot, string> = {
  "Aujourd'hui":       "Actions à traiter maintenant — ne pas remettre à demain.",
  "Demain":            "Préparer ces relances ce soir pour être opérationnel demain matin.",
  "Cette semaine":     "Bloquer du temps avant vendredi pour ne pas dépasser ces échéances.",
  "Semaine prochaine": "Planifier dès maintenant — les délais BANT approchent.",
  "Plus tard":         "Surveiller l'évolution des campagnes pour anticiper ces actions.",
  "Passé":             "Échéances passées — vérifier si elles ont bien été traitées.",
};

const SLOT_COLOR: Record<Slot, { bg: string; border: string; label: string; dot: string }> = {
  "Aujourd'hui":       { bg: "bg-red-50",    border: "border-red-200",    label: "text-red-700",    dot: "bg-red-500" },
  "Demain":            { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-700", dot: "bg-orange-500" },
  "Cette semaine":     { bg: "bg-blue-50",   border: "border-blue-200",   label: "text-blue-700",   dot: "bg-blue-500" },
  "Semaine prochaine": { bg: "bg-teal-50",   border: "border-teal-200",   label: "text-teal-700",   dot: "bg-teal-500" },
  "Plus tard":         { bg: "bg-gray-50",   border: "border-gray-200",   label: "text-gray-600",   dot: "bg-gray-400" },
  "Passé":             { bg: "bg-gray-50",   border: "border-gray-100",   label: "text-gray-400",   dot: "bg-gray-300" },
};

export default async function PlanningPage() {
  const echeances = await getEcheances();
  const urgentes  = echeances.filter((e) => e.urgent).length;

  const grouped: Record<Slot, typeof echeances> = {
    "Aujourd'hui": [], "Demain": [], "Cette semaine": [],
    "Semaine prochaine": [], "Plus tard": [], "Passé": [],
  };
  for (const e of echeances) {
    grouped[getSlot(e.date)].push(e);
  }

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Planning" title="Calendrier opérationnel" badge={urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""}` : undefined} badgeColor="red" />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[22px] font-extrabold text-white">Planning</div>
                <div className="text-[13px] text-white/70 mt-0.5">{urgentes > 0 ? `${urgentes} échéance${urgentes > 1 ? "s" : ""} urgente${urgentes > 1 ? "s" : ""}` : "Calendrier opérationnel"}</div>
              </div>
              <AddEcheanceButton />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {echeances.length === 0 && (
              <div className="text-center py-12 text-[13px] text-gray-400">Aucune échéance.</div>
            )}
            {SLOT_ORDER.map((slot) => {
              const items = grouped[slot];
              if (!items.length) return null;
              const c = SLOT_COLOR[slot];
              return (
                <div key={slot}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                    <span className={`text-[12px] font-bold uppercase tracking-[0.8px] ${c.label}`}>{slot}</span>
                    <span className="text-[11px] text-gray-400 ml-auto">{items.length}</span>
                  </div>
                  {/* IA hint */}
                  <div className={`text-[11.5px] ${c.label} opacity-70 mb-2 pl-4 italic`}>{SLOT_IA[slot]}</div>
                  <div className="space-y-2">
                    {items.map((e) => (
                      <div key={e.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${e.urgent ? "border-red-200 bg-red-50" : `${c.border} bg-white`}`}>
                        <div className="w-11 text-center flex-shrink-0">
                          <div className={`text-[16px] font-extrabold ${e.urgent ? "text-red-600" : "text-[#1a6b7e]"}`}>{e.date.split(" ")[0]}</div>
                          <div className="text-[9.5px] text-gray-400">{e.date.split(" ").slice(1).join(" ")}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-800 truncate">{e.nom}</div>
                          <span className={`text-[11px] font-semibold ${e.urgent ? "text-red-500" : "text-[#4a90d9]"}`}>{e.tag}</span>
                        </div>
                        {e.urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">URGENT</span>}
                        <EcheanceActions echeance={e} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-semibold text-gray-900">Timeline IA — Échéances groupées</span>
            <AddEcheanceButton />
          </div>
          <div className="space-y-4">
            {echeances.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-[13px] text-gray-400">
                Aucune échéance. Cliquez sur &quot;+ Ajouter&quot; pour commencer.
              </div>
            )}
            {SLOT_ORDER.map((slot) => {
              const items = grouped[slot];
              if (!items.length) return null;
              const c = SLOT_COLOR[slot];
              return (
                <div key={slot} className={`rounded-xl border ${c.border} overflow-hidden`}>
                  {/* Section header */}
                  <div className={`${c.bg} px-4 py-3 flex items-center gap-3 border-b ${c.border}`}>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    <span className={`text-[12.5px] font-bold uppercase tracking-[1px] ${c.label}`}>{slot}</span>
                    <span className="text-[11.5px] text-gray-400 flex-1 ml-1">· {SLOT_IA[slot]}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/60 ${c.label}`}>
                      {items.length} action{items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Items */}
                  <div className="bg-white divide-y divide-gray-100">
                    {items.map((e) => (
                      <div key={e.id} className={`group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${e.urgent ? "bg-red-50/30" : ""}`}>
                        <span className={`text-[15px] font-extrabold min-w-[52px] ${e.urgent ? "text-red-600" : "text-gray-700"}`}>{e.date}</span>
                        <span className="text-[13px] text-gray-700 flex-1">{e.nom}</span>
                        <span className={`text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full ${e.urgent ? "bg-red-100 text-red-600" : "bg-blue-50 text-[#4a90d9]"}`}>{e.tag}</span>
                        {e.urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">URGENT</span>}
                        <EcheanceActions echeance={e} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
      <div className="hidden md:block">
        <ConseilBar text="Deadline Fin Vague 1 IDF dans 4 jours. Concentrez vos appels sur les prospects A non contactés cette semaine." />
      </div>
    </>
  );
}
