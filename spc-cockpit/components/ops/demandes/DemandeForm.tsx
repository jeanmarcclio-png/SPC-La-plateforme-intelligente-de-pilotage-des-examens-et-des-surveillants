"use client";

import { createContext, useContext, useState } from "react";
import { Plus, Copy, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DemandeClient, LigneSalleDemande, ContactDemande } from "@/lib/operations/demandes/types";
import { validerDemande, totauxDemande } from "@/lib/operations/demandes/logic";
import { Button } from "@/components/ops/Button";
import { BoutonDG } from "./CockpitUI";

const BESOINS = ["Placement particulier", "Salle isolée", "Matériel spécifique", "Accès bâtiment", "Présence coordinateur", "Contrôle d'identité", "Émargement", "Interdiction téléphone", "Documents à distribuer", "Collecte copies"];

// Le formulaire vit dans deux contextes : les pages Opérations claires et le
// cockpit des demandes en thème Dark Graphite. Une seule implémentation, deux
// jeux de classes — jamais de duplication de composant.
const CLASSES = {
  clair: {
    input: "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300",
    lab: "block text-[11px] font-semibold text-slate-500 mb-1",
    section: "rounded-xl border border-slate-200/80 p-4",
    puce: "w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-[12px] font-bold flex items-center justify-center flex-shrink-0",
    titre: "text-[13.5px] font-bold text-slate-900",
    sousTitre: "text-[11px] text-slate-400",
    texte: "text-slate-600",
    texteFort: "text-slate-700",
    entete: "text-slate-400",
    separateur: "border-slate-100",
    encart: "rounded-lg bg-slate-50/60 p-3",
    chipOff: "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
    chipOn: "bg-indigo-600 text-white ring-indigo-600",
    ok: "flex items-center gap-2 text-[12.5px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2",
    alerte: "rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5",
    alerteTitre: "flex items-center gap-2 text-[12.5px] font-semibold text-amber-800 mb-1",
    alerteListe: "list-disc pl-6 text-[11.5px] text-amber-800 space-y-0.5",
    accent: "accent-indigo-600",
    lien: "mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700",
    iconeAction: "text-slate-400 hover:text-indigo-600 p-1",
    iconeSuppr: "text-slate-400 hover:text-rose-600 p-1",
  },
  sombre: {
    input: "w-full px-2.5 py-1.5 rounded-lg border bg-[#071827] border-[rgba(148,163,184,0.18)] text-[#F6F8FC] text-[12.5px] placeholder:text-[#647386] focus:outline-none focus:ring-2 focus:ring-[#735DFF]/45 focus:border-[#735DFF]",
    lab: "block text-[11px] font-semibold text-[#7E8C9F] mb-1",
    section: "rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#0B1926] p-4",
    puce: "w-6 h-6 rounded-lg bg-[rgba(115,93,255,0.14)] text-[#735DFF] text-[12px] font-bold flex items-center justify-center flex-shrink-0",
    titre: "text-[13.5px] font-bold text-[#F6F8FC]",
    sousTitre: "text-[11px] text-[#7E8C9F]",
    texte: "text-[#B4BECC]",
    texteFort: "text-[#F6F8FC]",
    entete: "text-[#647386]",
    separateur: "border-[rgba(148,163,184,0.14)]",
    encart: "rounded-lg bg-[#071827] border border-[rgba(148,163,184,0.10)] p-3",
    chipOff: "bg-[#0D1D2B] text-[#B4BECC] ring-[rgba(148,163,184,0.22)] hover:bg-[#12283A]",
    chipOn: "bg-[#5A3FFF] text-white ring-[#5A3FFF]",
    ok: "flex items-center gap-2 text-[12.5px] text-[#17D98B] bg-[rgba(23,217,139,0.13)] rounded-lg px-3 py-2",
    alerte: "rounded-lg bg-[rgba(255,138,0,0.12)] border border-[rgba(255,138,0,0.28)] px-3 py-2.5",
    alerteTitre: "flex items-center gap-2 text-[12.5px] font-semibold text-[#FF8A00] mb-1",
    alerteListe: "list-disc pl-6 text-[11.5px] text-[#E7B980] space-y-0.5",
    accent: "accent-[#5A3FFF]",
    lien: "mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#735DFF] hover:text-[#8C7BFF]",
    iconeAction: "text-[#7E8C9F] hover:text-[#735DFF] p-1",
    iconeSuppr: "text-[#7E8C9F] hover:text-[#FF3F55] p-1",
  },
} as const;

