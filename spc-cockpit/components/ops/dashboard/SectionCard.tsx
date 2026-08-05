import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Conteneur de section du dashboard : carte blanche, en-tête (titre en capitales
// + icône optionnelle + lien « voir tout »), corps. Source unique du style des
// blocs — interdiction de redéfinir marges/bordures/ombres bloc par bloc.

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "",
  padBody = true,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padBody?: boolean;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.7px] text-slate-700">
          {icon && <span aria-hidden className="text-slate-400">{icon}</span>}
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded"
          >
            {action.label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className={`${padBody ? "px-5 pb-5" : ""} ${bodyClassName} flex-1`}>{children}</div>
    </section>
  );
}

// Lien « voir tout » de bas de carte (aligné à droite ou centré).
export function SeeAllLink({ label, href, className = "" }: { label: string; href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-0.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded ${className}`}
    >
      {label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
    </Link>
  );
}
