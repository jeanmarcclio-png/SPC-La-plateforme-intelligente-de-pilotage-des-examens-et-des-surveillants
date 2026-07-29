// Filet de section : eyebrow + trait fin (+ compteur optionnel).
// Crée les groupes de lecture nommés d'une page (Synthèse / Analyse / …).
// Grammaire de mise en page partagée — voir reporting, qualification.
export function SectionRule({
  label,
  count,
  className = "",
}: {
  label: string;
  count?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-gray-400">{label}</span>
      <span className="h-px flex-1 bg-gray-200" aria-hidden />
      {count && <span className="text-[12px] text-gray-400 flex-shrink-0">{count}</span>}
    </div>
  );
}
