// Constructeurs purs pour l'export d'une demande client (Excel + PDF).
// Aucune dépendance Supabase / xlsx / DOM ici : testable et client-safe.
// Le composant client transforme les feuilles (AoA) en classeur via SheetJS,
// et imprime le HTML officiel en PDF (pattern FacturationButton).

import type { DemandeClient, DemandeSalle } from "./types";

export type SheetData = { name: string; rows: (string | number)[][] };
export type Brand = { nom: string; emoji?: string; couleur: string };

const CRENEAU_LABEL: Record<string, string> = { matin: "Matin", "apres-midi": "Après-midi" };
const oui = (b: boolean) => (b ? "Oui" : "—");
const dash = (v?: string | number | null) => (v === undefined || v === null || v === "" ? "—" : String(v));

function nomComplet(c: { prenom?: string; nom?: string }): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ").trim() || "—";
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function periodeDemande(d: DemandeClient): string {
  const dates = d.salles.map((s) => s.dateExamen).filter(Boolean).sort() as string[];
  if (dates.length === 0) return "—";
  return dates[0] === dates[dates.length - 1] ? fmtDate(dates[0]) : `${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}`;
}

function nbCreneaux(salles: DemandeSalle[]): number {
  return new Set(salles.map((s) => `${s.dateExamen ?? ""}|${s.creneau}`)).size;
}

function totaux(d: DemandeClient) {
  const salles = d.salles.filter((s) => s.salle?.trim());
  return {
    salles,
    nbSalles: salles.length,
    nbEtud: salles.reduce((s, x) => s + (x.etudiants || 0), 0),
    nbCreneaux: nbCreneaux(salles),
  };
}

/** Base de nom de fichier : SPC_Demande_Client_[Client]_[AAAA-MM-JJ]. */
export function demandeFileBase(d: DemandeClient, now: Date = new Date()): string {
  const client = (d.etablissement || "demande").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const iso = now.toISOString().slice(0, 10);
  return `SPC_Demande_Client_${client}_${iso}`;
}

/** Les 5 feuilles du classeur Excel (spec §11.1). */
export function buildDemandeSheets(d: DemandeClient, now: Date = new Date()): SheetData[] {
  const t = totaux(d);

  const synthese: (string | number)[][] = [
    ["Champ", "Valeur"],
    ["Établissement", dash(d.etablissement)],
    ["Site / Campus", dash(d.campus)],
    ["Référence client", dash(d.referenceClient)],
    ["Période", periodeDemande(d)],
    ["Nombre total étudiants", t.nbEtud],
    ["Nombre total salles", t.nbSalles],
    ["Nombre total créneaux", t.nbCreneaux],
    ["Demandeur surveillance", nomComplet(d.demandeur)],
    ["Responsable client", nomComplet(d.responsableClient)],
    ["Responsable SPC", dash(d.responsableSpc.nom)],
    ["Statut", d.statut],
    ["Date de génération", fmtDate(now.toISOString())],
  ];

  const salles: (string | number)[][] = [
    ["Date", "Créneau", "Salle", "Bâtiment", "Étudiants", "Surveillants demandés", "PMR", "Tiers-temps", "Début examen", "Fin examen", "Début surveillance", "Fin surveillance", "Observations"],
    ...t.salles.map((s) => [
      dash(s.dateExamen), CRENEAU_LABEL[s.creneau] ?? s.creneau, s.salle, dash(s.batiment),
      s.etudiants, s.surveillants, oui(s.pmr), oui(s.tiersTemps),
      dash(s.debutExamen), dash(s.finExamen), dash(s.debutSurveillance), dash(s.finSurveillance), dash(s.observations),
    ]),
  ];

  const responsables: (string | number)[][] = [
    ["Rôle", "Prénom", "Nom", "Fonction", "Email", "Téléphone", "Organisation"],
    ["Demandeur surveillance", dash(d.demandeur.prenom), dash(d.demandeur.nom), dash(d.demandeur.fonction), dash(d.demandeur.email), dash(d.demandeur.telephone), dash(d.demandeur.service)],
    ["Responsable client", dash(d.responsableClient.prenom), dash(d.responsableClient.nom), dash(d.responsableClient.fonction), dash(d.responsableClient.email), dash(d.responsableClient.telephone), dash(d.responsableClient.service)],
    ["Responsable SPC", "—", dash(d.responsableSpc.nom), dash(d.responsableSpc.role), dash(d.responsableSpc.email), "—", "SPC"],
  ];

  const besoins: (string | number)[][] = [["Type", "Salle", "Nombre", "Détail", "Observations"]];
  if (d.pmrPresent) besoins.push(["PMR", "—", d.pmrNombre, dash(d.pmrDetails), "—"]);
  if (d.tiersTempsPresent) besoins.push(["Tiers-temps", "—", d.tiersTempsNombre, dash(d.tiersTempsDetails), "—"]);
  for (const b of d.besoinsSpecifiques) besoins.push([b, "—", "—", "—", "—"]);
  if (besoins.length === 1) besoins.push(["—", "—", "—", "—", "—"]);

  const observations: (string | number)[][] = [
    ["Catégorie", "Observation"],
    ["Générale", dash(d.observations)],
    ...t.salles.filter((s) => s.observations?.trim()).map((s) => [`Salle ${s.salle}`, s.observations as string]),
  ];

  return [
    { name: "Synthèse demande", rows: synthese },
    { name: "Salles et horaires", rows: salles },
    { name: "Responsables", rows: responsables },
    { name: "Besoins spécifiques", rows: besoins },
    { name: "Observations", rows: observations },
  ];
}

const esc = (s?: string | number) =>
  String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Document PDF officiel (HTML imprimable, spec §11.2). */
