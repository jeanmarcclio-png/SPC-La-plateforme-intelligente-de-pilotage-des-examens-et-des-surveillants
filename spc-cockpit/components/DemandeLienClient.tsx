"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Copy, Check, RefreshCw, Ban, Send } from "lucide-react";
import { genererLienClient, revoquerLienClient } from "@/app/actions/demandes";
import type { DemandeLienEtat } from "@/lib/operations/demandes";

const STATUT_PILL: Record<string, string> = {
  actif: "bg-teal-50 text-teal-700",
  soumis: "bg-indigo-50 text-indigo-700",
  expiré: "bg-amber-50 text-amber-700",
  révoqué: "bg-gray-100 text-gray-500",
  aucun: "bg-gray-100 text-gray-500",
};

function fmt(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function DemandeLienClient({ demandeId, lien }: { demandeId: number; lien: DemandeLienEtat }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/client/demande-surveillance/${token}` : null;

  function generer() {
    setError(null);
    startTransition(async () => {
      const res = await genererLienClient(demandeId);
      if (res.error) setError(res.error);
      else if (res.token) { setToken(res.token); router.refresh(); }
    });
  }
  function revoquer() {
    setError(null);
    startTransition(async () => {
      const res = await revoquerLienClient(demandeId);
      if (res.error) setError(res.error);
      else { setToken(null); router.refresh(); }
    });
  }
  async function copier() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard indispo */ }
  }

  const actif = lien.statut === "actif";
  const label = lien.statut === "aucun" ? "Aucun lien" : lien.statut === "soumis" ? "Demande soumise" : `Lien ${lien.statut}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-400" />
          <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${STATUT_PILL[lien.statut] ?? STATUT_PILL.aucun}`}>{label}</span>
          {actif && lien.expiresAt && <span className="text-[12px] text-gray-400">expire le {fmt(lien.expiresAt)}</span>}
          {lien.statut === "soumis" && lien.submittedAt && <span className="text-[12px] text-gray-400">le {fmt(lien.submittedAt)}</span>}
          {actif && lien.viewedAt && <span className="text-[12px] text-emerald-600">· ouvert par le client</span>}
        </div>
        <div className="flex items-center gap-2">
          {actif && (
            <button type="button" onClick={revoquer} disabled={pending} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
              <Ban className="w-3.5 h-3.5" /> Révoquer
            </button>
          )}
          <button type="button" onClick={generer} disabled={pending} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90" style={{ background: "var(--color-primary)" }}>
            {actif ? <RefreshCw className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {pending ? "…" : actif ? "Régénérer" : "Générer le lien"}
          </button>
        </div>
      </div>

      {url && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-mono text-gray-600" />
            <button type="button" onClick={copier} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="text-[11.5px] text-amber-700 mt-2">⚠️ Ce lien ne s&apos;affichera qu&apos;une fois. Copiez-le et transmettez-le au client maintenant.</p>
        </div>
      )}

      {!url && lien.statut === "aucun" && <p className="text-[12px] text-gray-400 mt-2">Générez un lien sécurisé pour laisser le client compléter lui-même sa demande.</p>}
      {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
    </div>
  );
}
