// Identité fictive du mode démonstration (SPC_DEMO=1).
//
// Une démonstration publique n'a ni base, ni compte, ni session. Il lui faut
// pourtant un utilisateur et une organisation, sans quoi les gardes de layout
// (`requireActiveOrgId`) redirigent vers /onboarding et l'écran ne s'affiche
// jamais.
//
// Ces valeurs sont volontairement RECONNAISSABLES : le domaine `demonstration`
// et le libellé « démonstration » doivent sauter aux yeux si elles apparaissent
// quelque part où on ne les attendait pas. Un jeu de démonstration qui se fait
// passer pour du réel est exactement le défaut corrigé par BUG-001 / BUG-002.

/** Organisation fictive présentée au visiteur de la démonstration. */
export const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000d3d";
export const DEMO_ORG_NOM = "Campus de démonstration";
export const DEMO_ORG_SLUG = "demonstration";

/**
 * Compte fictif. Aucun compte de ce nom n'existe dans aucune instance.
 *
 * La partie locale de l'adresse est REGARDÉE, pas seulement stockée :
 * l'interface en dérive le nom affiché et les initiales de l'en-tête
 * (`nomDepuisEmail`, qui découpe sur « . », « _ » et « - » puis capitalise).
 * Un `visite.demonstration@…` produisait « Visite Demonstration », sans accent
 * et bancal — ce qu'on ne montre pas à un prospect. Un seul mot rend « Demo »,
 * et l'initiale « D ».
 *
 * Volontairement en ASCII : une adresse accentuée afficherait « Démo », mais
 * les adresses internationalisées se comportent mal dès qu'un composant les
 * valide ou les normalise. Un accent affiché ne vaut pas ce risque-là.
 */
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000de";
export const DEMO_EMAIL = "demo@surveo.example";

/**
 * Rôle servi en démonstration. « admin » pour que le visiteur voie l'intégralité
 * de l'interface — les écritures restent refusées par le client de démonstration
 * lui-même, pas par le contrôle de rôle.
 */
export const DEMO_ROLE = "admin";

/** Message unique de refus d'écriture. Repris tel quel par les Server Actions. */
export const DEMO_MESSAGE_ECRITURE =
  "Mode démonstration : cette modification n'est pas enregistrée. " +
  "Les données affichées sont fictives et reviennent à leur état initial à chaque chargement.";

/**
 * Utilisateur au format attendu par supabase-js. Typé `unknown` puis converti
 * au point d'usage : reproduire ici le type `User` complet n'apporterait rien
 * qu'une dette de synchronisation à chaque montée de version.
 */
export function utilisateurDemo() {
  const maintenant = new Date().toISOString();
  return {
    id: DEMO_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: DEMO_EMAIL,
    email_confirmed_at: maintenant,
    phone: "",
    confirmed_at: maintenant,
    last_sign_in_at: maintenant,
    app_metadata: { provider: "demo", providers: ["demo"] },
    user_metadata: { nom: "Visite de démonstration" },
    identities: [],
    created_at: maintenant,
    updated_at: maintenant,
    is_anonymous: false,
  };
}

/** Session au format attendu par supabase-js (jeton non valide, jamais émis). */
export function sessionDemo() {
  return {
    access_token: "demo-aucun-jeton",
    refresh_token: "demo-aucun-jeton",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: utilisateurDemo(),
  };
}
