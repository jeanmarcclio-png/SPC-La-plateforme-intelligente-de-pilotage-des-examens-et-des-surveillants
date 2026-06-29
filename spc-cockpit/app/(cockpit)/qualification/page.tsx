export const dynamic = "force-dynamic";

import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge } from "@/components/Badge";
import { getProspects, getClusterScores } from "@/lib/supabase/queries";
import { ProspectStatutSelect, ProspectNotesInput } from "@/components/ProspectCRM";
import { ProspectFilteredTable } from "@/components/ProspectFilteredTable";
import { MobileProspectList } from "@/components/MobileProspectList";
import { AddProspectButton } from "@/components/AddProspectModal";
import { ModeDecisionButtons } from "@/components/ModeDecisionButtons";
import { LancerScriptButton } from "@/components/LancerScriptButton";
import { ProspectKanban } from "@/components/ProspectKanban";

export default async function QualificationPage() {
  const [prospects, clusterScores] = await Promise.all([getProspects(), getClusterScores()]);
  if (!prospects.length) {
    return (
      <main className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
        <div>
          <div className="text-4xl mb-3">📋</div>
          <div className="text-[15px] font-semibold text-gray-600">Aucun prospect</div>
          <div className="text-[13px] mt-1">Ajoutez des prospects pour commencer la qualification BANT.</div>
        </div>
      </main>
    );
  }
  const emLyon = prospects[0];
  const tresChaudes = prospects.filter((p) => p.niveau === "Très chaud").length;

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Qualification BANT" title="Analyse Go / No-Go" badge={`${tresChaudes} Très chaud`} badgeColor="orange" />
      </div>

      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
            <div className="text-[22px] font-extrabold text-white">Qualification BANT</div>
            <div className="text-[13px] text-white/70 mt-0.5">{tresChaudes} très chaud · {prospects.length} prospects</div>
          </div>
          <div className="p-4 space-y-3">
            {/* Hero prospect */}
            <div className="bg-white rounded-2xl border border-[var(--color-primary)]/30 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[11px] text-gray-400 mb-0.5">Priorité A · Vague 1</div>
                  <div className="text-[18px] font-extrabold text-gray-900">{emLyon.nom}</div>
                  <div className="text-[12px] text-gray-500">{emLyon.segment} · {emLyon.cluster}</div>
                </div>
                <Badge variant="tres-chaud">{emLyon.niveau}</Badge>
              </div>
              {/* BANT score ring */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#edf2f7" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-primary)" strokeWidth="3.5"
                      strokeDasharray={`${(emLyon.scoreBANT / 10) * 100} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[17px] font-extrabold text-gray-900">{emLyon.scoreBANT}</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Budget", icon: "💰", score: emLyon.bant?.budget, estimated: !emLyon.bant },
                    { label: "Autorité", icon: "👤", score: emLyon.bant?.autorite, estimated: !emLyon.bant },
                    { label: "Besoin", icon: "🎯", score: emLyon.bant?.besoin, estimated: !emLyon.bant },
                    { label: "Timing", icon: "⏱", score: emLyon.bant?.timing, estimated: !emLyon.bant },
                  ].map((b) => (
                    <div key={b.label} className={`rounded-lg px-2 py-1.5 text-center ${b.estimated ? "bg-gray-50/70" : "bg-gray-50"}`}>
                      <span className="text-[11px]">{b.icon}</span>
                      <div className="text-[11px] text-gray-400">{b.label}</div>
                      {b.estimated || b.score === undefined
                        ? <div className="text-[11px] font-semibold text-gray-300 mt-0.5">—</div>
                        : <div className="text-[13px] font-extrabold text-[var(--color-primary)]">{b.score}</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
              {emLyon.bant === undefined && (
                <div className="text-[11px] text-gray-400 text-center mb-2 -mt-1">
                  Sous-scores non renseignés — à compléter dans la fiche prospect
                </div>
              )}

              <div className="mb-3">
                <ModeDecisionButtons prospect={emLyon} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px] mb-3 pt-3 border-t border-gray-100">
                <div><div className="text-gray-400 mb-0.5">Interlocuteur</div><div className="font-semibold text-gray-700">{emLyon.interlocuteur}</div></div>
                <div><div className="text-gray-400 mb-0.5">Canal</div><div className="font-semibold text-gray-700">{emLyon.canal}</div></div>
              </div>
              {/* Statut + Notes inline sur mobile */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-[12px]">
                <div>
                  <div className="text-gray-400 mb-1">Statut</div>
                  <ProspectStatutSelect id={emLyon.id} statut={emLyon.statut} />
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Notes</div>
                  <ProspectNotesInput id={emLyon.id} notes={emLyon.notes} />
                </div>
              </div>
            </div>

            {/* Points forts / risques */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                <div className="text-[11px] font-bold text-red-600 mb-2">⚠ Risques</div>
                {["Interlocuteur non nominatif", "Cycle décision long", "Prestataire sortant"].map((r, i) => (
                  <div key={i} className="text-[11px] text-gray-600 py-1 border-b border-red-100/50 last:border-0">· {r}</div>
                ))}
              </div>
              <div className="bg-teal-50 rounded-2xl p-3 border border-teal-100">
                <div className="text-[11px] font-bold text-[var(--color-primary)] mb-2">✓ Points forts</div>
                {["1 200+ étudiants", "Budget confirmé", "Tiers-temps non géré", "Réseau CHU x4"].map((p, i) => (
                  <div key={i} className="text-[11px] text-gray-600 py-1 border-b border-teal-100/50 last:border-0">· {p}</div>
                ))}
              </div>
            </div>

            {/* Prospects list mobile */}
            <MobileProspectList prospects={prospects} />
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
        {/* Top: Selected prospect hero + BANT sub-scores */}
        <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">
          {/* Hero card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] text-gray-400 mb-1">Prospect priorité A · Vague 1</div>
                <div className="text-[20px] font-extrabold text-gray-900">{emLyon.nom}</div>
                <div className="text-[13px] text-gray-500 mt-0.5">{emLyon.segment} · {emLyon.cluster}</div>
              </div>
              <Badge variant="tres-chaud">{emLyon.niveau}</Badge>
            </div>

            {/* BANT gauge */}
            <div className="flex flex-col items-center my-4">
              <BANTGauge score={emLyon.scoreBANT} />
            </div>

            {/* BANT breakdown */}
            <div className="grid grid-cols-4 gap-3 mt-2">
              {[
                { label: "Budget", score: emLyon.bant?.budget, max: 2.5, icon: "💰" },
                { label: "Autorité", score: emLyon.bant?.autorite, max: 2.5, icon: "👤" },
                { label: "Besoin", score: emLyon.bant?.besoin, max: 2.5, icon: "🎯" },
                { label: "Timing", score: emLyon.bant?.timing, max: 2.5, icon: "⏱" },
              ].map((b) => (
                <div key={b.label} className={`rounded-lg p-3 text-center ${b.score === undefined ? "bg-gray-50/60 border border-dashed border-gray-200" : "bg-gray-50"}`}>
                  <div className="text-lg mb-1">{b.icon}</div>
                  {b.score !== undefined
                    ? <><div className="text-[18px] font-extrabold text-[var(--color-primary)]">{b.score}</div><div className="text-[11px] text-gray-400 uppercase tracking-wide mt-0.5">/{b.max}</div></>
                    : <div className="text-[13px] font-semibold text-gray-300 mt-1">—</div>
                  }
                  <div className="text-[11px] font-semibold text-gray-600 mt-1">{b.label}</div>
                </div>
              ))}
            </div>
            {!emLyon.bant && (
              <div className="text-[11px] text-gray-400 mt-2 text-center">
                Sous-scores BANT non renseignés — à compléter dans la fiche prospect
              </div>
            )}

            {/* Contact info */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-gray-400 mb-0.5">Interlocuteur</div>
                <div className="font-semibold text-gray-700">{emLyon.interlocuteur}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Canal prioritaire</div>
                <div className="font-semibold text-gray-700">{emLyon.canal}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Statut</div>
                <ProspectStatutSelect id={emLyon.id} statut={emLyon.statut} />
              </div>
            </div>

            {/* Notes */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[11px] text-gray-400 mb-1.5">Notes</div>
              <ProspectNotesInput id={emLyon.id} notes={emLyon.notes} />
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[12.5px] font-semibold text-red-600 mb-2.5 flex items-center gap-1.5">
                <span>⚠</span> Risques majeurs
              </div>
              {[
                "Interlocuteur non nominatif — risque de filtrage par secrétariat",
                "Cycle de décision long (3 semaines) si consultation interne",
                "Présence d'un prestataire sortant non identifié",
              ].map((r, i) => (
                <div key={i} className="text-[12px] text-gray-600 py-1.5 border-b border-gray-100 last:border-0 leading-snug">
                  · {r}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[12.5px] font-semibold text-[var(--color-primary)] mb-2.5 flex items-center gap-1.5">
                <span>✓</span> Points forts
              </div>
              {[
                "Volume élevé (1 200+ étudiants · 3 sessions/an)",
                "Budget formation confirmé en interne",
                "Tiers-temps non géré actuellement",
                "Réseau CHU : référence duplicable sur 4 villes",
              ].map((p, i) => (
                <div key={i} className="text-[12px] text-gray-600 py-1.5 border-b border-gray-100 last:border-0 leading-snug">
                  · {p}
                </div>
              ))}
            </div>

            <div className="bg-[var(--color-primary)] rounded-xl p-4">
              <div className="text-[12px] text-white/70 mb-1">Prochaine étape recommandée</div>
              <div className="text-[13.5px] font-bold text-white">Appel sortant — Lundi matin</div>
              <div className="text-[12px] text-white/80 mt-1.5 leading-snug">Demander le responsable des examens · Script : segment Commerce · Proposer audit gratuit 30 min.</div>
              <LancerScriptButton prospect={emLyon} />
            </div>
          </div>
        </div>

        {/* Kanban pipeline view — HubSpot inspired */}
        <ProspectKanban prospects={prospects} />

        {/* Bottom: prospects table + cluster scores */}
        <div className="grid grid-cols-[1fr_220px] gap-4">
          <div>
            <ProspectFilteredTable prospects={prospects} />
          </div>

          {/* Cluster scores */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 self-start">
            <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Scores par cluster</div>
            <div className="space-y-3">
              {clusterScores.map((c) => (
                <div key={c.nom}>
                  <div className="flex justify-between text-[11.5px] text-gray-600 mb-1">
                    <span>{c.nom}</span>
                    <span className="font-bold text-gray-800">{c.score}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(c.score / 10) * 100}%`,
                        background: c.score >= 9.5 ? "var(--color-primary)" : c.score >= 9 ? "#4a90d9" : "#a0aec0"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-[11px] text-gray-400 mb-1">Meilleur cluster</div>
              <div className="text-[13px] font-bold text-[var(--color-primary)]">Lyon / Rhône-Alpes</div>
              <div className="text-[11px] text-gray-500">EM Lyon · IFSI CHU · Grenoble EM</div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <div className="hidden md:block">
        <ConseilBar text="EM Lyon, IFSI CHU Lyon, Kedge Bordeaux : 3 prospects à 10/10 — démarrer les appels lundi matin pour maximiser le taux de conversion Vague 1." />
      </div>
    </>
  );
}

function BANTGauge({ score }: { score: number }) {
  const r = 52, cx = 70, cy = 70;
  const circumference = Math.PI * r;
  const dash = (score / 10) * circumference;

  return (
    <svg viewBox="0 0 140 82" className="w-[180px] h-[105px]">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#edf2f7" strokeWidth="16" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--color-primary)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
      <text x={cx} y={cy - 12} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: "#1a202c" }}>{score}</text>
      <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 10, fill: "#718096" }}>SCORE BANT / 10</text>
      <text x={cx - r - 2} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: "#a0aec0" }}>0</text>
      <text x={cx + r + 2} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: "#a0aec0" }}>10</text>
    </svg>
  );
}
