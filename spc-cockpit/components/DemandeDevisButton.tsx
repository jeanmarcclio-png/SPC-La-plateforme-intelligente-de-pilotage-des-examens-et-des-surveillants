"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSignature, ArrowRight } from "lucide-react";
import { genererDevisDepuisDemande } from "@/app/actions/demandes";

/**
 * Sur une demande convertie en mission (§15) : génère un devis Brouillon
 * pré-rempli, ou renvoie vers le devis déjà rattaché à la mission.
 */
export function DemandeDevisButton({ demandeId, devisId }: { demandeId: number; devisId: number | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (devisId) {
    return (
      <Link href={`/operations/devis/${devisId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg transition-colors">
        <FileSignature className="w-4 h-4 text-[var(--color-primary)]" /> Voir le devis <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    );
  }

  function generer() {
    setError(null);
    startTransition(async () => {
      const res = await genererDevisDepuisDemande(demandeId);
      if (res.error) setError(res.error);
      else if (res.devisId) router.push(`/operations/devis/${res.devisId}`);
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={generer} disabled={pending} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white px-3 py-2 rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90" style={{ background: "var(--color-primary)" }}>
        <FileSignature className="w-4 h-4" /> {pending ? "Génération…" : "Générer le devis"}
      </button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
