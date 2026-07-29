"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { SectionRule } from "@/components/SectionRule";
import { DemandeSallesEditor } from "@/components/DemandeSallesEditor";
import { BESOINS_SUGGESTIONS } from "@/lib/operations/demandes-constants";
import { createDemande, updateDemande } from "@/app/actions/demandes";
import type { DemandeClient } from "@/lib/operations/types";

const field = "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]/50";
const label = "block text-[11px] font-semibold text-gray-500 mb-1";

function Field({ name, labelText, type = "text", required = false, placeholder, span, defaultValue }: { name: string; labelText: string; type?: string; required?: boolean; placeholder?: string; span?: string; defaultValue?: string }) {
  return (
    <div className={span}>
      <label className={label} htmlFor={name}>{labelText}{required && <span className="text-red-500"> *</span>}</label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className={field} />
    </div>
  );
}

export function DemandeClientForm({ demande }: { demande?: DemandeClient }) {
  const router = useRouter();
  const isEdit = Boolean(demande);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sameContact, setSameContact] = useState(false);

  const d = demande;
  const dem = d?.demandeur;
  const rc = d?.responsableClient;
  const spc = d?.responsableSpc;

  function handle(fd: FormData) {
    setError(null);
    if (sameContact) {
      for (const k of ["prenom", "nom", "fonction", "email", "telephone", "service"]) {
        fd.set(`resp_client_${k}`, (fd.get(`demandeur_${k}`) as string) ?? "");
      }
    }
    fd.set("besoins_json", JSON.stringify(fd.getAll("besoin")));

    startTransition(async () => {
      const res = isEdit ? await updateDemande(d!.id, fd) : await createDemande(fd);
      if (res.error) { setError(res.error); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      router.push(isEdit ? `/demandes-client/${d!.id}` : "/demandes-client");
      router.refresh();
    });
  }

  return (
    <form action={handle} className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Établissement */}
      <section>
        <SectionRule label="Établissement" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field name="etablissement" labelText="Nom de l'établissement" required span="md:col-span-2" defaultValue={d?.etablissement} />
          <Field name="type_etablissement" labelText="Type d'établissement" placeholder="Business school, IFSI…" defaultValue={d?.typeEtablissement} />
          <Field name="campus" labelText="Campus / site" defaultValue={d?.campus} />
          <Field name="ville" labelText="Ville" defaultValue={d?.ville} />
          <Field name="code_postal" labelText="Code postal" defaultValue={d?.codePostal} />
          <Field name="adresse" labelText="Adresse" span="md:col-span-2" defaultValue={d?.adresse} />
          <Field name="reference_client" labelText="Référence client" defaultValue={d?.referenceClient} />
        </div>
      </section>

      {/* 2. Demandeur */}
      <section>
        <SectionRule label="Demandeur de surveillance" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field name="demandeur_prenom" labelText="Prénom" required defaultValue={dem?.prenom} />
          <Field name="demandeur_nom" labelText="Nom" required defaultValue={dem?.nom} />
          <Field name="demandeur_fonction" labelText="Fonction" required defaultValue={dem?.fonction} />
          <Field name="demandeur_email" labelText="Email" type="email" required defaultValue={dem?.email} />
          <Field name="demandeur_telephone" labelText="Téléphone" defaultValue={dem?.telephone} />
          <Field name="demandeur_service" labelText="Service" defaultValue={dem?.service} />
        </div>
      </section>

      {/* 3. Responsable client */}
      <section>
        <SectionRule label="Responsable client" />
        <label className="flex items-center gap-2 mb-3 text-[12.5px] text-gray-600 cursor-pointer">
          <input type="checkbox" checked={sameContact} onChange={(e) => setSameContact(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
          Le demandeur est aussi le responsable client
        </label>
        {!sameContact && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field name="resp_client_prenom" labelText="Prénom" defaultValue={rc?.prenom} />
            <Field name="resp_client_nom" labelText="Nom" defaultValue={rc?.nom} />
            <Field name="resp_client_fonction" labelText="Fonction" defaultValue={rc?.fonction} />
            <Field name="resp_client_email" labelText="Email" type="email" defaultValue={rc?.email} />
            <Field name="resp_client_telephone" labelText="Téléphone" defaultValue={rc?.telephone} />
            <Field name="resp_client_service" labelText="Service" defaultValue={rc?.service} />
          </div>
        )}
      </section>

      {/* 4. Responsable SPC */}
      <section>
        <SectionRule label="Responsable SPC" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field name="resp_spc" labelText="Responsable SPC" required defaultValue={spc?.nom} />
          <Field name="resp_spc_email" labelText="Email SPC" type="email" defaultValue={spc?.email} />
          <Field name="resp_spc_role" labelText="Rôle SPC" defaultValue={spc?.role} />
        </div>
      </section>

      {/* 5. Salles et horaires */}
      <section>
        <SectionRule label="Salles et horaires demandés" />
        <DemandeSallesEditor initial={d?.salles} />
      </section>

      {/* 6. PMR / tiers-temps */}
      <section>
        <SectionRule label="PMR & tiers-temps" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 mb-3 cursor-pointer">
              <input type="checkbox" name="pmr_present" defaultChecked={d?.pmrPresent} className="w-4 h-4 accent-amber-500" /> Présence PMR
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Nombre</label><input name="pmr_nombre" type="number" min={0} defaultValue={d?.pmrNombre ?? 0} className={field} /></div>
              <div className="col-span-2"><label className={label}>Besoin particulier</label><input name="pmr_details" defaultValue={d?.pmrDetails} className={field} placeholder="ex : accès ascenseur" /></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 mb-3 cursor-pointer">
              <input type="checkbox" name="tiers_temps_present" defaultChecked={d?.tiersTempsPresent} className="w-4 h-4 accent-sky-500" /> Présence tiers-temps
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>Nombre</label><input name="tiers_temps_nombre" type="number" min={0} defaultValue={d?.tiersTempsNombre ?? 0} className={field} /></div>
              <div className="col-span-2"><label className={label}>Organisation</label><input name="tiers_temps_details" defaultValue={d?.tiersTempsDetails} className={field} placeholder="ex : majoration 1/3 temps" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Besoins particuliers + observations */}
      <section>
        <SectionRule label="Besoins particuliers & observations" />
        <div className="flex flex-wrap gap-2 mb-4">
          {BESOINS_SUGGESTIONS.map((b) => (
            <label key={b} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 cursor-pointer hover:border-[var(--color-primary)]/40 has-[:checked]:bg-teal-50 has-[:checked]:border-[var(--color-primary)]/40 has-[:checked]:text-[var(--color-primary)] transition-colors">
              <input type="checkbox" name="besoin" value={b} defaultChecked={d?.besoinsSpecifiques?.includes(b)} className="w-3.5 h-3.5 accent-[var(--color-primary)]" /> {b}
            </label>
          ))}
        </div>
        <label className={label} htmlFor="observations">Observations libres</label>
        <textarea id="observations" name="observations" rows={3} defaultValue={d?.observations} className={`${field} resize-y`} placeholder="Contexte, contraintes, précisions client…" />
        <p className="text-[11px] text-gray-400 mt-1.5">RGPD : ne pas collecter de données médicales inutiles concernant les PMR.</p>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
        <button type="button" onClick={() => router.push(isEdit ? `/demandes-client/${d!.id}` : "/demandes-client")} className="px-4 py-2.5 text-[13px] font-semibold text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200">
          Annuler
        </button>
        <button type="submit" disabled={pending} className="px-5 py-2.5 text-[13px] font-bold text-white rounded-lg disabled:opacity-50 transition-opacity" style={{ background: "var(--color-primary)" }}>
          {pending ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la demande"}
        </button>
      </div>
    </form>
  );
}
