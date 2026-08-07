"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock, CheckCircle2, Circle, DoorOpen, Users, GraduationCap, FileText,
  UsersRound, Clock, Euro as EuroIcon, CalendarRange, ArrowRight, Sparkles,
} from "lucide-react";
import type { VueMissionActive } from "@/lib/operations/missions-dashboard";
import type { Mission } from "@/lib/operations/types";
import { dateFR, euro, pourcent } from "@/lib/operations/format";
import { BoutonRepli, CorpsRepliable, useSectionRepliable } from "./Collapsible";
import { ProgressRing } from "./Charts";
import { MissionDetailsDialog } from "./MissionDetailsDialog";

// Bandeau « Mission active » — centre visuel de la page (§11).
// Toutes les valeurs proviennent de vueMissionActive : la checklist, le résumé,
// les indicateurs clés et les alertes lisent le MÊME calcul, ce qui rend toute
// contradiction impossible (14/14 ⇒ 100 % ⇒ aucune alerte de sous-effectif).

const PANNEAU = "linear-gradient(135deg, #071A3A 0%, #0A2147 100%)";

function couleurCouverture(taux: number): string {
  if (taux >= 1) return "#13B979";
  if (taux >= 0.8) return "#FF842B";
  return "#FF3E4D";
}

function Colonne({ titre, children, className = "" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`px-5 py-5 ${className}`}>
      <h3 className="text-[10.5px] font-bold uppercase tracking-[1px] text-[#8FA3C4] mb-3.5">{titre}</h3>
      {children}
    </section>
  );
}

function LigneResume({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px] text-white">
      <span aria-hidden className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-[#9FB6D8] flex-shrink-0">
        {icone}
      </span>
      {children}
    </li>
  );
}

