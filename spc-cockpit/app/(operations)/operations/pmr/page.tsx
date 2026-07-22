export const dynamic = "force-dynamic";

import { getAmenagements, getSalles, getSurveillants } from "@/lib/operations/queries";
import { PMRBoard } from "@/components/ops/PMRBoard";
import { Kpi } from "@/components/ops/Kpi";
import { Accessibility, DoorOpen, Clock } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function PMRPage() {
  const [amenagements, salles, surveillants] = await Promise.all([
    getAmenagements(), getSalles(), getSurveillants(),
  ]);

  const sallesDediees = salles.filter((s) => s.pmr || s.tiersTemps);
  const tiersTemps = amenagements.filter((a) => a.tiersTemps).length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="PMR & Tiers-temps" title="PMR &amp; Tiers-temps" subtitle="Gestion des aménagements pour étudiants à besoins spécifiques" />

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="indigo" label="Étudiants PMR/TT" value={String(amenagements.length)} sub="aménagements suivis" icon={<Accessibility className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="cyan" label="Salles dédiées" value={String(sallesDediees.length)} sub="équipées PMR ou tiers-temps" icon={<DoorOpen className="w-4 h-4" />} href="/operations/salles" />
        <Kpi variant="vivid" accent="amber" label="Temps additionnel" value={`${tiersTemps}/3`} sub="étudiants en durée majorée" icon={<Clock className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <PMRBoard amenagements={amenagements} surveillants={surveillants} />
        </div>

        {/* Salles aménagées */}
        <section aria-label="Salles aménagées" className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 self-start">
          <h2 className="text-[14px] font-bold text-gray-900 mb-4">Salles aménagées</h2>
          {sallesDediees.length === 0 ? (
            <p className="text-[12.5px] text-gray-400">Aucune salle marquée PMR ou tiers-temps — configurez-les dans la page Salles.</p>
          ) : (
            <div className="space-y-3">
              {sallesDediees.map((s) => (
                <div key={s.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
                  <span aria-hidden className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Accessibility className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">{s.nom}</div>
                    <div className="text-[11.5px] text-gray-400">{s.batiment} · {s.etudiants} étud.</div>
                    <div className="flex gap-1.5 mt-1.5">
                      {s.pmr && <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">PMR</span>}
                      {s.tiersTemps && <span className="text-[10px] font-bold uppercase bg-sky-50 text-sky-600 rounded px-1.5 py-0.5">Tiers-temps</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
