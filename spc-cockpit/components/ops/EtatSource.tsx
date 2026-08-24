// Rendu honnête de l'origine des données (corrige BUG-001 / BUG-002).
//
// Trois situations que l'application confondait auparavant :
//  · `demo`   → bandeau permanent « données de démonstration » ;
//  · `erreur` → message d'erreur actionnable (que s'est-il passé / pourquoi /
//               que faire), jamais le message PostgreSQL brut en première ligne ;
//  · `vide`   → état vide explicite avec l'action qui permet d'en sortir.

import Link from "next/link";
import { AlertTriangle, FlaskConical, Inbox } from "lucide-react";
import type { OrigineDonnees } from "@/lib/operations/source";

export function BandeauDemo() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-[#F0B100] bg-[#FFF8E6] px-4 py-3 mb-4"
    >
      <FlaskConical className="w-4 h-4 mt-[2px] shrink-0 text-[#8A6100]" aria-hidden />
      <p className="text-[13px] leading-relaxed text-[#5C4200]">
        <strong className="font-semibold">Données de démonstration.</strong>{" "}
        Cet écran affiche un jeu d’exemple (<code className="text-[12px]">SPC_DEMO=1</code>) :
        surveillants, missions et montants sont fictifs. Aucune décision opérationnelle
        ne doit être prise à partir de ces chiffres.
      </p>
    </div>
  );
}

export function BandeauErreur({ detail }: { detail?: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#E5484D] bg-[#FFF0F0] px-4 py-3 mb-4"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 mt-[2px] shrink-0 text-[#C62A2F]" aria-hidden />
        <div className="text-[13px] leading-relaxed text-[#7A1D21]">
          <p>
            <strong className="font-semibold">Données non chargées.</strong>{" "}
            La lecture en base a échoué : les chiffres de cet écran sont incomplets ou absents.
          </p>
          <p className="mt-1">
            Actualisez la page. Si le problème persiste, vérifiez vos droits d’accès à
            l’organisation active, puis signalez l’incident à l’administrateur.
          </p>
          {detail && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] font-medium">Détail technique</summary>
              <code className="mt-1 block text-[12px] break-words opacity-80">{detail}</code>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bandeau d'origine à poser en tête d'écran. Ne rend rien quand les données
 * viennent réellement de la base (cas nominal) ou quand l'écran est simplement
 * vide — ce dernier cas relève de `EtatVide`, au plus près du contenu absent.
 *
 * NE REND PAS le bandeau de démonstration, volontairement.
 * ---------------------------------------------------------
 * Le mode démonstration est GLOBAL : il ne concerne pas telle ou telle lecture,
 * mais l'instance entière. Il est donc signalé une seule fois, par le cadre
 * applicatif (`app/(operations)/layout.tsx`, et le layout racine pour les
 * écrans qui n'en ont pas).
 *
 * Le rendre ici AUSSI affichait deux bandeaux identiques empilés sur les neuf
 * écrans qui appellent ce composant, et un seul sur les sept autres — une
 * incohérence visible en démonstration, et le genre de détail qui fait douter
 * du reste.
 */
export function BandeauSource({ origine, detail }: { origine: OrigineDonnees; detail?: string }) {
  if (origine === "erreur") return <BandeauErreur detail={detail} />;
  return null;
}

/**
 * État vide explicite : ce qui manque, pourquoi l'écran est vide, et l'action
 * qui permet d'en sortir. Ne jamais laisser un tableau vide sans explication ni
 * afficher un compteur incohérent (§33 du référentiel d'audit).
 */
export function EtatVide({
  titre,
  message,
  action,
}: {
  titre: string;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-[#D5DCE7] bg-white px-6 py-12">
      <Inbox className="w-7 h-7 text-[#98A2B3]" aria-hidden />
      <h2 className="mt-3 text-[15px] font-semibold text-[#0F1F3D]">{titre}</h2>
      <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-[#667085]">{message}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-xl bg-[#2E7BFF] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-95"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