export function buildDemandePrintHtml(d: DemandeClient, brand: Brand, now: Date = new Date()): string {
  const t = totaux(d);
  const c = brand.couleur;
  const dateGen = fmtDate(now.toISOString());

  const sallesRows = t.salles.map((s) => `
    <tr>
      <td>${esc(s.dateExamen)}</td><td>${esc(CRENEAU_LABEL[s.creneau] ?? s.creneau)}</td>
      <td><strong>${esc(s.salle)}</strong></td><td>${esc(s.batiment)}</td>
      <td class="r">${esc(s.etudiants)}</td><td class="r">${esc(s.surveillants)}</td>
      <td>${s.pmr ? "PMR" : ""}${s.pmr && s.tiersTemps ? " · " : ""}${s.tiersTemps ? "T.-t." : ""}</td>
      <td>${esc(s.debutSurveillance)}–${esc(s.finSurveillance)}</td>
    </tr>`).join("");

  const contact = (titre: string, ct: { prenom?: string; nom?: string; fonction?: string; email?: string; telephone?: string }) => `
    <div class="contact">
      <div class="ct-role">${esc(titre)}</div>
      <div class="ct-nom">${esc(nomComplet(ct))}</div>
      <div class="ct-sub">${esc(ct.fonction)}</div>
      <div class="ct-sub">${esc(ct.email)}${ct.telephone ? " · " + esc(ct.telephone) : ""}</div>
    </div>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Fiche de demande client — ${esc(d.etablissement)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a202c;padding:40px;max-width:840px;margin:0 auto;font-size:12.5px}
  .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid ${c};padding-bottom:16px;margin-bottom:8px}
  .logo{font-size:22px;font-weight:900;color:${c}}
  .ref{font-family:monospace;font-size:12px;color:#718096}
  h1{font-size:17px;margin:20px 0 4px}
  .sub{color:#718096;margin-bottom:18px}
  .section{font-size:10.5px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:.06em;margin:22px 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .contact{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
  .ct-role{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#a0aec0;font-weight:700}
  .ct-nom{font-weight:700;margin-top:2px}
  .ct-sub{color:#718096;font-size:11px}
  .stats{display:flex;gap:24px;background:${c}0d;border:1px solid ${c}33;border-radius:8px;padding:12px 16px}
  .stat .v{font-size:20px;font-weight:800;color:${c}}
  .stat .l{font-size:10px;color:#718096}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th{background:#0d2137;color:#fff;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;text-align:left}
  td{border-bottom:1px solid #edf2f7;padding:6px 8px;font-size:11px}
  td.r{text-align:right}
  .badges span{display:inline-block;border:1px solid #e2e8f0;border-radius:99px;padding:2px 10px;margin:0 6px 6px 0;font-size:11px}
  .note{margin-top:26px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e}
  .footer{margin-top:22px;text-align:center;font-size:10px;color:#cbd5e0;border-top:1px solid #edf2f7;padding-top:12px}
  @media print{body{padding:20px}@page{margin:1.2cm}}
</style></head><body>
  <div class="header">
    <div><div class="logo">${esc(brand.nom)} ${esc(brand.emoji)}</div><div class="sub" style="margin:0">Fiche de demande client</div></div>
    <div style="text-align:right"><div class="ref">${esc(d.reference)}</div><div class="ref">Statut : ${esc(d.statut)}</div></div>
  </div>

  <h1>${esc(d.etablissement)}</h1>
  <div class="sub">${[esc(d.campus), esc(d.ville), esc(d.typeEtablissement)].filter((x) => x && x !== "—").join(" · ")} · ${esc(periodeDemande(d))}</div>

  <div class="stats">
    <div class="stat"><div class="v">${t.nbSalles}</div><div class="l">salles</div></div>
    <div class="stat"><div class="v">${t.nbCreneaux}</div><div class="l">créneaux</div></div>
    <div class="stat"><div class="v">${t.nbEtud}</div><div class="l">étudiants</div></div>
    <div class="stat"><div class="v">${d.pmrPresent ? d.pmrNombre : 0}</div><div class="l">PMR</div></div>
    <div class="stat"><div class="v">${d.tiersTempsPresent ? d.tiersTempsNombre : 0}</div><div class="l">tiers-temps</div></div>
  </div>

  <div class="section">Interlocuteurs</div>
  <div class="grid">
    ${contact("Demandeur", d.demandeur)}
    ${contact("Responsable client", d.responsableClient)}
    ${contact("Responsable SPC", { nom: d.responsableSpc.nom, fonction: d.responsableSpc.role, email: d.responsableSpc.email })}
  </div>

  <div class="section">Salles et horaires demandés</div>
  <table>
    <thead><tr><th>Date</th><th>Créneau</th><th>Salle</th><th>Bât.</th><th>Étud.</th><th>Surv.</th><th>Besoins</th><th>Surveillance</th></tr></thead>
    <tbody>${sallesRows || `<tr><td colspan="8">Aucune salle renseignée</td></tr>`}</tbody>
  </table>

  ${d.besoinsSpecifiques.length ? `<div class="section">Besoins particuliers</div><div class="badges">${d.besoinsSpecifiques.map((b) => `<span>${esc(b)}</span>`).join("")}</div>` : ""}
  ${d.observations ? `<div class="section">Observations</div><div>${esc(d.observations)}</div>` : ""}

  <div class="note"><strong>Document de demande client — sous réserve de validation SPC.</strong><br>Ce document ne constitue pas un devis définitif.</div>
  <div class="footer">Généré par ${esc(brand.nom)} · ${dateGen}</div>
</body></html>`;
}
