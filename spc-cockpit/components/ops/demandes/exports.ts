"use client";

// Génération des livrables de la Demande client : Excel opérationnel (5 feuilles)
// + fiche PDF officielle (via impression navigateur). Aucune dépendance nouvelle :
// xlsx est déjà présent, le PDF passe par la boîte d'impression → « Enregistrer en PDF ».

import type { DemandeClient } from "@/lib/operations/demandes/types";
import { totauxDemande } from "@/lib/operations/demandes/logic";

function slug(s: string): string {
  return (s || "client").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function nomFichier(d: DemandeClient, ext: string): string {
  const date = new Date(d.updatedAt || d.createdAt || Date.now()).toISOString().slice(0, 10);
  return `SPC_Demande_Client_${slug(d.etablissement)}_${date}.${ext}`;
}

const fullName = (c: { prenom?: string; nom?: string }) => [c.prenom, c.nom].filter(Boolean).join(" ").trim() || "—";

// ── Excel opérationnel — 5 feuilles ──────────────────────────────────────────
export async function telechargerExcel(d: DemandeClient) {
  const XLSX = await import("xlsx");
  const t = totauxDemande(d);
  const wb = XLSX.utils.book_new();

  const synthese = [
    ["Champ", "Valeur"],
    ["Établissement", d.etablissement],
    ["Site / Campus", d.campus ?? ""],
    ["Référence client", d.referenceClient ?? ""],
    ["Période", t.periodeLabel],
    ["Nombre total étudiants", t.nbEtudiants],
    ["Nombre total salles", t.nbSalles],
    ["Nombre total créneaux", t.nbCreneaux],
    ["Demandeur surveillance", fullName(d.demandeur)],
    ["Responsable client", fullName(d.responsableClient)],
    ["Responsable SPC", d.responsableSpc],
    ["Statut", d.statut],
    ["Date de génération", new Date().toLocaleString("fr-FR")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(synthese), "Synthèse demande");

  const sallesHeader = ["Date", "Créneau", "Salle", "Bâtiment", "Étudiants", "Surveillants demandés", "PMR", "Tiers-temps", "Début examen", "Fin examen", "Début surveillance", "Fin surveillance", "Observations"];
  const sallesRows = d.lignes.map((l) => [
    l.date ?? "", l.creneau ?? "", l.salle ?? "", l.batiment ?? "", l.etudiants ?? "", l.surveillants ?? "",
    l.pmr ? "Oui" : "Non", l.tiersTemps ? "Oui" : "Non", l.debutExamen ?? "", l.finExamen ?? "",
    l.debutSurveillance ?? "", l.finSurveillance ?? "", l.observations ?? "",
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sallesHeader, ...sallesRows]), "Salles et horaires");

  const responsables = [
    ["Rôle", "Prénom", "Nom", "Fonction", "Email", "Téléphone", "Organisation"],
    ["Demandeur surveillance", d.demandeur.prenom ?? "", d.demandeur.nom ?? "", d.demandeur.fonction ?? "", d.demandeur.email ?? "", d.demandeur.telephone ?? "", d.etablissement],
    ["Responsable client", d.responsableClient.prenom ?? "", d.responsableClient.nom ?? "", d.responsableClient.fonction ?? "", d.responsableClient.email ?? "", d.responsableClient.telephone ?? "", d.etablissement],
    ["Responsable SPC", d.responsableSpc, "", d.roleSpc ?? "", d.emailSpc ?? "", "", "SPC"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(responsables), "Responsables");

  const besoins: (string | number)[][] = [["Type", "Salle", "Nombre", "Détail", "Observations"]];
  if (d.pmrPresence) besoins.push(["PMR", d.pmrSalles ?? "", d.pmrNombre ?? "", d.pmrBesoin ?? "", ""]);
  if (d.ttPresence) besoins.push(["Tiers-temps", d.ttSalles ?? "", d.ttNombre ?? "", d.ttDuree ?? "", ""]);
  for (const b of d.besoinsParticuliers ?? []) besoins.push(["Besoin particulier", "", "", b, ""]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(besoins), "Besoins spécifiques");

  const obs = [["Catégorie", "Observation"], ["Générale", d.observations ?? ""]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(obs), "Observations");

  XLSX.writeFile(wb, nomFichier(d, "xlsx"));
}

// Modèle d'import salles / horaires.
export async function telechargerModele() {
  const XLSX = await import("xlsx");
  const header = ["Date", "Créneau", "Salle", "Bâtiment", "Étudiants", "Surveillants demandés", "PMR", "Tiers-temps", "Début examen", "Fin examen", "Début surveillance", "Fin surveillance", "Observations"];
  const exemple = ["2026-06-15", "Matin", "B22", "B", 30, 1, "Non", "Non", "08:30", "11:30", "08:00", "12:00", ""];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, exemple]), "Demande Surveillance");
  XLSX.writeFile(wb, "SPC_Modele_Demande_Client.xlsx");
}

