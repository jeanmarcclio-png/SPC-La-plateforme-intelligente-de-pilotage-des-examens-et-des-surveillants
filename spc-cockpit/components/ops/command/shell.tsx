// =============================================================================
// SHELL « COMMAND CENTER » — bleu nuit premium.
//
// Source de vérité unique de la palette sombre et de la navigation latérale des
// écrans plein écran du module Opérations (Cockpit, Salles…). Toute page de ce
// type consomme COMMAND_CSS + <CommandSidebar> plutôt que de redéclarer sa
// propre barre latérale.
// =============================================================================

import Link from "next/link";
import {
  LayoutDashboard, Gauge, Activity, Briefcase, Users, CalendarClock, DoorOpen,
  Accessibility, FileText, Euro, ClipboardCheck, AlertTriangle, BarChart3,
  ShieldAlert, ChevronRight, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon; badgeKey?: "inc" };

export const NAV_PILOTAGE: NavItem[] = [
  { href: "/operations", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/operations/cockpit", label: "Cockpit", Icon: Gauge },
  { href: "/operations/supervision", label: "Supervision live", Icon: Activity },
  { href: "/operations/missions", label: "Missions", Icon: Briefcase },
  { href: "/operations/surveillants", label: "Surveillants", Icon: Users },
  { href: "/operations/planification", label: "Planification", Icon: CalendarClock },
  { href: "/operations/salles", label: "Salles", Icon: DoorOpen },
  { href: "/operations/pmr", label: "PMR & Tiers-temps", Icon: Accessibility },
];

export const NAV_COMMERCIAL: NavItem[] = [
  { href: "/operations/devis", label: "Devis", Icon: FileText },
  { href: "/operations/facturation", label: "Facturation", Icon: Euro },
];

export const NAV_SUIVI: NavItem[] = [
  { href: "/operations/presence", label: "Présence", Icon: ClipboardCheck },
  { href: "/operations/incidents", label: "Incidents", Icon: AlertTriangle, badgeKey: "inc" },
  { href: "/operations/rapports", label: "Rapports", Icon: BarChart3 },
  { href: "/operations/risques", label: "Risques IA", Icon: ShieldAlert },
];

/**
 * Palette + chrome partagés (racine, sidebar, en-tête, boutons).
 * Les styles propres à une page restent dans la page.
 * Portée par la classe `.ckp` : aucune fuite de style hors des écrans concernés.
 */
export const COMMAND_CSS = `
.ckp{--bg-app:#071C48;--bg-app-deep:#051541;--bg-sidebar:#061944;--bg-header:#0A2054;--bg-panel:#102352;--bg-panel-soft:#132A5C;--bg-panel-hover:#173266;--bg-row-hover:#142D62;--bg-active-nav:#172C5B;
  --border-default:rgba(119,151,211,.20);--border-soft:rgba(141,167,218,.13);--border-strong:rgba(117,155,232,.34);
  --text-primary:#F4F7FF;--text-secondary:#A4ADC8;--text-muted:#8B95B8;--text-disabled:#6E7799;
  --blue-primary:#2667DD;--blue-bright:#2E7BFF;--cyan-info:#2997FF;--green-success:#33B162;--green-bright:#36D477;--green-dark:#146144;
  --orange-warning:#F59E0B;--orange-dark:#A56500;--red-critical:#F0444B;--red-dark:#A72435;--purple-ai:#8B5CF6;
  display:flex;min-height:100dvh;color:var(--text-primary);
  font-family:Inter,"SF Pro Display","SF Pro Text",system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 640px at 78% -8%,rgba(46,123,255,.10),transparent 60%),var(--bg-app);}
.ckp *{box-sizing:border-box}
.ckp svg{display:block}
.ckp :focus-visible{outline:2px solid var(--blue-bright);outline-offset:2px;border-radius:6px}

.ckp .side{width:232px;flex:none;background:var(--bg-sidebar);border-right:1px solid var(--border-soft);display:flex;flex-direction:column;padding:16px 14px 12px}
.ckp .brand{display:flex;align-items:center;gap:10px;padding:2px 4px 14px}
.ckp .brand .logo{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#2E7BFF,#7C5CFF);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(46,123,255,.4);flex:none;color:#fff}
.ckp .brand .nm{font-weight:800;font-size:15px;display:flex;align-items:center;gap:6px;line-height:1}
.ckp .brand .nm .ai{font-size:9px;font-weight:800;background:var(--purple-ai);color:#fff;border-radius:5px;padding:2px 5px;letter-spacing:.04em}
.ckp .brand .sub{font-size:10.5px;color:var(--text-muted);margin-top:3px}
.ckp .mcard{margin:2px 2px 16px;border:1px solid var(--border-default);background:var(--bg-active-nav);border-radius:10px;padding:9px 11px;display:flex;align-items:center;gap:9px;text-decoration:none}
.ckp .mcard .dot{width:8px;height:8px;border-radius:50%;background:var(--green-bright);box-shadow:0 0 8px var(--green-bright);flex:none}
.ckp .mcard .k{font-size:9.5px;font-weight:700;letter-spacing:.09em;color:var(--green-bright)}
.ckp .mcard .v{font-size:12px;font-weight:600;color:var(--text-primary);margin-top:2px}
.ckp .mcard .chev{margin-left:auto;color:var(--text-muted)}
.ckp .navsec{font-size:9.5px;font-weight:700;letter-spacing:.13em;color:var(--text-disabled);padding:12px 8px 6px}
.ckp .nav a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;color:var(--text-secondary);font-size:12.5px;font-weight:500;text-decoration:none;position:relative;margin-bottom:1px}
.ckp .nav a:hover{background:var(--bg-panel-hover);color:var(--text-primary)}
.ckp .nav a.active{background:var(--bg-active-nav);color:#fff;font-weight:650;box-shadow:inset 0 0 0 1px var(--border-strong)}
.ckp .nav a.active::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--blue-bright)}
.ckp .nav a .bdg{margin-left:auto;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:var(--red-critical);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}
.ckp .side .foot{margin-top:auto;border-top:1px solid var(--border-soft);padding-top:10px}
.ckp .side .foot a{display:flex;align-items:center;gap:8px;padding:8px 10px;color:var(--text-muted);font-size:12px;text-decoration:none;border-radius:7px}
.ckp .side .foot a:hover{background:var(--bg-panel-hover);color:var(--text-secondary)}

.ckp .main{flex:1;min-width:0;display:flex;flex-direction:column}
.ckp .hdr{display:flex;align-items:flex-start;gap:20px;padding:16px 24px 14px;border-bottom:1px solid var(--border-soft);background:linear-gradient(180deg,var(--bg-header),rgba(10,32,84,.4))}
.ckp .ttl{font-size:25px;font-weight:800;letter-spacing:-.01em;display:flex;align-items:center;gap:12px}
.ckp .pill-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--green-bright);background:rgba(54,212,119,.12);border:1px solid rgba(54,212,119,.3);border-radius:999px;padding:4px 9px}
.ckp .pill-live .d{width:7px;height:7px;border-radius:50%;background:var(--green-bright);box-shadow:0 0 7px var(--green-bright)}
.ckp .subttl{font-size:12px;color:var(--text-secondary);margin-top:6px;display:flex;align-items:center;gap:8px}
.ckp .datesel{display:flex;align-items:center;gap:10px;border:1px solid var(--border-default);background:var(--bg-panel);border-radius:10px;padding:7px 12px;font-size:12.5px;font-weight:600;color:var(--text-primary)}
.ckp .datesel svg{color:var(--text-secondary)}
.ckp .right{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:12px}
.ckp .toprow{display:flex;align-items:center;gap:14px}
.ckp .bell{position:relative;width:38px;height:38px;border-radius:10px;border:1px solid var(--border-default);background:var(--bg-panel);display:flex;align-items:center;justify-content:center;color:var(--text-secondary)}
.ckp .bell .b{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;border-radius:999px;background:var(--red-critical);color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg-header)}
.ckp .usr{display:flex;align-items:center;gap:9px}
.ckp .usr .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2E7BFF,#6D45D9);display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;color:#fff}
.ckp .usr .nm{font-size:12.5px;font-weight:700}
.ckp .usr .rl{font-size:11px;color:var(--text-secondary)}
.ckp .btns{display:flex;gap:10px}
.ckp .btn{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:10px;font-size:12px;font-weight:650;cursor:pointer;border:1px solid transparent;text-decoration:none}
.ckp .btn-sec{background:transparent;border-color:var(--border-strong);color:var(--text-primary)}
.ckp .btn-pri{background:var(--blue-bright);color:#fff;box-shadow:0 6px 16px rgba(46,123,255,.32)}
.ckp .scroll{flex:1;overflow:auto;padding:18px 24px 26px}

/* --- Repli mobile : la sidebar passe en barre horizontale défilante. ------- */
@media(max-width:900px){
  .ckp{flex-direction:column}
  .ckp .side{width:auto;flex-direction:row;align-items:center;gap:6px;overflow-x:auto;padding:10px 12px;border-right:0;border-bottom:1px solid var(--border-soft)}
  .ckp .side .brand{padding:0 8px 0 0;flex:none}
  .ckp .side .brand .sub,.ckp .side .mcard,.ckp .side .navsec,.ckp .side .foot{display:none}
  .ckp .side .nav{display:flex;gap:4px}
  .ckp .side .nav a{white-space:nowrap;margin-bottom:0}
  .ckp .side .nav a.active::before{display:none}
  .ckp .hdr{flex-direction:column;padding:14px 16px 12px}
  .ckp .right{margin-left:0;align-items:flex-start;width:100%}
  .ckp .ttl{font-size:21px}
  .ckp .scroll{padding:14px 16px 22px}
}
@media(prefers-reduced-motion:reduce){.ckp *{animation:none!important;transition:none!important}}
`;

function navBlock(items: NavItem[], actif: string, badges: Record<string, number>) {
  return items.map(({ href, label, Icon, badgeKey }) => {
    const n = badgeKey ? badges[badgeKey] ?? 0 : 0;
    const active = href === actif;
    return (
      <Link
        key={href}
        href={href}
        className={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-4 h-4" aria-hidden />
        {label}
        {n > 0 ? <span className="bdg">{n}</span> : null}
      </Link>
    );
  });
}

/**
 * Barre latérale des écrans « command center ».
 * @param actif  href de l'entrée à marquer active (ex. "/operations/salles")
 */
export function CommandSidebar({
  actif,
  missionLabel,
  incidentsOuverts = 0,
}: {
  actif: string;
  missionLabel: string;
  incidentsOuverts?: number;
}) {
  const badges = { inc: incidentsOuverts };
  return (
    <aside className="side">
      <div className="brand">
        <span className="logo"><Check className="w-[19px] h-[19px]" strokeWidth={2.4} aria-hidden /></span>
        <div>
          <div className="nm">Survéo <span className="ai">IA</span></div>
          <div className="sub">Gestion des examens</div>
        </div>
      </div>

      <Link href="/operations/missions" className="mcard">
        <span className="dot" aria-hidden />
        <div>
          <div className="k">MISSION ACTIVE</div>
          <div className="v">{missionLabel}</div>
        </div>
        <ChevronRight className="w-4 h-4 chev" aria-hidden />
      </Link>

      <div className="navsec">PILOTAGE</div>
      <nav className="nav" aria-label="Pilotage">{navBlock(NAV_PILOTAGE, actif, badges)}</nav>
      <div className="navsec">COMMERCIAL</div>
      <nav className="nav" aria-label="Commercial">{navBlock(NAV_COMMERCIAL, actif, badges)}</nav>
      <div className="navsec">SUIVI &amp; QUALITÉ</div>
      <nav className="nav" aria-label="Suivi et qualité">{navBlock(NAV_SUIVI, actif, badges)}</nav>

      <div className="foot">
        <Link href="/cockpit"><ChevronRight className="w-[15px] h-[15px] rotate-180" aria-hidden />Cockpit commercial</Link>
      </div>
    </aside>
  );
}

/** Initiales d'un nom, pour l'avatar de l'en-tête. */
export function initialesNom(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "SP";
  return ((p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}

/** Nom lisible déduit d'une adresse e-mail (« jean.dupont@… » → « Jean Dupont »). */
export function nomDepuisEmail(email?: string | null): string {
  if (!email) return "Coordinateur SPC";
  const local = email.split("@")[0] ?? "";
  const mots = local.split(/[._-]+/).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
  return mots.join(" ") || "Coordinateur SPC";
}

/** Libellé métier d'un rôle technique. */
export function libelleRole(role: string | null): string {
  if (!role) return "Coordinateur";
  const r = role.toLowerCase();
  if (r.includes("admin")) return "Administrateur";
  if (r.includes("edit") || r.includes("édit")) return "Éditeur";
  if (r.includes("lect") || r.includes("read")) return "Lecture seule";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
