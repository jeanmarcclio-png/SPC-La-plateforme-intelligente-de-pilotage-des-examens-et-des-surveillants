export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { SectionRule } from "@/components/SectionRule";
import { DemandeStatutActions } from "@/components/DemandeStatutActions";
import { getDemandesClient } from "@/lib/operations/demandes";
import { STATUT_META } from "@/lib/operations/demandes-constants";
import type { DemandeClient } from "@/lib/operations/types";

function nomContact(c: { prenom?: string; nom?: string }): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ").trim() || "—";
}

function periode(d: DemandeClient): string {
  const dates = d.salles.map((s) => s.dateExamen).filter(Boolean).sort() as string[];
  if (dates.length === 0) return "—";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return dates[0] === dates[dates.length - 1] ? fmt(dates[0]) : `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

function NouvelleButton() {
  return (
    <Link href="/demandes-client/nouvelle" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: "var(--color-primary)" }}>
      <Plus className="w-4 h-4" /> Nouvelle demande
    </Link>
  );
}

export default async function DemandesClientPage() {
  const demandes = await getDemandesClient();

  const count = (fn: (d: DemandeClient) => boolean) => demandes.filter(fn).length;
  const kpis = [
    { label: "Brouillons", value: count((d) => d.statut === "Brouillon"), bar: "bg-gray-400" },
    { label: "À vérifier", value: count((d) => d.statut === "À vérifier"), bar: "bg-amber-500" },
    { label: "Validées SPC", value: count((d) => d.statut === "Validée SPC"), bar: "bg-teal-500" },
    { label: "Converties", value: count((d) => d.statut === "Convertie en mission"), bar: "bg-indigo-500" },
  ];

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Opérations" title="Demandes clients" badge={`${demandes.length} demande${demandes.length > 1 ? "s" : ""}`} badgeColor="blue" actions={<NouvelleButton />} />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[22px] font-extrabold text-white">Demandes clients</div>
                <div className="text-[13px] text-white/70 mt-0.5">{demandes.length} demande{demandes.length > 1 ? "s" : ""} · avant mission</div>
              </div>
              <NouvelleButton />
            </div>
          </div>
          <div className="p-4 pb-40 space-y-3">
            {demandes.length === 0 ? (
              <EmptyState />
            ) : demandes.map((d) => (
              <Link key={d.id} href={`/demandes-client/${d.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold text-gray-900 truncate">{d.etablissement}</div>
                    <div className="text-[11.5px] text-gray-400 font-mono">{d.reference}</div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${STATUT_META[d.statut].pill}`}>{d.statut}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div className="bg-gray-50 rounded-lg py-2"><div className="text-[16px] font-extrabold text-gray-900">{d.salles.length}</div><div className="text-[10.5px] text-gray-400">salles</div></div>
                  <div className="bg-gray-50 rounded-lg py-2"><div className="text-[16px] font-extrabold text-gray-900">{d.salles.reduce((s, x) => s + x.etudiants, 0)}</div><div className="text-[10.5px] text-gray-400">étud.</div></div>
                  <div className="bg-gray-50 rounded-lg py-2"><div className="text-[13px] font-bold text-gray-700 mt-0.5">{periode(d)}</div><div className="text-[10.5px] text-gray-400">période</div></div>
                </div>
                <div className="text-[11.5px] text-gray-500 mt-3">Demandeur : <span className="font-semibold text-gray-700">{nomContact(d.demandeur)}</span> · SPC : {d.responsableSpc.nom ?? "—"}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-6">
          <SectionRule label="Synthèse" />
          <div className="grid grid-cols-4 gap-4 mb-4">
            {kpis.map((k, i) => (
              <div key={i} className="relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm p-4 pt-[18px]">
                <span aria-hidden className={`absolute top-0 left-0 right-0 h-[3px] ${k.bar}`} />
                <div className="text-[28px] font-extrabold leading-none text-gray-900">{k.value}</div>
                <div className="text-[12.5px] text-gray-600 mt-1.5 font-medium">{k.label}</div>
              </div>
            ))}
          </div>

          <SectionRule label="Demandes reçues" count={`${demandes.length} au total`} className="mt-8" />
          {demandes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Référence", "Établissement", "Demandeur", "Resp. client", "Resp. SPC", "Période", "Salles", "Étud.", "Statut / action"].map((h, i) => (
                        <th key={i} className={`px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.5px] ${i >= 6 && i <= 7 ? "text-center" : i === 8 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 whitespace-nowrap"><Link href={`/demandes-client/${d.id}`} className="text-[12px] font-mono text-[var(--color-primary)] hover:underline">{d.reference}</Link></td>
                        <td className="px-3 py-2.5"><Link href={`/demandes-client/${d.id}`} className="text-[13px] font-semibold text-gray-800 hover:text-[var(--color-primary)]">{d.etablissement}</Link><div className="text-[11px] text-gray-400">{[d.ville, d.typeEtablissement].filter(Boolean).join(" · ")}</div></td>
                        <td className="px-3 py-2.5 text-[12.5px] text-gray-600">{nomContact(d.demandeur)}</td>
                        <td className="px-3 py-2.5 text-[12.5px] text-gray-600">{nomContact(d.responsableClient)}</td>
                        <td className="px-3 py-2.5 text-[12.5px] text-gray-600">{d.responsableSpc.nom ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[12.5px] text-gray-600 whitespace-nowrap">{periode(d)}</td>
                        <td className="px-3 py-2.5 text-[12.5px] font-semibold text-gray-800 text-center">{d.salles.length}</td>
                        <td className="px-3 py-2.5 text-[12.5px] font-semibold text-gray-800 text-center">{d.salles.reduce((s, x) => s + x.etudiants, 0)}</td>
                        <td className="px-3 py-2.5"><DemandeStatutActions id={d.id} statut={d.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="text-3xl mb-2">📋</div>
      <div className="text-[15px] font-semibold text-gray-700">Aucune demande client</div>
      <div className="text-[13px] text-gray-400 mt-1 mb-4">Centralisez les demandes de surveillance reçues avant mission et devis.</div>
      <NouvelleButton />
    </div>
  );
}
