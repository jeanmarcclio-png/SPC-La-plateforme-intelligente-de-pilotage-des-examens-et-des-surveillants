"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";

// Le bouton primaire de l'en-tête de page et la barre d'outils du tableau
// ouvrent LE MÊME formulaire (une seule implémentation de création).
// L'en-tête étant rendu côté serveur au-dessus du tableau, la demande transite
// par un évènement applicatif nommé plutôt que par un état dupliqué.

export const EVENEMENT_NOUVELLE_MISSION = "spc:nouvelle-mission";

export function NouvelleMissionBouton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENEMENT_NOUVELLE_MISSION))}
      className="min-h-[40px] inline-flex items-center gap-1.5 px-4 rounded-xl text-white text-[13px] font-semibold shadow-sm bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <Plus className="w-4 h-4" aria-hidden />
      Nouvelle mission
    </button>
  );
}

/** Abonne un composant client à la demande de création de mission. */
export function useDemandeNouvelleMission(onDemande: () => void) {
  useEffect(() => {
    window.addEventListener(EVENEMENT_NOUVELLE_MISSION, onDemande);
    return () => window.removeEventListener(EVENEMENT_NOUVELLE_MISSION, onDemande);
  }, [onDemande]);
}
