"use client";

import { FileText } from "lucide-react";
import { useTenant } from "@/lib/tenant/TenantContext";

type Props = {
  campagneNom:     string;
  totalProspects:  number;
  convertis:       number;
  rdvFixes:        number;
  scoreMoyen:      string;
  pipelineCA:      number;
  tresChaudes:     number;
  date:            string;
};

export function FacturationButton(props: Props) {
  const { config } = useTenant();

  function generateReport() {
    const { campagneNom, totalProspects, convertis, rdvFixes, scoreMoyen, pipelineCA, tresChaudes, date } = props;
    const tauxConversion = totalProspects > 0
      ? Math.round(((rdvFixes + convertis) / totalProspects) * 100)
      : 0;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport — ${campagneNom}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a202c;background:#fff;padding:48px;max-width:800px;margin:0 auto}
  .header{text-align:center;margin-bottom:40px;border-bottom:2px solid ${config.couleur};padding-bottom:24px}
  .logo{font-size:28px;font-weight:900;color:${config.couleur}}
  .subtitle{font-size:16px;color:#718096;margin-top:4px}
  .meta{font-size:13px;color:#a0aec0;margin-top:4px}
  .section{font-size:12px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:.08em;margin:28px 0 12px}
  .campagne{font-size:22px;font-weight:800;color:#1a202c;margin-bottom:24px}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .kpi{border:1px solid #e2e8f0;border-radius:12px;padding:20px}
  .kpi-v{font-size:32px;font-weight:900;color:${config.couleur}}
  .kpi-l{font-size:12px;color:#718096;margin-top:4px}
  .highlight{background:${config.couleur}0d;border:1px solid ${config.couleur}30;border-radius:12px;padding:24px;margin-bottom:24px}
  .hl-v{font-size:40px;font-weight:900;color:${config.couleur}}
  .hl-l{font-size:13px;color:${config.couleur}99;margin-top:4px}
  .footer{text-align:center;font-size:11px;color:#cbd5e0;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
  @media print{body{padding:24px}@page{margin:1cm}}
</style>
</head>
<body>
<div class="header">
  <div class="logo">JMC Cockpit ${config.emoji}</div>
  <div class="subtitle">Rapport de Performance Commerciale</div>
  <div class="meta">${date} · ${config.nom}</div>
</div>

<div class="section">Campagne</div>
<div class="campagne">${campagneNom}</div>

<div class="section">Indicateurs clés</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-v">${totalProspects}</div><div class="kpi-l">Total ${config.vocabulaire.ressource}s</div></div>
  <div class="kpi"><div class="kpi-v">${tresChaudes}</div><div class="kpi-l">${config.scoring.labels[0]}</div></div>
  <div class="kpi"><div class="kpi-v">${scoreMoyen}/10</div><div class="kpi-l">Score moyen · ${config.scoring.dimensions.join(' / ')}</div></div>
  <div class="kpi"><div class="kpi-v">${tauxConversion}%</div><div class="kpi-l">Taux de conversion</div></div>
</div>

${pipelineCA > 0 ? `<div class="section">Pipeline CA estimé</div>
<div class="highlight">
  <div class="hl-v">${pipelineCA.toLocaleString('fr-FR')} €</div>
  <div class="hl-l">Valeur totale pipeline</div>
</div>` : ""}

<div class="section">Progression commerciale</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-v">${rdvFixes}</div><div class="kpi-l">RDV fixés</div></div>
  <div class="kpi"><div class="kpi-v">${convertis}</div><div class="kpi-l">Convertis</div></div>
</div>

<div class="footer">Rapport généré par JMC Cockpit · ${date}</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  return (
    <button
      onClick={generateReport}
      className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-3 py-1.5 rounded-lg transition-colors"
    >
      <FileText className="w-3.5 h-3.5" />
      Export PDF
    </button>
  );
}
