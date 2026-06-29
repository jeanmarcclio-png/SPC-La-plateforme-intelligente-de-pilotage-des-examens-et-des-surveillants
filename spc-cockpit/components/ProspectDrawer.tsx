"use client";

import { useState, useTransition, useEffect } from "react";
import type { Prospect } from "@/lib/types";
import { logProspectInteraction, updateProspectFiche, updateProspectNiveau, updateProspectStatut } from "@/app/actions/prospects";

import { STATUT_PROSPECT as STATUT_PIPELINE, NIVEAU_CHALEUR as NIVEAUX } from "@/lib/constants";

function parseMontant(str?: string): number {
  if (!str) return 0;
  const n = parseInt(str.replace(/\s/g, "").replace(/[^0-9]/g, ""));
  return isNaN(n) ? 0 : n;
}

function computeProfileCompleteness(p: {
  niveau: string; telephone?: string; contactPrincipal?: string;
  fonctionContact?: string; valeurPotentielle?: string; prochaineRelance?: string;
}): number {
  let s = 0;
  if (parseMontant(p.valeurPotentielle) > 0) s += 2.5;
  if (p.contactPrincipal) s += 1.5;
  if (p.fonctionContact) s += 1;
  const np: Record<string, number> = { "Très chaud": 2.5, "Chaud": 1.5, "Tiède": 0.75, "Froid": 0 };
  s += np[p.niveau] ?? 0;
  if (p.telephone) s += 1;
  if (p.prochaineRelance) s += 1.5;
  return Math.min(Math.round(s * 10) / 10, 10);
}

function getRelanceStatus(dateStr?: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { cls: "text-red-500 bg-red-50 border-red-100", label: `⚠️ En retard de ${Math.abs(diff)}j` };
  if (diff === 0) return { cls: "text-orange-500 bg-orange-50 border-orange-100", label: "🔔 Aujourd'hui" };
  if (diff === 1) return { cls: "text-orange-400 bg-orange-50 border-orange-100", label: "⏰ Demain" };
  return { cls: "text-green-600 bg-green-50 border-green-100", label: `✅ Dans ${diff}j` };
}

const LOG_TYPES = [
  "📞 Appel sans réponse",
  "📞 Message vocal laissé",
  "📞 Conversation tél.",
  "✉️ Email envoyé",
  "📅 RDV fixé",
];

