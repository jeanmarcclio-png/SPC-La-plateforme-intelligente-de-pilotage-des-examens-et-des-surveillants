export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSurveillants, getMissions, getDevisList, getIncidents, getAffectations } from "@/lib/operations/queries";
import { MissionBadge, DevisBadge, SurvBadge } from "@/components/ops/badges";
import { Kpi } from "@/components/ops/Kpi";
import { euro, dateFR } from "@/lib/operations/format";
import { SEUIL_SURCHARGE_H, STATUTS_PIPELINE, STATUTS_CA_CONFIRME } from "@/lib/operations/constants";
import { tendanceCA } from "@/lib/operations/stats";
import { QuickActions } from "@/components/ops/QuickActions";
import { Briefcase, Users, Euro, FileCheck2, AlertTriangle, Star, ClipboardList, FileText, Send, ArrowRight, Plus, TrendingUp } from "lucide-react";

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

// ── Priorités du jour ────────────────────────────────────────────────────────
type Severite = "critique" | "attention" | "suivre";

interface Priorite {
  severite: Severite;
  tag: string;
  titre: string;
  detail: string;
  action: string;
  href: string;
  icon: React.ReactNode;
}

const SEV_ORDER: Record<Severite, number> = { critique: 0, attention: 1, suivre: 2 };
const SEV_STYLE: Record<Severite, { badge: string; label: string; border: string }> = {
  critique:  { badge: "bg-red-500 text-white",      label: "Critique",  border: "border-l-red-500" },
  attention: { badge: "bg-amber-400 text-amber-950", label: "Attention", border: "border-l-amber-400" },
  suivre:    { badge: "bg-blue-100 text-blue-700",   label: "À suivre",  border: "border-l-blue-300" },
};

