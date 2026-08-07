"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, CalendarRange, Sparkles } from "lucide-react";
import { lienSession } from "@/lib/operations/planification-vue";

// Parcours en trois étapes : PILOTER → PLANIFIER → OPTIMISER (prompt §18).
// La session courante suit la navigation via ?session=<id>, si bien qu'on ne
// perd jamais le contexte en passant d'une étape à l'autre.
//
// Chaque étape porte sa propre couleur pour être distinguée d'un coup d'œil,
// y compris au repos : teinte pâle + bordure + icône colorée quand l'étape est
// inactive, aplat plein quand elle est active. Le VERT est délibérément écarté
// de ce trio : dans tout le module il signifie « validé » (bouton « Valider la
// session », marge saine) et le réemployer ici brouillerait ce sens.

const ETAPES = [
  {
    href: "/operations/planification",
    label: "Piloter",
    sous: "Synthèse",
    icone: <Gauge className="w-4 h-4" />,
    couleur: "#155EEF", // bleu — pilotage
    fond: "#155EEF0F",
    bordure: "#155EEF33",
    anneau: "focus-visible:ring-[#155EEF]/40",
  },
  {
    href: "/operations/planification/planning",
    label: "Planifier",
    sous: "Affectations",
    icone: <CalendarRange className="w-4 h-4" />,
    couleur: "#0E9384", // turquoise — planning (même teinte que les créneaux du matin)
    fond: "#0E93840F",
    bordure: "#0E938433",
    anneau: "focus-visible:ring-[#0E9384]/40",
  },
  {
    href: "/operations/planification/copilote",
    label: "Optimiser",
    sous: "Copilote IA",
    icone: <Sparkles className="w-4 h-4" />,
    couleur: "#6941C6", // violet — IA, cohérent avec le rail copilote
    fond: "#6941C60F",
    bordure: "#6941C633",
    anneau: "focus-visible:ring-[#6941C6]/40",
  },
];

export function EtapesNav({ missionId, alertes = 0 }: { missionId?: number | null; alertes?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Parcours de planification" className="mb-4">
      <ul className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E6EAF0] bg-white p-1.5 shadow-sm flex-wrap">
        {ETAPES.map((e, i) => {
          const actif = pathname === e.href;
          return (
            <li key={e.href} className="flex items-center">
              {i > 0 && <span aria-hidden className="text-[#D0D5DD] px-1 select-none">→</span>}
              <Link
                href={lienSession(e.href, missionId)}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 ${e.anneau} ${
                  actif ? "shadow-sm" : "hover:brightness-[0.97]"
                }`}
                style={
                  actif
                    ? { background: e.couleur, borderColor: e.couleur, color: "#FFFFFF" }
                    : { background: e.fond, borderColor: e.bordure, color: e.couleur }
                }
              >
                {/* Numéro d'étape : le parcours est séquentiel, le rang le dit
                    sans dépendre de la seule couleur (WCAG). */}
                <span
                  aria-hidden
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10.5px] font-extrabold flex-shrink-0"
                  style={actif ? { background: "rgba(255,255,255,0.22)", color: "#FFFFFF" } : { background: `${e.couleur}1F`, color: e.couleur }}
                >
                  {i + 1}
                </span>
                <span aria-hidden style={{ color: actif ? "rgba(255,255,255,0.85)" : e.couleur }}>{e.icone}</span>
                <span className="leading-tight text-left">
                  <span className="block text-[12.5px] font-bold">
                    {e.label}
                    <span className="sr-only"> — étape {i + 1} sur {ETAPES.length}{actif ? ", étape courante" : ""}</span>
                  </span>
                  <span className="block text-[10.5px]" style={{ color: actif ? "rgba(255,255,255,0.75)" : "#667085" }}>
                    {e.sous}
                  </span>
                </span>
                {e.href.endsWith("/copilote") && alertes > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                    style={actif ? { background: "#FFFFFF", color: e.couleur } : { background: "#F04438", color: "#FFFFFF" }}
                  >
                    {alertes > 9 ? "9+" : alertes}
                    <span className="sr-only"> alerte(s) à traiter</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
