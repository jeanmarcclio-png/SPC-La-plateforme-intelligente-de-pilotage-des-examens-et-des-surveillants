"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RepartitionCA } from "@/lib/operations/missions-dashboard";
import { euro, euroEntier, pourcent } from "@/lib/operations/format";
import { CarteRepliable } from "./Collapsible";
import { Donut } from "./Charts";

// « Répartition du CA HT » (§12.3) — trois segments disjoints dont la somme est
// exactement le KPI « CA total (HT) ». Le donut est décoratif : la légende
// porte les montants et les parts, et un tableau lisible par lecteur d'écran
// reprend l'intégralité des valeurs.

const COULEURS: Record<RepartitionCA["parts"][number]["cle"], string> = {
  terminees: "#13B979",
  enCours: "#168AF5",
  aVenir: "#FF842B",
};

export function RevenueDistributionCard({ ca }: { ca: RepartitionCA }) {
  return (
    <CarteRepliable
      cle="ca"
      titre="Répartition du CA (HT)"
      pied={
        <Link href="/operations/facturation" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#4F46F5] hover:text-[#3730c9] transition-colors">
          Voir le détail
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      }
    >
      {ca.total === 0 ? (
        <p className="text-[12.5px] text-[#8D97AA] py-3">Aucun chiffre d&apos;affaires enregistré sur les missions.</p>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          <Donut segments={ca.parts.map((p) => ({ label: p.label, valeur: p.montant, couleur: COULEURS[p.cle] }))}>
            <span className="text-[15px] font-extrabold text-[#11182D] leading-none">{euroEntier(ca.total)}</span>
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#8D97AA] mt-1">Total HT</span>
          </Donut>

          <dl className="flex-1 min-w-[150px] space-y-2">
            {ca.parts.map((p) => (
              <div key={p.cle} className="flex items-center justify-between gap-2 text-[12px]">
                <dt className="flex items-center gap-2 text-[#64708A]">
                  <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COULEURS[p.cle] }} />
                  {p.label}
                </dt>
                <dd className="text-right">
                  <span className="font-bold text-[#11182D]">{euroEntier(p.montant)}</span>
                  <span className="text-[#8D97AA] ml-1.5">({pourcent(p.part)})</span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="sr-only">
            Répartition du chiffre d&apos;affaires hors taxes, total {euro(ca.total)} :{" "}
            {ca.parts.map((p) => `${p.label} ${euro(p.montant)} soit ${pourcent(p.part)}`).join(", ")}.
          </p>
        </div>
      )}
    </CarteRepliable>
  );
}
