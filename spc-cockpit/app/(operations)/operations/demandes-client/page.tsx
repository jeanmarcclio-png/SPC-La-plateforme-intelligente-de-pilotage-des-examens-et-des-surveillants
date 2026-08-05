import { DemandesWorkspace } from "@/components/ops/demandes/DemandesWorkspace";
import { OPS_CONTENT_CLASS } from "@/components/ops/shell";

// Point d'entrée interne SPC pour les demandes clients reçues avant mission.
// Accès réservé aux utilisateurs SPC (layout Opérations). MVP : pas de portail
// client public, pas d'authentification client.
export default function DemandesClientPage() {
  return (
    <div className={OPS_CONTENT_CLASS}>
      <DemandesWorkspace />
    </div>
  );
}
