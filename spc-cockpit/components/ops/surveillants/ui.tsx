// Primitives visuelles partagées de la page « Surveillants ».
// Composants purs (aucun hook) → réutilisables côté serveur comme client.

import { Star } from "lucide-react";
import type { StatutSurveillant } from "@/lib/operations/types";

const AVATAR_COLORS = ["#7c5cff", "#ec4899", "#2563eb", "#f43f5e", "#12b76a", "#f59e0b", "#06b6d4", "#173650"];

/** Initiales (1 à 2 lettres) d'un nom complet. */
export function initiales(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Couleur d'avatar déterministe (stable pour un id donné). */
export function couleurAvatar(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

export function Avatar({ id, nom, size = 32 }: { id: number; nom: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="rounded-full inline-flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ background: couleurAvatar(id), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initiales(nom)}
    </span>
  );
}

/** Découpe une chaîne de compétences (« PMR · Tiers-temps ») en jetons. */
export function competencesToTokens(qualifications?: string): string[] {
  if (!qualifications) return [];
  return qualifications
    .split(/[·,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Competences({ qualifications, max = 3 }: { qualifications?: string; max?: number }) {
  const tokens = competencesToTokens(qualifications);
  if (tokens.length === 0) return <span className="text-slate-300">—</span>;
  const shown = tokens.slice(0, max);
  const reste = tokens.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((t) => (
        <span key={t} className="inline-flex items-center rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-medium px-1.5 py-0.5 ring-1 ring-inset ring-slate-200/70">
          {t}
        </span>
      ))}
      {reste > 0 && <span className="text-[10.5px] text-slate-400 font-medium">+{reste}</span>}
    </span>
  );
}

// Rôle → grammaire couleur (violet coordination · cyan PMR · rose sécurité · bleu salle).
function roleTone(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("coordin")) return "bg-violet-50 text-violet-700 ring-violet-600/15";
  if (r.includes("pmr")) return "bg-teal-50 text-teal-700 ring-teal-600/15";
  if (r.includes("sécur") || r.includes("secur")) return "bg-rose-50 text-rose-600 ring-rose-600/15";
  if (r.includes("volant")) return "bg-cyan-50 text-cyan-700 ring-cyan-600/15";
  return "bg-sky-50 text-sky-700 ring-sky-600/15";
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${roleTone(role)}`}>
      {role}
    </span>
  );
}

const DISPO_TONE: Record<StatutSurveillant, { cls: string; dot: string; label: string }> = {
  Disponible: { cls: "text-emerald-700", dot: "bg-emerald-500", label: "Disponible" },
  Planifié: { cls: "text-sky-700", dot: "bg-sky-500", label: "Planifié" },
  Indisponible: { cls: "text-slate-500", dot: "bg-slate-400", label: "Indisponible" },
  Annulé: { cls: "text-rose-600", dot: "bg-rose-500", label: "Annulé" },
};

export function DispoBadge({ statut }: { statut: StatutSurveillant }) {
  const t = DISPO_TONE[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${t.cls}`}>
      <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

export function Stars({ note }: { note: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={`Note ${note.toFixed(1)} sur 5`}>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="text-[13px] font-bold text-slate-800">{note.toFixed(1)}</span>
    </span>
  );
}

const PORTAIL: Record<"actif" | "invite" | "non_invite", { txt: string; cls: string }> = {
  actif: { txt: "Compte actif", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  invite: { txt: "Invité", cls: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  non_invite: { txt: "Non invité", cls: "bg-slate-100 text-slate-500 ring-slate-500/15" },
};

export function PortailBadge({ statut }: { statut: "actif" | "invite" | "non_invite" }) {
  const p = PORTAIL[statut];
  return (
    <span className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${p.cls}`}>
      {p.txt}
    </span>
  );
}
