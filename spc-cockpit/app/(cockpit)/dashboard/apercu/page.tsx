import { redirect } from "next/navigation";

/**
 * Fusionné dans le Dashboard principal.
 * Le langage « centre de pilotage » validé ici est désormais celui de
 * /dashboard (voir docs/pilot-design-system.md). On garde cette route en
 * redirection pour ne casser aucun lien/bookmark existant.
 */
export default function DashboardApercuPage() {
  redirect("/dashboard");
}
