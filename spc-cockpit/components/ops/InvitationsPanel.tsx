"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, Clock, UserPlus, KeyRound } from "lucide-react";
import { inviterSurveillant, definirMotDePasseSurveillant } from "@/app/actions/invitations";
import type { InvitationRow } from "@/lib/supabase/portail";

const STATUT = {
  actif: { txt: "Compte actif", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Check className="w-3.5 h-3.5" /> },
  invite: { txt: "Invité", cls: "bg-sky-50 text-sky-700 border-sky-200", icon: <Clock className="w-3.5 h-3.5" /> },
  non_invite: { txt: "Non invité", cls: "bg-slate-100 text-slate-500 border-slate-200", icon: <Mail className="w-3.5 h-3.5" /> },
} as const;

export function InvitationsPanel({ rows }: { rows: InvitationRow[] }) {
  return (
    <div className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-gray-500" aria-hidden />
        <span className="text-[13px] font-bold text-gray-800">Accès portail surveillant</span>
        <span className="text-[11.5px] text-gray-400 ml-1">— invitez vos surveillants à consulter leur planning</span>
      </div>
      <ul className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
        {rows.map((r) => (
          <InvitationLigne key={r.id} row={r} />
        ))}
        {rows.length === 0 && (
          <li className="px-5 py-4 text-[12.5px] text-gray-400">Aucun surveillant dans l&apos;annuaire.</li>
        )}
      </ul>
    </div>
  );
}

function InvitationLigne({ row }: { row: InvitationRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [creds, setCreds] = useState<{ email: string; motDePasse: string } | null>(null);
  const s = STATUT[row.statut];

  function inviter() {
    setError("");
    setCreds(null);
    startTransition(async () => {
      const res = await inviterSurveillant(row.id);
      if (res.error) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  function definirMdp() {
    setError("");
    setDone(false);
    startTransition(async () => {
      const res = await definirMotDePasseSurveillant(row.id);
      if (res.error) setError(res.error);
      else {
        setCreds({ email: res.email!, motDePasse: res.motDePasse! });
        router.refresh();
      }
    });
  }

  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-gray-800 truncate">{row.nom}</div>
          <div className="text-[12px] text-gray-400 truncate">{row.email ?? "email manquant"}</div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
          {s.icon} {s.txt}
        </span>
        <button
          onClick={definirMdp}
          disabled={pending || !row.email}
          title={!row.email ? "Renseignez d'abord un email (identifiant de connexion)" : "Définir un mot de passe à transmettre"}
          className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 shrink-0"
        >
          <KeyRound className="w-3.5 h-3.5" aria-hidden /> Mot de passe
        </button>
        {row.statut !== "actif" && (
          <button
            onClick={inviter}
            disabled={pending || !row.email}
            title={!row.email ? "Renseignez d'abord un email" : "Envoyer une invitation par email"}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 shrink-0"
            style={{ background: "#1a6b7e" }}
          >
            {done ? "Envoyé ✓" : row.statut === "invite" ? "Relancer" : "Inviter"}
          </button>
        )}
      </div>

      {creds && (
        <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-900">
          <div className="font-semibold mb-0.5">Identifiants à transmettre à {row.nom} :</div>
          <div>Identifiant : <span className="font-mono select-all">{creds.email}</span></div>
          <div>Mot de passe : <span className="font-mono select-all font-bold">{creds.motDePasse}</span></div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Connexion sur <span className="font-mono">/login</span> (onglet « Mot de passe »). Notez-le : il ne sera plus affiché.
          </div>
        </div>
      )}
      {error && <div className="mt-2 text-[11px] text-red-600">{error}</div>}
    </li>
  );
}