function MiniIndicateur({
  icone, couleur, libelle, valeur, detail, barre,
}: {
  icone: React.ReactNode; couleur: string; libelle: string; valeur: string; detail: string; barre?: number;
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/10 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}26`, color: couleur }}>
          {icone}
        </span>
        <span className="text-[11.5px] font-semibold text-[#B8C4D9]">{libelle}</span>
      </div>
      <div className="text-[19px] font-extrabold text-white mt-1.5 leading-none">{valeur}</div>
      <div className="text-[10.5px] text-[#8FA3C4] mt-1.5">{detail}</div>
      {typeof barre === "number" && (
        <span aria-hidden className="mt-2 block h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <span className="block h-full rounded-full bar-fill" style={{ width: `${Math.min(100, barre * 100)}%`, background: couleur }} />
        </span>
      )}
    </div>
  );
}

function ActionRapide({ href, onClick, icone, children }: { href?: string; onClick?: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  const cls =
    "w-full min-h-[40px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/10 text-[12.5px] font-semibold text-white hover:bg-white/[0.12] hover:ring-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  const contenu = (
    <>
      <span aria-hidden className="text-[#9FB6D8]">{icone}</span>
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{contenu}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{contenu}</button>;
}

export function ActiveMissionCard({ vue }: { vue: VueMissionActive }) {
  const { ouvert, basculer, id } = useSectionRepliable("mission-active");
  const [detail, setDetail] = useState(false);
  const m = vue.mission;
  const taux = Math.min(1, vue.couverture.tauxCouverture);
  const couleurTaux = couleurCouverture(taux);

  return (
    <section
      aria-label={`Mission active — ${m.client}`}
      className="bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] overflow-hidden mb-5"
    >
      {/* En-tête clair */}
      <div className="flex items-center justify-between gap-3 flex-wrap pl-5 pr-2 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#168AF5]" />
            <span className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-[#64708A]">Mission active</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <h2 className="text-[19px] md:text-[20px] font-extrabold text-[#11182D] tracking-tight">
              {m.client} — {dateFR(m.dateMission)}
            </h2>
            {m.session && (
              <span className="text-[11px] font-semibold text-[#4F46F5] bg-[#ECEBFF] rounded-full px-2.5 py-1">{m.session}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDetail(true)}
            className="min-h-[40px] px-3.5 rounded-xl border border-[#E3E8F1] bg-white text-[12.5px] font-semibold text-[#11182D] hover:bg-slate-50 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Voir le détail
          </button>
          <BoutonRepli ouvert={ouvert} onClick={basculer} controls={id} libelle="le détail de la mission active" />
        </div>
      </div>

      {/* Corps sombre */}
      <CorpsRepliable id={id} ouvert={ouvert}>
        {/* 1 colonne < 768 px · 2 colonnes en tablette · 4 colonnes ≥ 1280 px.
            Les séparateurs suivent la grille : bordure droite entre colonnes
            d'une même ligne, bordure basse entre deux lignes. */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 text-white" style={{ background: PANNEAU }}>
          {/* A — Avancement de préparation */}
          <Colonne titre="Avancement préparation" className="border-b border-white/[0.08] md:border-r xl:border-b-0">
            <div className="flex items-center gap-4">
              <ProgressRing valeur={vue.preparation.pourcentage}>
                <span className="text-[22px] font-extrabold leading-none">{vue.preparation.pourcentage} %</span>
                <span className="text-[10px] text-[#8FA3C4] mt-0.5">préparé</span>
              </ProgressRing>
              <ul className="space-y-2 min-w-0">
                {vue.preparation.etapes.map((e) => (
                  <li key={e.cle} className="flex items-center gap-2 text-[12px]">
                    {e.fait ? (
                      <CheckCircle2 className="w-4 h-4 text-[#13B979] flex-shrink-0" aria-hidden />
                    ) : (
                      <Circle className="w-4 h-4 text-[#5D7098] flex-shrink-0" aria-hidden />
                    )}
                    <span className={e.fait ? "text-white" : "text-[#B8C4D9]"}>
                      {e.label}
                      <span className="sr-only"> — {e.fait ? "terminé" : "en cours"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Colonne>

          {/* B — Résumé */}
          <Colonne titre="Résumé de la mission" className="border-b border-white/[0.08] xl:border-b-0 xl:border-r">
            <ul className="space-y-2.5">
              <LigneResume icone={<DoorOpen className="w-3.5 h-3.5" />}>
                <span><strong className="font-extrabold">{m.nbSalles}</strong> salle{m.nbSalles > 1 ? "s" : ""}</span>
              </LigneResume>
              <LigneResume icone={<Users className="w-3.5 h-3.5" />}>
                <span>
                  <strong className="font-extrabold">{vue.couverture.affectes}</strong>
                  <span className="text-[#B8C4D9]">/{vue.couverture.requis}</span> surveillants affectés
                </span>
              </LigneResume>
              {vue.candidats !== null && (
                <LigneResume icone={<GraduationCap className="w-3.5 h-3.5" />}>
                  <span><strong className="font-extrabold">{vue.candidats}</strong> candidats</span>
                </LigneResume>
              )}
              <LigneResume icone={<FileText className="w-3.5 h-3.5" />}>
                <span>{m.type}</span>
              </LigneResume>
              <LigneResume icone={<CalendarClock className="w-3.5 h-3.5" />}>
                <span>{dateFR(m.dateMission)}</span>
              </LigneResume>
            </ul>
          </Colonne>

          {/* C — Indicateurs clés */}
          <Colonne titre="Indicateurs clés" className="border-b border-white/[0.08] md:border-b-0 md:border-r">
            <div className="space-y-2.5">
              <MiniIndicateur
                icone={<UsersRound className="w-3.5 h-3.5" />}
                couleur={couleurTaux}
                libelle="Taux de couverture"
                valeur={pourcent(taux)}
                detail={vue.couverture.manque > 0 ? `${vue.couverture.manque} surveillant(s) à mobiliser` : "effectif complet"}
                barre={taux}
              />
              <MiniIndicateur
                icone={<Clock className="w-3.5 h-3.5" />}
                couleur="#168AF5"
                libelle="Heures prévues"
                valeur={vue.heuresLabel}
                detail={vue.minutesPlanifiees > 0 ? "créneaux planifiés" : "aucun créneau planifié"}
              />
              <MiniIndicateur
                icone={<EuroIcon className="w-3.5 h-3.5" />}
                couleur="#FF842B"
                libelle="Montant estimé HT"
                valeur={euro(vue.montantHT)}
                detail={vue.montantSource}
              />
            </div>
          </Colonne>

          {/* D — Actions rapides */}
          <Colonne titre="Actions rapides">
            <div className="space-y-2.5">
              <ActionRapide href="/operations/planification" icone={<CalendarRange className="w-3.5 h-3.5" />}>Voir le planning</ActionRapide>
              <ActionRapide href="/operations/surveillants" icone={<Users className="w-3.5 h-3.5" />}>Gérer les surveillants</ActionRapide>
              <ActionRapide onClick={() => setDetail(true)} icone={<FileText className="w-3.5 h-3.5" />}>Détails de la mission</ActionRapide>
              {vue.couverture.manque > 0 && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#FFC9A0] pt-1">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden />
                  {vue.couverture.manque} poste{vue.couverture.manque > 1 ? "s" : ""} à pourvoir avant la session.
                </p>
              )}
            </div>
          </Colonne>
        </div>
      </CorpsRepliable>

      <MissionDetailsDialog
        mission={detail ? m : null}
        onClose={() => setDetail(false)}
        details={{
          avancement: vue.preparation.pourcentage,
          surveillantsAffectes: vue.couverture.affectes,
          affectationsSuivies: vue.affectationsSuivies,
          candidats: vue.candidats,
          heuresLabel: vue.heuresLabel,
        }}
      />
    </section>
  );
}

/** État « aucune mission active » (§21) — jamais un bandeau vide. */
export function AucuneMissionActive({ prochaine }: { prochaine?: Mission | null }) {
  return (
    <section
      aria-label="Aucune mission active"
      className="bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] p-6 mb-5 flex items-center justify-between gap-4 flex-wrap"
    >
      <div>
        <h2 className="text-[16px] font-extrabold text-[#11182D]">Aucune mission active</h2>
        <p className="text-[12.5px] text-[#64708A] mt-1">
          {prochaine
            ? `Prochaine session planifiée : ${prochaine.client} — ${dateFR(prochaine.dateMission)}.`
            : "Aucune session n'est actuellement engagée ni planifiée."}
        </p>
      </div>
      <Link
        href="/operations/planification"
        className="min-h-[40px] inline-flex items-center gap-2 px-4 rounded-xl text-white text-[12.5px] font-semibold shadow-sm bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        Voir les missions planifiées
        <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </section>
  );
}
