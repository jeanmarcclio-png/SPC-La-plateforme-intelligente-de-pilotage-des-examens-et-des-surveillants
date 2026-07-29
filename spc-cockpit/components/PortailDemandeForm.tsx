"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { soumettrePortail } from "@/app/actions/portail-client";
import { validatePortailPayload, type PortailPayload, type PortailSalle } from "@/lib/operations/portail-constants";
import { BESOINS_SUGGESTIONS } from "@/lib/operations/demandes-constants";

const ACCENT = "#1a6b7e";
const NAVY = "#0d2137";

const field =
  "w-full px-3 py-2 rounded-lg border border-gray-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/25 focus:border-[#1a6b7e]";
// Input compact pour le tableau des salles : PAS de w-full (largeur fixée par cellule).
const cell =
  "px-2 py-1.5 rounded-lg border border-gray-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/25 focus:border-[#1a6b7e]";
const label = "block text-[12.5px] font-semibold text-gray-600 mb-1";

type Row = PortailSalle & { _key: string };

function Section({ titre, sous, children }: { titre: string; sous?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[15px] font-bold" style={{ color: NAVY }}>{titre}</h2>
      {sous && <p className="text-[12.5px] text-gray-500 mt-0.5 mb-3">{sous}</p>}
      <div className={sous ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export function PortailDemandeForm({ token, initial, reference, expiresAt, correction }: { token: string; initial: PortailPayload; reference?: string; expiresAt?: string; correction?: string }) {
  const seq = useRef(0);
  const key = () => `s-${seq.current++}`;
  const [p, setP] = useState<PortailPayload>(initial);
  const [rows, setRows] = useState<Row[]>(
    (initial.salles.length ? initial.salles : [{ creneau: "matin", salle: "", etudiants: 0, surveillants: 1, pmr: false, tiers_temps: false } as PortailSalle])
      .map((s, i) => ({ ...s, _key: `init-${i}` })),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof PortailPayload>(k: K, v: PortailPayload[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }
  function updateRow(k: string, patch: Partial<PortailSalle>) {
    setRows((prev) => prev.map((r) => (r._key === k ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, { creneau: "matin", salle: "", etudiants: 0, surveillants: 1, pmr: false, tiers_temps: false, date_examen: last?.date_examen, debut_surveillance: last?.debut_surveillance, fin_surveillance: last?.fin_surveillance, _key: key() }]);
  }
  function removeRow(k: string) {
    setRows((prev) => prev.filter((r) => r._key !== k));
  }
  function toggleBesoin(b: string) {
    setP((prev) => ({ ...prev, besoins_specifiques: prev.besoins_specifiques.includes(b) ? prev.besoins_specifiques.filter((x) => x !== b) : [...prev.besoins_specifiques, b] }));
  }

  function buildPayload(): PortailPayload {
    return {
      ...p,
      salles: rows.filter((r) => r.salle.trim()).map(({ _key, ...s }, i) => { void _key; return { ...s, salle: s.salle.trim(), ordre: i + 1 }; }),
    };
  }

  function submit() {
    const payload = buildPayload();
    const errs = validatePortailPayload(payload);
    setErrors(errs);
    setSubmitError(null);
    if (errs.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    startTransition(async () => {
      const res = await soumettrePortail(token, payload);
      if (res.ok) setDone(true);
      else setSubmitError(res.error ?? "Envoi impossible.");
    });
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `${ACCENT}15` }}>
          <CheckCircle2 className="w-9 h-9" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-[20px] font-extrabold" style={{ color: NAVY }}>Demande transmise à SPC</h2>
        <p className="text-[14px] text-gray-500 mt-2 max-w-md mx-auto">Merci. Vos informations ont bien été envoyées. L&apos;équipe SPC va les vérifier et revenir vers vous. Vous pouvez fermer cette page.</p>
      </div>
    );
  }

  return (
    <div>
      {correction && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-amber-800"><AlertTriangle className="w-4 h-4" /> SPC vous demande de compléter votre demande</div>
          <p className="mt-1 text-[12.5px] text-amber-700 whitespace-pre-line">{correction}</p>
          <p className="mt-1 text-[11.5px] text-amber-600">Corrigez les informations ci-dessous puis transmettez à nouveau.</p>
        </div>
      )}
      {expiresAt && (
        <p className="text-[12px] text-gray-400 mt-2">Lien valable jusqu&apos;au {new Date(expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</p>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-red-700"><AlertTriangle className="w-4 h-4" /> Merci de corriger :</div>
          <ul className="mt-1 text-[12.5px] text-red-600 space-y-0.5 list-disc pl-5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <Section titre="Établissement">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className={label} htmlFor="etab">Nom de l&apos;établissement <span className="text-red-500">*</span></label>
            <input id="etab" value={p.etablissement} onChange={(e) => set("etablissement", e.target.value)} className={field} />
          </div>
          <div><label className={label} htmlFor="campus">Site / Campus</label><input id="campus" value={p.campus ?? ""} onChange={(e) => set("campus", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="ville">Ville</label><input id="ville" value={p.ville ?? ""} onChange={(e) => set("ville", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="typeet">Type d&apos;établissement</label><input id="typeet" value={p.type_etablissement ?? ""} onChange={(e) => set("type_etablissement", e.target.value)} className={field} placeholder="Business school, université…" /></div>
          <div><label className={label} htmlFor="refcli">Votre référence interne</label><input id="refcli" value={p.reference_client ?? ""} onChange={(e) => set("reference_client", e.target.value)} className={field} /></div>
        </div>
      </Section>

      <Section titre="Demandeur" sous="La personne à contacter pour cette demande.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={label} htmlFor="dnom">Nom <span className="text-red-500">*</span></label><input id="dnom" value={p.demandeur_nom ?? ""} onChange={(e) => set("demandeur_nom", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="dpre">Prénom</label><input id="dpre" value={p.demandeur_prenom ?? ""} onChange={(e) => set("demandeur_prenom", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="dmail">Email <span className="text-red-500">*</span></label><input id="dmail" type="email" value={p.demandeur_email ?? ""} onChange={(e) => set("demandeur_email", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="dtel">Téléphone</label><input id="dtel" value={p.demandeur_telephone ?? ""} onChange={(e) => set("demandeur_telephone", e.target.value)} className={field} /></div>
          <div className="md:col-span-2"><label className={label} htmlFor="dfonc">Fonction</label><input id="dfonc" value={p.demandeur_fonction ?? ""} onChange={(e) => set("demandeur_fonction", e.target.value)} className={field} placeholder="Responsable des examens…" /></div>
        </div>
      </Section>

      <Section titre="Responsable de l'établissement" sous="Optionnel — si différent du demandeur.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={label} htmlFor="rnom">Nom</label><input id="rnom" value={p.resp_client_nom ?? ""} onChange={(e) => set("resp_client_nom", e.target.value)} className={field} /></div>
          <div><label className={label} htmlFor="rmail">Email</label><input id="rmail" type="email" value={p.resp_client_email ?? ""} onChange={(e) => set("resp_client_email", e.target.value)} className={field} /></div>
        </div>
      </Section>

      <Section titre="Salles et horaires" sous="Une ligne par salle et par créneau. Les heures de surveillance encadrent l'examen.">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse min-w-[820px]">
            <thead>
              <tr style={{ background: NAVY }}>
                {["Date", "Créneau", "Salle", "Bât.", "Étud.", "Surv.", "PMR", "T.-t.", "Début surv.", "Fin surv.", ""].map((h, i) => (
                  <th key={i} className={`px-2.5 py-2 text-[10px] font-bold text-white/80 uppercase tracking-[.5px] whitespace-nowrap ${i >= 4 && i <= 7 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._key} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-1.5"><input type="date" value={r.date_examen ?? ""} onChange={(e) => updateRow(r._key, { date_examen: e.target.value })} className={`${cell} w-[150px]`} /></td>
                  <td className="px-2 py-1.5">
                    <select value={r.creneau} onChange={(e) => updateRow(r._key, { creneau: e.target.value as "matin" | "apres-midi" })} className={`${cell} w-[118px]`}>
                      <option value="matin">Matin</option>
                      <option value="apres-midi">Après-midi</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input value={r.salle} maxLength={8} onChange={(e) => updateRow(r._key, { salle: e.target.value.toUpperCase() })} placeholder="A21" className={`${cell} font-mono w-[88px]`} /></td>
                  <td className="px-2 py-1.5"><input value={r.batiment ?? ""} maxLength={6} onChange={(e) => updateRow(r._key, { batiment: e.target.value })} className={`${cell} w-[72px]`} /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} value={r.etudiants} onChange={(e) => updateRow(r._key, { etudiants: Number(e.target.value) })} className={`${cell} w-[80px] text-center`} /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} value={r.surveillants} onChange={(e) => updateRow(r._key, { surveillants: Number(e.target.value) })} className={`${cell} w-[76px] text-center`} /></td>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={r.pmr} onChange={(e) => updateRow(r._key, { pmr: e.target.checked })} aria-label="PMR" className="w-4 h-4 accent-amber-500" /></td>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={r.tiers_temps} onChange={(e) => updateRow(r._key, { tiers_temps: e.target.checked })} aria-label="Tiers-temps" className="w-4 h-4 accent-sky-500" /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.debut_surveillance ?? ""} onChange={(e) => updateRow(r._key, { debut_surveillance: e.target.value })} className={`${cell} font-mono w-[104px]`} /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.fin_surveillance ?? ""} onChange={(e) => updateRow(r._key, { fin_surveillance: e.target.value })} className={`${cell} font-mono w-[104px]`} /></td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeRow(r._key)} aria-label="Supprimer la ligne" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-500 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-[12.5px] font-semibold text-gray-600 hover:border-[#1a6b7e] hover:text-[#1a6b7e] transition-colors">
          <Plus className="w-3.5 h-3.5" /> Ajouter une salle
        </button>
      </Section>

      <Section titre="Aménagements & besoins">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700"><input type="checkbox" checked={p.pmr_present} onChange={(e) => set("pmr_present", e.target.checked)} className="w-4 h-4 accent-amber-500" /> Étudiants PMR</label>
            {p.pmr_present && <input type="number" min={0} value={p.pmr_nombre} onChange={(e) => set("pmr_nombre", Number(e.target.value))} placeholder="Nombre" className={`${field} mt-2`} />}
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700"><input type="checkbox" checked={p.tiers_temps_present} onChange={(e) => set("tiers_temps_present", e.target.checked)} className="w-4 h-4 accent-sky-500" /> Étudiants tiers-temps</label>
            {p.tiers_temps_present && <input type="number" min={0} value={p.tiers_temps_nombre} onChange={(e) => set("tiers_temps_nombre", Number(e.target.value))} placeholder="Nombre" className={`${field} mt-2`} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {BESOINS_SUGGESTIONS.map((b) => {
            const on = p.besoins_specifiques.includes(b);
            return (
              <button key={b} type="button" onClick={() => toggleBesoin(b)} className={`rounded-full px-3 py-1 text-[12px] border transition-colors ${on ? "text-white border-transparent" : "text-gray-600 border-gray-300 hover:border-gray-400"}`} style={on ? { background: ACCENT } : undefined}>{b}</button>
            );
          })}
        </div>
        <div className="mt-3">
          <label className={label} htmlFor="obs">Observations</label>
          <textarea id="obs" value={p.observations ?? ""} onChange={(e) => set("observations", e.target.value)} rows={3} className={`${field} resize-y`} placeholder="Précisions utiles à l'organisation de la surveillance…" />
        </div>
      </Section>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12px] text-gray-500 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
        <span>Vos données sont transmises à SPC uniquement pour l&apos;organisation de la surveillance de vos examens. Consultez la <a href="/confidentialite" className="underline" style={{ color: ACCENT }}>politique de confidentialité</a>. N&apos;indiquez pas d&apos;information nominative sur les étudiants.</span>
      </div>

      {submitError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{submitError}</div>}

      <div className="mt-5 flex items-center justify-end gap-3">
        {reference && <span className="text-[12px] text-gray-400 font-mono">{reference}</span>}
        <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40" style={{ background: ACCENT }}>
          <CheckCircle2 className="w-4 h-4" /> {pending ? "Envoi…" : "Transmettre à SPC"}
        </button>
      </div>
    </div>
  );
}