const ThemeFormulaire = createContext<typeof CLASSES.clair | typeof CLASSES.sombre>(CLASSES.clair);
const useC = () => useContext(ThemeFormulaire);

function Section({ n, titre, sub, children }: { n: number; titre: string; sub?: string; children: React.ReactNode }) {
  const c = useC();
  return (
    <section className={c.section}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={c.puce}>{n}</span>
        <div>
          <h3 className={c.titre}>{titre}</h3>
          {sub && <p className={c.sousTitre}>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useC();
  return <div><label className={c.lab}>{label}</label>{children}</div>;
}

function newLigne(): LigneSalleDemande {
  return { id: Math.random().toString(36).slice(2), creneau: "Matin" };
}

export function DemandeForm({ demande, onSave, onCancel, sombre = false }: { demande: DemandeClient; onSave: (d: DemandeClient) => void; onCancel: () => void; sombre?: boolean }) {
  const [d, setD] = useState<DemandeClient>(demande);
  const [erreurNom, setErreurNom] = useState(false);
  const c = sombre ? CLASSES.sombre : CLASSES.clair;
  const patch = (p: Partial<DemandeClient>) => setD((x) => ({ ...x, ...p }));
  const patchContact = (k: "demandeur" | "responsableClient", p: Partial<ContactDemande>) => setD((x) => ({ ...x, [k]: { ...x[k], ...p } }));

  function copyDemandeur(checked: boolean) {
    setD((x) => ({ ...x, demandeurEstResponsable: checked, responsableClient: checked ? { ...x.demandeur } : x.responsableClient }));
  }

  const updateLigne = (i: number, p: Partial<LigneSalleDemande>) => setD((x) => ({ ...x, lignes: x.lignes.map((l, j) => (j === i ? { ...l, ...p } : l)) }));
  const addLigne = () => setD((x) => ({ ...x, lignes: [...x.lignes, newLigne()] }));
  const dupLigne = (i: number) => setD((x) => { const cp = { ...x.lignes[i], id: Math.random().toString(36).slice(2) }; const next = [...x.lignes]; next.splice(i + 1, 0, cp); return { ...x, lignes: next }; });
  const removeLigne = (i: number) => setD((x) => ({ ...x, lignes: x.lignes.filter((_, j) => j !== i) }));
  const toggleBesoin = (b: string) => setD((x) => { const set = new Set(x.besoinsParticuliers ?? []); if (set.has(b)) set.delete(b); else set.add(b); return { ...x, besoinsParticuliers: [...set] }; });

  const erreurs = validerDemande(d);
  const t = totauxDemande(d);

  function submit() {
    if (!d.etablissement.trim()) { setErreurNom(true); return; }
    setErreurNom(false);
    onSave({ ...d, updatedAt: new Date().toISOString() });
  }

  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <ThemeFormulaire.Provider value={c}>
      <div className="space-y-4">
        {/* 1. Établissement */}
        <Section n={1} titre="Informations établissement">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <Champ label="Nom établissement *">
              <input
                className={c.input}
                value={d.etablissement}
                aria-invalid={erreurNom}
                aria-describedby={erreurNom ? "erreur-etablissement" : undefined}
                onChange={(e) => { patch({ etablissement: e.target.value }); if (erreurNom) setErreurNom(false); }}
                placeholder="ex : ICP Paris"
              />
              {erreurNom && (
                <p id="erreur-etablissement" role="alert" className="text-[11px] mt-1 text-[#FF3F55]">
                  Le nom de l&apos;établissement est obligatoire.
                </p>
              )}
            </Champ>
            <Champ label="Campus / site"><input className={c.input} value={d.campus ?? ""} onChange={(e) => patch({ campus: e.target.value })} /></Champ>
            <Champ label="Référence client"><input className={c.input} value={d.referenceClient ?? ""} onChange={(e) => patch({ referenceClient: e.target.value })} /></Champ>
            <Champ label="Adresse"><input className={c.input} value={d.adresse ?? ""} onChange={(e) => patch({ adresse: e.target.value })} /></Champ>
            <Champ label="Code postal"><input className={c.input} value={d.codePostal ?? ""} onChange={(e) => patch({ codePostal: e.target.value })} /></Champ>
            <Champ label="Ville"><input className={c.input} value={d.ville ?? ""} onChange={(e) => patch({ ville: e.target.value })} /></Champ>
          </div>
        </Section>

        {/* 2. Demandeur */}
        <Section n={2} titre="Demandeur de surveillance" sub="Personne ayant formulé la demande côté client">
          <ContactFields c={d.demandeur} onChange={(p) => patchContact("demandeur", p)} />
        </Section>

        {/* 3. Responsable client */}
        <Section n={3} titre="Responsable client" sub="Personne officiellement responsable côté établissement">
          <label className={`flex items-center gap-2 text-[12px] ${c.texte} mb-3 cursor-pointer`}>
            <input type="checkbox" className={`w-4 h-4 ${c.accent}`} checked={!!d.demandeurEstResponsable} onChange={(e) => copyDemandeur(e.target.checked)} />
            Le demandeur est aussi le responsable client
          </label>
          <ContactFields c={d.responsableClient} disabled={!!d.demandeurEstResponsable} onChange={(p) => patchContact("responsableClient", p)} />
        </Section>

        {/* 4. Responsable SPC */}
        <Section n={4} titre="Responsable SPC" sub="Personne interne chargée de suivre la demande">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <Champ label="Responsable SPC *"><input className={c.input} value={d.responsableSpc} onChange={(e) => patch({ responsableSpc: e.target.value })} /></Champ>
            <Champ label="Email SPC"><input className={c.input} value={d.emailSpc ?? ""} onChange={(e) => patch({ emailSpc: e.target.value })} /></Champ>
            <Champ label="Rôle SPC"><input className={c.input} value={d.roleSpc ?? ""} onChange={(e) => patch({ roleSpc: e.target.value })} /></Champ>
          </div>
        </Section>

        {/* 5. Salles & horaires */}
        <Section n={5} titre="Dates, créneaux et salles" sub="Matin et après-midi indépendants — ne pas confondre heure d'examen et heure de surveillance">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-collapse min-w-[1100px] text-[11.5px]">
              <thead>
                <tr className={`text-left ${c.entete}`}>
                  {["Date", "Créneau", "Salle", "Bât.", "Étud.", "Surv.", "PMR", "T-t", "Début ex.", "Fin ex.", "Début surv.", "Fin surv.", ""].map((h, i) => <th key={h || `col-${i}`} className="px-1.5 py-1 font-semibold uppercase tracking-wide text-[9.5px]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {d.lignes.map((l, i) => (
                  <tr key={l.id} className={`border-t ${c.separateur}`}>
                    <td className="px-1 py-1"><input type="date" aria-label={`Date ligne ${i + 1}`} className={c.input} value={l.date ?? ""} onChange={(e) => updateLigne(i, { date: e.target.value })} /></td>
                    <td className="px-1 py-1"><select aria-label={`Créneau ligne ${i + 1}`} className={c.input} value={l.creneau ?? "Matin"} onChange={(e) => updateLigne(i, { creneau: e.target.value })}><option>Matin</option><option>Après-midi</option></select></td>
                    <td className="px-1 py-1"><input aria-label={`Salle ligne ${i + 1}`} className={`${c.input} min-w-[70px]`} value={l.salle ?? ""} onChange={(e) => updateLigne(i, { salle: e.target.value })} /></td>
                    <td className="px-1 py-1"><input aria-label={`Bâtiment ligne ${i + 1}`} className={`${c.input} w-14`} value={l.batiment ?? ""} onChange={(e) => updateLigne(i, { batiment: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="number" min="0" aria-label={`Étudiants ligne ${i + 1}`} className={`${c.input} w-16`} value={l.etudiants ?? ""} onChange={(e) => updateLigne(i, { etudiants: num(e.target.value) })} /></td>
                    <td className="px-1 py-1"><input type="number" min="0" aria-label={`Surveillants ligne ${i + 1}`} className={`${c.input} w-14`} value={l.surveillants ?? ""} onChange={(e) => updateLigne(i, { surveillants: num(e.target.value) })} /></td>
                    <td className="px-1 py-1 text-center"><input type="checkbox" aria-label={`PMR ligne ${i + 1}`} className={`w-4 h-4 ${c.accent}`} checked={!!l.pmr} onChange={(e) => updateLigne(i, { pmr: e.target.checked })} /></td>
                    <td className="px-1 py-1 text-center"><input type="checkbox" aria-label={`Tiers-temps ligne ${i + 1}`} className={`w-4 h-4 ${c.accent}`} checked={!!l.tiersTemps} onChange={(e) => updateLigne(i, { tiersTemps: e.target.checked })} /></td>
                    <td className="px-1 py-1"><input type="time" aria-label={`Début examen ligne ${i + 1}`} className={c.input} value={l.debutExamen ?? ""} onChange={(e) => updateLigne(i, { debutExamen: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="time" aria-label={`Fin examen ligne ${i + 1}`} className={c.input} value={l.finExamen ?? ""} onChange={(e) => updateLigne(i, { finExamen: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="time" aria-label={`Début surveillance ligne ${i + 1}`} className={c.input} value={l.debutSurveillance ?? ""} onChange={(e) => updateLigne(i, { debutSurveillance: e.target.value })} /></td>
                    <td className="px-1 py-1"><input type="time" aria-label={`Fin surveillance ligne ${i + 1}`} className={c.input} value={l.finSurveillance ?? ""} onChange={(e) => updateLigne(i, { finSurveillance: e.target.value })} /></td>
                    <td className="px-1 py-1 whitespace-nowrap">
                      <button onClick={() => dupLigne(i)} title="Dupliquer" aria-label={`Dupliquer la ligne ${i + 1}`} className={c.iconeAction}><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeLigne(i)} title="Supprimer" aria-label={`Supprimer la ligne ${i + 1}`} className={c.iconeSuppr}><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addLigne} className={c.lien}><Plus className="w-3.5 h-3.5" />Ajouter une ligne</button>
        </Section>

        {/* 6. PMR / tiers-temps / besoins */}
        <Section n={6} titre="PMR, tiers-temps et besoins spécifiques" sub="RGPD : ne pas demander de données médicales inutiles">
          <div className="grid md:grid-cols-2 gap-4">
            <div className={c.encart}>
              <label className={`flex items-center gap-2 text-[12.5px] font-semibold ${c.texteFort} mb-2 cursor-pointer`}><input type="checkbox" className={`w-4 h-4 ${c.accent}`} checked={!!d.pmrPresence} onChange={(e) => patch({ pmrPresence: e.target.checked })} />Présence PMR</label>
              {d.pmrPresence && <div className="grid grid-cols-2 gap-2">
                <Champ label="Nombre"><input type="number" min="0" className={c.input} value={d.pmrNombre ?? ""} onChange={(e) => patch({ pmrNombre: num(e.target.value) })} /></Champ>
                <Champ label="Salles concernées"><input className={c.input} value={d.pmrSalles ?? ""} onChange={(e) => patch({ pmrSalles: e.target.value })} /></Champ>
                <div className="col-span-2"><Champ label="Besoin particulier"><input className={c.input} value={d.pmrBesoin ?? ""} onChange={(e) => patch({ pmrBesoin: e.target.value })} /></Champ></div>
              </div>}
            </div>
            <div className={c.encart}>
              <label className={`flex items-center gap-2 text-[12.5px] font-semibold ${c.texteFort} mb-2 cursor-pointer`}><input type="checkbox" className={`w-4 h-4 ${c.accent}`} checked={!!d.ttPresence} onChange={(e) => patch({ ttPresence: e.target.checked })} />Présence tiers-temps</label>
              {d.ttPresence && <div className="grid grid-cols-2 gap-2">
                <Champ label="Nombre"><input type="number" min="0" className={c.input} value={d.ttNombre ?? ""} onChange={(e) => patch({ ttNombre: num(e.target.value) })} /></Champ>
                <Champ label="Salles concernées"><input className={c.input} value={d.ttSalles ?? ""} onChange={(e) => patch({ ttSalles: e.target.value })} /></Champ>
                <div className="col-span-2"><Champ label="Durée supplémentaire"><input className={c.input} value={d.ttDuree ?? ""} onChange={(e) => patch({ ttDuree: e.target.value })} /></Champ></div>
              </div>}
            </div>
          </div>
          <div className="mt-3">
            <div className={c.lab}>Besoins particuliers</div>
            <div className="flex flex-wrap gap-1.5">
              {BESOINS.map((b) => {
                const on = (d.besoinsParticuliers ?? []).includes(b);
                return <button key={b} onClick={() => toggleBesoin(b)} aria-pressed={on} className={`text-[11px] px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors ${on ? c.chipOn : c.chipOff}`}>{b}</button>;
              })}
            </div>
          </div>
        </Section>

        {/* 7. Observations */}
        <Section n={7} titre="Observations">
          <textarea aria-label="Observations" className={`${c.input} min-h-[70px]`} value={d.observations ?? ""} onChange={(e) => patch({ observations: e.target.value })} placeholder="Consignes, contexte, contraintes…" />
        </Section>

        {/* 8. Vérification */}
        <Section n={8} titre="Vérification" sub={`${t.nbSalles} salles · ${t.nbCreneaux} créneaux · ${t.nbEtudiants} étudiants · ${t.periodeLabel}`}>
          {erreurs.length === 0 ? (
            <div className={c.ok}><CheckCircle2 className="w-4 h-4" />Tous les contrôles obligatoires sont satisfaits — la demande pourra être validée.</div>
          ) : (
            <div className={c.alerte}>
              <div className={c.alerteTitre}><AlertTriangle className="w-4 h-4" />{erreurs.length} élément(s) à corriger avant validation SPC</div>
              <ul className={c.alerteListe}>{erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </Section>

        <div className="flex justify-end gap-2.5 pt-1">
          {sombre ? (
            <>
              <BoutonDG onClick={onCancel}>Annuler</BoutonDG>
              <BoutonDG variante="principal" onClick={submit}>Enregistrer la demande</BoutonDG>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onCancel}>Annuler</Button>
              <Button variant="accent" onClick={submit}>Enregistrer la demande</Button>
            </>
          )}
        </div>
      </div>
    </ThemeFormulaire.Provider>
  );
}

function ContactFields({ c: contact, onChange, disabled }: { c: ContactDemande; onChange: (p: Partial<ContactDemande>) => void; disabled?: boolean }) {
  const c = useC();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      <Champ label="Prénom *"><input disabled={disabled} className={c.input} value={contact.prenom} onChange={(e) => onChange({ prenom: e.target.value })} /></Champ>
      <Champ label="Nom *"><input disabled={disabled} className={c.input} value={contact.nom} onChange={(e) => onChange({ nom: e.target.value })} /></Champ>
      <Champ label="Fonction"><input disabled={disabled} className={c.input} value={contact.fonction ?? ""} onChange={(e) => onChange({ fonction: e.target.value })} /></Champ>
      <Champ label="Email"><input disabled={disabled} type="email" className={c.input} value={contact.email ?? ""} onChange={(e) => onChange({ email: e.target.value })} /></Champ>
      <Champ label="Téléphone"><input disabled={disabled} className={c.input} value={contact.telephone ?? ""} onChange={(e) => onChange({ telephone: e.target.value })} /></Champ>
      <Champ label="Service"><input disabled={disabled} className={c.input} value={contact.service ?? ""} onChange={(e) => onChange({ service: e.target.value })} /></Champ>
    </div>
  );
}
