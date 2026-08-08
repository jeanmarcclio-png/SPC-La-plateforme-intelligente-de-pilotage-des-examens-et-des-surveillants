// Shell Opérations — source de vérité unique du layout premium.
// Toutes les pages utilisent OPS_CONTENT_CLASS et PageHeader : interdiction
// de redéfinir marges, largeurs ou styles de header page par page.

import { OpsBreadcrumb } from "./OpsBreadcrumb";

// Tokens de layout (référence : capture Planification v0)
// Sidebar 236px (OpsSidebar) · topbar 64px (OpsTopbar) · contenu large aéré.
export const OPS_CONTENT_CLASS = "p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16";

export function PageHeader({
  page,
  title,
  subtitle,
  actions,
  icon,
  badge,
}: {
  page: string;
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Pastille d'icône optionnelle affichée devant le titre (aucune page existante n'en dépend). */
  icon?: React.ReactNode;
  /** Pastille de contexte affichée APRÈS le titre (ex. « Cockpit commercial »). */
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
      <div>
        <OpsBreadcrumb page={page} />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
          {icon && (
            <span aria-hidden className="w-8 h-8 rounded-xl bg-[#ECEBFF] text-[#4F46F5] flex items-center justify-center flex-shrink-0">
              {icon}
            </span>
          )}
          {title ?? page}
          {badge}
        </h1>
        {typeof subtitle === "string" ? (
          <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>
        ) : (
          subtitle
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
