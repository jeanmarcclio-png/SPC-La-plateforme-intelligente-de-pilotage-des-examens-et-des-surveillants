import { DemandesCockpit } from "@/components/ops/demandes/DemandesCockpit";

// Cockpit des demandes clients — point d'entrée interne SPC pour les demandes
// reçues avant mission. Accès réservé aux utilisateurs SPC (layout Opérations).
// MVP : pas de portail client public, pas d'authentification client.
//
// Cette page porte son propre thème « Dark Graphite » (pleine largeur) : elle
// n'utilise donc pas OPS_CONTENT_CLASS, dont les marges sont reprises à
// l'intérieur du fond sombre par DemandesCockpit.
export default function DemandesClientPage() {
  return <DemandesCockpit />;
}
