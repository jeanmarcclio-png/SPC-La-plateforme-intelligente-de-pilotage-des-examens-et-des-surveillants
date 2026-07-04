import Link from "next/link";
import { FileText, Users, Clock, AlertTriangle } from "lucide-react";

const ACTIONS = [
  { href: "/operations/devis",         label: "Nouveau devis",    icon: <FileText className="w-4 h-4" />,      bg: "#0d2137" },
  { href: "/operations/planification", label: "Planifier équipe", icon: <Users className="w-4 h-4" />,         bg: "#2563eb" },
  { href: "/operations/salles",        label: "Gérer les salles", icon: <Clock className="w-4 h-4" />,         bg: "#059669" },
  { href: "/operations/rapports",      label: "Voir les rapports", icon: <AlertTriangle className="w-4 h-4" />, bg: "#f59e0b" },
];

export function QuickActions() {
  return (
    <nav aria-label="Actions rapides" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center justify-center gap-2.5 rounded-2xl py-4 text-white text-[13.5px] font-bold shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          style={{ background: a.bg }}
        >
          <span aria-hidden>{a.icon}</span>
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
