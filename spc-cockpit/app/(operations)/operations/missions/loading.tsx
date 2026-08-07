import { OPS_CONTENT_CLASS } from "@/components/ops/shell";

// Squelette calqué sur la mise en page réelle (KPI → mission active → blocs
// secondaires → tableau) pour éviter tout saut de contenu à l'affichage.

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

function Carte({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export default function Loading() {
  return (
    <div className={OPS_CONTENT_CLASS} aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement des missions…</span>

      <div className="mb-6">
        <Pulse className="w-40 h-3 mb-2" />
        <Pulse className="w-52 h-7" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <Carte key={i} className="px-4 py-4 flex items-center gap-3.5">
            <Pulse className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Pulse className="w-24 h-2.5" />
              <Pulse className="w-16 h-5" />
              <Pulse className="w-20 h-2.5" />
            </div>
          </Carte>
        ))}
      </div>

      <Carte className="mb-5 overflow-hidden">
        <div className="px-5 py-4 space-y-2">
          <Pulse className="w-28 h-2.5" />
          <Pulse className="w-72 h-5" />
        </div>
        <div className="h-[212px]" style={{ background: "linear-gradient(135deg, #071A3A 0%, #0A2147 100%)" }} />
      </Carte>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mb-5">
        {[0, 1, 2].map((i) => (
          <Carte key={i} className="px-5 py-4 space-y-3">
            <Pulse className="w-40 h-2.5" />
            <Pulse className="w-full h-3" />
            <Pulse className="w-5/6 h-3" />
            <Pulse className="w-2/3 h-3" />
          </Carte>
        ))}
      </div>

      <Carte className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EDF0F5] bg-[#F9FAFD] flex gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Pulse key={i} className="h-2.5 flex-1" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3.5 border-b border-[#EDF0F5] last:border-0 flex items-center gap-4">
            <Pulse className="w-24 h-3" />
            <Pulse className="w-40 h-3" />
            <Pulse className="w-24 h-3" />
            <Pulse className="w-20 h-3" />
            <Pulse className="w-16 h-5 rounded-full ml-auto" />
          </div>
        ))}
      </Carte>
    </div>
  );
}