export function ProspectDrawer({ prospect, onClose, onUpdated, allProspects, currentIndex, onNavigate }: {
  prospect: Prospect;
  onClose: () => void;
  onUpdated?: (id: string, fields: Partial<Prospect>) => void;
  allProspects?: Prospect[];
  currentIndex?: number;
  onNavigate?: (p: Prospect) => void;
}) {
  const [telephone, setTelephone] = useState(prospect.telephone ?? "");
  const [contact, setContact] = useState(prospect.contactPrincipal ?? "");
  const [fonction, setFonction] = useState(prospect.fonctionContact ?? "");
  const [valeur, setValeur] = useState(prospect.valeurPotentielle ?? "");
  const [relance, setRelance] = useState(prospect.prochaineRelance ?? "");
  const [interaction, setInteraction] = useState(prospect.derniereInteraction ?? "");
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [niveau, setNiveau] = useState(prospect.niveau);
  const [statut, setStatut] = useState(prospect.statut);
  const [nbEtudiants, setNbEtudiants] = useState(prospect.nbEtudiants?.toString() ?? "");
  const [sessionsParAn, setSessionsParAn] = useState(prospect.sessionsParAn?.toString() ?? "");
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasPrev = allProspects && currentIndex !== undefined && currentIndex > 0;
  const hasNext = allProspects && currentIndex !== undefined && currentIndex < allProspects.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "SELECT") {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft" && hasPrev) onNavigate?.(allProspects![currentIndex! - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate?.(allProspects![currentIndex! + 1]);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, hasPrev, hasNext, allProspects, currentIndex, onNavigate]);

  const bantAuto = computeProfileCompleteness({ niveau, telephone, contactPrincipal: contact, fonctionContact: fonction, valeurPotentielle: valeur, prochaineRelance: relance });
  const bantColor = bantAuto >= 8 ? "#38a169" : bantAuto >= 5 ? "#f6ad55" : "#fc8181";
  const relanceStatus = getRelanceStatus(relance);
  const timelineEntries = interaction.split("\n").filter(Boolean);
  const pipelineIdx = STATUT_PIPELINE.indexOf(statut);

  function handleLog(type: string) {
    const today = new Date().toLocaleDateString("fr-FR");
    const entry = `${type} — ${today}`;
    const lines = interaction ? [entry, ...interaction.split("\n").filter(Boolean).slice(0, 4)] : [entry];
    const newVal = lines.join("\n");
    setInteraction(newVal);
    setLoggerOpen(false);
    if (type.includes("RDV")) { setStatut("RDV fixé"); startTransition(() => updateProspectStatut(prospect.id, "RDV fixé")); }
    startTransition(() => logProspectInteraction(prospect.id, newVal));
  }

  function handleNiveau(n: string) {
    setNiveau(n as Prospect["niveau"]);
    startTransition(() => updateProspectNiveau(prospect.id, n));
  }

  function handleStatut(s: string) {
    setStatut(s as Prospect["statut"]);
    onUpdated?.(prospect.id, { statut: s as Prospect["statut"] });
    startTransition(() => updateProspectStatut(prospect.id, s));
  }

  function handleSave() {
    startTransition(async () => {
      await updateProspectFiche(prospect.id, {
        telephone, contact_principal: contact, fonction_contact: fonction,
        valeur_potentielle: valeur, prochaine_relance: relance,
        derniere_interaction: interaction, notes,
        nb_etudiants: nbEtudiants ? parseInt(nbEtudiants) : null,
        sessions_par_an: sessionsParAn ? parseInt(sessionsParAn) : null,
      });
      setSaved(true);
      onUpdated?.(prospect.id, {
        telephone, contactPrincipal: contact, fonctionContact: fonction,
        valeurPotentielle: valeur, prochaineRelance: relance,
        derniereInteraction: interaction, notes,
        nbEtudiants: nbEtudiants ? parseInt(nbEtudiants) : undefined,
        sessionsParAn: sessionsParAn ? parseInt(sessionsParAn) : undefined,
      });
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche prospect — ${prospect.nom}`}
      className="fixed right-0 top-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl z-50 flex flex-col"
    >

      {/* Header */}
      <div className="bg-[var(--color-primary)] px-5 pt-4 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-2">
            <div className="text-white/60 text-[11px] uppercase tracking-wider mb-0.5">{prospect.segment} · {prospect.cluster}</div>
            <div className="text-white text-[16px] font-extrabold leading-tight truncate">{prospect.nom}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {allProspects && (
              <>
                <button onClick={() => hasPrev && onNavigate?.(allProspects[currentIndex! - 1])} disabled={!hasPrev} title="Précédent (←)" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white text-base hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
                <span className="text-white/40 text-[11px] min-w-[30px] text-center">{currentIndex !== undefined ? `${currentIndex + 1}/${allProspects.length}` : ""}</span>
                <button onClick={() => hasNext && onNavigate?.(allProspects[currentIndex! + 1])} disabled={!hasNext} title="Suivant (→)" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white text-base hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
              </>
            )}
            <button onClick={onClose} title="Fermer (Échap)" className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 ml-1 transition-colors text-[12px]">✕</button>
          </div>
        </div>

        {/* Pipeline steps */}
        <div className="flex items-center gap-1 mb-3">
          {STATUT_PIPELINE.map((s, i) => (
            <button key={s} onClick={() => handleStatut(s)} className={`flex-1 text-[11px] font-bold py-1 rounded transition-colors ${i === pipelineIdx ? "bg-white text-[var(--color-primary)]" : i < pipelineIdx ? "bg-white/30 text-white" : "bg-white/10 text-white/40 hover:bg-white/20"}`}>
              {i < pipelineIdx ? "✓" : s.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* BANT + Chaleur */}
        <div className="flex gap-2">
          <div className="bg-white/10 rounded-xl px-3 py-2 flex-1">
            <div className="text-white/50 text-[11px] uppercase tracking-wider">COMPLÉTUDE</div>
            <div className="text-white text-[20px] font-black">{bantAuto}<span className="text-[11px] font-normal text-white/40">/10</span></div>
            <div className="h-1 bg-white/20 rounded-full mt-1">
              <div className="h-full rounded-full transition-all" style={{ width: `${(bantAuto / 10) * 100}%`, backgroundColor: bantColor }} />
            </div>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 flex-1">
            <div className="text-white/50 text-[11px] uppercase tracking-wider mb-1">CHALEUR</div>
            <select value={niveau} onChange={(e) => handleNiveau(e.target.value)} className="bg-transparent text-white text-[13px] font-bold border-0 outline-none cursor-pointer w-full">
              {NIVEAUX.map(n => <option key={n} value={n} className="text-black">{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">

        {/* ── Mode Décision IA ── */}
        <div className="rounded-xl border border-[var(--color-primary)]/20 overflow-hidden">
          <div className="bg-[var(--color-primary)]/[0.06] px-3 py-2 flex items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider">🧠 Mode Décision IA</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              {
                icon: "📞",
                label: "Script appel",
                prompt: `Génère un script d'appel à froid pour contacter ${prospect.nom} (${prospect.segment} · ${prospect.cluster}). Score BANT ${bantAuto}/10, statut actuel : ${statut}. Interlocuteur cible : ${prospect.interlocuteur}. Canal recommandé : ${prospect.canal}. Objectif : décrocher un RDV ou audit gratuit 30 min.`,
              },
              {
                icon: "📧",
                label: "Email IA",
                prompt: `Rédige un email de prospection B2B pour ${prospect.nom} (${prospect.segment}). Score BANT ${bantAuto}/10, niveau : ${niveau}. Notes : ${prospect.notes ?? "aucune note"}. Ton : professionnel institutionnel. CTA : proposer un appel découverte de 15 minutes.`,
              },
              {
                icon: "📅",
                label: "Préparer RDV",
                prompt: `Aide-moi à préparer mon RDV avec ${prospect.nom} (${prospect.segment} · ${prospect.cluster}). Score BANT ${bantAuto}/10. Donne-moi 5 questions clés à poser, les 3 objections probables et comment les surmonter, et un pitch de 2 minutes sur la valeur JMC.`,
              },
            ].map(({ icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: prompt }))}
                className="flex flex-col items-center gap-1.5 py-3 hover:bg-[var(--color-primary)]/[0.08] transition-colors"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] font-semibold text-[var(--color-primary)] text-center leading-tight px-1">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          {telephone && (
            <a href={`tel:${telephone.replace(/\s/g, "")}`} className="flex-1 flex flex-col items-center gap-1 py-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors">
              <span className="text-xl">📞</span><span className="text-[11px] font-semibold">Appeler</span>
            </a>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="flex-1 flex flex-col items-center gap-1 py-3 bg-green-50 rounded-xl text-green-700 hover:bg-green-100 transition-colors">
              <span className="text-xl">✉️</span><span className="text-[11px] font-semibold">Email</span>
            </a>
          )}
          <div className="relative flex-1">
            <button onClick={() => setLoggerOpen(!loggerOpen)} className="w-full flex flex-col items-center gap-1 py-3 bg-purple-50 rounded-xl text-purple-700 hover:bg-purple-100 transition-colors">
              <span className="text-xl">📝</span><span className="text-[11px] font-semibold">Logger ▾</span>
            </button>
            {loggerOpen && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 overflow-hidden">
                {LOG_TYPES.map((type) => (
                  <button key={type} onClick={() => handleLog(type)} className="w-full text-left px-3.5 py-2.5 text-[12px] text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {timelineEntries.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
            <div className="text-[13px] text-blue-600 font-bold uppercase tracking-wider mb-2.5">Historique contacts</div>
            {timelineEntries.map((entry, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <div className={`rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? "w-2.5 h-2.5 bg-blue-600" : "w-2 h-2 bg-blue-300"}`} />
                <span className={`text-[14px] leading-snug ${i === 0 ? "text-gray-800 font-semibold" : "text-blue-600"}`}>{entry}</span>
              </div>
            ))}
          </div>
        )}

        {/* Coordonnées */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <div className="text-[13px] text-gray-600 font-bold uppercase tracking-wider mb-3">Coordonnées</div>
          <div className="space-y-3">
            {[
              { label: "Téléphone", value: telephone, setter: setTelephone },
              { label: "Contact", value: contact, setter: setContact },
              { label: "Fonction", value: fonction, setter: setFonction },
              { label: "Valeur €", value: valeur, setter: setValeur },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[13px] text-gray-600 w-24 font-semibold flex-shrink-0">{label}</span>
                <input
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="flex-1 text-[14px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
                />
              </div>
            ))}
            {prospect.email && (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-gray-600 w-24 font-semibold flex-shrink-0">Email</span>
                <span className="text-[14px] text-[#4a90d9]">{prospect.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prochaine relance */}
        <div className={`rounded-xl p-3.5 border ${relanceStatus?.cls ?? "bg-gray-50 border-gray-100"}`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[13px] text-gray-600 font-bold uppercase tracking-wider">Prochaine relance</div>
            {relanceStatus && <span className={`text-[13px] font-bold ${relanceStatus.cls.split(" ")[0]}`}>{relanceStatus.label}</span>}
          </div>
          <input
            value={relance}
            onChange={(e) => setRelance(e.target.value)}
            placeholder="ex : 24/06/2026"
            className="w-full text-[14px] bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 font-medium"
          />
        </div>

        {/* Données JMC */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <div className="text-[13px] text-gray-600 font-bold uppercase tracking-wider mb-3">Données JMC</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[13px] text-gray-600 font-semibold mb-1.5">Nb étudiants</div>
              <input value={nbEtudiants} onChange={(e) => setNbEtudiants(e.target.value)} type="number" placeholder="ex : 2500" className="w-full text-[14px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
            </div>
            <div>
              <div className="text-[13px] text-gray-600 font-semibold mb-1.5">Sessions / an</div>
              <input value={sessionsParAn} onChange={(e) => setSessionsParAn(e.target.value)} type="number" placeholder="ex : 4" className="w-full text-[14px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <div className="text-[13px] text-gray-600 font-bold uppercase tracking-wider mb-2">Notes de prospection</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Décideur identifié, budget, objections, prochaine étape..."
            rows={4}
            className="w-full text-[14px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9] placeholder-gray-400"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-gray-100 flex-shrink-0 bg-white">
        <button
          onClick={handleSave}
          disabled={pending}
          className={`w-full text-[13px] font-semibold py-2.5 rounded-xl transition-colors ${saved ? "bg-green-500 text-white" : "bg-[var(--color-primary)] hover:bg-[#1a5c6e] text-white"} disabled:opacity-50`}
        >
          {pending ? "Sauvegarde..." : saved ? "✓ Sauvegardé" : "💾 Enregistrer la fiche"}
        </button>
        {allProspects && (
          <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-gray-400">
            <span>← → naviguer</span><span>·</span><span>Échap fermer</span>
          </div>
        )}
      </div>
    </div>
  );
}
