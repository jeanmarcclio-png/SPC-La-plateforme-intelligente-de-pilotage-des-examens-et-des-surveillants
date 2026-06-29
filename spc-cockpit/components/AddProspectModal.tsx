"use client";

import { useRef, useState, useTransition } from "react";
import { createProspect } from "@/app/actions/prospects";
import { useTenant } from "@/lib/tenant/TenantContext";
import { NIVEAU_CHALEUR as NIVEAUX } from "@/lib/constants";

export function AddProspectButton() {
  const { config } = useTenant();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = new FormData(formRef.current!);
    startTransition(async () => {
      await createProspect(data);
      setOpen(false);
      formRef.current?.reset();
    });
  }

  const accent = config.couleur;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[12.5px] font-semibold transition-colors"
        style={{ background: accent }}
      >
        + Ajouter un {config.vocabulaire.ressource.toLowerCase()}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[16px] font-bold text-gray-900">
                Nouveau {config.vocabulaire.ressource.toLowerCase()}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nom */}
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">
                  {config.vocabulaire.ressource} *
                </label>
                <input
                  name="nom"
                  required
                  placeholder={`ex: ${config.segments[0] ?? "Client"} Paris`}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": `${accent}50` } as React.CSSProperties}
                />
              </div>

              {/* Segment + Cluster */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Segment *</label>
                  <select name="segment" required className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                    <option value="">—</option>
                    {config.segments.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Zone</label>
                  <select name="cluster" required className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                    <option value="">—</option>
                    {config.clusters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Score + Niveau + Priorité */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">
                    Score {config.scoring.dimensions[0]}
                  </label>
                  <input name="score_bant" type="number" min="0" max="10" step="0.5" defaultValue="8"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Niveau</label>
                  <select name="niveau" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                    {config.scoring.labels.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Priorité</label>
                  <select name="priorite" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </div>
              </div>

              {/* Interlocuteur */}
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Interlocuteur</label>
                <select name="interlocuteur" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  {config.interlocuteurs.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* Canal + Vague */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Canal</label>
                  <input name="canal" placeholder="ex: Email + Appel"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Phase</label>
                  <select name="vague" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none">
                    <option value="1">Phase 1</option>
                    <option value="2">Phase 2</option>
                  </select>
                </div>
              </div>

              {/* Action */}
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Action prévue</label>
                <input name="action" placeholder={`ex: Email J+1 → ${config.vocabulaire.mission}`}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none" />
                <input type="hidden" name="campagne_id" value="" />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: accent }}>
                  {pending ? "Ajout..." : `Ajouter`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
