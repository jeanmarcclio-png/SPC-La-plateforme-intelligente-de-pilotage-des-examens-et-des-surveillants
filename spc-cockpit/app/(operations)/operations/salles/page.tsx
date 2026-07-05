export const dynamic = "force-dynamic";

import { getSalles } from "@/lib/operations/queries";
import { SallesBoard } from "@/components/ops/SallesBoard";
import { Kpi } from "@/components/ops/Kpi";
import { DoorOpen, GraduationCap, Users, Accessibility } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function SallesPage() {
  const salles = await getSalles();
  const etudiants = salles.reduce((s, x) => s + x.etudiants, 0);
  const surveillants = salles.reduce((s, x) => s + x.nbSurveillants, 0);
  const pmrTT = salles.filter((s) => s.pmr || s.tiersTemps).length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Salles" subtitle="Gestion des salles d&apos;examen, capacités et affectation des surveillants" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Salles" value={String(salles.length)} sub="configurées" icon={<DoorOpen className="w-4 h-4" />} />
        <Kpi label="Étudiants" value={String(etudiants)} sub="répartis" icon={<GraduationCap className="w-4 h-4" />} />
        <Kpi label="Surveillants" value={String(surveillants)} sub="affectés aux salles" icon={<Users className="w-4 h-4" />} />
        <Kpi label="Salles PMR/TT" value={String(pmrTT)} sub="aménagements spécifiques" icon={<Accessibility className="w-4 h-4" />} />
      </div>

      <SallesBoard salles={salles} />
    </div>
  );
}
