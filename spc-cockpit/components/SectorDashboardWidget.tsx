"use client";
import Link from "next/link";
import { useTenant } from "@/lib/tenant/TenantContext";
import { Pill, type PillTone } from "@/components/pilot";

// ─── Seed data ─────────────────────────────────────────────────────────────────

const SESSIONS = [
  { nom: "Kedge Business School", city: "Bordeaux", date: "03 juil.", nb: 12, tiers: 4, statut: "Confirmé" },
  { nom: "IFSI CHU Lyon", city: "Lyon", date: "08 juil.", nb: 8, tiers: 2, statut: "En attente" },
  { nom: "CPGE Fermat Toulouse", city: "Toulouse", date: "14 juil.", nb: 6, tiers: 1, statut: "Confirmé" },
  { nom: "Université Paris-Saclay", city: "Palaiseau", date: "22 juil.", nb: 18, tiers: 6, statut: "À confirmer" },
];

const MISSIONS = [
  { nom: "SNCF — Transformation RH", phase: "Cadrage", pct: 35, ca: 85, initiales: "MD", color: "#4a90d9" },
  { nom: "AXA — Stratégie digitale", phase: "Exécution", pct: 68, ca: 120, initiales: "LM", color: "#38a169" },
  { nom: "Engie — Optimisation Ops", phase: "Prospection", pct: 12, ca: 65, initiales: "—", color: "#a0aec0" },
  { nom: "BNP — Refonte SI RH", phase: "Clôture", pct: 92, ca: 95, initiales: "AR", color: "#7c3aed" },
];

const SITES = [
  { nom: "Centre commercial Vélizy 2", type: "Retail", agents: 8, statut: "OK", check: "2h" },
  { nom: "Siège Total Énergies", type: "Entreprise", agents: 4, statut: "Alerte", check: "18min" },
  { nom: "Festival Solidays 2026", type: "Événementiel", agents: 22, statut: "OK", check: "1h" },
  { nom: "Résidence Les Ormes", type: "Résidentiel", agents: 2, statut: "OK", check: "4h" },
];

const CHANTIERS = [
  { nom: "Résidence Éco-Quartier Lyon", mo: "Nexity", phase: "Gros œuvre", pct: 64, deadline: "Sept. 2026", budget: 2800 },
  { nom: "Hôtel Mercure Bordeaux", mo: "Bouygues Immo", phase: "Second œuvre", pct: 82, deadline: "Août 2026", budget: 1200 },
  { nom: "Entrepôt Logistique Metz", mo: "Prologis", phase: "Fondations", pct: 23, deadline: "Déc. 2026", budget: 4500 },
];

const COMMANDES = [
  { poste: "Technicien maintenance", client: "Renault Flins", nb: 3, deadline: "30 juin", segment: "Industrie", urgent: true },
  { poste: "Opérateur logistique", client: "Amazon Saran", nb: 8, deadline: "02 juil.", segment: "Logistique", urgent: false },
  { poste: "Infirmier DE", client: "CHU Pitié-Salpêtrière", nb: 2, deadline: "03 juil.", segment: "Santé", urgent: true },
  { poste: "Dev Full-Stack JS", client: "Capgemini Paris", nb: 1, deadline: "07 juil.", segment: "IT", urgent: false },
];

// ─── Sub-widgets ───────────────────────────────────────────────────────────────

function WidgetShell({ title, subtitle, emoji, href, ctaLabel, children }: {
  title: string; subtitle: string; emoji: string; href: string; ctaLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="block" style={{ marginTop: 38 }}>
      <div className="sechd">
        <h2>{emoji} {title}</h2>
        <Link href={href}>{ctaLabel} →</Link>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: -2, marginBottom: 8 }}>{subtitle}</div>
      {children}
    </div>
  );
}

