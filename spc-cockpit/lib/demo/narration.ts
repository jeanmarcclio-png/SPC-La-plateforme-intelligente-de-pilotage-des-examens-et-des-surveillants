// Narration de la démonstration — texte lu ET affiché.
//
// Le texte est la source unique : il est montré à l'écran, et la synthèse
// vocale du navigateur le lit. Jamais l'inverse. Une explication disponible
// seulement en audio exclut les visiteurs sourds ou malentendants, ceux qui
// consultent en salle d'attente sans écouteurs, et ceux dont le navigateur ne
// propose aucune voix française — soit une part considérable des personnes à
// qui l'on montre un produit.
//
// RÈGLES D'ÉCRITURE
// -----------------
// · Phrases courtes : la synthèse vocale butte sur les subordonnées longues.
// · Aucun sigle non développé à la première occurrence (« PMR » se lit « pé em
//   erre » et n'apprend rien à qui ne le connaît pas déjà).
// · Pas de chiffre présenté comme réel : le jeu est fictif, la narration le
//   rappelle plutôt que de laisser le visiteur croire à des volumes vrais.
// · On parle métier — ce que l'écran RÉSOUT — pas interface.

export interface EtapeNarration {
  /** Titre court, affiché en tête de l'étape. */
  titre: string;
  /** Texte lu et affiché. Une à trois phrases. */
  texte: string;
}

export interface ScriptEcran {
  /** Nom de l'écran, affiché dans l'en-tête du narrateur. */
  ecran: string;
  etapes: EtapeNarration[];
}

/**
 * Scripts par chemin. La correspondance se fait par préfixe le plus long, ce
 * qui permet à `/operations/devis/[id]` d'hériter du script de `/operations/devis`
 * sans le dupliquer.
 */
