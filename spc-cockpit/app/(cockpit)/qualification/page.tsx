import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge } from "@/components/Badge";
import { clusterScores } from "@/lib/data";
import { getProspects } from "@/lib/supabase/queries";
import { ProspectStatutSelect, ProspectNotesInput } from "@/components/ProspectCRM";

export default async function QualificationPage() {
  const prospects = await getProspects();
  const emLyon = prospects[0];
  const autresProspects = prospects.slice(1);
  const tresChaudes = prospects.filter((p) => p.niveau === "Très chaud").length;

  return (
    <>
      <Topbar context="Qualification BANT" title="Analyse Go / No-Go" badge={`${tresChaudes} Très chaud`} badgeColor="orange" />

      <main className="flex-1 overflow-y-auto p-5">
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
                { label: "Budget", score: 2.5, max: 2.5, icon: "💰" },
                { label: "Autorité", score: 2.5, max: 2.5, icon: "👤" },
                { label: "Besoin", score: 2.5, max: 2.5, icon: "🎯" },
                { label: "Timing", score: 2.5, max: 2.5, icon: "⏱" },
              ].map((b) => (
                <div key={b.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg mb-1">{b.icon}</div>
                  <div className="text-[18px] font-extrabold text-[#1a6b7e]">{b.score}</div>
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">/{b.max}</div>
                  <div className="text-[11px] font-semibold text-gray-600 mt-1">{b.label}</div>
                </div>
              ))}
            </div>

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
              <div className="text-[12.5px] font-semibold text-[#1a6b7e] mb-2.5 flex items-center gap-1.5">
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

            <div className="bg-[#1a6b7e] rounded-xl p-4">
              <div className="text-[12px] text-white/70 mb-1">Prochaine étape recommandée</div>
              <div className="text-[13.5px] font-bold text-white">Appel sortant — Lundi matin</div>
              <div className="text-[12px] text-white/80 mt-1.5 leading-snug">Demander le responsable des examens · Script : segment Commerce · Proposer audit gratuit 30 min.</div>
              <Link href="/planning" className="mt-3 w-full bg-white/[0.15] hover:bg-white/[0.25] text-white text-[12px] font-semibold py-2 rounded-lg transition-colors flex items-center justify-center">
                Lancer le script d&apos;appel →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom: prospects table + cluster scores */}
        <div className="grid grid-cols-[1fr_220px] gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-gray-900">Top prospects — Vague 1</span>
              <span className="text-[12px] text-gray-400">{prospects.length} prospects chargés</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["#", "Établissement", "Segment", "Score", "Statut", "Action"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10.5px] font-semibold text-gray-500 uppercase tracking-[.5px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p, i) => (
                    <tr key={p.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${i === 0 ? "bg-[#1a6b7e]/[0.03]" : ""}`}>
                      <td className="px-3 py-2.5 text-[12px] font-bold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12.5px] font-semibold text-gray-800">{p.nom}</div>
                        <div className="text-[11px] text-gray-400">{p.cluster}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-600">{p.segment}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1a6b7e] rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%` }} />
                          </div>
                          <span className="text-[12px] font-bold text-gray-800">{p.scoreBANT}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <ProspectStatutSelect id={p.id} statut={p.statut} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Link href="/planning" className="text-[11.5px] text-[#4a90d9] hover:underline">{p.action}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                        background: c.score >= 9.5 ? "#1a6b7e" : c.score >= 9 ? "#4a90d9" : "#a0aec0"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-[11px] text-gray-400 mb-1">Meilleur cluster</div>
              <div className="text-[13px] font-bold text-[#1a6b7e]">Lyon / Rhône-Alpes</div>
              <div className="text-[11px] text-gray-500">EM Lyon · IFSI CHU · Grenoble EM</div>
            </div>
          </div>
        </div>
      </main>

      <ConseilBar text="EM Lyon, IFSI CHU Lyon, Kedge Bordeaux : 3 prospects à 10/10 — démarrer les appels lundi matin pour maximiser le taux de conversion Vague 1." />
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
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1a6b7e" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
      <text x={cx} y={cy - 12} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: "#1a202c" }}>{score}</text>
      <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 10, fill: "#718096" }}>SCORE BANT / 10</text>
      <text x={cx - r - 2} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: "#a0aec0" }}>0</text>
      <text x={cx + r + 2} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: "#a0aec0" }}>10</text>
    </svg>
  );
}
