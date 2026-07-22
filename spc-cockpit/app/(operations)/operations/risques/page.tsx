export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/ops/shell";
import { Kpi } from "@/components/ops/Kpi";
import { RisqueNarrative } from "@/components/ops/RisqueNarrative";
import { getPlanningRiskReport } from "@/lib/agents/planning-risk/tools";
import type { RiskSeverity } from "@/lib/operations/engine/risk";
import { ShieldAlert, AlertTriangle, Info, CircleCheck } from "lucide-react";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const SEV_STYLE: Record<RiskSeverity, { border: string; chip: string; label: string }> = {
  critique: { border: "border-l-red-500", chip: "bg-red-50 text-red-600", label: "Critique" },
  avertissement: { border: "border-l-amber-400", chip: "bg-amber-50 text-amber-700", label: "Avertissement" },
  information: { border: "border-l-blue-400", chip: "bg-blue-50 text-blue-600", label: "Information" },
};

export default async function RisquesPage() {
  const today = todayISO();
  const report = await getPlanningRiskReport(null, today);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader
        page="Risques IA"
        title="Auditeur de risques planning"
        subtitle="Analyse lecture seule des risques opérationnels de la session active — détection déterministe, explication IA facultative"
      />

      {/* Bandeau lecture seule */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-[12.5px] text-indigo-800">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" aria-hidden />
        Agent <strong>lecture seule</strong> — il détecte, explique et recommande. Il ne crée, ne modifie et ne valide jamais rien : toute correction reste une décision humaine.
      </div>

      {!report.mission ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-10 text-center text-[13px] text-gray-400">
          Aucune session active à analyser.
        </div>
      ) : (
        <>
          {/* Récapitulatif */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            <Kpi variant="vivid" label="Session analysée" value={report.mission.client} sub={`${report.mission.reference} · ${report.mission.date}`} accent="slate" truncate />
            <Kpi variant="vivid" label="Critiques" value={String(report.counts.critique)} sub="à traiter en priorité" accent="red" />
            <Kpi variant="vivid" label="Avertissements" value={String(report.counts.avertissement)} sub="à surveiller" accent="amber" />
            <Kpi variant="vivid" label="Informations" value={String(report.counts.information)} sub="pour information" accent="cyan" />
          </div>

          <div className="grid lg:grid-cols-5 gap-5 items-start">
            {/* Liste des risques déterministes */}
            <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
                <h2 className="text-[14px] font-bold text-gray-900">Risques détectés</h2>
                <p className="text-[12px] text-gray-400">Calcul déterministe depuis les affectations réelles</p>
              </div>
              <div className="p-4 space-y-2.5 max-h-[620px] overflow-y-auto">
                {report.risks.length === 0 ? (
                  <div className="flex items-center gap-2 text-[13px] text-emerald-600 px-2 py-6 justify-center">
                    <CircleCheck className="w-4 h-4" aria-hidden /> Aucun risque détecté sur cette session.
                  </div>
                ) : (
                  report.risks.map((r, i) => {
                    const st = SEV_STYLE[r.severity];
                    return (
                      <div key={i} className={`rounded-xl border border-gray-200/70 border-l-[3px] ${st.border} px-4 py-3`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide rounded px-1.5 py-0.5 ${st.chip}`}>{st.label}</span>
                          <span className="text-[11px] text-gray-400">{r.entities.join(" · ")}</span>
                        </div>
                        <div className="text-[13px] font-bold text-gray-900">{r.title}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">{r.detail}</div>
                        <div className="flex items-start gap-1.5 text-[12px] text-gray-600 mt-1.5">
                          {r.severity === "information" ? <Info className="w-3.5 h-3.5 mt-0.5 text-blue-400" aria-hidden /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500" aria-hidden />}
                          <span><strong>Reco :</strong> {r.recommendation} <span className="text-gray-400">(validation humaine requise)</span></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Narratif IA */}
            <div className="lg:col-span-2">
              <RisqueNarrative todayISO={today} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

