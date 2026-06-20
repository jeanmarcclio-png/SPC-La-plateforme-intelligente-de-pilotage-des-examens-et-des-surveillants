"use client";

import { useRef, useState, useTransition } from "react";
import { createProspect } from "@/app/actions/prospects";

const SEGMENTS = ["Commerce", "Santé", "CPGE", "Université"];
const CLUSTERS = ["Lyon/RA", "Paris IDF", "Lille/HdF", "Bordeaux/NA", "Nancy/GE", "PACA"];
const NIVEAUX  = ["Très chaud", "Chaud", "Tiède", "Froid"];
const CAMPAGNES = [
  { id: "idf-2026",      nom: "IDF Complète 2026" },
  { id: "national-2026", nom: "National Écoles 2026" },
  { id: "saclay-2026",   nom: "Paris-Saclay Juin 2026" },
];

export function AddProspectButton() {
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a6b7e] text-white text-[12.5px] font-semibold hover:bg-[#155a6a] transition-colors"
      >
        + Ajouter un prospect
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[16px] font-bold text-gray-900">Nouveau prospect</div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nom */}
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Établissement *</label>
                <input name="nom" required placeholder="ex: Sciences Po Paris" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>

              {/* Segment + Cluster */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Segment *</label>
                  <select name="segment" required className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    <option value="">—</option>
                    {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Cluster *</label>
                  <select name="cluster" required className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    <option value="">—</option>
                    {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Score BANT + Niveau + Priorité */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Score BANT</label>
                  <input name="score_bant" type="number" min="0" max="10" step="0.5" defaultValue="8" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Niveau</label>
                  <select name="niveau" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Priorité</label>
                  <select name="priorite" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </div>
              </div>

              {/* Interlocuteur */}
              <div>
                <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Interlocuteur</label>
                <input name="interlocuteur" placeholder="ex: Resp. examens / Dir. scolarité" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
              </div>

              {/* Canal + Vague */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Canal</label>
                  <input name="canal" placeholder="ex: Email + Appel" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Vague</label>
                  <select name="vague" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    <option value="1">Vague 1</option>
                    <option value="2">Vague 2</option>
                  </select>
                </div>
              </div>

              {/* Action + Campagne */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Action</label>
                  <input name="action" placeholder="ex: Email J+1 →" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Campagne *</label>
                  <select name="campagne_id" required className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
                    <option value="">—</option>
                    {CAMPAGNES.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-lg bg-[#1a6b7e] text-white text-[13px] font-semibold hover:bg-[#155a6a] disabled:opacity-50">
                  {pending ? "Ajout..." : "Ajouter le prospect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
