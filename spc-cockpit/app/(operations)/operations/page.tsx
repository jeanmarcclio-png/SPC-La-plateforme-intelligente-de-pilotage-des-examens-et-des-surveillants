export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSurveillants, getMissions, getDevisList, getIncidents, getAffectations } from "@/lib/operations/queries";
import { MissionBadge, DevisBadge, SurvBadge } from "@/components/ops/badges";
import { ButtonLink } from "@/components/ops/Button";
import { euro, dateFR } from "@/lib/operations/format";
import { SEUIL_SURCHARGE_H, STATUTS_PIPELINE, STATUTS_CA_CONFIRME } from "@/lib/operations/constants";
import { tendanceCA } from "@/lib/operations/stats";
import { QuickActions } from "@/components/ops/QuickActions";
import { Plus } from "lucide-react";
import { PilotStyles, SectionHead, Pill, type PillTone } from "@/components/pilot";

/**
 * Vue d'ensemble Opérations — langage « centre de pilotage »
 * (docs/pilot-design-system.md). Un ancrage sombre (vitals), des lignes denses
 * en encre, un écho clair-teinté (Tendance CA). Zéro carte blanche flottante.
 * La page vit dans le shell Opérations (main clair) : on scope le langage via
 * un conteneur `.pilot`.
 */

type Severite = "critique" | "attention" | "suivre";
interface Priorite {
  severite: Severite;
  tag: string;
  titre: string;
  detail: string;
  action: string;
  href: string;
}
const SEV_ORDER: Record<Severite, number> = { critique: 0, attention: 1, suivre: 2 };
const SEV: Record<Severite, { tone: PillTone; label: string }> = {
  critique:  { tone: "hot",  label: "Critique" },
  attention: { tone: "warm", label: "Attention" },
  suivre:    { tone: "neutral", label: "À suivre" },
};

