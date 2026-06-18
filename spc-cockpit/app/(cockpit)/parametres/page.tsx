import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getCampagnes } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { CompteSection, NotificationsSection } from "@/components/ParametresForm";

export default async function ParametresPage() {
  const supabase = await createClient();
  const [{ data: { user } }, campagnes] = await Promise.all([
    supabase.auth.getUser(),
    getCampagnes(),
  ]);

  const email = user?.email ?? "—";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? email.split("@")[0];
  const campagneActive = campagnes.find((c) => c.statut === "Actif") ?? campagnes[0];

  return (
    <>
      <Topbar context="Configuration" title="Paramètres" />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-4">

          {/* Compte utilisateur */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Compte utilisateur</div>
            <CompteSection email={email} displayName={displayName} />
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Notifications</div>
            <NotificationsSection />
          </div>

          {/* Campagne active */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Campagne active</div>
            <div className="space-y-2.5">
              {campagneActive ? (
                <>
                  {[
                    { label: "Nom", value: campagneActive.nom },
                    { label: "Périmètre", value: campagneActive.perimetre },
                    { label: "Deadline", value: campagneActive.deadline },
                    { label: "Prospects", value: `${campagneActive.nombreProspects} cibles` },
                    { label: "Score BANT", value: `${campagneActive.score} / 10` },
                    { label: "Statut", value: campagneActive.statut },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-semibold text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-[12.5px] text-gray-400">Aucune campagne active</div>
              )}
            </div>
          </div>

          {/* Intégrations */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Intégrations</div>
            <div className="space-y-2.5">
              {[
                { label: "Base de données", value: "Supabase", ok: true },
                { label: "Authentification", value: "Supabase Auth", ok: true },
                { label: "Déploiement", value: "Vercel", ok: true },
                { label: "Agent IA", value: "Claude Sonnet 4.6", ok: true },
                { label: "Analytics J+30", value: "À configurer", ok: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-semibold flex items-center gap-1 ${row.ok ? "text-[#1a6b7e]" : "text-gray-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.ok ? "bg-green-400" : "bg-gray-300"}`} />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <ConseilBar text="Modifiez votre nom affiché et votre mot de passe directement depuis cette page. Les toggles de notifications seront connectés à Supabase à la prochaine version." />
    </>
  );
}
