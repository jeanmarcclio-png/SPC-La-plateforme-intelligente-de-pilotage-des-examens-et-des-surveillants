"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";
import type { Mission } from "@/lib/operations/types";
import { isoDuJour, prochainesMissions } from "@/lib/operations/missions-dashboard";
import { CarteRepliable } from "./Collapsible";

// « Prochaines missions à venir » — jamais une session passée (§12.1).
// Le filtre chronologique est recalculé après montage avec la date LOCALE du
// navigateur : un utilisateur à Nouméa et un serveur en UTC ne voient pas une
// session de la veille présentée comme « à venir ». Le premier rendu utilise la
// date du serveur, ce qui évite toute erreur d'hydratation.

const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];

// L'horloge du poste est un système externe : elle est lue via
// useSyncExternalStore (aucun abonnement — la date du jour ne change pas au
// cours d'une session de travail) plutôt qu'avec un setState dans un effet.
const sansAbonnement = () => () => {};

function Pastille({ iso }: { iso: string }) {
  const [, mois, jour] = iso.split("-");
  return (
    <span aria-hidden className="w-[46px] flex-shrink-0 text-center">
      <span className="block text-[19px] font-extrabold text-[#4F46F5] leading-none">{Number(jour)}</span>
      <span className="block text-[9.5px] font-bold tracking-wide text-[#8D97AA] mt-0.5">{MOIS[Number(mois) - 1]}</span>
    </span>
  );
}

export function UpcomingMissionsCard({
  missions,
  todayISO,
  limite = 3,
}: {
  missions: Mission[];
  todayISO: string;
  limite?: number;
}) {
  const jour = useSyncExternalStore(sansAbonnement, () => isoDuJour(new Date()), () => todayISO);
  const prochaines = prochainesMissions(missions, jour, limite);

  return (
    <CarteRepliable
      cle="prochaines"
      titre="Prochaines missions à venir"
      compteur={prochaines.length}
      pied={
        <Link href="/operations/planification" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#4F46F5] hover:text-[#3730c9] transition-colors">
          Voir tout le calendrier
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      }
    >
      {prochaines.length === 0 ? (
        <p className="text-[12.5px] text-[#8D97AA] py-3">Aucune mission à venir pour le moment.</p>
      ) : (
        <ul className="divide-y divide-[#EDF0F5]">
          {prochaines.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-1">
              <Pastille iso={m.dateMission as string} />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#11182D] truncate">{m.client}</p>
                <p className="text-[11.5px] text-[#8D97AA] truncate">
                  {m.session ?? m.type} · {m.nbSalles} salle{m.nbSalles > 1 ? "s" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">
        {prochaines.length === 0
          ? "Aucune mission à venir."
          : prochaines.map((m) => `${m.client} le ${m.dateMission}, ${m.nbSalles} salles`).join(" ; ")}
      </p>
      {prochaines.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-[#8D97AA] mt-2">
          <CalendarCheck className="w-3.5 h-3.5" aria-hidden />
          Sessions postérieures au {jour.split("-").reverse().join("/")}.
        </p>
      )}
    </CarteRepliable>
  );
}