function PrioriteCard({ p }: { p: Priorite }) {
  const s = SEV_STYLE[p.severite];
  return (
    <div className={`flex-1 min-w-[240px] border-l-[3px] ${s.border} px-5 py-4 flex flex-col`}>
      <div className="flex items-center justify-between mb-2.5">
        <span aria-hidden className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">{p.icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${s.badge}`}>{s.label}</span>
      </div>
      <div className="text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400">{p.tag}</div>
      <div className="text-[13.5px] font-bold text-gray-900 mt-0.5">{p.titre}</div>
      <div className="text-[12px] text-gray-500 mt-0.5 flex-1">{p.detail}</div>
      <Link
        href={p.href}
        className="inline-flex items-center gap-1 text-[12.5px] font-bold text-blue-600 hover:text-blue-800 mt-3 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {p.action} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export default async function OperationsPage() {
  const [surveillants, missions, devis, incidents, affectations] = await Promise.all([
    getSurveillants(), getMissions(), getDevisList(), getIncidents(), getAffectations(),
  ]);

  const dispo = surveillants.filter((s) => s.statut === "Disponible" || s.statut === "Planifié");
  const missionsAVenir = missions.filter((m) => m.statut === "Planifiée" || m.statut === "En cours");
  const pipeline = devis.filter((d) => (STATUTS_PIPELINE as readonly string[]).includes(d.statut));
  const confirmes = devis.filter((d) => (STATUTS_CA_CONFIRME as readonly string[]).includes(d.statut));
  const incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu");

  // Priorités du jour — dérivées des données réelles, jamais décoratives
  const priorites: Priorite[] = [];

  for (const inc of incidentsOuverts) {
    priorites.push({
      severite: inc.gravite === "critique" ? "critique" : "attention",
      tag: "Impact examen",
      titre: inc.gravite === "critique" ? "Incident critique à traiter" : "Incident à traiter",
      detail: `${inc.titre}${inc.salle ? ` · salle ${inc.salle}` : ""} · ${dateFR(inc.dateIncident)}`,
      action: "Ouvrir",
      href: "/operations/incidents",
      icon: <AlertTriangle className="w-4 h-4" />,
    });
  }

  const missionActive = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Planifiée");
  if (missionActive) {
    const rows = affectations.filter((a) => a.missionId === missionActive.id);
    const incomplets = rows.filter((a) => (!a.matin && !a.apm) || !a.salle).length;
    if (incomplets > 0) {
      priorites.push({
        severite: "attention",
        tag: "En cours",
        titre: "Mission active à sécuriser",
        detail: `${missionActive.client} · ${dateFR(missionActive.dateMission)} · ${incomplets} affectation${incomplets > 1 ? "s" : ""} incomplète${incomplets > 1 ? "s" : ""}`,
        action: "Piloter",
        href: "/operations/planification",
        icon: <ClipboardList className="w-4 h-4" />,
      });
    }
  }

  for (const d of devis.filter((x) => x.statut === "Brouillon")) {
    priorites.push({
      severite: "attention",
      tag: "Sans devis accepté",
      titre: "Devis à finaliser",
      detail: `${d.client} · ${euro(d.montantHT)} HT · brouillon`,
      action: "Finaliser",
      href: "/operations/devis",
      icon: <FileText className="w-4 h-4" />,
    });
  }

  for (const d of devis.filter((x) => x.statut === "Envoyé")) {
    priorites.push({
      severite: "suivre",
      tag: "En attente de réponse",
      titre: "Relance commerciale",
      detail: `${d.client} · ${euro(d.montantHT)} HT · envoyé`,
      action: "Relancer",
      href: "/operations/devis",
      icon: <Send className="w-4 h-4" />,
    });
  }

  priorites.sort((a, b) => SEV_ORDER[a.severite] - SEV_ORDER[b.severite]);
  const prioritesAffichees = priorites.slice(0, 4);

  const tendance = tendanceCA(missions);
  const maxMois = Math.max(...tendance.map((t) => t.total), 1);
  const dernier = tendance[tendance.length - 1];
  const precedent = tendance[tendance.length - 2];
  const variation = dernier && precedent && precedent.total > 0
    ? Math.round(((dernier.total - precedent.total) / precedent.total) * 100)
    : null;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      {/* Header — une seule action primaire */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Pilotage opérationnel des examens — missions, équipe, devis, incidents</p>
        </div>
        <Link
          href="/operations/missions"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-blue-500"
          style={{ background: "#0d2137" }}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Nouvelle mission
        </Link>
      </div>

      {/* KPIs — terminologie stable, chaque tuile mène à sa page source */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Kpi label="Missions à venir" value={String(missionsAVenir.length)} sub={`${missions.length} au total`} icon={<Briefcase className="w-4 h-4" />} href="/operations/missions" />
        <Kpi label="Équipe mobilisable" value={`${dispo.length}/${surveillants.length}`} sub="disponibles ou planifiés" icon={<Users className="w-4 h-4" />} href="/operations/surveillants" />
        <Kpi label="Pipeline commercial HT" value={euro(pipeline.reduce((s, d) => s + d.montantHT, 0))} sub={`${pipeline.length} devis brouillon ou envoyé`} icon={<Euro className="w-4 h-4" />} href="/operations/devis" />
        <Kpi label="CA confirmé HT" value={euro(confirmes.reduce((s, d) => s + d.montantHT, 0))} sub={`${confirmes.length} devis accepté${confirmes.length > 1 ? "s" : ""} ou facturé${confirmes.length > 1 ? "s" : ""}`} icon={<FileCheck2 className="w-4 h-4" />} href="/operations/devis" />
      </div>

      {/* Priorités du jour */}
      {prioritesAffichees.length > 0 && (
        <section aria-label="Priorités du jour" className="bg-white rounded-2xl border border-gray-200/80 shadow-sm mb-6 overflow-hidden">
          <div className="px-5 pt-4.5 pb-1">
            <h2 className="text-[14px] font-bold text-gray-900">Priorités du jour</h2>
            <p className="text-[12px] text-gray-400">Actions à traiter en premier pour sécuriser les examens et le chiffre d&apos;affaires</p>
          </div>
          <div className="flex flex-wrap divide-x divide-gray-100">
            {prioritesAffichees.map((p, i) => <PrioriteCard key={i} p={p} />)}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Missions */}
        <section aria-label="Missions" className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">Missions récentes</h2>
              <p className="text-[12px] text-gray-400">Sessions d&apos;examens planifiées et récentes</p>
            </div>
            <Link href="/operations/missions" className="text-[12px] font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap">
              Voir tout →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[460px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Client</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px] hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Périmètre</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-semibold text-gray-800">{m.client}</div>
                      <div className="text-[11px] font-mono text-gray-400">{m.reference}</div>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap hidden sm:table-cell">{dateFR(m.dateMission)}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{m.nbSalles} salles · {m.nbSurveillants} surv.</td>
                    <td className="px-5 py-3"><MissionBadge statut={m.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Colonne droite : tendance + incident + devis */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tendance CA */}
          <section aria-label="Tendance chiffre d'affaires" className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h2 className="text-[14px] font-bold text-gray-900">Tendance CA</h2>
              <span className="text-[11px] text-gray-400">montants HT / mois de mission</span>
            </div>
            {tendance.length === 0 ? (
              <p className="text-[12.5px] text-gray-400 py-4">Aucune mission datée — la tendance apparaîtra dès la première mission planifiée.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[22px] font-extrabold text-gray-900">{euro(dernier.total)}</span>
                  {variation !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold ${variation >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      <TrendingUp className={`w-3.5 h-3.5 ${variation < 0 ? "rotate-180" : ""}`} aria-hidden />
                      {variation >= 0 ? "+" : ""}{variation}% vs mois précédent
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {tendance.map((t) => (
                    <div key={t.key} className="flex items-center gap-2.5">
                      <span className="text-[11px] text-gray-500 w-12 flex-shrink-0">{t.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round((t.total / maxMois) * 100)}%`, background: "#0d2137" }} />
                      </div>
                      <span className="text-[11.5px] font-semibold text-gray-700 w-[84px] text-right flex-shrink-0">{euro(t.total)}</span>
                    </div>
                  ))}
                </div>
                <Link href="/operations/devis" className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 hover:text-blue-800 mt-3.5">
                  Voir les devis <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </Link>
              </>
            )}
          </section>

          {/* Incidents ouverts */}
          {incidentsOuverts.map((inc) => (
            <section key={inc.id} aria-label={`Incident : ${inc.titre}`} className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span aria-hidden className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-bold text-gray-900">{inc.titre}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-red-500 text-white rounded px-1.5 py-0.5">{inc.gravite}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 rounded px-1.5 py-0.5">{inc.statut}</span>
                  </div>
                  <div className="text-[12px] text-gray-500 mt-0.5">
                    {inc.salle ? `Salle ${inc.salle} · ` : ""}{dateFR(inc.dateIncident)}
                  </div>
                </div>
              </div>
              <Link
                href="/operations/incidents"
                className="mt-3 block text-center text-[12.5px] font-bold text-red-600 border border-red-200 rounded-xl py-2 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-500"
              >
                Voir l&apos;incident
              </Link>
            </section>
          ))}

          {/* Devis */}
          <section aria-label="Devis" className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-bold text-gray-900">Devis</h2>
              <Link href="/operations/devis" className="text-[12px] font-bold text-blue-600 hover:text-blue-800">Voir tout →</Link>
            </div>
            <div>
              {devis.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-gray-800 truncate">{d.client}</div>
                    <div className="text-[11.5px] text-gray-400 truncate">{d.session ?? d.reference} · {d.nbSurveillants} surv.</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13.5px] font-extrabold text-gray-900">{euro(d.montantHT)}</div>
                    <DevisBadge statut={d.statut} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Équipe */}
      <section aria-label="Équipe" className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Équipe — Disponibilité</h2>
            <p className="text-[12px] text-gray-400">{dispo.length} mobilisables sur {surveillants.length}</p>
          </div>
          <Link href="/operations/surveillants" className="text-[12px] font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap">
            Voir l&apos;équipe →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Surveillant", "Statut", "Examens", "Heures", "Note"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveillants.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      >
                        {s.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-gray-800">{s.nom}</div>
                        <div className="text-[11.5px] text-gray-400">{s.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><SurvBadge statut={s.statut} /></td>
                  <td className="px-5 py-3 text-[13px] text-gray-700">{s.nbExamens}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-[13px] text-gray-700">{s.heures}h</span>
                    {s.heures >= SEUIL_SURCHARGE_H && (
                      <span className="ml-2 text-[10px] font-bold uppercase bg-amber-50 text-amber-600 rounded px-1.5 py-0.5" title={`Seuil de surcharge dépassé (≥ ${SEUIL_SURCHARGE_H}h)`}>
                        Surcharge
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" aria-hidden />{s.note.toFixed(1)}
                      <span className="sr-only">sur 5</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actions rapides */}
      <QuickActions />
    </div>
  );
}
