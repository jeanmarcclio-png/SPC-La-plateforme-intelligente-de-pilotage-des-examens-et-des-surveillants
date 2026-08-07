"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Bell, CalendarDays, ChevronDown, Clock, Euro as EuroIcon,
  History, Layers, MapPin, Scale, Sparkles, TrendingUp, UserPlus, Users,
} from "lucide-react";
import type { JournalEntry, Surveillant } from "@/lib/operations/types";
import type { VueSession } from "@/lib/operations/planification-vue";
import { heuresFR, lienSession } from "@/lib/operations/planification-vue";
import { dateFR, euro } from "@/lib/operations/format";
import { SessionEnTete } from "./SessionEnTete";
import { EtapesNav } from "./EtapesNav";

// PAGE 3 — OPTIMISER (prompt §7). Ne répète JAMAIS les 5 cartes de la Page 1 :
// on y trouve les recommandations actionnables, le contrôle (sous-effectifs,
// conflits, équilibrage, impact marge) et un aperçu contextualisé en accordéons.

type Onglet = "suggestions" | "remplacements" | "sous-effectifs" | "conflits" | "historique" | "journal";

const TON: Record<string, { fond: string; bordure: string; texte: string; pastille: string; label: string }> = {
  haute: { fond: "#FEF3F2", bordure: "#FDA29B", texte: "#B42318", pastille: "bg-[#FEE4E2] text-[#B42318]", label: "Priorité haute" },
  moyenne: { fond: "#FFFAEB", bordure: "#FEC84B", texte: "#B54708", pastille: "bg-[#FEF0C7] text-[#B54708]", label: "Priorité moyenne" },
  positive: { fond: "#ECFDF3", bordure: "#A6F4C5", texte: "#027A48", pastille: "bg-[#D1FADF] text-[#027A48]", label: "Impact positif" },
};

function Accordeon({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="border-t border-[#E6EAF0] first:border-t-0">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="w-full flex items-center justify-between gap-3 py-3 text-left min-h-[40px]"
      >
        <span className="text-[12.5px] font-semibold text-[#0F1F3D]">{titre}</span>
        <ChevronDown className={`w-4 h-4 text-[#98A2B3] transition-transform ${ouvert ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {ouvert && <div className="pb-3">{children}</div>}
    </div>
  );
}

function CarteControle({ titre, icone, teinte, children }: {
  titre: string; icone: React.ReactNode; teinte: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span aria-hidden className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${teinte}14`, color: teinte }}>
          {icone}
        </span>
        <h2 className="text-[12.5px] font-bold text-[#0F1F3D]">{titre}</h2>
      </div>
      {children}
    </section>
  );
}