const SCRIPTS: Record<string, ScriptEcran> = {
  "/operations/cockpit": {
    ecran: "Cockpit",
    etapes: [
      {
        titre: "À quoi sert cet écran",
        texte:
          "Le cockpit répond à une seule question, celle que le responsable des examens se pose chaque matin : " +
          "est-ce que la session du jour va se tenir sans incident ? Tout ce qui est affiché ici sert à y répondre en moins de dix secondes.",
      },
      {
        titre: "Les indicateurs du haut",
        texte:
          "Les cinq indicateurs de la première ligne couvrent la couverture en surveillants, les salles engagées, " +
          "les incidents ouverts et la charge financière de la session. Ils ne sont jamais décoratifs : " +
          "chacun est calculé à partir des affectations réelles, et chacun est cliquable pour descendre au détail qui l'explique.",
      },
      {
        titre: "Les alertes",
        texte:
          "Une alerte n'apparaît que si une action est possible. Un surveillant manquant, une salle sans responsable, " +
          "un aménagement de tiers-temps non couvert. Le principe est simple : si vous ne pouvez rien faire, ce n'est pas une alerte, c'est du bruit.",
      },
      {
        titre: "Ce que vous regardez",
        texte:
          "Attention : cette démonstration affiche un jeu fictif. Les noms, les montants et les volumes sont inventés. " +
          "Sur une instance réelle, ces mêmes écrans lisent votre base de données, et le bandeau jaune du haut disparaît.",
      },
    ],
  },

  "/operations/missions": {
    ecran: "Missions",
    etapes: [
      {
        titre: "La mission, unité de travail",
        texte:
          "Une mission, c'est une session d'examen pour un établissement, à une date donnée. " +
          "Tout s'y rattache : les salles, les surveillants, les aménagements, le devis et la facture.",
      },
      {
        titre: "Le cycle de vie",
        texte:
          "Une mission passe par des états successifs : à planifier, planifiée, en cours, terminée, facturée. " +
          "Cet état n'est jamais saisi à la main. Il se déduit des affectations et des émargements, ce qui évite qu'un tableau raconte autre chose que la réalité du terrain.",
      },
      {
        titre: "Pourquoi c'est la porte d'entrée",
        texte:
          "En exploitation, on ouvre rarement une liste de surveillants. On ouvre une mission, et on regarde ce qui lui manque.",
      },
    ],
  },

  "/operations/planification": {
    ecran: "Planification",
    etapes: [
      {
        titre: "Le problème à résoudre",
        texte:
          "Affecter des surveillants, c'est croiser quatre contraintes en même temps : " +
          "leurs disponibilités, leur zone géographique, leurs qualifications, et la règle du quota par salle.",
      },
      {
        titre: "Matin et après-midi sont indépendants",
        texte:
          "C'est une règle du métier, et elle est appliquée strictement. Un surveillant disponible le matin ne l'est pas automatiquement l'après-midi. " +
          "Les deux demi-journées se planifient séparément, parce que c'est ainsi que les gens travaillent réellement.",
      },
      {
        titre: "L'assistance à la décision",
        texte:
          "Le copilote propose des affectations et signale les risques : sous-couverture, surcharge d'un surveillant, aménagement non pourvu. " +
          "Il propose, il ne décide pas. La validation reste humaine, toujours.",
      },
    ],
  },

  "/operations/surveillants": {
    ecran: "Surveillants",
    etapes: [
      {
        titre: "Le vivier",
        texte:
          "Chaque surveillant porte ses disponibilités, sa zone d'intervention, ses qualifications et son taux horaire. " +
          "C'est ce référentiel qui alimente la planification.",
      },
      {
        titre: "Données personnelles",
        texte:
          "Ces fiches contiennent des données personnelles au sens du règlement européen. " +
          "Sur une instance réelle, elles sont cloisonnées par établissement au niveau de la base de données elle-même, " +
          "et non par un filtre dans le code — ce qui rend le cloisonnement impossible à contourner par oubli.",
      },
    ],
  },

  "/operations/salles": {
    ecran: "Salles",
    etapes: [
      {
        titre: "Le référentiel des lieux",
        texte:
          "Capacité, bâtiment, accessibilité, équipement. La capacité conditionne le nombre de surveillants requis, " +
          "et l'accessibilité conditionne l'affectation des candidats qui en ont besoin.",
      },
      {
        titre: "Cohérence avec le devis",
        texte:
          "La grille de salles et les heures facturées proviennent de la même source. " +
          "Elles ne peuvent pas diverger : c'était un défaut identifié en audit, il a été corrigé à la racine plutôt qu'affiché en avertissement.",
      },
    ],
  },

  "/operations/pmr": {
    ecran: "Aménagements",
    etapes: [
      {
        titre: "Tiers-temps et aménagements",
        texte:
          "Cet écran gère les aménagements d'épreuve : temps majoré, salle dédiée, assistance, matériel adapté. " +
          "C'est souvent le point le plus sensible d'une session, et le plus coûteux à rattraper le jour même.",
      },
      {
        titre: "Ce sont des données de santé",
        texte:
          "Un aménagement révèle une situation de handicap. Le règlement européen classe cette information en catégorie particulière. " +
          "Elle appelle donc un hébergement en Union européenne, un accès restreint, et une durée de conservation définie. " +
          "Ce n'est pas une contrainte technique, c'est une obligation légale.",
      },
    ],
  },

  "/operations/presence": {
    ecran: "Présence",
    etapes: [
      {
        titre: "Le jour de l'examen",
        texte:
          "L'émargement se fait depuis le terrain, sur téléphone. Les arrivées, les retards et les absences remontent en direct dans le cockpit.",
      },
      {
        titre: "Pourquoi c'est le cœur du service",
        texte:
          "C'est ce qui distingue une plateforme de pilotage d'un simple tableur de planning. " +
          "Le planning dit ce qui était prévu. La présence dit ce qui se passe. L'écart entre les deux, c'est votre métier.",
      },
    ],
  },

  "/operations/incidents": {
    ecran: "Incidents",
    etapes: [
      {
        titre: "Traçabilité",
        texte:
          "Retard, absence, suspicion de fraude, problème matériel. Chaque incident est horodaté, rattaché à une mission et à une salle, " +
          "et suivi jusqu'à sa clôture.",
      },
      {
        titre: "L'usage réel",
        texte:
          "En cas de contestation d'un candidat, plusieurs mois après, c'est ce registre qui fait foi. " +
          "Sa valeur ne se mesure pas le jour où on le remplit, mais le jour où on doit le produire.",
      },
    ],
  },

  "/operations/devis": {
    ecran: "Devis",
    etapes: [
      {
        titre: "Un moteur de calcul unique",
        texte:
          "Tous les montants du produit sortent du même moteur. Aucun écran ne recalcule un prix dans son coin. " +
          "C'est ce qui garantit que le devis, le cockpit et la facture affichent le même chiffre.",
      },
      {
        titre: "La règle de référence",
        texte:
          "Le cas témoin du métier : cent heures, à trente euros, avec vingt pour cent de majoration et cinquante euros de frais, " +
          "donnent quatre mille trois cent quatre-vingts euros toutes taxes comprises. Ce calcul est vérifié automatiquement à chaque modification du code.",
      },
    ],
  },

  "/operations/facturation": {
    ecran: "Facturation",
    etapes: [
      {
        titre: "Du réalisé, pas du prévu",
        texte:
          "La facture est construite à partir des heures réellement effectuées, relevées à l'émargement — " +
          "pas à partir du planning initial. C'est la différence entre facturer ce qui était prévu et facturer ce qui a eu lieu.",
      },
      {
        titre: "Le contrôle qui compte",
        texte:
          "Avant toute mise en service réelle, une session passée est rejouée intégralement dans l'outil, " +
          "et le montant obtenu est comparé à celui qui avait été facturé. S'ils diffèrent, on ne met pas en service.",
      },
    ],
  },

  "/operations/rapports": {
    ecran: "Rapports",
    etapes: [
      {
        titre: "Après la session",
        texte:
          "Le rapport post-session consolide la couverture, les incidents, les écarts et le coût réel. " +
          "C'est le livrable que l'établissement attend, et c'est souvent lui qui décide du renouvellement du contrat.",
      },
    ],
  },

  "/operations": {
    ecran: "Opérations",
    etapes: [
      {
        titre: "Bienvenue",
        texte:
          "Vous êtes dans une démonstration de Survéo, la plateforme de pilotage des examens et des surveillants. " +
          "Les données affichées sont entièrement fictives et aucune modification n'est enregistrée.",
      },
      {
        titre: "Comment visiter",
        texte:
          "Le menu de gauche suit le déroulé réel d'une session : la mission, la planification, le jour de l'examen, puis la facturation. " +
          "Ce panneau commente chaque écran au fur et à mesure. Vous pouvez le replier à tout moment.",
      },
    ],
  },
};

/** Script par défaut, pour tout écran non commenté. */
const PAR_DEFAUT: ScriptEcran = {
  ecran: "Démonstration",
  etapes: [
    {
      titre: "Démonstration",
      texte:
        "Vous parcourez une démonstration de Survéo. Les données sont fictives et aucune modification n'est enregistrée. " +
        "Les écrans commentés sont accessibles depuis le menu de gauche.",
    },
  ],
};

/**
 * Script de l'écran courant, par correspondance de préfixe la plus longue.
 * `/operations/devis/42` retombe donc sur le script de `/operations/devis`,
 * et `/operations/planification/planning` sur celui de la planification.
 */
export function scriptPour(chemin: string): ScriptEcran {
  let meilleur: ScriptEcran | null = null;
  let longueur = -1;
  for (const [prefixe, script] of Object.entries(SCRIPTS)) {
    if ((chemin === prefixe || chemin.startsWith(prefixe + "/")) && prefixe.length > longueur) {
      meilleur = script;
      longueur = prefixe.length;
    }
  }
  return meilleur ?? PAR_DEFAUT;
}
