"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { inviteTeamMember, updateTeamMemberRole, removeTeamMember } from "@/app/actions/parametres";

type Member = { id: string; email: string; nom: string; role: string };

const ROLES = ["Admin", "Commercial", "Lecteur"] as const;

const roleColors: Record<string, string> = {
  Admin:      "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  Commercial: "bg-blue-50 text-blue-700",
  Lecteur:    "bg-gray-100 text-gray-500",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin:      ["Tout accès", "Gérer l'équipe", "Exporter", "Configurer"],
  Commercial: ["Prospects", "Campagnes", "Copilote IA", "Reporting"],
  Lecteur:    ["Lecture seule", "Reporting", "Dashboard"],
};

export function TeamSection({ members }: { members: Member[] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleInvite(fd: FormData) {
    startTransition(async () => {
      await inviteTeamMember(fd);
      setShowForm(false);
    });
  }

  function handleRoleChange(id: string, role: string) {
    startTransition(() => updateTeamMemberRole(id, role));
  }

  function handleRemove(id: string, nom: string) {
    if (!confirm(`Retirer ${nom} de l'équipe ?`)) return;
    startTransition(() => removeTeamMember(id));
  }

  return (
    <div className="space-y-3">
      {members.length === 0 && !showForm && (
        <div className="text-[12.5px] text-gray-400 py-2">Aucun membre. Invitez votre équipe ci-dessous.</div>
      )}
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
            {m.nom.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-gray-800 truncate">{m.nom}</div>
            <div className="text-[11px] text-gray-400 truncate">{m.email}</div>
          </div>
          <select
            value={m.role}
            onChange={(e) => handleRoleChange(m.id, e.target.value)}
            disabled={pending}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${roleColors[m.role] ?? "bg-gray-100 text-gray-500"}`}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={() => handleRemove(m.id, m.nom)}
            disabled={pending}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Role permissions legend */}
      <div className="pt-3 border-t border-gray-100">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Permissions par rôle</div>
        <div className="space-y-1.5">
          {(Object.entries(ROLE_PERMISSIONS) as [string, string[]][]).map(([role, perms]) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${roleColors[role]}`}>{role}</span>
              <span className="text-[11px] text-gray-400">{perms.join(" · ")}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm ? (
        <form action={handleInvite} className="space-y-2 pt-2 border-t border-gray-100">
          <input name="nom" required placeholder="Nom complet" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
          <input name="email" type="email" required placeholder="Email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30" />
          <select name="role" defaultValue="Commercial" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 bg-[var(--color-primary)] hover:bg-[#155a6a] text-white text-[12px] font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors">
              {pending ? "Ajout…" : "Ajouter"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-[12px] text-[#4a90d9] hover:underline font-medium">
          + Inviter un membre
        </button>
      )}
    </div>
  );
}
