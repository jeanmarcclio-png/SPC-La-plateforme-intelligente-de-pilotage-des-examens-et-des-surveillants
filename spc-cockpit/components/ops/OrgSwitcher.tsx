"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { setActiveOrganisation } from "@/app/actions/onboarding";

export interface OrgOption {
  orgId: string;
  nom: string;
  role: string;
}

// Sélecteur d'organisation. Affiche l'org active ; propose un menu de bascule
// uniquement si l'utilisateur appartient à plusieurs organisations (spec §3).
export function OrgSwitcher({ orgs, activeId }: { orgs: OrgOption[]; activeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (orgs.length === 0) return null;
  const active = orgs.find((o) => o.orgId === activeId) ?? orgs[0];
  const multi = orgs.length > 1;

  function choose(orgId: string) {
    setOpen(false);
    if (orgId === active.orgId) return;
    startTransition(async () => {
      const res = await setActiveOrganisation(orgId);
      if (!res.error) router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => multi && setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup={multi ? "menu" : undefined}
        aria-expanded={multi ? open : undefined}
        title={multi ? "Changer d'organisation" : active.nom}
        className={`flex items-center gap-2 px-3 h-10 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 max-w-[220px] transition-colors ${multi ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"} disabled:opacity-50`}
      >
        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
        <span className="truncate font-medium">{active.nom}</span>
        {multi && <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden />}
      </button>

      {multi && open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] min-w-[240px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-40"
        >
          {orgs.map((o) => (
            <button
              key={o.orgId}
              role="menuitem"
              onClick={() => choose(o.orgId)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 text-left transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium">{o.nom}</span>
                <span className="block text-[11px] text-gray-400 capitalize">{o.role}</span>
              </span>
              {o.orgId === active.orgId && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