export function CopiloteBoard({
  vue, disponibles, journal, ongletInitial = "suggestions",
}: {
  vue: VueSession; disponibles: Surveillant[]; journal: JournalEntry[]; ongletInitial?: Onglet;
}) {
  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  const { mission, couverture, rentabilite, equilibrage } = vue;

  const conflits = vue.lignes.flatMap((l) => l.alertes.filter((a) => a.niveau === "critique").map((a) => ({ ...a, nom: l.nom, salle: l.salle })));
  const avertissements = vue.lignes.flatMap((l) => l.alertes.filter((a) => a.niveau === "avertissement").map((a) => ({ ...a, nom: l.nom, salle: l.salle })));
  const remplacements = disponibles.slice(0, 3);
  const margeAvant = Math.round(rentabilite.tauxMarge * 100);
  const margeApres = Math.round(vue.tauxMargeApres * 100);
  const gain = vue.suggestions.find((s) => s.id === "marge")?.gainEuros ?? 0;

  const ONGLETS: { cle: Onglet; label: string; compteur?: number }[] = [
    { cle: "suggestions", label: "Suggestions", compteur: vue.suggestions.length },
    { cle: "remplacements", label: "Remplacements", compteur: remplacements.length },
    { cle: "sous-effectifs", label: "Sous-effectifs", compteur: couverture.manque },
    { cle: "conflits", label: "Conflits", compteur: conflits.length },
    { cle: "historique", label: "Historique IA" },
    { cle: "journal", label: "Journal des changements", compteur: journal.length },
  ];

  const lienPlanning = lienSession("/operations/planification/planning", mission.id);

  return (
    <>
      <EtapesNav missionId={mission.id} alertes={vue.alertes.length} />

      <SessionEnTete
        mission={mission}
        etat={{ nbSalles: vue.nbSalles, nbCreneaux: vue.nbCreneaux, nbAlertes: vue.alertes.length, nbLignes: vue.lignes.length, nbModifiees: 0 }}
        disponibles={disponibles}
        variante="compact"
        titre="Copilote IA & contrôle"
        sousTitre="Optimise la couverture, détecte les risques et guide les décisions"
      />

      {/* ── Navigation interne (§7.2) ── */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#E6EAF0] overflow-x-auto">
        {ONGLETS.map((o) => {
          const actif = onglet === o.cle;
          return (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle)}
              aria-pressed={actif}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                actif ? "border-[#6941C6] text-[#6941C6]" : "border-transparent text-[#667085] hover:text-[#0F1F3D]"
              }`}
            >
              {o.label}
              {typeof o.compteur === "number" && o.compteur > 0 && (
                <span className={`min-w-[18px] px-1 rounded-md text-[10.5px] font-bold ${actif ? "bg-[#6941C6]/10 text-[#6941C6]" : "bg-[#F2F4F7] text-[#667085]"}`}>{o.compteur}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1.1fr_1fr_0.9fr] lg:grid-cols-2">
        {/* ── Colonne gauche : recommandations actionnables (§7.3) ── */}
        <div className="space-y-2.5">
          <h2 className="text-[12.5px] font-bold text-[#0F1F3D]">
            {onglet === "remplacements" ? "Profils mobilisables" : onglet === "journal" ? "Journal des changements" : "Recommandations"}
          </h2>

          {onglet === "remplacements" ? (
            remplacements.length === 0 ? (
              <p className="text-[12.5px] text-[#667085] bg-white rounded-2xl border border-[#E6EAF0] p-4">Aucun surveillant disponible en dehors de cette session.</p>
            ) : remplacements.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-[#E6EAF0] p-3.5 flex items-center gap-3">
                <span aria-hidden className="w-9 h-9 rounded-full bg-[#6941C6]/10 text-[#6941C6] flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#0F1F3D] truncate">{s.nom}</p>
                  <p className="text-[11.5px] text-[#667085]">{s.role} · {s.heures} h planifiées · note {s.note}/5</p>
                </div>
                <Link href={lienPlanning} className="text-[11.5px] font-bold text-[#155EEF] hover:underline whitespace-nowrap">Affecter →</Link>
              </div>
            ))
          ) : onglet === "journal" ? (
            journal.length === 0 ? (
              <p className="text-[12.5px] text-[#667085] bg-white rounded-2xl border border-[#E6EAF0] p-4">Aucune modification enregistrée sur cette session.</p>
            ) : (
              <ul className="bg-white rounded-2xl border border-[#E6EAF0] divide-y divide-[#F1F3F7]">
                {journal.slice(0, 12).map((j) => (
                  <li key={j.id} className="p-3.5">
                    <p className="text-[12.5px] font-semibold text-[#0F1F3D]">{j.objet}</p>
                    <p className="text-[11.5px] text-[#667085] mt-0.5">
                      {j.ancienne ?? "—"} → <strong className="font-semibold text-[#0F1F3D]">{j.nouvelle ?? "—"}</strong>
                    </p>
                    <p className="text-[11px] text-[#98A2B3] mt-1">
                      {new Date(j.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })} · {j.utilisateur}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : vue.suggestions.length === 0 ? (
            <p className="text-[12.5px] font-semibold text-[#039855] bg-white rounded-2xl border border-[#E6EAF0] p-4">
              Aucune optimisation détectée — la session est prête.
            </p>
          ) : (
            vue.suggestions.map((s) => {
              const t = TON[s.priorite];
              return (
                <article key={s.id} className="rounded-2xl border p-3.5" style={{ background: t.fond, borderColor: t.bordure }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold text-[#0F1F3D]">{s.titre}</h3>
                      <p className="text-[11.5px] text-[#667085] mt-1 leading-relaxed">{s.detail}</p>
                      {s.gainEuros != null && (
                        <p className="text-[12px] font-bold mt-1" style={{ color: t.texte }}>Gain estimé : +{euro(s.gainEuros)}</p>
                      )}
                      <span className={`inline-flex mt-2 items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full ${t.pastille}`}>{t.label}</span>
                    </div>
                    <Link
                      href={lienPlanning}
                      className="flex-shrink-0 inline-flex items-center min-h-[40px] px-3 rounded-xl bg-white border text-[11.5px] font-bold whitespace-nowrap"
                      style={{ borderColor: t.bordure, color: t.texte }}
                    >
                      {s.actionLabel}
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ── Colonne centrale : contrôle (§7.4) ── */}
        <div className="space-y-3.5">
          <CarteControle titre="Sous-effectifs détectés" icone={<Users className="w-3.5 h-3.5" />} teinte="#E31B54">
            {vue.sousEffectifs.length === 0 ? (
              <p className="text-[12px] text-[#667085]">Aucun écart entre le matin et l&apos;après-midi sur les salles affectées.</p>
            ) : (
              <ul className="space-y-1.5">
                {vue.sousEffectifs.map((s) => (
                  <li key={`${s.salle}-${s.periode}`} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 text-[#0F1F3D]">
                      <MapPin className="w-3.5 h-3.5 text-[#98A2B3]" aria-hidden />
                      <strong className="font-semibold">{s.salle}</strong>
                      <span className="text-[#667085]">({s.periode === "matin" ? "matin" : "après-midi"})</span>
                    </span>
                    <span className="text-[#B42318] font-semibold whitespace-nowrap">
                      {s.presents} sur {s.reference}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#E6EAF0] text-[12px]">
              <span className="font-semibold text-[#B42318]">{couverture.manque} surveillant{couverture.manque > 1 ? "s" : ""} à trouver</span>
              <span className="font-bold text-[#155EEF]">{Math.round(couverture.tauxCouverture * 100)} % de couverture</span>
            </div>
          </CarteControle>

          <CarteControle titre="Conflits / alertes" icone={<Bell className="w-3.5 h-3.5" />} teinte="#F04438">
            {conflits.length === 0 && avertissements.length === 0 ? (
              <p className="text-[12px] font-semibold text-[#039855]">Aucun conflit détecté sur cette session.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...conflits, ...avertissements].slice(0, 6).map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] text-[#0F1F3D]">
                    <AlertTriangle
                      className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      style={{ color: a.niveau === "critique" ? "#F04438" : "#F79009" }}
                      aria-hidden
                    />
                    <span>{a.texte}</span>
                  </li>
                ))}
              </ul>
            )}
          </CarteControle>

          <CarteControle titre="Rééquilibrage de charge" icone={<Scale className="w-3.5 h-3.5" />} teinte="#6941C6">
            <div className="flex items-center justify-between gap-3 text-[11.5px] text-[#667085] mb-1.5">
              <span>Écart max : <strong className="font-bold text-[#0F1F3D]">{heuresFR(equilibrage.ecartMax, 1)}</strong></span>
              <span>cible : ± {equilibrage.cible} h</span>
            </div>
            <div className="h-2 rounded-full bg-[#F2F4F7] overflow-hidden" role="img" aria-label={`Écart de charge ${heuresFR(equilibrage.ecartMax, 1)} pour une cible de plus ou moins ${equilibrage.cible} heures`}>
              <div
                className="h-full rounded-full bar-fill"
                style={{
                  width: `${Math.min(100, equilibrage.cible > 0 ? (equilibrage.ecartMax / (equilibrage.cible * 3)) * 100 : 0)}%`,
                  background: equilibrage.aRepartir > 0 ? "#6941C6" : "#039855",
                }}
              />
            </div>
            {equilibrage.plusCharge && equilibrage.moinsCharge && (
              <p className="text-[11.5px] text-[#667085] mt-2">
                {equilibrage.plusCharge.nom} {heuresFR(equilibrage.plusCharge.heures, 2)} · {equilibrage.moinsCharge.nom} {heuresFR(equilibrage.moinsCharge.heures, 2)}
              </p>
            )}
            <Link
              href={lienPlanning}
              className="mt-3 inline-flex items-center justify-center w-full min-h-[40px] rounded-xl border border-[#E6EAF0] text-[12px] font-semibold text-[#6941C6] hover:bg-[#6941C6]/[0.05] transition-colors"
            >
              {equilibrage.aRepartir > 0 ? "Rééquilibrer dans le planning" : "Ouvrir le planning"}
            </Link>
          </CarteControle>

          <CarteControle titre="Impact sur la marge" icone={<TrendingUp className="w-3.5 h-3.5" />} teinte="#039855">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-[#F7F9FC] px-3 py-2.5 text-center">
                <div className="text-[10.5px] text-[#667085]">Avant</div>
                <div className="text-[19px] font-extrabold text-[#0F1F3D]">{margeAvant} %</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#98A2B3] flex-shrink-0" aria-hidden />
              <div className="flex-1 rounded-xl bg-[#ECFDF3] px-3 py-2.5 text-center">
                <div className="text-[10.5px] text-[#027A48]">Après</div>
                <div className="text-[19px] font-extrabold text-[#027A48]">{margeApres} %</div>
              </div>
            </div>
            <p className="text-[11.5px] text-[#667085] mt-2">
              {gain > 0
                ? `Estimation fondée sur ${heuresFR(equilibrage.aRepartir, 1)} redistribuées, soit +${euro(gain)} de marge.`
                : "Aucun levier de marge identifié : la charge est déjà équilibrée."}
            </p>
          </CarteControle>
        </div>

        {/* ── Colonne droite : aperçu contextualisé (§7.5) ── */}
        <div>
          <section className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm p-4">
            <h2 className="text-[12.5px] font-bold text-[#0F1F3D] mb-3">Aperçu de la session</h2>
            <dl className="space-y-2">
              {[
                { icone: <CalendarDays className="w-3.5 h-3.5" />, k: "Date", v: dateFR(mission.dateMission) },
                { icone: <MapPin className="w-3.5 h-3.5" />, k: "Lieu", v: mission.client },
                { icone: <Layers className="w-3.5 h-3.5" />, k: "Salles", v: String(vue.nbSalles) },
                { icone: <Clock className="w-3.5 h-3.5" />, k: "Créneaux", v: String(vue.nbCreneaux) },
                { icone: <Users className="w-3.5 h-3.5" />, k: "Surveillants planifiés", v: `${couverture.affectes} / ${couverture.requis} requis` },
                { icone: <Clock className="w-3.5 h-3.5" />, k: "Heures planifiées", v: heuresFR(vue.heuresTotal, 2) },
                { icone: <Sparkles className="w-3.5 h-3.5" />, k: "Taux de couverture", v: `${Math.round(couverture.tauxCouverture * 100)} %` },
                { icone: <EuroIcon className="w-3.5 h-3.5" />, k: "Marge estimée", v: `${margeAvant} %` },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-[12px] text-[#667085]">
                    <span aria-hidden className="text-[#98A2B3]">{r.icone}</span>{r.k}
                  </dt>
                  <dd className="text-[12.5px] font-bold text-[#0F1F3D] text-right">{r.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3">
              <Accordeon titre="Détail financier">
                <dl className="space-y-1.5">
                  {[
                    ["CA HT", euro(rentabilite.caHT)],
                    ["Coût surveillants", euro(rentabilite.coutHT)],
                    ["Marge HT", euro(rentabilite.margeHT)],
                    ["Taux de marge", `${margeAvant} %`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-[12px]">
                      <dt className="text-[#667085]">{k}</dt>
                      <dd className="font-bold text-[#0F1F3D]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Accordeon>
              <Accordeon titre="Journal des modifications">
                {journal.length === 0 ? (
                  <p className="text-[11.5px] text-[#667085]">Aucune modification enregistrée.</p>
                ) : (
                  <ul className="space-y-2">
                    {journal.slice(0, 5).map((j) => (
                      <li key={j.id} className="text-[11.5px]">
                        <span className="font-semibold text-[#0F1F3D]">{j.objet}</span>
                        <span className="block text-[#98A2B3]">
                          {new Date(j.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {j.utilisateur}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Accordeon>
              <Accordeon titre="Informations complémentaires">
                <p className="text-[11.5px] text-[#667085] leading-relaxed">
                  Référence {mission.reference} · type {mission.type} · statut {mission.statut}.
                  Les heures sont calculées en minutes exactes puis additionnées une seule fois ;
                  la couverture compare les surveillants disposant d&apos;un créneau à l&apos;effectif requis
                  par la session. L&apos;IA propose, elle n&apos;applique rien sans votre action.
                </p>
              </Accordeon>
            </div>
          </section>
        </div>
      </div>

      {/* ── Historique des décisions IA (§7.6) ── */}
      <section className="mt-4 bg-white rounded-2xl border border-[#E6EAF0] shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span aria-hidden className="w-9 h-9 rounded-xl bg-[#6941C6]/10 text-[#6941C6] flex items-center justify-center">
            <History className="w-4 h-4" />
          </span>
          <h2 className="text-[13px] font-bold text-[#0F1F3D]">Historique des décisions</h2>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { k: "Modifications tracées", v: String(journal.length) },
            { k: "Recommandations ouvertes", v: String(vue.suggestions.length) },
            { k: "Gain de marge estimé", v: gain > 0 ? `+${euro(gain)}` : "—" },
            { k: "Alertes à traiter", v: String(vue.alertes.length) },
          ].map((s) => (
            <div key={s.k}>
              <div className="text-[10.5px] text-[#667085]">{s.k}</div>
              <div className="text-[16px] font-extrabold text-[#0F1F3D]">{s.v}</div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOnglet("journal")}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-[#E6EAF0] text-[12px] font-semibold text-[#155EEF] hover:bg-[#F7F9FC] transition-colors"
          >
            Voir l&apos;historique complet<ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </section>
    </>
  );
}
