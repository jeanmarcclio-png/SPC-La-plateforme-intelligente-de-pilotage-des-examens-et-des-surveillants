"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, ShieldCheck } from "lucide-react";
import type { AlerteMission } from "@/lib/operations/missions-dashboard";
import { CarteRepliable } from "./Collapsible";

// « Alertes & points d'attention » (§12.2) — uniquement des écarts mesurés,
// produits par alertesMissions. Le compteur du titre est exactement le nombre
// d'alertes listées : aucune divergence possible entre le badge et la liste.

const STYLE = {
  critique: { couleur: "#FF3E4D", libelle: "Bloquant", icone: AlertTriangle },
  avertissement: { couleur: "#FF842B", libelle: "Attention", icone: AlertTriangle },
  information: { couleur: "#168AF5", libelle: "Information", icone: Info },
} as const;

export function MissionAlertsCard({ alertes }: { alertes: AlerteMission[] }) {
  return (
    <CarteRepliable
      cle="alertes"
      titre="Alertes & points d'attention — toutes missions"
      compteur={alertes.length}
      pied={
        <Link href="/operations/cockpit" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#4F46F5] hover:text-[#3730c9] transition-colors">
          Voir toutes les alertes
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      }
    >
      {alertes.length === 0 ? (
        <p className="flex items-center gap-2 text-[12.5px] text-[#13B979] font-semibold py-3">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
          Aucun point bloquant détecté
        </p>
      ) : (
        <ul className="space-y-2 pt-0.5">
          {alertes.map((a) => {
            const s = STYLE[a.niveau];
            const Icone = s.icone;
            return (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="flex items-start gap-2 min-h-[40px] py-1.5 rounded-lg text-[12.5px] hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <Icone className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: s.couleur }} aria-hidden />
                  <span className="min-w-0">
                    <span className="font-semibold" style={{ color: s.couleur }}>
                      {s.libelle} —{" "}
                    </span>
                    <span className="text-[#11182D]">{a.titre}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CarteRepliable>
  );
}
