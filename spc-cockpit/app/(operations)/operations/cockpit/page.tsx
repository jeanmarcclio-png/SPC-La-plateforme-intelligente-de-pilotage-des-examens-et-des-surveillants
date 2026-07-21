export const dynamic = "force-dynamic";

import Link from "next/link";
import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { CockpitSubtitle, RefreshButton } from "@/components/ops/CockpitRefresh";
import { dateFR } from "@/lib/operations/format";
import { SEUIL_SURCHARGE_H } from "@/lib/operations/constants";
import { joursAvant, prioriteAlerte, trierParPriorite, type NiveauAlerte } from "@/lib/operations/alertes";
import { Activity, DoorOpen, CalendarClock, AlertTriangle, CheckCircle2, MapPin, Zap, Users, Landmark, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";
import { Kpi } from "@/components/ops/Kpi";
import { ButtonLink } from "@/components/ops/Button";

type StatutLigne = "Conforme" | "Salle manquante" | "Sans créneau";

function statutLigne(a: { salle?: string; matin: boolean; apm: boolean }): StatutLigne {
  if (!a.matin && !a.apm) return "Sans créneau";
  if (!a.salle) return "Salle manquante";
  return "Conforme";
}

function LigneBadge({ statut }: { statut: StatutLigne }) {
  if (statut === "Conforme") {
    return <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden />Conforme</span>;
  }
  if (statut === "Salle manquante") {
    return <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-600"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />Salle manquante</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-red-500"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />Sans créneau</span>;
}

function Creneau({ on, debut, fin }: { on: boolean; debut?: string; fin?: string }) {
  if (!on || !debut || !fin) return <span className="text-gray-300">—</span>;
  return <span className="text-[11.5px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 whitespace-nowrap">{debut}→{fin}</span>;
}

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

interface Alerte {
  niveau: NiveauAlerte;
  tag: "Planning" | "Staff" | "Délai";
  titre: string;
  detail: string;
  href: string;
  priorite: number;
}

export default async function CockpitOpsPage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);
  const survById = new Map(surveillants.map((s) => [s.id, s]));

  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Validée") ?? missions.find((m) => m.statut === "Planifiée");
  const enCours = missions.filter((m) => m.statut === "En cours").length;
  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];

  const aPreparer = missions.filter((m) => m.statut === "Acceptée" || m.statut === "Planifiée" || m.statut === "Validée").length;
  const sallesAffectees = new Set(rows.filter((a) => a.salle).map((a) => a.salle)).size;
  const sallesRequises = active?.nbSalles ?? 0;
  const creneauxDefinis = rows.filter((a) => a.matin || a.apm).length;
  const coordinateurOk = rows.some((a) => (a.roleMission ?? "").toLowerCase().includes("coordinat") && (a.matin || a.apm) && a.salle);

  // ── Alertes (priorisées automatiquement · §21) ──────────────────────────────
  const now = new Date();
  const alertes: Alerte[] = [];

  // Session active imminente (≤ 2 j) → les manques de planning deviennent critiques.
  const joursActive = joursAvant(active?.dateMission, now);
  const planningNiveau: NiveauAlerte = joursActive != null && joursActive >= 0 && joursActive <= 2 ? "critique" : "avertissement";

  for (const a of rows) {
    const nom = survById.get(a.surveillantId)?.nom ?? `Surveillant #${a.surveillantId}`;
    const session = `Session "${active?.client} — ${active?.session ?? "Session"}"${active?.reference ? ` · ${active.reference}` : ""}`;
    const sansCreneau = !a.matin && !a.apm;
    const sansSalle = !a.salle;
    const priorite = prioriteAlerte(planningNiveau, joursActive);
    if (sansCreneau && sansSalle) {
      // Regroupement : un seul signal par surveillant, jamais deux cartes pour le même problème.
      alertes.push({ niveau: planningNiveau, tag: "Planning", titre: `Affectation incomplète — ${nom}`, detail: `${session} : salle et créneau à compléter`, href: "/operations/planification", priorite });
    } else if (sansCreneau) {
      alertes.push({ niveau: planningNiveau, tag: "Planning", titre: `Créneau manquant — ${nom}`, detail: `${session} : ni matin ni après-midi`, href: "/operations/planification", priorite });
    } else if (sansSalle) {
      alertes.push({ niveau: planningNiveau, tag: "Planning", titre: `Salle manquante — ${nom}`, detail: `${session} : aucune salle affectée`, href: "/operations/planification", priorite });
    }
  }

  for (const s of surveillants.filter((x) => x.heures >= SEUIL_SURCHARGE_H)) {
    alertes.push({
      niveau: "avertissement", tag: "Staff",
      titre: `Charge critique — ${s.nom}`,
      detail: `${s.heures}h planifiées — seuil de surcharge dépassé`,
      href: "/operations/surveillants",
      priorite: prioriteAlerte("avertissement", null),
    });
  }

  for (const m of missions.filter((x) => x.statut !== "Annulée" && x.dateMission)) {
    const j = joursAvant(m.dateMission, now);
    alertes.push({
      niveau: "information", tag: "Délai",
      titre: `Session du ${dateFR(m.dateMission)} — ${m.client}`,
      detail: `${m.nbSalles} salles · ${m.nbSurveillants} surveillants · statut : ${m.statut}`,
      href: "/operations/missions",
      priorite: prioriteAlerte("information", j),
    });
  }

  // Tri par priorité décroissante — le plus urgent remonte en tête.
  const alertesTriees = trierParPriorite(alertes);
  const actionnables = alertesTriees.filter((a) => a.niveau !== "information");
  const informations = alertesTriees.filter((a) => a.niveau === "information");
  const critiques = alertes.filter((a) => a.niveau === "critique");
  const avertissements = alertes.filter((a) => a.niveau === "avertissement");

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader
        page="Cockpit"
        title="Cockpit opérationnel"
        subtitle={<CockpitSubtitle />}
        actions={
          <>
            <RefreshButton />
            <ButtonLink href="/operations/planification" variant="primary">
              <Zap className="w-4 h-4" aria-hidden />
              Planification
            </ButtonLink>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Grammaire couleur distribuée : teal marque (live) · ambre (couverture) · cyan · rouge/ambre sémantique (alertes). */}
        {enCours > 0 ? (
          <Kpi
            variant="vivid"
            accent="teal"
            label="Sessions en cours"
            value={String(enCours)}
            sub="sur le terrain en ce moment"
            icon={<Activity className="w-4 h-4" />}
          />
        ) : (
          <Kpi
            variant="vivid"
            accent="teal"
            label="Sessions à préparer"
            value={String(aPreparer)}
            sub="aucune session en cours"
            icon={<Activity className="w-4 h-4" />}
          />
        )}
        <Kpi
          variant="vivid"
          label="Salles couvertes"
          value={`${sallesAffectees}/${sallesRequises}`}
          sub={`${Math.max(0, sallesRequises - sallesAffectees)} salle(s) à couvrir`}
          icon={<DoorOpen className="w-4 h-4" />}
          accent="amber"
        />
        <Kpi
          variant="vivid"
          label="Créneaux définis"
          value={`${creneauxDefinis}/${rows.length}`}
          sub={`${rows.length - creneauxDefinis} surveillant(s) sans créneau`}
          icon={<UserCheck className="w-4 h-4" />}
          accent="cyan"
        />
        <Kpi
          variant="vivid"
          label="Alertes"
          value={String(alertes.length)}
          sub={`${critiques.length ? `${critiques.length} critique(s) · ` : ""}${avertissements.length} avert. · ${informations.length} info(s)`}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={critiques.length ? "red" : "amber"}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Sessions actives */}
        <div className="lg:col-span-3">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[1px] text-gray-700">Sessions actives</h2>
            <Link href="/operations/planification" className="text-[12.5px] font-bold text-indigo-600 hover:text-indigo-700">Voir planning →</Link>
          </div>

          {!active ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 text-center text-[13px] text-gray-500">
              Aucune session active ou planifiée. Créez une mission pour démarrer le pilotage.
            </div>
          ) : (
            <section aria-label="Session active" className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-3.5 flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-[15px] font-extrabold text-gray-900">{active.client} — {active.session ?? "Session"}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mt-1">
                    <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                    {dateFR(active.dateMission)} · {active.client}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{actionnables.length} alertes</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">En préparation</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-y border-gray-100 bg-gray-50/70">
                      {["Surveillant", "Salle", "Matin", "Après-midi", "Statut"].map((h) => (
                        <th key={h} className="text-left px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-[.8px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a, i) => {
                      const s = survById.get(a.surveillantId);
                      const st = statutLigne(a);
                      const coord = (a.roleMission ?? "").toLowerCase().includes("coordinat");
                      return (
                        <tr key={a.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                aria-hidden
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white flex-shrink-0"
                                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                              >
                                {(s?.nom ?? "??").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[13px] font-semibold text-gray-800">{s?.nom ?? `Surveillant #${a.surveillantId}`}</span>
                                {coord && <span className="text-[9.5px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">Coord</span>}
                              </div>
                            </div>
                            {!coord && <div className="text-[11px] text-gray-400 ml-[38px]">{a.roleMission ?? s?.role ?? ""}</div>}
                          </td>
                          <td className="px-5 py-3">
                            {a.salle
                              ? <span className="inline-flex items-center gap-1 text-[12.5px] font-mono font-bold text-gray-700"><MapPin className="w-3 h-3 text-blue-500" aria-hidden />{a.salle}</span>
                              : <span className="inline-flex items-center gap-1 text-[12.5px] text-red-400"><MapPin className="w-3 h-3" aria-hidden />—</span>}
                          </td>
                          <td className="px-5 py-3"><Creneau on={a.matin} debut={a.matinDebut} fin={a.matinFin} /></td>
                          <td className="px-5 py-3"><Creneau on={a.apm} debut={a.apmDebut} fin={a.apmFin} /></td>
                          <td className="px-5 py-3"><LigneBadge statut={st} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12.5px] flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-gray-600"><Users className="w-3.5 h-3.5 text-gray-400" aria-hidden />{rows.length} surveillants</span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${sallesAffectees < sallesRequises ? "text-red-500" : "text-emerald-600"}`}>
                    <Landmark className="w-3.5 h-3.5" aria-hidden />{sallesAffectees}/{sallesRequises} salles
                  </span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${coordinateurOk ? "text-emerald-600" : "text-amber-600"}`}>
                    <UserCheck className="w-3.5 h-3.5" aria-hidden />{coordinateurOk ? "Coordinateur OK" : "Coordinateur à confirmer"}
                  </span>
                </div>
                <Link href="/operations/planification" className="font-bold text-indigo-600 hover:text-indigo-700">Ouvrir →</Link>
              </div>
            </section>
          )}
        </div>

        {/* Alertes */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[1px] text-gray-700">Alertes</h2>
            <span className={`w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center ${critiques.length ? "bg-rose-500" : "bg-amber-400"}`}>{actionnables.length}</span>
          </div>

          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {actionnables.map((a, i) => {
              const crit = a.niveau === "critique";
              return (
                <Link
                  key={`a-${i}`}
                  href={a.href}
                  className={`block bg-white rounded-2xl ring-1 ring-slate-900/5 border-l-[3px] shadow-sm px-4 py-3.5 hover:shadow-md transition-all ${crit ? "border-l-rose-500 hover:ring-rose-200" : "border-l-amber-400 hover:ring-amber-200"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wide rounded px-1.5 py-0.5 ${crit ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{a.tag}</span>
                      {crit && <span className="text-[9.5px] font-extrabold uppercase tracking-wide rounded px-1.5 py-0.5 bg-rose-600 text-white">Critique</span>}
                    </span>
                    <span className="text-gray-300">›</span>
                  </div>
                  <div className="text-[13px] font-bold text-gray-900 mt-1.5">{a.titre}</div>
                  <div className="text-[11.5px] text-gray-500 mt-0.5">{a.detail}</div>
                  <div className={`text-[11.5px] font-bold mt-1.5 ${crit ? "text-rose-700" : "text-amber-700"}`}>{a.tag === "Staff" ? "Rééquilibrer la charge →" : "Corriger l'affectation →"}</div>
                </Link>
              );
            })}
            {informations.map((a, i) => (
              <Link
                key={`i-${i}`}
                href={a.href}
                className="block bg-white rounded-2xl ring-1 ring-slate-900/5 border-l-[3px] border-l-sky-400 shadow-sm px-4 py-3.5 hover:shadow-md hover:ring-sky-200 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-500 rounded px-1.5 py-0.5">{a.tag}</span>
                  <span className="text-gray-300">›</span>
                </div>
                <div className="text-[13px] font-bold text-gray-900 mt-1.5">{a.titre}</div>
                <div className="text-[11.5px] text-gray-500 mt-0.5">{a.detail}</div>
                <div className="text-[11.5px] font-bold text-blue-600 mt-1.5">Voir la mission →</div>
              </Link>
            ))}
          </div>

          {/* Récapitulatif */}
          <div className="mt-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
            <h3 className="text-[12px] font-bold uppercase tracking-[1px] text-gray-700 mb-3">Récapitulatif</h3>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between text-gray-600">
                <span className="inline-flex items-center gap-2"><span aria-hidden className="w-2 h-2 rounded-full bg-rose-500" />Critiques</span>
                <span className="font-extrabold text-gray-900">{critiques.length}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="inline-flex items-center gap-2"><span aria-hidden className="w-2 h-2 rounded-full bg-amber-400" />Avertissements</span>
                <span className="font-extrabold text-gray-900">{avertissements.length}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span className="inline-flex items-center gap-2"><span aria-hidden className="w-2 h-2 rounded-full bg-blue-400" />Informations</span>
                <span className="font-extrabold text-gray-900">{informations.length}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                <span className="font-bold text-gray-900">Total alertes</span>
                <span className="text-[15px] font-extrabold text-gray-900">{alertes.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
