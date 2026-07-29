"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRightCircle, CheckCircle2 } from "lucide-react";
import { convertirEnMission } from "@/app/actions/demandes";
import type { StatutDemande } from "@/lib/operations/types";

export function DemandeConvertButton({ id, statut, missionId }: { id: number; statut: StatutDemande; missionId?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (missionId) {
    return (
      <Link href="/operations/missions" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-teal-50 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-4 h-4" /> Mission créée — ouvrir
      </Link>
    );
  }

  if (statut !== "Validée SPC") return null;

  function convert() {
    setError(null);
    startTransition(async () => {
      const res = await convertirEnMission(id);
      if (res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={convert} disabled={pending} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white rounded-lg px-3.5 py-2 disabled:opacity-50 transition-opacity" style={{ background: "var(--color-primary)" }}>
        <ArrowRightCircle className="w-4 h-4" /> {pending ? "Conversion…" : "Convertir en mission"}
      </button>
      {error && <span className="text-[11px] text-red-500 max-w-[260px] text-right">{error}</span>}
    </div>
  );
}
