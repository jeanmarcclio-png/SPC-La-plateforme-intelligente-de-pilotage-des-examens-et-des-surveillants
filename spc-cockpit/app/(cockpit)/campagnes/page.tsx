import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge } from "@/components/Badge";
import { campagnes, livraisonIDF } from "@/lib/data";

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

export default function CampagnesPage() {
  const validated = livraisonIDF.filter((l) => l.statut === "Validé").length;
  const total = livraisonIDF.length;
  const pct = Math.round((validated / total) * 100);

  return (
    <>
      <Topbar context="Prospection B2B" title="Mes campagnes" badge="3 actives" badgeColor="green" />

      <main className="flex-1 overflow-y-auto p-5">
        {/* Campaign cards */}
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {campagnes.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${c.statut === "Actif" ? "border-[#1a6b7e]/40" : "border-gray-200"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[13.5px] font-bold text-gray-900">{c.nom}</div>
                  <div className="text-[11.5px] text-gray-400 mt-0.5">{c.perimetre}</div>
                </div>
                <Badge variant={c.statut === "Actif" ? "tres-chaud" : c.statut === "En cours" ? "en-cours" : "valide"}>
                  {c.statut}
                </Badge>
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
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Deadline : {c.deadline}</span>
                <span className={`text-[12px] font-bold ${c.joursRestants <= 10 && c.joursRestants > 0 ? "text-red-600" : c.joursRestants === 0 ? "text-gray-400" : "text-[#1a6b7e]"}`}>
                  {c.joursRestants > 0 ? `J - ${c.joursRestants}` : "Terminé"}
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
                    <span className="text-[11.5px] text-[#4a90d9] hover:underline whitespace-nowrap">Ouvrir →</span>
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
                { ico: "📊", label: "Lancer /analyse", sub: "Rapport J+30" },
                { ico: "📧", label: "Planifier Vague 2", sub: "Septembre 2026" },
                { ico: "🎯", label: "Nouvelle campagne", sub: "Ciblage → /cibler" },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 -mx-1">
                  <span className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">{a.ico}</span>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-gray-700">{a.label}</div>
                    <div className="text-[11px] text-gray-400">{a.sub}</div>
                  </div>
                  <span className="text-gray-300">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ConseilBar text="La campagne IDF Complète 2026 est à J-8 de sa deadline. Priorité : décrocher les RDV EM Lyon, CPGE Versailles et IFSI CHU Paris cette semaine." />
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
