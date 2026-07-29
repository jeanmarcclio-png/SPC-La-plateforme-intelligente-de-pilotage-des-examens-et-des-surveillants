// Helpers purs du portail client public — importables côté client comme serveur
// (aucune dépendance Supabase / node:crypto ici). Le portail travaille en
// snake_case (mêmes clés que la base) pour éviter tout double mapping.

export interface PortailSalle {
  date_examen?: string;
  creneau: "matin" | "apres-midi";
  salle: string;
  batiment?: string;
  etudiants: number;
  surveillants: number;
  pmr: boolean;
  tiers_temps: boolean;
  debut_examen?: string;
  fin_examen?: string;
  debut_surveillance?: string;
  fin_surveillance?: string;
  observations?: string;
  ordre?: number;
}

export interface PortailPayload {
  etablissement: string;
  campus?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  reference_client?: string;
  type_etablissement?: string;
  demandeur_prenom?: string;
  demandeur_nom?: string;
  demandeur_fonction?: string;
  demandeur_email?: string;
  demandeur_telephone?: string;
  demandeur_service?: string;
  resp_client_prenom?: string;
  resp_client_nom?: string;
  resp_client_fonction?: string;
  resp_client_email?: string;
  resp_client_telephone?: string;
  pmr_present: boolean;
  pmr_nombre: number;
  pmr_details?: string;
  tiers_temps_present: boolean;
  tiers_temps_nombre: number;
  tiers_temps_details?: string;
  besoins_specifiques: string[];
  observations?: string;
  salles: PortailSalle[];
}

/** État renvoyé par les fonctions scellées du portail (spc_portail_get/submit). */
export type PortailEtat = "ok" | "invalide" | "expire" | "revoque" | "soumis" | "erreur";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Un payload vierge (formulaire non pré-rempli). */
export function emptyPortailPayload(): PortailPayload {
  return {
    etablissement: "",
    pmr_present: false, pmr_nombre: 0,
    tiers_temps_present: false, tiers_temps_nombre: 0,
    besoins_specifiques: [],
    salles: [],
  };
}

/**
 * Contrôle bloquant minimal côté client avant soumission (spec §14). SPC
 * effectue ensuite le contrôle complet à 3 niveaux. Retourne la liste des
 * erreurs bloquantes (vide = soumission autorisée).
 */
export function validatePortailPayload(p: PortailPayload): string[] {
  const err: string[] = [];
  if (!p.etablissement?.trim()) err.push("Le nom de l'établissement est obligatoire.");
  if (!p.demandeur_nom?.trim() || !p.demandeur_email?.trim()) err.push("Le nom et l'email du demandeur sont obligatoires.");
  if (p.demandeur_email?.trim() && !EMAIL_RE.test(p.demandeur_email.trim())) err.push("L'email du demandeur n'est pas valide.");
  if (p.resp_client_email?.trim() && !EMAIL_RE.test(p.resp_client_email.trim())) err.push("L'email du responsable n'est pas valide.");

  const salles = p.salles.filter((s) => s.salle?.trim());
  if (salles.length === 0) err.push("Renseignez au moins une salle.");
  if (salles.length > 0 && !salles.some((s) => s.date_examen)) err.push("Renseignez au moins une date d'examen.");
  for (const s of salles) {
    if (s.etudiants <= 0) err.push(`Salle ${s.salle} : effectif étudiants manquant.`);
    if (s.surveillants <= 0) err.push(`Salle ${s.salle} : nombre de surveillants manquant.`);
    if (s.debut_surveillance && s.fin_surveillance && s.debut_surveillance >= s.fin_surveillance) {
      err.push(`Salle ${s.salle} : l'horaire de surveillance est incohérent.`);
    }
  }
  if (p.pmr_present && p.pmr_nombre <= 0) err.push("PMR signalé : précisez l'effectif.");
  if (p.tiers_temps_present && p.tiers_temps_nombre <= 0) err.push("Tiers-temps signalé : précisez l'effectif.");
  return err;
}

/** Message client selon l'état renvoyé par le serveur. */
export function portailEtatMessage(etat: PortailEtat | string | undefined): string {
  switch (etat) {
    case "expire":   return "Ce lien a expiré. Contactez SPC pour en obtenir un nouveau.";
    case "revoque":  return "Ce lien a été désactivé. Contactez SPC pour en obtenir un nouveau.";
    case "soumis":   return "Cette demande a déjà été transmise à SPC. Merci !";
    case "invalide": return "Ce lien n'est pas valide.";
    default:         return "Une erreur est survenue. Merci de réessayer.";
  }
}