// ── Fiche PDF officielle (impression navigateur) ─────────────────────────────
function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export function imprimerFiche(d: DemandeClient) {
  const t = totauxDemande(d);
  const lignes = d.lignes.filter((l) => l.date || l.salle || l.etudiants);
  const rows = lignes.map((l) => `<tr>
    <td>${esc(l.date)}</td><td>${esc(l.creneau)}</td><td>${esc(l.salle)}</td><td>${esc(l.batiment)}</td>
    <td style="text-align:right">${esc(l.etudiants)}</td><td style="text-align:right">${esc(l.surveillants)}</td>
    <td>${l.pmr ? "Oui" : "—"}</td><td>${l.tiersTemps ? "Oui" : "—"}</td>
    <td>${esc(l.debutExamen)}–${esc(l.finExamen)}</td><td>${esc(l.debutSurveillance)}–${esc(l.finSurveillance)}</td>
    <td>${esc(l.observations)}</td></tr>`).join("");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(nomFichier(d, "pdf"))}</title>
  <style>
    * { box-sizing: border-box; } body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0f172a; margin:32px; font-size:12px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0F2942; padding-bottom:12px; margin-bottom:16px; }
    .brand { font-weight:800; font-size:20px; color:#0F2942; } .brand span { color:#2563eb; }
    h1 { font-size:16px; margin:4px 0 0; } .ref { color:#64748b; font-size:11px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; margin:12px 0; }
    .card { border:1px solid #e4e7ec; border-radius:8px; padding:10px 12px; }
    .label { font-size:9px; text-transform:uppercase; letter-spacing:.6px; color:#94a3b8; font-weight:700; }
    .val { font-weight:600; margin-top:2px; }
    table { width:100%; border-collapse:collapse; margin-top:6px; font-size:10.5px; }
    th, td { border:1px solid #e4e7ec; padding:4px 6px; text-align:left; } th { background:#f7f9fc; font-size:9px; text-transform:uppercase; letter-spacing:.4px; color:#64748b; }
    .kpis { display:flex; gap:16px; margin:8px 0 4px; } .kpi b { font-size:16px; } .kpi span { color:#64748b; font-size:10px; display:block; }
    .mention { margin-top:18px; padding:10px 12px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; color:#9a3412; font-size:10.5px; }
    .foot { margin-top:14px; color:#94a3b8; font-size:9.5px; display:flex; justify-content:space-between; }
    h2 { font-size:12px; margin:16px 0 4px; color:#0F2942; }
    @media print { body { margin:14mm; } .noprint { display:none; } }
  </style></head><body>
  <div class="head">
    <div><div class="brand">SPC <span>·</span> Surveillance d'examens</div>
      <h1>Fiche de demande client</h1><div class="ref">Référence ${esc(d.reference)} · Statut : ${esc(d.statut)}</div></div>
    <div style="text-align:right" class="ref">Généré le ${new Date().toLocaleDateString("fr-FR")}<br>${esc(d.etablissement)}${d.campus ? " · " + esc(d.campus) : ""}</div>
  </div>

  <div class="kpis">
    <div class="kpi"><b>${t.nbSalles}</b><span>salles</span></div>
    <div class="kpi"><b>${t.nbCreneaux}</b><span>créneaux</span></div>
    <div class="kpi"><b>${t.nbEtudiants}</b><span>étudiants</span></div>
    <div class="kpi"><b>${esc(t.periodeLabel)}</b><span>période</span></div>
  </div>

  <div class="grid">
    <div class="card"><div class="label">Demandeur de surveillance</div><div class="val">${esc(fullName(d.demandeur))}</div><div class="ref">${esc(d.demandeur.fonction)} · ${esc(d.demandeur.email)}</div></div>
    <div class="card"><div class="label">Responsable client</div><div class="val">${esc(fullName(d.responsableClient))}</div><div class="ref">${esc(d.responsableClient.fonction)} · ${esc(d.responsableClient.email)}</div></div>
    <div class="card"><div class="label">Responsable SPC</div><div class="val">${esc(d.responsableSpc)}</div><div class="ref">${esc(d.roleSpc)} ${esc(d.emailSpc)}</div></div>
    <div class="card"><div class="label">Établissement</div><div class="val">${esc(d.etablissement)}</div><div class="ref">${esc([d.adresse, d.codePostal, d.ville].filter(Boolean).join(", "))}</div></div>
  </div>

  <h2>Salles et horaires demandés</h2>
  <table><thead><tr><th>Date</th><th>Créneau</th><th>Salle</th><th>Bât.</th><th>Étud.</th><th>Surv.</th><th>PMR</th><th>T-t</th><th>Examen</th><th>Surveillance</th><th>Observations</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="11" style="text-align:center;color:#94a3b8">Aucune ligne</td></tr>'}</tbody></table>

  ${(d.pmrPresence || d.ttPresence) ? `<h2>Besoins spécifiques</h2><div class="grid">
    ${d.pmrPresence ? `<div class="card"><div class="label">PMR</div><div class="val">${esc(d.pmrNombre)} étudiant(s)</div><div class="ref">${esc(d.pmrSalles)} ${esc(d.pmrBesoin)}</div></div>` : ""}
    ${d.ttPresence ? `<div class="card"><div class="label">Tiers-temps</div><div class="val">${esc(d.ttNombre)} étudiant(s)</div><div class="ref">${esc(d.ttSalles)} ${esc(d.ttDuree)}</div></div>` : ""}
  </div>` : ""}

  ${d.observations ? `<h2>Observations</h2><div class="card">${esc(d.observations)}</div>` : ""}

  <div class="mention"><b>Document de demande client — sous réserve de validation SPC.</b><br>Ce document ne constitue pas un devis définitif.</div>
  <div class="foot"><span>SPC — Plateforme de pilotage des examens</span><span>${esc(d.reference)}</span></div>

  <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
