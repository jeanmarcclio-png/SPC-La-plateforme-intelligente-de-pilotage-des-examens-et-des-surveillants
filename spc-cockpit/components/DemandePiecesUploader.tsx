"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Download, FileText } from "lucide-react";
import { uploadPiece, deletePiece, getPieceSignedUrl } from "@/app/actions/demandes";
import { PIECES_ACCEPT, validatePieceMeta, formatTaille } from "@/lib/operations/demandes-constants";
import type { DemandePiece } from "@/lib/operations/types";

export function DemandePiecesUploader({ demandeId, pieces }: { demandeId: number; pieces: DemandePiece[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const invalid = validatePieceMeta({ name: file.name, size: file.size });
    if (invalid) { setError(invalid); e.target.value = ""; return; }
    const fd = new FormData();
    fd.set("demande_id", String(demandeId));
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadPiece(fd);
      if (res.error) setError(res.error);
      else router.refresh();
    });
    e.target.value = "";
  }

  function remove(id: number) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deletePiece(id);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function download(id: number) {
    setBusyId(id);
    startTransition(async () => {
      const res = await getPieceSignedUrl(id);
      setBusyId(null);
      if (res.url) window.open(res.url, "_blank", "noopener");
      else if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-gray-300 bg-gray-50/50 py-6 px-4 text-center cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors">
        <Upload className="w-5 h-5 text-[var(--color-primary)]" />
        <div className="text-[13px] text-gray-600"><span className="font-semibold text-[var(--color-primary)]">Parcourir</span> — convocations, plan de salles, consignes</div>
        <div className="text-[11px] text-gray-400">PDF, images, Excel, Word · 10 Mo max</div>
        <input type="file" accept={PIECES_ACCEPT} onChange={onFile} disabled={pending} className="hidden" />
      </label>

      {error && <div className="text-[12px] text-red-500">{error}</div>}
      {pending && <div className="text-[12px] text-gray-400">Traitement…</div>}

      {pieces.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {pieces.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-800 truncate">{p.nom}</div>
                <div className="text-[11px] text-gray-400">{formatTaille(p.taille)} · {new Date(p.createdAt).toLocaleDateString("fr-FR")}</div>
              </div>
              <button type="button" onClick={() => download(p.id)} disabled={busyId === p.id} title="Télécharger" aria-label={`Télécharger ${p.nom}`} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <Download className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remove(p.id)} disabled={busyId === p.id} title="Supprimer" aria-label={`Supprimer ${p.nom}`} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-500 hover:bg-red-100 disabled:opacity-40">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
