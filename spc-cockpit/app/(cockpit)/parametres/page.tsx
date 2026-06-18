import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";

export default function ParametresPage() {
  return (
    <>
      <Topbar context="Configuration" title="Paramètres" />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            { titre: "Compte utilisateur", items: [{ label: "Nom", value: "Jean-Marc Clio" }, { label: "Email", value: "jeanmarcclio@gmail.com" }, { label: "Rôle", value: "Administrateur" }] },
            { titre: "Campagne active", items: [{ label: "Nom", value: "IDF Complète 2026" }, { label: "Périmètre", value: "Paris · IDF · Paris-Saclay" }, { label: "Deadline Vague 1", value: "30/06/2026" }] },
            { titre: "Intégrations", items: [{ label: "Base de données", value: "Supabase (Sprint 2)" }, { label: "Agent IA", value: "Claude API (Sprint 3)" }, { label: "CRM", value: "CRM léger (Sprint 4)" }] },
            { titre: "Notifications", items: [{ label: "Alertes urgentes", value: "Activé" }, { label: "Rappels échéances", value: "Activé" }, { label: "Rapport J+30", value: "Désactivé" }] },
          ].map((section) => (
            <div key={section.titre} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[13px] font-semibold text-gray-800 mb-3">{section.titre}</div>
              <div className="space-y-2.5">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <ConseilBar text="Sprint 2 : connexion Supabase pour données réelles et authentification. Sprint 3 : agents Claude directement depuis l'interface." />
    </>
  );
}