function ExamensWidget() {
  const tone = (s: string): PillTone => (s === "Confirmé" ? "rdv" : s === "En attente" ? "warm" : "neutral");
  return (
    <WidgetShell title="Sessions à venir" subtitle="Prochaines surveillances planifiées" emoji="🗓" href="/planning" ctaLabel="Voir le planning">
      <div>
        {SESSIONS.map((s, i) => (
          <Link className="row" href="/planning" key={i}>
            <span className="nm">{s.nom}</span>
            <span className="sub">{s.city} · {s.date} · {s.nb} surveillants{s.tiers > 0 ? ` · ${s.tiers} tiers-temps` : ""}</span>
            <span className="right"><Pill tone={tone(s.statut)}>{s.statut}</Pill></span>
          </Link>
        ))}
      </div>
    </WidgetShell>
  );
}

function ConseilWidget() {
  const PHASES = ["Prospection", "Cadrage", "Exécution", "Clôture"];
  return (
    <WidgetShell title="Pipeline missions" subtitle="Affaires en cours par phase" emoji="💼" href="/campagnes" ctaLabel="Voir les campagnes">
      {/* Phase rail */}
      <div className="flex gap-0 mb-3 rounded-lg overflow-hidden border border-gray-100">
        {PHASES.map((p, i) => (
          <div key={p} className={`flex-1 text-center py-1.5 text-[11px] font-semibold border-r last:border-r-0 border-gray-100 ${
            MISSIONS.some(m => m.phase === p) ? "bg-blue-50 text-blue-700" : "text-gray-400"
          }`}>
            {i + 1}. {p}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {MISSIONS.map((m, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: m.color }}>
              {m.initiales}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-gray-800 truncate">{m.nom}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">{m.pct}%</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[12px] font-bold text-gray-800">{m.ca}k€</div>
              <div className="text-[10px] text-gray-400">{m.phase}</div>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

function SecuriteWidget() {
  const alertes = SITES.filter(s => s.statut !== "OK").length;
  return (
    <WidgetShell title="Sites surveillés" subtitle="Statut en temps réel" emoji="🛡️" href="/planning" ctaLabel="Voir tous les sites">
      {alertes > 0 && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="text-red-500 text-sm">⚠</span>
          <span className="text-[12px] font-semibold text-red-700">{alertes} alerte{alertes > 1 ? "s" : ""} active{alertes > 1 ? "s" : ""} — intervention requise</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {SITES.map((s, i) => (
          <div key={i} className={`rounded-xl p-3 border transition-all ${
            s.statut === "OK" ? "border-gray-100 bg-gray-50" : "border-red-300 bg-red-50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.statut === "OK" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
              <span className={`text-[10px] font-bold ${s.statut === "OK" ? "text-green-600" : "text-red-600"}`}>{s.statut}</span>
            </div>
            <div className="text-[12px] font-semibold text-gray-800 leading-tight mb-0.5">{s.nom}</div>
            <div className="text-[10px] text-gray-400">{s.type}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60">
              <span className="text-[11px] text-gray-500">{s.agents} agents</span>
              <span className="text-[10px] text-gray-400">↻ {s.check}</span>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

function BTPWidget() {
  return (
    <WidgetShell title="Chantiers actifs" subtitle="Avancement par phase" emoji="🏗️" href="/planning" ctaLabel="Voir le planning">
      <div className="space-y-3">
        {CHANTIERS.map((c, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-3 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[13px] font-semibold text-gray-800">{c.nom}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">MO : {c.mo} · {c.budget}k€</div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-[20px] font-extrabold leading-none" style={{ color: c.pct >= 70 ? "#d97706" : c.pct >= 40 ? "#4a90d9" : "#a0aec0" }}>{c.pct}%</div>
                <div className="text-[10px] text-gray-400">{c.deadline}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{c.phase}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${c.pct}%`, background: c.pct >= 70 ? "#d97706" : c.pct >= 40 ? "#4a90d9" : "#a0aec0" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

function RHWidget() {
  return (
    <WidgetShell title="Commandes en cours" subtitle="Missions d'intérim actives" emoji="👥" href="/campagnes" ctaLabel="Voir les campagnes">
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Poste", "Client", "Candidats", "Deadline", ""].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-[.4px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMMANDES.map((c, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="text-[12px] font-semibold text-gray-800">{c.poste}</div>
                  <div className="text-[11px] text-gray-400">{c.segment}</div>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-gray-600">{c.client}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {"●".repeat(Math.min(c.nb, 5)).split("").map((_, j) => (
                      <span key={j} className="w-3 h-3 rounded-full bg-purple-400 inline-block" />
                    ))}
                    <span className="text-[11px] text-gray-500 ml-1">{c.nb}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[12px] font-semibold" style={{ color: c.urgent ? "#dc2626" : "#718096" }}>
                  {c.deadline}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {c.urgent && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">URGENT</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function SectorDashboardWidget() {
  const { config } = useTenant();
  switch (config.secteur) {
    case "examens":  return <ExamensWidget />;
    case "conseil":  return <ConseilWidget />;
    case "securite": return <SecuriteWidget />;
    case "btp":      return <BTPWidget />;
    case "rh":       return <RHWidget />;
    default:         return null;
  }
}

// ─── Mobile version (compact) ─────────────────────────────────────────────────

export function SectorDashboardWidgetMobile() {
  const { config } = useTenant();

  if (config.secteur === "examens") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-gray-800">🗓 Sessions à venir</div>
          <Link href="/planning" className="text-[11px] text-[#4a90d9]">Voir tout →</Link>
        </div>
        <div className="space-y-2">
          {SESSIONS.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-extrabold text-[var(--color-primary)] leading-none">{s.date.split(" ")[0]}</span>
                <span className="text-[8px] text-[var(--color-primary)]/60 leading-none">{s.date.split(" ")[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate">{s.nom}</div>
                <div className="text-[11px] text-gray-400">👤 {s.nb} · ⏱ {s.tiers} tiers-temps</div>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                s.statut === "Confirmé" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>{s.statut}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.secteur === "securite") {
    const alertes = SITES.filter(s => s.statut !== "OK");
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-gray-800">🛡️ Sites surveillés</div>
          {alertes.length > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{alertes.length} alerte{alertes.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SITES.map((s, i) => (
            <div key={i} className={`rounded-xl p-2.5 border ${s.statut === "OK" ? "border-gray-100 bg-gray-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${s.statut === "OK" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                <span className="text-[10px] font-bold text-gray-600">{s.statut}</span>
              </div>
              <div className="text-[11px] font-semibold text-gray-800 leading-tight">{s.nom}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.agents} agents</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.secteur === "btp") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-gray-800">🏗️ Chantiers actifs</div>
          <Link href="/planning" className="text-[11px] text-[#4a90d9]">Voir tout →</Link>
        </div>
        <div className="space-y-3">
          {CHANTIERS.map((c, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-gray-800 flex-1 truncate">{c.nom}</span>
                <span className="text-[12px] font-bold ml-2" style={{ color: c.pct >= 70 ? "#d97706" : "#4a90d9" }}>{c.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.pct >= 70 ? "#d97706" : "#4a90d9" }} />
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{c.phase} · {c.deadline}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.secteur === "rh") {
    const urgentes = COMMANDES.filter(c => c.urgent);
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-gray-800">👥 Commandes en cours</div>
          {urgentes.length > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{urgentes.length} urgent{urgentes.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="space-y-2">
          {COMMANDES.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-purple-700">{c.nb}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate">{c.poste}</div>
                <div className="text-[11px] text-gray-400">{c.client}</div>
              </div>
              <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: c.urgent ? "#dc2626" : "#718096" }}>
                {c.deadline}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // conseil — mini pipeline
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-bold text-gray-800">💼 Missions en cours</div>
        <Link href="/campagnes" className="text-[11px] text-[#4a90d9]">Voir tout →</Link>
      </div>
      <div className="space-y-2">
        {MISSIONS.map((m, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-gray-800 flex-1 truncate">{m.nom}</span>
              <span className="text-[12px] font-bold ml-2 text-gray-700">{m.ca}k€</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.phase} · {m.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
