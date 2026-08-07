"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, CalendarRange, Sparkles } from "lucide-react";
import { lienSession } from "@/lib/operations/planification-vue";

// Parcours en trois étapes : PILOTER → PLANIFIER → OPTIMISER (prompt §18).
// La session courante suit la navigation via ?session=<id>, si bien qu'on ne
// perd jamais le contexte en passant d'une étape à l'autre.

const ETAPES = [
  { href: "/operations/planification", label: "Piloter", sous: "Synthèse", icone: <Gauge className="w-4 h-4" /> },
  { href: "/operations/planification/planning", label: "Planifier", sous: "Affectations", icone: <CalendarRange className="w-4 h-4" /> },
  { href: "/operations/planification/copilote", label: "Optimiser", sous: "Copilote IA", icone: <Sparkles className="w-4 h-4" /> },
];

export function EtapesNav({ missionId, alertes = 0 }: { missionId?: number | null; alertes?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Parcours de planification" className="mb-4">
      <ul className="inline-flex items-center gap-1 rounded-2xl border border-[#E6EAF0] bg-white p-1 shadow-sm flex-wrap">
        {ETAPES.map((e, i) => {
          const actif = pathname === e.href;
          return (
            <li key={e.href} className="flex items-center">
              {i > 0 && <span aria-hidden className="text-[#D0D5DD] px-0.5 select-none">→</span>}
              <Link
                href={lienSession(e.href, missionId)}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155EEF]/40 ${
                  actif ? "bg-[#155EEF] text-white shadow-sm" : "text-[#667085] hover:bg-[#F7F9FC] hover:text-[#0F1F3D]"
                }`}
              >
                <span aria-hidden className={actif ? "text-white/80" : "text-[#98A2B3]"}>{e.icone}</span>
                <span className="leading-tight">
                  <span className="block text-[12.5px] font-bold">{e.label}</span>
                  <span className={`block text-[10.5px] ${actif ? "text-white/70" : "text-[#98A2B3]"}`}>{e.sous}</span>
                </span>
                {e.href.endsWith("/copilote") && alertes > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${actif ? "bg-white text-[#155EEF]" : "bg-[#F04438] text-white"}`}>
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
