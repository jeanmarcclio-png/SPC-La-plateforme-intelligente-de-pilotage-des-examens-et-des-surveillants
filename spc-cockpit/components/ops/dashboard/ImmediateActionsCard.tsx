import Link from "next/link";
import { ChevronRight, AlertTriangle, Clock, Users, FileWarning, FileText } from "lucide-react";
import type { DashboardAction } from "@/lib/operations/dashboard";
import { SectionCard, SeeAllLink } from "./SectionCard";
import { PriorityBadge } from "./badges";

function iconFor(key: string) {
  if (key.startsWith("pourvoir")) return <AlertTriangle className="w-4 h-4" />;
  if (key.startsWith("j48")) return <Clock className="w-4 h-4" />;
  if (key.startsWith("conflits")) return <Users className="w-4 h-4" />;
  if (key.startsWith("incident")) return <FileWarning className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

const ACCENT: Record<string, string> = {
  critique: "text-rose-600 bg-rose-50",
  important: "text-amber-600 bg-amber-50",
  suivre: "text-blue-600 bg-blue-50",
};

function ActionRow({ action }: { action: DashboardAction }) {
  return (
    <Link
      href={action.href}
      className="group flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <span aria-hidden className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENT[action.severite]}`}>
        {iconFor(action.key)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-slate-800 truncate">{action.titre}</span>
        </div>
        <div className="text-[11.5px] text-slate-500 truncate">{action.detail}</div>
      </div>
      <PriorityBadge severite={action.severite} />
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0" aria-hidden />
    </Link>
  );
}

export function ImmediateActionsCard({ actions }: { actions: DashboardAction[] }) {
  return (
    <SectionCard title="Actions immédiates" icon={<AlertTriangle className="w-4 h-4" />} padBody={false}>
      <div className="px-3">
        {actions.length === 0 ? (
          <div className="px-2 py-8 text-center text-[13px] text-slate-500">
            Aucune action urgente — tout est sous contrôle.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actions.map((a) => (
              <ActionRow key={a.key} action={a} />
            ))}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-100">
        <SeeAllLink label="Voir toutes les actions" href="/operations/cockpit" />
      </div>
    </SectionCard>
  );
}
