"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, CalendarDays, Clock, Sparkles, TrendingUp, Users, X } from "lucide-react";
import type { Mission, Surveillant } from "@/lib/operations/types";
import type { VueSession } from "@/lib/operations/planification-vue";
import { heuresFR, lienSession } from "@/lib/operations/planification-vue";
import { dateFR, euro } from "@/lib/operations/format";
import { SessionEnTete } from "./SessionEnTete";
import { EtapesNav } from "./EtapesNav";

// PAGE 1 — PILOTER (prompt §5). Lecture exécutive en moins de 10 secondes :
// 5 cartes de commandement, une bande financière unique, le sélecteur de
// sessions et un résumé IA. Le détail vit en Page 2 et Page 3 — jamais ici.

const COULEURS = {
  bleu: "#155EEF", violet: "#6941C6", vert: "#039855", orange: "#F79009",
  rouge: "#F04438", rose: "#E31B54", texte: "#0F1F3D", secondaire: "#667085", faible: "#98A2B3",
};

function Carte({ titre, icone, teinte, children, action }: {
  titre: string; icone: React.ReactNode; teinte: string; children: React.ReactNode; action: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2.5">
        <span aria-hidden className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${teinte}14`, color: teinte }}>
          {icone}
        </span>
        <h2 className="text-[12.5px] font-bold text-[#0F1F3D]">{titre}</h2>
      </div>
      <div className="flex-1">{children}</div>
      <div className="mt-2.5">{action}</div>
    </section>
  );
}

function LienCarte({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#155EEF] hover:text-[#175CD3] transition-colors">
      {children}
      <ArrowRight className="w-3 h-3" aria-hidden />
    </Link>
  );
}

export function CommandCenter({
  vue, sessions, disponibles,
}: {
  vue: VueSession; sessions: Mission[]; disponibles: Surveillant[];
}) {
  const [financier, setFinancier] = useState(false);
  const { mission, couverture, rentabilite, sante } = vue;
  const covPct = Math.min(100, Math.round(couverture.tauxCouverture * 100));
  const margePct = Math.round(rentabilite.tauxMarge * 100);

  const santeCouleur = sante.niveau === "prête" ? COULEURS.vert : sante.niveau === "à consolider" ? COULEURS.orange : COULEURS.rouge;
  const santePastille = sante.niveau === "prête" ? "bg-emerald-50 text-emerald-700" : sante.niveau === "à consolider" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  const margeTon = rentabilite.niveau === "saine" ? "bg-emerald-50 text-emerald-700" : rentabilite.niveau === "surveiller" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  const margeLabel = rentabilite.niveau === "saine" ? "Marge saine" : rentabilite.niveau === "surveiller" ? "Marge à surveiller" : "Marge critique";

  const R = 26, C = 2 * Math.PI * R;
  const lienPlanning = lienSession("/operations/planification/planning", mission.id);
  const lienCopilote = (onglet?: string) =>
    `${lienSession("/operations/planification/copilote", mission.id)}${onglet ? `&onglet=${onglet}` : ""}`;

  const alertesUniques = vue.alertes.slice(0, 2);

  return (
    <>
      <EtapesNav missionId={mission.id} alertes={vue.alertes.length} />

      <SessionEnTete
        mission={mission}
        etat={{ nbSalles: vue.nbSalles, nbCreneaux: vue.nbCreneaux, nbAlertes: vue.alertes.length, nbLignes: vue.lignes.length, nbModifiees: 0 }}
        disponibles={disponibles}
      />

      {/* ── 5 cartes de commandement (§5.2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 mb-4">
        <Carte
          titre="Santé de la session"
          icone={<Sparkles className="w-3.5 h-3.5" />}
          teinte={santeCouleur}
          action={<LienCarte href={lienCopilote()}>Voir le détail</LienCarte>}
        >
          <div className="flex items-center gap-3">
            <div className="relative w-[62px] h-[62px] flex-shrink-0">
              <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden className="-rotate-90">
                <circle cx="31" cy="31" r={R} fill="none" stroke="#EEF0F4" strokeWidth="6" />
                <circle cx="31" cy="31" r={R} fill="none" stroke={santeCouleur} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - sante.score / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-extrabold text-[#0F1F3D] leading-none">{sante.score}</span>
                <span className="text-[8px] font-bold text-[#98A2B3]">/100</span>
              </div>
            </div>
            <div className="min-w-0">
              <span className={`inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full ${santePastille}`}>
                {sante.niveau === "prête" ? "Prête" : sante.niveau === "à consolider" ? "À améliorer" : "À risque"}
              </span>
              <ul className="mt-1.5 space-y-1">
                {sante.recommandations.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex items-start gap-1 text-[11px] text-[#667085] leading-snug">
                    <span aria-hidden style={{ color: santeCouleur }}>•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Carte>

        <Carte
          titre="Couverture surveillants"
          icone={<Users className="w-3.5 h-3.5" />}
          teinte={couverture.manque > 0 ? COULEURS.rose : COULEURS.vert}
          action={<LienCarte href={lienCopilote("sous-effectifs")}>Voir la couverture</LienCarte>}
        >
          <div className="text-[28px] font-extrabold leading-none text-[#0F1F3D]">
            {couverture.affectes}
            <span className="text-[15px] text-[#98A2B3] font-bold"> / {couverture.requis} requis</span>
          </div>
          {couverture.manque > 0 && (
            <p className="text-[11.5px] font-semibold mt-1.5" style={{ color: COULEURS.rose }}>
              {couverture.manque} surveillant{couverture.manque > 1 ? "s" : ""} à trouver
            </p>
          )}
          <div className="mt-2 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden">
            <div className="h-full rounded-full bar-fill" style={{ width: `${covPct}%`, background: couverture.manque > 0 ? COULEURS.rose : COULEURS.vert }} />
          </div>
          <p className="text-[11.5px] text-[#667085] mt-1"><strong className="font-bold" style={{ color: COULEURS.bleu }}>{covPct} %</strong> de couverture</p>
        </Carte>

        <Carte
          titre="Marge estimée — cette session"
          icone={<TrendingUp className="w-3.5 h-3.5" />}
          teinte={COULEURS.vert}
          action={<LienCarte href={lienCopilote()}>Voir l&apos;analyse</LienCarte>}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[28px] font-extrabold leading-none" style={{ color: COULEURS.vert }}>{margePct} %</span>
            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${margeTon}`}>{margeLabel}</span>
          </div>
          <p className="text-[16px] font-extrabold text-[#0F1F3D] mt-1.5">{euro(rentabilite.margeHT)}</p>
          <p className="text-[11.5px] text-[#98A2B3]">Sur CA HT de {euro(rentabilite.caHT)}</p>
        </Carte>

        <Carte
          titre="Heures planifiées"
          icone={<Clock className="w-3.5 h-3.5" />}
          teinte={COULEURS.bleu}
          action={<LienCarte href={lienPlanning}>Voir le planning</LienCarte>}
        >
          <div className="text-[28px] font-extrabold leading-none text-[#0F1F3D]">{heuresFR(vue.heuresTotal, 2)}</div>
          <p className="text-[11.5px] text-[#98A2B3] mt-1">Planifiées</p>
          <p className="text-[11.5px] text-[#667085] mt-1.5">Moyenne / surveillant</p>
          <p className="text-[15px] font-extrabold text-[#0F1F3D]">{heuresFR(vue.heuresMoyenne, 2)}</p>
        </Carte>

        <Carte
          titre="Refus / alertes"
          icone={<Bell className="w-3.5 h-3.5" />}
          teinte={vue.alertes.length > 0 ? COULEURS.rouge : COULEURS.vert}
          action={<LienCarte href={lienCopilote("conflits")}>Voir les alertes</LienCarte>}
        >
          {vue.alertes.length === 0 ? (
            <p className="text-[12.5px] font-semibold" style={{ color: COULEURS.vert }}>Aucune alerte — session saine</p>
          ) : (
            <>
              <p className="text-[15px] font-extrabold" style={{ color: COULEURS.rouge }}>
                {vue.alertes.length} alerte{vue.alertes.length > 1 ? "s" : ""} active{vue.alertes.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-1.5 space-y-1">
                {alertesUniques.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#667085] leading-snug">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: COULEURS.rouge }} aria-hidden />
                    <span className="line-clamp-2">{a.texte}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Carte>
      </div>

      {/* ── Bande financière unique (§5.3) ── */}
      <div className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm mb-5 flex items-stretch divide-x divide-[#E6EAF0] flex-wrap">
        {[
          { label: "CA HT", valeur: euro(rentabilite.caHT), couleur: COULEURS.texte },
          { label: "Coût surveillants", valeur: euro(rentabilite.coutHT), couleur: COULEURS.secondaire },
          { label: "Marge HT", valeur: euro(rentabilite.margeHT), couleur: rentabilite.margeHT >= 0 ? COULEURS.vert : COULEURS.rouge },
          { label: "Taux de marge — session", valeur: `${margePct} %`, couleur: COULEURS.vert },
        ].map((m) => (
          <div key={m.label} className="flex-1 min-w-[150px] px-5 py-3.5">
            <div className="text-[11px] text-[#667085]">{m.label}</div>
            <div className="text-[19px] font-extrabold mt-0.5" style={{ color: m.couleur }}>{m.valeur}</div>
          </div>
        ))}
        <div className="flex items-center px-4">
          <button
            type="button"
            onClick={() => setFinancier(true)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-[#E6EAF0] text-[12px] font-semibold text-[#155EEF] hover:bg-[#F7F9FC] transition-colors whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5" aria-hidden />Voir le détail financier
          </button>
        </div>
      </div>

      {/* ── Sélecteur de sessions (§5.4) ── */}
      <h2 className="text-[13px] font-bold text-[#0F1F3D] mb-2.5">Sélectionner une session</h2>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {sessions.slice(0, 7).map((m) => {
          const actif = m.id === mission.id;
          return (
            <Link
              key={m.id}
              href={lienSession("/operations/planification", m.id)}
              aria-current={actif ? "true" : undefined}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                actif ? "border-[#155EEF] bg-[#155EEF]/[0.06]" : "border-[#E6EAF0] bg-white hover:border-[#D0D5DD]"
              }`}
            >
              <CalendarDays className={`w-3.5 h-3.5 flex-shrink-0 ${actif ? "text-[#155EEF]" : "text-[#98A2B3]"}`} aria-hidden />
              <span className="leading-tight">
                <span className={`block text-[12.5px] font-bold ${actif ? "text-[#155EEF]" : "text-[#0F1F3D]"}`}>{dateFR(m.dateMission)}</span>
                <span className="block text-[11px] text-[#667085]">{m.client}</span>
              </span>
            </Link>
          );
        })}
        <Link
          href="/operations/missions"
          className="inline-flex items-center px-3.5 py-2.5 rounded-xl border border-dashed border-[#D0D5DD] text-[12px] font-semibold text-[#667085] hover:border-[#98A2B3] transition-colors"
        >
          Toutes les sessions
        </Link>
      </div>

      {/* ── Bandeau IA léger (§5.5) — résumé uniquement ── */}
      <div className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#6941C614", color: COULEURS.violet }}>
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-[#0F1F3D]">Copilote d&apos;affectation</h2>
            <p className="text-[12px] text-[#667085]">Résumé IA pour vous aider à finaliser votre session.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="rounded-xl bg-[#155EEF]/[0.06] px-3 py-2 text-[12px] text-[#0F1F3D]">
            <strong className="font-extrabold">{vue.couverture.manque}</strong> surveillant{vue.couverture.manque > 1 ? "s" : ""} à mobiliser
          </span>
          <span className="rounded-xl bg-[#F04438]/[0.07] px-3 py-2 text-[12px] text-[#0F1F3D]">
            <strong className="font-extrabold">{vue.alertes.filter((a) => a.niveau === "critique").length}</strong> conflit(s) détecté(s)
          </span>
          <span className="rounded-xl bg-[#F79009]/[0.09] px-3 py-2 text-[12px] text-[#0F1F3D]">
            <strong className="font-extrabold">{vue.sousEffectifs.length}</strong> salle(s) en écart
          </span>
          <Link
            href={lienCopilote()}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl text-white text-[12.5px] font-semibold shadow-sm transition-opacity hover:opacity-95"
            style={{ background: `linear-gradient(90deg, ${COULEURS.violet}, #7A5AF8)` }}
          >
            Voir les recommandations
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Détail financier — drawer, jamais une page de plus (§14) */}
      {financier && (
        <div role="dialog" aria-modal="true" aria-label="Détail financier de la session" className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/30" onClick={() => setFinancier(false)} />
          <div className="relative w-full max-w-[400px] h-full bg-white shadow-xl p-5 overflow-y-auto animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[16px] font-extrabold text-[#0F1F3D]">Détail financier</h2>
                <p className="text-[12px] text-[#667085]">{mission.client} — {dateFR(mission.dateMission)}</p>
              </div>
              <button type="button" onClick={() => setFinancier(false)} aria-label="Fermer le détail financier" className="w-10 h-10 flex items-center justify-center rounded-xl text-[#98A2B3] hover:bg-[#F7F9FC]">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <dl className="space-y-0">
              {[
                ["CA HT de la session", euro(rentabilite.caHT)],
                ["Heures planifiées", heuresFR(vue.heuresTotal, 2)],
                ["Coût surveillants estimé", euro(rentabilite.coutHT)],
                ["Marge HT", euro(rentabilite.margeHT)],
                ["Taux de marge — session", `${margePct} %`],
                ["Marge après optimisation", `${Math.round(vue.tauxMargeApres * 100)} %`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#E6EAF0] last:border-0">
                  <dt className="text-[12.5px] text-[#667085]">{k}</dt>
                  <dd className="text-[13px] font-bold text-[#0F1F3D]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11.5px] text-[#98A2B3] mt-4 leading-relaxed">
              Marge HT = CA HT − coût des surveillants. Le coût est estimé à partir des heures réellement
              planifiées et du taux horaire de chaque surveillant. Les heures sont sommées en minutes exactes.
            </p>
            <Link
              href={lienCopilote()}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#155EEF] hover:text-[#175CD3]"
            >
              Voir les leviers d&apos;optimisation<ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