export default async function OperationsPage() {
  const [surveillants, missions, devis, incidents, affectations] = await Promise.all([
    getSurveillants(), getMissions(), getDevisList(), getIncidents(), getAffectations(),
  ]);

  const disponibles = surveillants.filter((s) => s.statut === "Disponible");
  const planifies = surveillants.filter((s) => s.statut === "Planifié");
  const missionsAVenir = missions.filter((m) => m.statut === "Planifiée" || m.statut === "Validée" || m.statut === "En cours");
  const pipeline = devis.filter((d) => (STATUTS_PIPELINE as readonly string[]).includes(d.statut));
  const confirmes = devis.filter((d) => (STATUTS_CA_CONFIRME as readonly string[]).includes(d.statut));
  const incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu");
  const pipelineHT = pipeline.reduce((s, d) => s + d.montantHT, 0);
  const confirmeHT = confirmes.reduce((s, d) => s + d.montantHT, 0);

  // Priorités du jour — dérivées des données réelles, jamais décoratives
  const priorites: Priorite[] = [];
  for (const inc of incidentsOuverts) {
    priorites.push({
      severite: inc.gravite === "critique" ? "critique" : "attention",
      tag: "Impact examen",
      titre: inc.gravite === "critique" ? "Incident critique à traiter" : "Incident à traiter",
      detail: `${inc.titre}${inc.salle ? ` · salle ${inc.salle}` : ""} · ${dateFR(inc.dateIncident)}`,
      action: "Ouvrir", href: "/operations/incidents",
    });
  }
  const missionActive = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Validée") ?? missions.find((m) => m.statut === "Planifiée");
  if (missionActive) {
    const rows = affectations.filter((a) => a.missionId === missionActive.id);
    const incomplets = rows.filter((a) => (!a.matin && !a.apm) || !a.salle).length;
    if (incomplets > 0) {
      priorites.push({
        severite: "attention", tag: "En cours", titre: "Mission active à sécuriser",
        detail: `${missionActive.client} · ${missionActive.reference} · ${dateFR(missionActive.dateMission)} · ${incomplets} affectation${incomplets > 1 ? "s" : ""} incomplète${incomplets > 1 ? "s" : ""}`,
        action: "Piloter", href: "/operations/planification",
      });
    }
  }
  for (const d of devis.filter((x) => x.statut === "Brouillon")) {
    priorites.push({ severite: "attention", tag: "Sans devis accepté", titre: "Devis à finaliser", detail: `${d.client} · ${d.reference} · ${euro(d.montantHT)} HT · brouillon`, action: "Finaliser", href: "/operations/devis" });
  }
  for (const d of devis.filter((x) => x.statut === "Envoyé")) {
    priorites.push({ severite: "suivre", tag: "En attente de réponse", titre: "Relance commerciale", detail: `${d.client} · ${d.reference} · ${euro(d.montantHT)} HT · envoyé`, action: "Relancer", href: "/operations/devis" });
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

  const vitals = [
    { v: String(missionsAVenir.length), l: "Missions à venir", s: `${missions.length} au total`, accent: false },
    { v: String(disponibles.length), l: "Équipe mobilisable", s: `${planifies.length} planifié${planifies.length > 1 ? "s" : ""} · ${surveillants.length} au total`, accent: false },
    { v: euro(pipelineHT), l: "Pipeline HT", s: `${pipeline.length} devis brouillon/envoyé`, accent: false },
    { v: euro(confirmeHT), l: "CA confirmé HT", s: `${confirmes.length} accepté${confirmes.length > 1 ? "s" : ""}/facturé${confirmes.length > 1 ? "s" : ""}`, accent: true },
  ];

  return (
    <div className="pilot" style={{ background: "transparent" }}>
      <PilotStyles />
      <div className="wrap">

        <header className="phead">
          <div>
            <div className="eyebrow">Opérations</div>
            <h1>Vue d&apos;ensemble</h1>
            <div className="sub">Pilotage opérationnel des examens — missions, équipe, devis, incidents</div>
          </div>
          <div className="actions">
            <ButtonLink href="/operations/missions" variant="primary"><Plus className="w-4 h-4" aria-hidden />Nouvelle mission</ButtonLink>
          </div>
        </header>

        {/* Ancrage sombre — vitals */}
        <section className="anchor">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "22px 34px", position: "relative" }}>
            {vitals.map((k) => (
              <div key={k.l}>
                <div className="num" style={{ fontSize: 27, fontWeight: 720, letterSpacing: "-.03em", lineHeight: 1, color: k.accent ? "#83e3b4" : "#fff" }}>{k.v}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#c2ccc7", marginTop: 8 }}>{k.l}</div>
                <div style={{ fontSize: 11.5, color: "#8fa19b", marginTop: 2 }}>{k.s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Priorités du jour */}
        {prioritesAffichees.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <SectionHead title="Priorités du jour" count={prioritesAffichees.length} />
            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: -2, marginBottom: 6 }}>Actions à traiter en premier pour sécuriser les examens et le chiffre d&apos;affaires</div>
            <div>
              {prioritesAffichees.map((p, i) => (
                <Link className="row" href={p.href} key={i}>
                  <span className="nm">{p.titre}</span>
                  <span className="sub">{p.tag} · {p.detail}</span>
                  <span className="right">
                    <Pill tone={SEV[p.severite].tone}>{SEV[p.severite].label}</Pill>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap" }}>{p.action} →</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Colonnes : missions + équipe | tendance (écho) + incidents + devis */}
        <div className="grid2">
          <div>
            <div className="block">
              <SectionHead title="Missions récentes" href="/operations/missions" hrefLabel="Voir tout →" />
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: -2, marginBottom: 6 }}>Sessions d&apos;examens planifiées et récentes</div>
              <div>
                {missions.map((m) => (
                  <Link className="row" href="/operations/missions" key={m.id}>
                    <span className="nm">{m.client}</span>
                    <span className="sub">{m.reference} · {dateFR(m.dateMission)} · {m.nbSalles} salles · {m.nbSurveillants} surv.</span>
                    <span className="right"><MissionBadge statut={m.statut} /></span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="block">
              <SectionHead title="Équipe — disponibilité" href="/operations/surveillants" hrefLabel="Voir l'équipe →" />
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: -2, marginBottom: 6 }}>{disponibles.length} disponibles · {planifies.length} planifiés · {surveillants.length} au total</div>
              <div>
                {surveillants.map((s) => (
                  <div className="row" key={s.id}>
                    <span className="nm">{s.nom}</span>
                    <span className="sub">{s.role} · {s.nbExamens} examens · {s.heures}h{s.heures >= SEUIL_SURCHARGE_H ? " · surcharge" : ""}</span>
                    <span className="right">
                      <span className="num" style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: "var(--warn)" }}>★ {s.note.toFixed(1)}</span>
                      <SurvBadge statut={s.statut} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside>
            {/* Tendance CA — écho de rythme */}
            <section className="echo">
              <SectionHead title="Tendance CA" />
              <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: -2 }}>montants HT / mois de mission</div>
              {tendance.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--ink3)", padding: "12px 0" }}>Aucune mission datée — la tendance apparaîtra dès la première mission planifiée.</p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "12px 0 14px" }}>
                    <span className="num" style={{ fontSize: 24, fontWeight: 730, letterSpacing: "-.03em", color: "var(--ink)" }}>{euro(dernier.total)}</span>
                    {variation !== null && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: variation >= 0 ? "var(--good)" : "var(--crit)" }}>{variation >= 0 ? "▲ +" : "▼ "}{variation}% vs mois préc.</span>
                    )}
                  </div>
                  <div>
                    {tendance.map((t) => (
                      <div className="camp" key={t.key} style={{ gridTemplateColumns: "44px 1fr 88px", borderTop: "1px solid var(--line)" }}>
                        <span className="sub" style={{ marginTop: 0 }}>{t.label}</span>
                        <span className="bar"><i style={{ width: `${Math.round((t.total / maxMois) * 100)}%`, background: "var(--good)" }} /></span>
                        <span className="v num" style={{ width: 88 }}>{euro(t.total)}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/operations/devis" style={{ display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>Voir les devis →</Link>
                </>
              )}
            </section>

            {/* Incidents ouverts */}
            {incidentsOuverts.map((inc) => (
              <div className="card" key={inc.id} style={{ marginTop: 20, borderColor: "color-mix(in srgb,var(--crit) 34%,var(--line))" }}>
                <div className="sig" style={{ alignItems: "flex-start" }}>
                  <span className="dot" style={{ background: "var(--crit)" }} />
                  <span>
                    <div className="t">{inc.titre} <span style={{ fontSize: 11, color: "var(--crit)", fontWeight: 600 }}>· {inc.gravite} · {inc.statut}</span></div>
                    <div className="d">{inc.salle ? `Salle ${inc.salle} · ` : ""}{dateFR(inc.dateIncident)}</div>
                  </span>
                </div>
                <Link href="/operations/incidents" style={{ display: "block", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "var(--crit)", borderTop: "1px solid var(--line2)", padding: "10px 0" }}>Voir l&apos;incident →</Link>
              </div>
            ))}

            {/* Devis */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="h"><span className="b sig">Devis</span><Link href="/operations/devis" className="s" style={{ color: "var(--brand)", fontWeight: 600 }}>Voir tout →</Link></div>
              {devis.map((d) => (
                <div className="rec" key={d.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ minWidth: 0 }}><div className="nm">{d.client}</div><div className="why" style={{ marginTop: 1 }}>{d.session ?? d.reference} · {d.nbSurveillants} surv.</div></span>
                  <span style={{ textAlign: "right", flex: "none" }}><div className="num" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{euro(d.montantHT)}</div><DevisBadge statut={d.statut} /></span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <QuickActions />
      </div>
    </div>
  );
}
