"use client";

import { useCallback, useId, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

// Sections repliables du centre de pilotage Missions.
// – état conservé pour la durée de la session utilisateur (sessionStorage) ;
// – déplié par défaut sur desktop, replié sous 768 px (§11.2 / §15) ;
// – aria-expanded + aria-controls sur le déclencheur, animation 200 ms
//   neutralisée par prefers-reduced-motion.
//
// Le premier rendu est identique côté serveur et côté client (defautDesktop) :
// la préférence stockée et la taille d'écran ne sont appliquées qu'après montage,
// ce qui évite toute erreur d'hydratation.

const PREFIXE = "spc.missions.section.";

// La préférence de repli vit dans sessionStorage : c'est un système externe à
// React, lu via useSyncExternalStore (pas de setState dans un effet, pas de
// rendu en cascade). Le rendu serveur utilise le défaut desktop, puis
// l'hydratation aligne l'état sur la préférence réelle de l'utilisateur.

const abonnes = new Set<() => void>();

function souscrire(notifier: () => void) {
  abonnes.add(notifier);
  return () => {
    abonnes.delete(notifier);
  };
}

function lire(cle: string, defautDesktop: boolean): boolean {
  try {
    const stocke = window.sessionStorage.getItem(PREFIXE + cle);
    if (stocke === "1") return true;
    if (stocke === "0") return false;
  } catch {
    /* mode privé / quota : on retombe sur la règle d'écran */
  }
  // Aucune préférence : replié sur petit écran, déplié au-delà.
  return window.matchMedia("(min-width: 768px)").matches ? defautDesktop : false;
}

function ecrire(cle: string, valeur: boolean) {
  try {
    window.sessionStorage.setItem(PREFIXE + cle, valeur ? "1" : "0");
  } catch {
    /* ignoré : l'état reste au moins cohérent pour le rendu courant */
  }
  abonnes.forEach((notifier) => notifier());
}

export function useSectionRepliable(cle: string, defautDesktop = true) {
  const id = `section-${cle}`;
  const ouvert = useSyncExternalStore(
    souscrire,
    () => lire(cle, defautDesktop),
    () => defautDesktop
  );
  const basculer = useCallback(() => ecrire(cle, !lire(cle, defautDesktop)), [cle, defautDesktop]);

  return { ouvert, basculer, id };
}

/** Bouton chevron accessible — libellé explicite, jamais une icône seule. */
export function BoutonRepli({
  ouvert,
  onClick,
  controls,
  libelle,
  ton = "clair",
}: {
  ouvert: boolean;
  onClick: () => void;
  controls: string;
  libelle: string;
  ton?: "clair" | "sombre";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ouvert}
      aria-controls={controls}
      aria-label={`${ouvert ? "Replier" : "Déplier"} ${libelle}`}
      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        ton === "sombre"
          ? "text-white/70 hover:text-white hover:bg-white/10"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
      }`}
    >
      <ChevronDown
        className={`w-[18px] h-[18px] transition-transform duration-200 motion-reduce:transition-none ${ouvert ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}

/** Conteneur animé — hauteur auto sans saut de contenu. */
export function CorpsRepliable({
  id,
  ouvert,
  children,
}: {
  id: string;
  ouvert: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      // `inert` sort le contenu replié du parcours clavier et des lecteurs
      // d'écran sans le retirer du DOM — l'animation de repli reste possible.
      inert={!ouvert}
      className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: ouvert ? "1fr" : "0fr" }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Carte repliable standard des trois blocs secondaires. */
export function CarteRepliable({
  cle,
  titre,
  compteur,
  children,
  pied,
}: {
  cle: string;
  titre: string;
  compteur?: number;
  children: React.ReactNode;
  pied?: React.ReactNode;
}) {
  const { ouvert, basculer, id } = useSectionRepliable(cle);
  const titreId = useId();

  return (
    <section
      aria-labelledby={titreId}
      className="bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 pl-5 pr-2 py-3">
        <h2 id={titreId} className="text-[11.5px] font-bold uppercase tracking-[0.9px] text-slate-600">
          {titre}
          {typeof compteur === "number" && <span className="text-slate-400 font-semibold"> ({compteur})</span>}
        </h2>
        <BoutonRepli ouvert={ouvert} onClick={basculer} controls={id} libelle={`la section ${titre}`} />
      </div>
      <CorpsRepliable id={id} ouvert={ouvert}>
        <div className="px-5 pb-4">{children}</div>
        {pied && <div className="px-5 py-3 border-t border-[#EDF0F5]">{pied}</div>}
      </CorpsRepliable>
    </section>
  );
}
