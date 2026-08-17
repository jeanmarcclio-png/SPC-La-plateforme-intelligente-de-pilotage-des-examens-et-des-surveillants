/**
 * Traduction honnête des erreurs d'authentification Supabase.
 *
 * POURQUOI CE MODULE EXISTE
 * -------------------------
 * La page de connexion traduisait TOUTE erreur par « Email ou mot de passe
 * incorrect. » — y compris « projet injoignable », « clé d'API invalide » ou
 * « compte non confirmé ».
 *
 * C'est le même vice que le repli mock corrigé par l'audit (BUG-002) : une
 * panne présentée comme un résultat. L'utilisateur ressaisit indéfiniment un
 * mot de passe correct, et l'exploitant ne voit jamais que son instance n'est
 * pas raccordée. Un message faux coûte plus cher qu'un message technique.
 *
 * CE QUE CE MODULE NE FAIT PAS
 * ----------------------------
 * Il ne divulgue pas si un compte existe : « identifiants incorrects » couvre
 * indifféremment l'adresse inconnue et le mauvais mot de passe. Distinguer les
 * deux permettrait d'énumérer les comptes.
 *
 * En revanche, il distingue toujours ce qui relève de la SAISIE de ce qui
 * relève de la CONFIGURATION — cette frontière-là n'a aucune valeur pour un
 * attaquant, et toute la valeur pour l'exploitant.
 */

/** Forme minimale d'une erreur Supabase, sans dépendre du type exporté. */
export type ErreurAuth = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
};

export type DiagnosticAuth = {
  /** Message affiché à l'utilisateur. */
  message: string;
  /**
   * `true` quand la cause est une panne, une configuration absente ou une clé
   * invalide — donc rien que l'utilisateur puisse corriger en ressaisissant.
   * L'interface s'en sert pour ne pas laisser croire à une faute de frappe.
   */
  configuration: boolean;
};

export function diagnostiquerErreurAuth(erreur: ErreurAuth | null | undefined): DiagnosticAuth {
  if (!erreur) {
    return { message: "", configuration: false };
  }

  const code = (erreur.code ?? "").toLowerCase();
  const nom = (erreur.name ?? "").toLowerCase();
  const texte = (erreur.message ?? "").toLowerCase();
  const statut = erreur.status;

  // --- 1. Service injoignable -----------------------------------------------
  // `AuthRetryableFetchError` est ce que remonte supabase-js quand la requête
  // n'aboutit pas : URL de projet erronée, projet en pause (offre gratuite,
  // après 7 jours d'inactivité), coupure réseau.
  if (
    nom.includes("retryable") ||
    texte.includes("failed to fetch") ||
    texte.includes("networkerror") ||
    texte.includes("load failed") ||
    statut === 0 ||
    (typeof statut === "number" && statut >= 500)
  ) {
    return {
      configuration: true,
      message:
        "Le service d'authentification est injoignable. Ce n'est pas votre mot de passe : " +
        "l'instance est absente, en pause, ou l'adresse du projet est erronée.",
    };
  }

  // --- 2. Clé d'API invalide ------------------------------------------------
  // Configuration côté hébergeur : la clé « anon » ne correspond pas au projet.
  if (texte.includes("api key") || code === "invalid_api_key" || statut === 401) {
    return {
      configuration: true,
      message:
        "La clé d'API du projet est invalide ou absente. Ce n'est pas votre mot de passe : " +
        "la variable NEXT_PUBLIC_SUPABASE_ANON_KEY doit être corrigée côté hébergement.",
    };
  }

  // --- 3. Compte existant mais non confirmé ---------------------------------
  // Cas fréquent à la mise en service : un compte créé sans « Auto Confirm
  // User » refuse la connexion avec un mot de passe pourtant juste.
  if (code === "email_not_confirmed" || texte.includes("not confirmed")) {
    return {
      configuration: true,
      message:
        "Ce compte existe mais n'est pas confirmé. Validez le courriel de confirmation, " +
        "ou activez « Auto Confirm User » sur le compte dans Supabase.",
    };
  }

  // --- 4. Trop de tentatives ------------------------------------------------
  if (statut === 429 || code.includes("rate_limit")) {
    return {
      configuration: false,
      message: "Trop de tentatives. Patientez une minute avant de réessayer.",
    };
  }

  // --- 5. Identifiants réellement refusés -----------------------------------
  if (code === "invalid_credentials" || statut === 400) {
    return {
      configuration: false,
      message: "Email ou mot de passe incorrect.",
    };
  }

  // --- 6. Reste : ne pas inventer -------------------------------------------
  // Un cas non prévu ne doit pas être maquillé en « mot de passe incorrect ».
  // Le code technique est affiché : c'est laid, mais c'est diagnosticable.
  return {
    configuration: true,
    message: `Connexion impossible (${erreur.code || erreur.status || erreur.name || "cause inconnue"}). Ce n'est pas votre mot de passe.`,
  };
}
