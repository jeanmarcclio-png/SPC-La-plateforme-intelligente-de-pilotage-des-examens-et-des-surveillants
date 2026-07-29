export const dynamic = "force-dynamic";

import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getCampagnes } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { CompteSection, NotificationsSection } from "@/components/ParametresForm";
import { TeamSection } from "@/components/TeamSection";
import { getNotificationPrefs, getTeamMembers } from "@/app/actions/parametres";
import { PushNotificationToggle } from "@/components/PushNotificationBanner";
import { SectorSection } from "@/components/SectorSection";
import { FacturationSection } from "@/components/FacturationSection";
import { getTauxHoraireFacturation } from "@/lib/operations/org-parametres";

export default async function ParametresPage() {
  const supabase = await createClient();
  const [{ data: { user } }, campagnes, notifPrefs, teamMembers, tauxFacturation] = await Promise.all([
    supabase.auth.getUser(),
    getCampagnes(),
    getNotificationPrefs(),
    getTeamMembers(),
    getTauxHoraireFacturation(),
  ]);

  const email = user?.email ?? "—";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? email.split("@")[0];
  const campagneActive = campagnes.find((c) => c.statut === "Actif") ?? campagnes[0];

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Configuration" title="Paramètres" />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
            <div className="text-[22px] font-extrabold text-white">Paramètres</div>
            <div className="text-[13px] text-white/70 mt-0.5">{displayName}</div>
          </div>
          <div className="p-4 space-y-3">

            {/* Secteur */}
            <SectorSection />

            {/* Compte */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Compte utilisateur</div>
              <CompteSection email={email} displayName={displayName} />
            </div>

            {/* Campagne active */}
            {campagneActive && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-[13px] font-bold text-gray-800 mb-3">Campagne active</div>
                <div className="space-y-2.5">
                  {[
                    { label: "Nom", value: campagneActive.nom },
                    { label: "Deadline", value: campagneActive.deadline },
                    { label: "Prospects", value: `${campagneActive.nombreProspects} cibles` },
                    { label: "Score BANT", value: `${campagneActive.score} / 10` },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-[12.5px]">
                      <span className="text-gray-400">{row.label}</span>
                      <span className="font-semibold text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Notifications</div>
              <NotificationsSection saved={notifPrefs} />
              <div className="mt-3 pt-3 border-t border-gray-100">
                <PushNotificationToggle />
              </div>
            </div>

            {/* Facturation */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Facturation</div>
              <FacturationSection taux={tauxFacturation} />
            </div>

            {/* Intégrations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Intégrations</div>
              <div className="space-y-2.5">
                {[
                  { label: "Base de données", value: "Supabase", ok: true },
                  { label: "Déploiement", value: "Vercel", ok: true },
                  { label: "Agent IA", value: "Claude", ok: true },
                  { label: "Analytics J+30", value: "À configurer", ok: false },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-[12.5px]">
                    <span className="text-gray-400">{row.label}</span>
                    <span className={`font-semibold flex items-center gap-1.5 ${row.ok ? "text-[var(--color-primary)]" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.ok ? "bg-green-400" : "bg-gray-300"}`} />
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Équipe */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Équipe</div>
              <TeamSection members={teamMembers} />
            </div>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
        <div className="grid grid-cols-2 gap-4">

          {/* Secteur d'activité — full width, 5 colonnes desktop */}
          <div className="col-span-2">
            <SectorSection cols={5} />
          </div>

          {/* Compte utilisateur */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Compte utilisateur</div>
            <CompteSection email={email} displayName={displayName} />
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Notifications</div>
            <NotificationsSection saved={notifPrefs} />
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

          {/* Facturation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Facturation</div>
            <FacturationSection taux={tauxFacturation} />
          </div>

          {/* Équipe */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-4">Équipe & rôles</div>
            <TeamSection members={teamMembers} />
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
                  <span className={`font-semibold flex items-center gap-1 ${row.ok ? "text-[var(--color-primary)]" : "text-gray-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.ok ? "bg-green-400" : "bg-gray-300"}`} />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>{/* end desktop */}
      </main>
      <div className="hidden md:block">
        <ConseilBar text="Modifiez votre nom affiché et votre mot de passe directement depuis cette page. Les toggles de notifications seront connectés à Supabase à la prochaine version." />
      </div>
    </>
  );
}
