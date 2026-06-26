export const dynamic = "force-dynamic";

import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge } from "@/components/Badge";
import { getCampagnes, getLivrables } from "@/lib/supabase/queries";
import { CampagneStatutSelect, AddCampagneButton } from "@/components/CampagneActions";
import { computeCampagneHealth } from "@/lib/ai/engine";

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const clockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

export default async function CampagnesPage() {
  const campagnes = await getCampagnes();
  const activeCampagne = campagnes.find((c) => c.statut === "Actif" || c.statut === "En cours") ?? campagnes[0];
  const [livraisonIDF, healthMap] = await Promise.all([
    activeCampagne ? getLivrables(activeCampagne.id) : Promise.resolve([]),
    Promise.resolve(Object.fromEntries(campagnes.map((c) => [c.id, computeCampagneHealth(c)]))),
  ]);
  const validated = livraisonIDF.filter((l) => l.statut === "Validé").length;
  const total = livraisonIDF.length;
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Prospection B2B" title="Mes campagnes" badge={`${campagnes.filter(c => c.statut === "Actif" || c.statut === "En cours").length} actives`} badgeColor="green" />
      </div>

      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[22px] font-extrabold text-white">Mes campagnes</div>
                <div className="text-[13px] text-white/70 mt-0.5">{campagnes.filter(c => c.statut === "Actif" || c.statut === "En cours").length} actives · {campagnes.length} au total</div>
              </div>
              <AddCampagneButton />
            </div>
          </div>
          <div className="p-4 pb-36 space-y-3">
            {campagnes.map((c) => (
              <div key={c.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${c.statut === "Actif" ? "border-[#1a6b7e]/40" : "border-gray-100"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div><div className="text-[15px] font-extrabold text-gray-900">{c.nom}</div><div className="text-[12px] text-gray-400 mt-0.5">{c.perimetre}</div></div>
                  <CampagneStatutSelect id={c.id} statut={c.statut} />
                </div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 text-center bg-gray-50 rounded-xl py-2"><div className="text-[22px] font-extrabold text-gray-900">{c.nombreProspects}</div><div className="text-[10px] text-gray-400">cibles</div></div>
                  <div className="flex-1 text-center bg-teal-50 rounded-xl py-2"><div className="text-[22px] font-extrabold text-[#1a6b7e]">{c.tresChaudes}</div><div className="text-[10px] text-[#1a6b7e]">très chaud</div></div>
                  <div className="flex-1 text-center bg-gray-50 rounded-xl py-2"><div className="text-[22px] font-extrabold text-gray-900">{c.score}</div><div className="text-[10px] text-gray-400">score/10</div></div>
                </div>
                <div className="flex justify-between text-[12px] mb-2.5">
                  <span className="text-gray-400">Deadline : {c.deadline}</span>
                  <span className={`font-bold ${c.joursRestants === 0 ? "text-gray-400" : c.joursRestants <= 10 ? "text-red-600" : "text-[#1a6b7e]"}`}>{c.joursRestants > 0 ? `J - ${c.joursRestants}` : "Terminé"}</span>
                </div>
                {/* Health score */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bar-fill"
                      style={{ width: `${healthMap[c.id].score}%`, background: healthMap[c.id].color }}
                    />
                  </div>
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color: healthMap[c.id].color }}>
                    {healthMap[c.id].label}
                  </span>
                </div>
              </div>
            ))}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-bold text-gray-900">Livrables</span>
                <span className="text-[12px] font-semibold text-[#1a6b7e]">{validated}/{total} validés</span>
              </div>
              {activeCampagne && (
                <div className="text-[11px] text-gray-400 mb-3 truncate">{activeCampagne.nom}</div>
              )}
              {total > 0 && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-[#1a6b7e] rounded-full bar-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {livraisonIDF.length === 0 ? (
                <div className="text-[12px] text-gray-400 text-center py-4">Aucun livrable pour cette campagne</div>
              ) : (
                <div className="space-y-1">
                  {livraisonIDF.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${l.statut === "Validé" ? "bg-[#1a6b7e] text-white" : "bg-gray-100 text-gray-400"}`}>
                        {l.statut === "Validé" ? "✓" : i + 1}
                      </div>
                      <span className="text-[12.5px] text-gray-700 flex-1 min-w-0 truncate">{l.nom}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${l.statut === "Validé" ? "bg-teal-50 text-[#1a6b7e]" : "bg-gray-100 text-gray-400"}`}>{l.statut}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
        {/* Campaign cards */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-semibold text-gray-900">{campagnes.length} campagne{campagnes.length > 1 ? "s" : ""}</span>
          <AddCampagneButton />
        </div>
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {campagnes.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow ${c.statut === "Actif" ? "border-[#1a6b7e]/40" : "border-gray-200"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[13.5px] font-bold text-gray-900">{c.nom}</div>
                  <div className="text-[11.5px] text-gray-400 mt-0.5">{c.perimetre}</div>
                </div>
                <CampagneStatutSelect id={c.id} statut={c.statut} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <div className="text-[20px] font-extrabold text-gray-900">{c.nombreProspects}</div>
                  <div className="text-[10px] text-gray-400">cibles</div>
                </div>
                <div className="text-center border-x border-gray-100">
                  <div className="text-[20px] font-extrabold text-[#1a6b7e]">{c.tresChaudes}</div>
                  <div className="text-[10px] text-gray-400">très chaud</div>
                </div>
                <div className="text-center">
                  <div className="text-[20px] font-extrabold text-gray-900">{c.score}</div>
                  <div className="text-[10px] text-gray-400">score /10</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between mb-2.5">
                <span className="text-[11px] text-gray-400">Deadline : {c.deadline}</span>
                <span className={`text-[12px] font-bold ${c.joursRestants <= 10 && c.joursRestants > 0 ? "text-red-600" : c.joursRestants === 0 ? "text-gray-400" : "text-[#1a6b7e]"}`}>
                  {c.joursRestants > 0 ? `J - ${c.joursRestants}` : "Terminé"}
                </span>
              </div>
              {/* Health score bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bar-fill"
                    style={{ width: `${healthMap[c.id].score}%`, background: healthMap[c.id].color }}
                  />
                </div>
                <span className="text-[10.5px] font-bold whitespace-nowrap" style={{ color: healthMap[c.id].color }}>
                  {healthMap[c.id].score}/100
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main 2-col layout */}
        <div className="grid grid-cols-[1fr_260px] gap-4">
          <div>
            {/* Plan de campagne */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-gray-900">Plan de campagne — IDF Complète 2026</span>
              <span className="text-[12px] text-gray-400">{validated}/{total} livrables validés</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              {livraisonIDF.map((l, i) => (
                <div
                  key={l.id}
                  className={`flex items-center gap-3.5 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer`}
                >
                  {/* Step number / check */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${l.statut === "Validé" ? "bg-[#1a6b7e] text-white" : "bg-gray-100 text-gray-400"}`}>
                    {l.statut === "Validé" ? checkIcon : i + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-800">{l.nom}</div>
                    <div className="text-[11.5px] text-gray-400 mt-0.5">{l.description}</div>
                  </div>

                  {/* Status */}
                  <Badge variant={l.statut === "Validé" ? "valide" : "a-rediger"}>{l.statut}</Badge>

                  {/* File link */}
                  {l.fichier && (
                    <Link href="/livrables" className="text-[11.5px] text-[#4a90d9] hover:underline whitespace-nowrap">Ouvrir →</Link>
                  )}
                  {!l.fichier && (
                    <span className="text-[11.5px] text-gray-300 flex items-center gap-1">{clockIcon} À générer</span>
                  )}
                </div>
              ))}
            </div>

            {/* Section à renforcer */}
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500">⚠</span>
                <span className="text-[13px] font-semibold text-orange-700">Section à renforcer</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: "📊", titre: "Analytics J+30 manquant", txt: "Aucun rapport de performance généré — lancer /analyse à partir du 17/07/2026." },
                  { icon: "📞", titre: "7 contacts sans interlocuteur nominatif", txt: "Identifier le responsable des examens avant tout envoi. Utiliser LinkedIn ou appel standard." },
                  { icon: "📧", titre: "Vague 2 non planifiée", txt: "Les emails Vague 2 (septembre) sont rédigés mais aucune date d'envoi n'a été fixée." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-orange-50 last:border-0">
                    <span className="w-7 h-7 rounded-md bg-orange-50 border border-orange-100 flex items-center justify-center text-sm flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-[12.5px] font-semibold text-gray-700">{item.titre}</div>
                      <div className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">{item.txt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: conformité */}
          <div className="space-y-3.5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Conformité globale</div>
              <ConformiteGauge pct={pct} />
              <div className="mt-4 space-y-2">
                {[
                  { label: "Livrables produits", value: `${validated}/${total}`, ok: true },
                  { label: "Contacts identifiés", value: "36/43", ok: true },
                  { label: "Vague 2 planifiée", value: "Non", ok: false },
                  { label: "Analytics J+30", value: "Manquant", ok: false },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`font-semibold ${row.ok ? "text-[#1a6b7e]" : "text-orange-500"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Actions rapides</div>
              {[
                { ico: "📊", label: "Lancer /analyse", sub: "Rapport J+30",        href: "/reporting" },
                { ico: "📧", label: "Planifier Vague 2", sub: "Septembre 2026",     href: "/planning" },
                { ico: "🎯", label: "Nouvelle campagne", sub: "Ciblage → /cibler",  href: "/qualification" },
              ].map((a, i) => (
                <Link key={i} href={a.href} className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-1 -mx-1">
                  <span className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">{a.ico}</span>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-gray-700">{a.label}</div>
                    <div className="text-[11px] text-gray-400">{a.sub}</div>
                  </div>
                  <span className="text-gray-300">›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        </div>{/* end desktop */}
      </main>
      <div className="hidden md:block">
        <ConseilBar text="La campagne IDF Complète 2026 est à J-8 de sa deadline. Priorité : décrocher les RDV EM Lyon, CPGE Versailles et IFSI CHU Paris cette semaine." />
      </div>
    </>
  );
}

function ConformiteGauge({ pct }: { pct: number }) {
  const r = 38;
  const cx = 50;
  const cy = 52;
  const circumference = Math.PI * r;
  const dash = (pct / 100) * circumference;
  const color = pct >= 80 ? "#1a6b7e" : pct >= 60 ? "#f6ad55" : "#fc8181";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-[130px] h-[78px]">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#edf2f7"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: "#1a202c" }}>{pct}%</text>
        <text x={cx} y={cy + 8} textAnchor="middle" style={{ fontSize: 8, fill: "#718096" }}>CONFORMITÉ</text>
      </svg>
    </div>
  );
}
