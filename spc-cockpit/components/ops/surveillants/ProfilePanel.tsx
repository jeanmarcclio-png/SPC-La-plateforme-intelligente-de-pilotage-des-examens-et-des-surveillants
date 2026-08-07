"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, Mail, Phone, Star, Clock, Briefcase, MapPin, ExternalLink } from "lucide-react";
import type { SurvRow } from "./types";
import { Avatar, RoleBadge, DispoBadge, Competences, PortailBadge } from "./ui";
import { inviterSurveillant } from "@/app/actions/invitations";
import { showToast } from "@/components/Toast";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
      <div className="text-[10.5px] font-bold uppercase tracking-[.6px] text-slate-400">{label}</div>
      <div className="text-[13.5px] font-bold text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

function LigneInfo({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-slate-600 min-w-0">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

export function ProfilePanel({
  row,
  open,
  onClose,
  onReopen,
  onEditComplete,
}: {
  row: SurvRow | null;
  open: boolean;
  onClose: () => void;
  onReopen: () => void;
  onEditComplete: (row: SurvRow) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"details" | "planning">("details");
  const [pending, startTransition] = useTransition();

  // Poignée de réouverture quand le panneau est replié mais qu'une sélection existe.
  if (!open) {
    if (!row) return null;
    return (
      <button
        onClick={onReopen}
        aria-label="Rouvrir le profil du surveillant"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 rounded-l-xl bg-white border border-r-0 border-slate-200 shadow-md py-3 pl-2 pr-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        <span className="text-[11px] font-semibold [writing-mode:vertical-rl] rotate-180">Profil</span>
      </button>
    );
  }

  if (!row) return null;

  function renvoyerInvitation() {
    if (!row) return;
    startTransition(async () => {
      const res = await inviterSurveillant(row.id);
      if (res.error) showToast(res.error, "error");
      else { showToast(`Invitation envoyée à ${row.nom}.`); router.refresh(); }
    });
  }

  return (
    <>
      {/* Voile — visible uniquement sous xl (drawer superposé). */}
      <div className="fixed inset-0 z-30 bg-slate-900/20 xl:hidden" onClick={onClose} aria-hidden />

      <aside
        className="fixed right-0 top-0 xl:top-16 bottom-0 z-40 w-[330px] max-w-[88vw] bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200"
        aria-label={`Profil de ${row.nom}`}
      >
        {/* En-tête */}
        <div className="px-4 pt-4 pb-3.5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar id={row.id} nom={row.nom} size={44} />
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-900 truncate">{row.nom}</div>
                <div className="mt-1"><RoleBadge role={row.role} /></div>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer le profil" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-lg hover:bg-slate-100">
              <X className="w-4.5 h-4.5" aria-hidden />
            </button>
          </div>
          <div className="mt-3 space-y-1.5">
            <LigneInfo icon={<Mail className="w-3.5 h-3.5" aria-hidden />}>{row.email ?? "Email manquant"}</LigneInfo>
            <LigneInfo icon={<Phone className="w-3.5 h-3.5" aria-hidden />}>{row.telephone ?? "Téléphone non renseigné"}</LigneInfo>
            {row.zone && <LigneInfo icon={<MapPin className="w-3.5 h-3.5" aria-hidden />}>{row.zone}</LigneInfo>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <DispoBadge statut={row.statut} />
            <span className="ml-auto"><PortailBadge statut={row.portail} /></span>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-slate-100">
          {(["details", "planning"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-[12.5px] font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "details" ? "Détails" : "Planning"}
            </button>
          ))}
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === "details" ? (
            <div className="space-y-3.5">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[.6px] text-slate-400 mb-1.5">Compétences</div>
                <Competences qualifications={row.qualifications} max={8} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Stat label="Taux horaire" value={`${row.tauxHoraire.toFixed(2).replace(".", ",")} €`} />
                <Stat label="Heures planifiées" value={`${row.heuresPlanifiees} h`} />
                <Stat label="Missions" value={row.nbExamens} />
                <Stat label="Note moyenne" value={<span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />{row.note.toFixed(1)}</span>} />
              </div>
              <Stat label="Dernière mission" value={row.missionClient ?? "—"} />

              <div className="rounded-xl border border-slate-200/80 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] text-slate-600">Accès portail</div>
                  <PortailBadge statut={row.portail} />
                </div>
                {row.portail !== "actif" && (
                  <button
                    onClick={renvoyerInvitation}
                    disabled={pending || !row.email}
                    title={!row.email ? "Renseignez d'abord un email" : undefined}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden />
                    {row.portail === "invite" ? "Renvoyer l'invitation" : "Envoyer l'invitation"}
                  </button>
                )}
              </div>

              <button
                onClick={() => onEditComplete(row)}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold px-3 py-2.5 rounded-xl bg-gradient-to-b from-[#173650] to-[#0F2942] text-white shadow-sm hover:from-[#1c405e] hover:to-[#13314b]"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Voir le profil complet
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {row.creneaux.length === 0 ? (
                <div className="text-[12.5px] text-slate-400 py-6 text-center">Aucun créneau planifié sur la mission active.</div>
              ) : (
                row.creneaux.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/80 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-slate-800">{c.periode === "matin" ? "Matin" : "Après-midi"}</span>
                      <span className="inline-flex items-center gap-1 text-[12px] text-slate-500"><Clock className="w-3.5 h-3.5" aria-hidden />{c.debut ?? "—"}–{c.fin ?? "—"}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11.5px] text-slate-500">
                      {c.salle && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden />{c.salle}</span>}
                      {c.missionRef && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" aria-hidden />{c.missionRef}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
