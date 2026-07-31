export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  LayoutDashboard, Gauge, Activity, Briefcase, Users, CalendarClock, DoorOpen,
  Accessibility, FileText, Euro, ClipboardCheck, AlertTriangle, BarChart3,
  ShieldAlert, ChevronRight, ChevronDown, Bell, RefreshCw, Calendar, MapPin,
  CheckCircle2, Clock, Pencil, MessageSquare, MoreHorizontal, Sparkles, Settings,
  UserCog, Info, LayoutGrid, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireActiveOrgId } from "@/lib/auth/org";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/session";
import { getMissions, getAffectations, getSurveillants, getSalles, getIncidents } from "@/lib/operations/queries";
import { buildCockpitView, DEMO_COCKPIT } from "@/lib/operations/cockpit";

function nomDepuisEmail(email?: string | null): string {
  if (!email) return "Coordinateur SPC";
  const local = email.split("@")[0] ?? "";
  const mots = local.split(/[._-]+/).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
  return mots.join(" ") || "Coordinateur SPC";
}
function libelleRole(role: string | null): string {
  if (!role) return "Coordinateur";
  const r = role.toLowerCase();
  if (r.includes("admin")) return "Administrateur";
  if (r.includes("edit") || r.includes("édit")) return "Éditeur";
  if (r.includes("lect") || r.includes("read")) return "Lecture seule";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
function initialesNom(nom: string): string {
  const p = nom.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "SP";
  return ((p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}

type NavItem = { href: string; label: string; Icon: LucideIcon; active?: boolean; badgeKey?: "inc" };
const NAV_PILOTAGE: NavItem[] = [
  { href: "/operations", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/operations/cockpit", label: "Cockpit", Icon: Gauge, active: true },
  { href: "/operations/supervision", label: "Supervision live", Icon: Activity },
  { href: "/operations/missions", label: "Missions", Icon: Briefcase },
  { href: "/operations/surveillants", label: "Surveillants", Icon: Users },
  { href: "/operations/planification", label: "Planification", Icon: CalendarClock },
  { href: "/operations/salles", label: "Salles", Icon: DoorOpen },
  { href: "/operations/pmr", label: "PMR & Tiers-temps", Icon: Accessibility },
];
const NAV_COMMERCIAL: NavItem[] = [
  { href: "/operations/devis", label: "Devis", Icon: FileText },
  { href: "/operations/facturation", label: "Facturation", Icon: Euro },
];
const NAV_SUIVI: NavItem[] = [
  { href: "/operations/presence", label: "Présence", Icon: ClipboardCheck },
  { href: "/operations/incidents", label: "Incidents", Icon: AlertTriangle, badgeKey: "inc" },
  { href: "/operations/rapports", label: "Rapports", Icon: BarChart3 },
  { href: "/operations/risques", label: "Risques IA", Icon: ShieldAlert },
];

const CSS = `
.ckp{--bg-app:#071C48;--bg-app-deep:#051541;--bg-sidebar:#061944;--bg-header:#0A2054;--bg-panel:#102352;--bg-panel-soft:#132A5C;--bg-panel-hover:#173266;--bg-row-hover:#142D62;--bg-active-nav:#172C5B;
  --border-default:rgba(119,151,211,.20);--border-soft:rgba(141,167,218,.13);--border-strong:rgba(117,155,232,.34);
  --text-primary:#F4F7FF;--text-secondary:#A4ADC8;--text-muted:#727B9F;--text-disabled:#4C5575;
  --blue-primary:#2667DD;--blue-bright:#2E7BFF;--cyan-info:#2997FF;--green-success:#33B162;--green-bright:#36D477;--green-dark:#146144;
  --orange-warning:#F59E0B;--orange-dark:#A56500;--red-critical:#F0444B;--red-dark:#A72435;--purple-ai:#8B5CF6;
  display:flex;min-height:100dvh;color:var(--text-primary);
  font-family:Inter,"SF Pro Display","SF Pro Text",system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1200px 640px at 78% -8%,rgba(46,123,255,.10),transparent 60%),var(--bg-app);}
.ckp *{box-sizing:border-box}
.ckp svg{display:block}

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
.ckp .right{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:12px}
.ckp .toprow{display:flex;align-items:center;gap:14px}
.ckp .datesel{display:flex;align-items:center;gap:10px;border:1px solid var(--border-default);background:var(--bg-panel);border-radius:10px;padding:7px 12px;font-size:12.5px;font-weight:600;color:var(--text-primary)}
.ckp .datesel svg{color:var(--text-secondary)}
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
.ckp .kpis{display:grid;grid-template-columns:repeat(4,1fr) 1.28fr;gap:14px}
.ckp .kpi{border:1px solid var(--border-default);background:var(--bg-panel);border-radius:13px;padding:15px 16px 14px;box-shadow:0 2px 8px rgba(0,8,30,.16);min-height:118px}
.ckp .kpi .top{display:flex;align-items:center;gap:10px}
.ckp .kpi .ico{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex:none}
.ckp .kpi .k{font-size:10px;font-weight:700;letter-spacing:.07em;color:var(--text-secondary);line-height:1.25}
.ckp .kpi .val{font-size:28px;font-weight:800;letter-spacing:-.02em;margin-top:11px;line-height:1}
.ckp .kpi .val small{font-size:15px;font-weight:600;color:var(--text-muted)}
.ckp .kpi .sub{font-size:11px;color:var(--text-muted);margin-top:6px}
.ckp .kbar{height:5px;border-radius:3px;background:rgba(255,255,255,.07);margin-top:10px;overflow:hidden}
.ckp .kbar i{display:block;height:100%;border-radius:3px}
.ckp .ico-blue{background:rgba(46,123,255,.16);color:var(--blue-bright)}
.ckp .ico-green{background:rgba(54,212,119,.15);color:var(--green-bright)}
.ckp .ico-orange{background:rgba(245,158,11,.15);color:var(--orange-warning)}
.ckp .ico-red{background:rgba(240,68,75,.15);color:var(--red-critical)}
.ckp .ico-ai{background:rgba(139,92,246,.18);color:#b79bff}
.ckp .spark{display:flex;align-items:flex-end;gap:3px;height:30px;margin-top:12px}
.ckp .spark i{flex:1;border-radius:2px 2px 0 0;opacity:.9}
.ckp .kpi.ai{background:linear-gradient(135deg,#132A5C,#10204e)}
.ckp .aihint{font-size:10.5px;color:var(--text-muted);display:inline-flex;align-items:center;gap:5px}

.ckp .board{display:grid;grid-template-columns:1fr 372px;gap:16px;margin-top:16px;align-items:start}
.ckp .panel{border:1px solid var(--border-default);background:var(--bg-panel);border-radius:13px;box-shadow:0 2px 8px rgba(0,8,30,.16)}
.ckp .ph{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border-soft)}
.ckp .ph .t{font-size:12px;font-weight:700;letter-spacing:.09em;color:var(--text-secondary);text-transform:uppercase}
.ckp .ph .link{margin-left:auto;font-size:11.5px;font-weight:600;color:var(--cyan-info);text-decoration:none}
.ckp .chip{font-size:10.5px;font-weight:700;border-radius:999px;padding:3px 8px}
.ckp .chip-green{background:rgba(54,212,119,.14);color:var(--green-bright)}
.ckp .chip-blue{background:rgba(46,123,255,.16);color:#7fb0ff}
.ckp .count-red{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--red-critical);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.ckp .seg{margin-left:auto;display:flex;background:var(--bg-app-deep);border:1px solid var(--border-soft);border-radius:10px;padding:3px}
.ckp .seg span{font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:7px;color:var(--text-secondary)}
.ckp .seg span.on{background:var(--blue-bright);color:#fff}

.ckp .tl-wrap{padding:16px 18px 20px}
.ckp .tl-grid{position:relative;margin-left:96px;height:16px;border-bottom:1px solid var(--border-soft)}
.ckp .tl-grid .h{position:absolute;top:0;transform:translateX(-50%);font-size:10px;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace}
.ckp .tl-grid .vg{position:absolute;top:16px;width:1px;height:96px;background:var(--border-soft)}
.ckp .tl-row{display:flex;align-items:center;margin-top:14px}
.ckp .tl-row .lab{width:96px;flex:none}
.ckp .tl-row .lab .p{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--text-secondary)}
.ckp .tl-row .lab .h{font-size:11px;color:var(--text-muted);margin-top:2px}
.ckp .tl-track{position:relative;flex:1;height:34px;background:repeating-linear-gradient(90deg,transparent,transparent 8px,rgba(255,255,255,.018) 8px,rgba(255,255,255,.018) 9px);border-radius:6px}
.ckp .tl-bar{position:absolute;top:5px;height:24px;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:11.5px;font-weight:650;color:#06122a;gap:7px}
.ckp .tl-now{position:absolute;top:-6px;bottom:-14px;width:2px;background:var(--red-critical);box-shadow:0 0 8px var(--red-critical);z-index:3}
.ckp .tl-now .lbl{position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:var(--red-critical);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:5px;font-family:ui-monospace,monospace}

.ckp .tbl{width:100%;border-collapse:collapse}
.ckp .tbl thead th{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;text-align:left;padding:9px 14px;border-bottom:1px solid var(--border-soft)}
.ckp .tbl tbody td{padding:9px 14px;border-bottom:1px solid var(--border-soft);font-size:12.5px;vertical-align:middle}
.ckp .tbl tbody tr:hover{background:var(--bg-row-hover)}
.ckp .who{display:flex;align-items:center;gap:10px}
.ckp .who .av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:800;color:#fff;flex:none}
.ckp .who .nm{font-weight:650;display:flex;align-items:center;gap:6px}
.ckp .who .rl{font-size:10.5px;color:var(--text-muted);margin-top:1px}
.ckp .coord{font-size:8.5px;font-weight:800;letter-spacing:.04em;background:rgba(139,92,246,.2);color:#b79bff;border-radius:4px;padding:2px 5px}
.ckp .salle{display:inline-flex;align-items:center;gap:6px;font-weight:650}
.ckp .salle svg{color:var(--cyan-info)}
.ckp .cre .st{font-size:10px;margin-top:1px}
.ckp .st-enc{color:var(--green-bright)}.ckp .st-att{color:var(--orange-warning)}.ckp .st-pre{color:var(--cyan-info)}
.ckp .dash{color:var(--text-disabled)}
.ckp .stat{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:650}
.ckp .stat .d{width:7px;height:7px;border-radius:50%}
.ckp .s-ok{color:var(--green-bright)}.ckp .s-ok .d{background:var(--green-bright)}
.ckp .s-wa{color:var(--orange-warning)}.ckp .s-wa .d{background:var(--orange-warning)}
.ckp .s-cr{color:var(--red-critical)}.ckp .s-cr .d{background:var(--red-critical)}
.ckp .c-ok{color:var(--green-bright)}.ckp .c-wa{color:var(--orange-warning)}
.ckp .acts{display:flex;gap:5px}
.ckp .acts b{width:28px;height:28px;border-radius:7px;border:1px solid var(--border-default);display:flex;align-items:center;justify-content:center;color:var(--text-secondary)}
.ckp .tbl-foot{display:flex;align-items:center;gap:16px;padding:11px 16px;font-size:11.5px;color:var(--text-muted)}
.ckp .tbl-foot .fi{display:inline-flex;align-items:center;gap:6px}
.ckp .tbl-foot .link{margin-left:auto;color:var(--cyan-info);font-weight:600;text-decoration:none}

.ckp .aq .row{display:flex;align-items:center;gap:11px;padding:12px 15px;border-bottom:1px solid var(--border-soft)}
.ckp .aq .row:last-child{border-bottom:0}
.ckp .aq .ai{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none}
.ckp .aq .tx{min-width:0}
.ckp .aq .tx .t{font-size:12.5px;font-weight:650;color:var(--text-primary)}
.ckp .aq .tx .s{font-size:11px;color:var(--text-muted);margin-top:2px}
.ckp .aq .go{margin-left:auto;flex:none;font-size:11px;font-weight:700;padding:6px 11px;border-radius:7px;border:1px solid var(--border-strong);color:var(--text-primary);background:var(--bg-panel-soft)}
.ckp .aq .go.pri{background:var(--blue-bright);border-color:var(--blue-bright);color:#fff}
.ckp .aq .empty{padding:24px 15px;text-align:center;color:var(--text-muted);font-size:12px}

.ckp .tabs{display:flex;gap:6px;padding:11px 14px 4px;flex-wrap:wrap}
.ckp .tabs span{border:1px solid var(--border-soft);color:var(--text-secondary);font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px;display:inline-flex;gap:6px;align-items:center}
.ckp .tabs span .n{font-weight:800}
.ckp .tabs span.on{background:rgba(240,68,75,.16);border-color:rgba(240,68,75,.4);color:#ff9ba0}
.ckp .al .row{display:flex;gap:11px;padding:11px 15px;border-bottom:1px solid var(--border-soft)}
.ckp .al .abar{width:3px;border-radius:3px;flex:none;margin:2px 0}
.ckp .al .tx{min-width:0;flex:1}
.ckp .al .lv{font-size:9.5px;font-weight:800;letter-spacing:.08em}
.ckp .al .t{font-size:12.5px;font-weight:650;margin-top:2px}
.ckp .al .s{font-size:11px;color:var(--text-muted);margin-top:2px}
.ckp .al .tm{font-size:10.5px;color:var(--text-muted);flex:none;font-family:ui-monospace,monospace;padding-top:2px}
.ckp .lv-cr{color:var(--red-critical)}.ckp .lv-rt{color:var(--orange-warning)}.ckp .lv-if{color:var(--cyan-info)}
.ckp .al .row.cr .abar{background:var(--red-critical)}.ckp .al .row.rt .abar{background:var(--orange-warning)}.ckp .al .row.if .abar{background:var(--cyan-info)}
.ckp .al-foot{padding:11px 15px;font-size:11.5px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:8px;justify-content:center}
.ckp .sum-h{display:flex;align-items:center;margin-top:2px}
.ckp .sum-h .lbl{margin-left:auto;font-size:10.5px;color:var(--text-muted)}
.ckp .sum{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ckp .sc{border:1px solid var(--border-default);background:var(--bg-panel);border-radius:10px;padding:12px 12px 13px;text-align:center}
.ckp .sc .n{font-size:22px;font-weight:800;line-height:1;margin-top:4px}
.ckp .sc .l{font-size:10px;color:var(--text-muted);margin-top:5px;font-weight:600}
.ckp .sc.cr{color:var(--red-critical)}.ckp .sc.rt{color:var(--orange-warning)}.ckp .sc.if{color:var(--cyan-info)}.ckp .sc.tt{color:var(--text-primary)}
@media(max-width:1180px){.ckp .board{grid-template-columns:1fr}.ckp .kpis{grid-template-columns:repeat(2,1fr)}}
@media(prefers-reduced-motion:reduce){.ckp *{animation:none!important}}
`;

const ICO = "w-[17px] h-[17px]";

export default async function CockpitOpsPage() {
  await requireActiveOrgId();

  // Récupération résiliente : si Supabase n'est pas configuré (démo / preview),
  // l'écran retombe sur le jeu de référence plutôt que de faire une 500.
  let view = DEMO_COCKPIT;
  try {
    const [missions, affectations, surveillants, salles] = await Promise.all([
      getMissions(), getAffectations(), getSurveillants(), getSalles(),
    ]);
    view = buildCockpitView({ missions, affectations, surveillants, salles });
  } catch {
    /* jeu de démonstration */
  }

  let openIncidents = 0;
  try {
    const incidents = await getIncidents();
    openIncidents = incidents.filter((i) => i.statut !== "Résolu").length;
  } catch {
    /* pas d'incidents en démo */
  }

  let userName = "Coordinateur SPC";
  let roleLabel = "Coordinateur";
  try {
    const [user, role] = await Promise.all([getCurrentUser(), getCurrentRole()]);
    userName = nomDepuisEmail(user?.email);
    roleLabel = libelleRole(role);
  } catch {
    /* identité par défaut */
  }

  const k = view.kpis;
  const badges: Record<string, number> = { inc: openIncidents };

  const navBlock = (items: NavItem[]) => items.map(({ href, label, Icon, active, badgeKey }) => {
    const b = badgeKey ? badges[badgeKey] ?? 0 : 0;
    return (
      <Link key={href} href={href} className={active ? "active" : undefined}>
        <Icon className="w-4 h-4" />{label}{b > 0 ? <span className="bdg">{b}</span> : null}
      </Link>
    );
  });

  return (
    <div className="ckp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* SIDEBAR */}
      <aside className="side">
        <div className="brand">
          <span className="logo"><Check className="w-[19px] h-[19px]" strokeWidth={2.4} /></span>
          <div>
            <div className="nm">Survéo <span className="ai">IA</span></div>
            <div className="sub">Gestion des examens</div>
          </div>
        </div>

        <Link href="/operations/missions" className="mcard">
          <span className="dot" />
          <div>
            <div className="k">MISSION ACTIVE</div>
            <div className="v">{view.missionLabel}</div>
          </div>
          <ChevronRight className="w-4 h-4 chev" />
        </Link>

        <div className="navsec">PILOTAGE</div>
        <nav className="nav">{navBlock(NAV_PILOTAGE)}</nav>
        <div className="navsec">COMMERCIAL</div>
        <nav className="nav">{navBlock(NAV_COMMERCIAL)}</nav>
        <div className="navsec">SUIVI &amp; QUALITÉ</div>
        <nav className="nav">{navBlock(NAV_SUIVI)}</nav>

        <div className="foot">
          <Link href="/cockpit"><ChevronRight className="w-[15px] h-[15px] rotate-180" />Cockpit commercial</Link>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="hdr">
          <div>
            <div className="ttl">Cockpit opérationnel <span className="pill-live"><span className="d" />Temps réel</span></div>
            <div className="subttl">Pilotage temps réel · Dernière mise à jour : {view.majHeure}<RefreshCw className="w-[13px] h-[13px]" /></div>
          </div>
          <div className="right">
            <div className="toprow">
              <div className="datesel"><Calendar className="w-[15px] h-[15px]" />{view.dateLabel || "Aujourd’hui"}<ChevronRight className="w-[13px] h-[13px]" /></div>
              <div className="bell"><Bell className="w-[18px] h-[18px]" />{openIncidents > 0 ? <span className="b">{openIncidents}</span> : null}</div>
              <div className="usr"><span className="av">{initialesNom(userName)}</span><div><div className="nm">{userName}</div><div className="rl">{roleLabel}</div></div><ChevronDown className="w-4 h-4" /></div>
            </div>
            <div className="btns">
              <Link href="/operations/cockpit" className="btn btn-sec"><RefreshCw className="w-[15px] h-[15px]" />Actualiser</Link>
              <Link href="/operations/planification" className="btn btn-pri"><Calendar className="w-[15px] h-[15px]" />Planification</Link>
            </div>
          </div>
        </header>

        <div className="scroll">
          <div className="navsec" style={{ padding: "0 2px 9px", color: "var(--text-secondary)", letterSpacing: ".12em" }}>SANTÉ DE LA MISSION</div>

          {/* KPIs */}
          <div className="kpis">
            <div className="kpi">
              <div className="top"><span className="ico ico-blue"><Users className={ICO} /></span><span className="k">COUVERTURE GLOBALE</span></div>
              <div className="val">{k.couverturePct} %</div>
              <div className="sub">{k.postesCouverts} / {k.postesTotal} postes couverts</div>
              <div className="kbar"><i style={{ width: `${k.couverturePct}%`, background: "linear-gradient(90deg,var(--blue-primary),var(--blue-bright))" }} /></div>
            </div>
            <div className="kpi">
              <div className="top"><span className="ico ico-green"><CheckCircle2 className={ICO} /></span><span className="k">CONFIRMATIONS</span></div>
              <div className="val">{k.confirmationsPct} %</div>
              <div className="sub">{k.confirmes} / {k.confTotal} confirmés</div>
              <div className="kbar"><i style={{ width: `${k.confirmationsPct}%`, background: "linear-gradient(90deg,var(--green-dark),var(--green-bright))" }} /></div>
            </div>
            <div className="kpi">
              <div className="top"><span className="ico ico-orange"><Clock className={ICO} /></span><span className="k">PRISES DE POSTE À VENIR</span></div>
              <div className="val">{k.prisesDePoste}</div>
              <div className="sub">dans les 2 prochaines heures</div>
              <div className="spark">{[40, 62, 48, 78, 56, 88, 70, 100, 64, 82].map((h, i) => <i key={i} style={{ height: `${h}%`, background: i % 2 ? "var(--orange-warning)" : "var(--orange-dark)" }} />)}</div>
            </div>
            <div className="kpi">
              <div className="top"><span className="ico ico-red"><AlertTriangle className={ICO} /></span><span className="k">ALERTES ACTIVES</span></div>
              <div className="val">{k.alertesTotal}</div>
              <div className="sub">{k.alertesCritiques} critiques · {k.alertesRetards} retards · {k.alertesInfos} infos</div>
              <div className="spark">{[100, 70, 85, 55, 60, 45, 40, 30, 35].map((h, i) => <i key={i} style={{ height: `${h}%`, background: i < 4 ? "var(--red-critical)" : i < 7 ? "var(--orange-warning)" : "var(--cyan-info)" }} />)}</div>
            </div>
            <div className="kpi ai">
              <div className="top"><span className="ico ico-ai"><Sparkles className={ICO} /></span><span className="k">SCORE DE FLUIDITÉ IA</span></div>
              <div className="val">{k.scoreIA.toLocaleString("fr-FR")} <small>/10</small></div>
              <div className="sub"><span className="aihint">{k.scoreLabel} <Info className="w-3 h-3" /></span></div>
              <svg viewBox="0 0 260 40" preserveAspectRatio="none" style={{ width: "100%", height: 36, marginTop: 8 }}>
                <polyline points="0,36 30,32 60,34 90,26 120,28 150,20 180,22 210,13 240,9 260,6" fill="none" stroke="#8B5CF6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="210" cy="13" r="2.6" fill="#b79bff" /><circle cx="260" cy="6" r="2.8" fill="#c9b6ff" />
              </svg>
            </div>
          </div>

          {/* BOARD */}
          <div className="board">
            <div>
              {/* TIMELINE */}
              <div className="panel">
                <div className="ph"><span className="t">Frise horaire — vue du jour</span>
                  <div className="seg"><span className="on">Jour</span><span>Semaine</span><span>Vue salle</span></div>
                </div>
                <div className="tl-wrap">
                  <div className="tl-grid">
                    {["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].map((h, i) => (
                      <span className="h" key={h} style={{ left: `${(i / 12) * 100}%` }}>{h}</span>
                    ))}
                    {[1, 3, 5, 7, 9, 11].map((i) => <span className="vg" key={i} style={{ left: `${(i / 12) * 100}%` }} />)}
                    {view.timeline.nowPct != null ? <span className="tl-now" style={{ left: `${view.timeline.nowPct}%` }}><span className="lbl">{view.timeline.nowLabel}</span></span> : null}
                  </div>
                  {(() => {
                    const pct = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return Math.max(0, Math.min(100, (((h * 60 + m) - 420) / 720) * 100)); };
                    const rows: Array<[string, typeof view.timeline.matin, string]> = [["MATIN", view.timeline.matin, "linear-gradient(90deg,#2E7BFF,#3f88ff)"], ["APRÈS-MIDI", view.timeline.apm, "linear-gradient(90deg,#2aa85e,#36D477)"]];
                    return rows.map(([lab, bar, bg]) => (
                      <div className="tl-row" key={lab}>
                        <div className="lab"><div className="p">{lab}</div><div className="h">{bar ? `${bar.debut} – ${bar.fin}` : "—"}</div></div>
                        <div className="tl-track">{bar ? (
                          <div className="tl-bar" style={{ left: `${pct(bar.debut)}%`, width: `${Math.max(6, pct(bar.fin) - pct(bar.debut))}%`, background: bg }}>
                            <Users className="w-[13px] h-[13px]" style={{ color: "#06122a" }} />{bar.salles} salles · {bar.surveillants} surveillants
                          </div>
                        ) : null}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* SESSIONS */}
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="ph"><span className="t">Sessions actives</span>
                  <span className="chip chip-green" style={{ marginLeft: 10 }}>{view.sessionsEnCours} en cours</span>
                  <span className="chip chip-blue">{view.sessionsPrep} en préparation</span>
                  <Link className="link" href="/operations/planification">Voir planning →</Link>
                </div>
                <table className="tbl">
                  <thead><tr><th>Surveillant</th><th>Salle</th><th>Matin</th><th>Après-midi</th><th>Statut</th><th>Conf.</th><th>Actions</th></tr></thead>
                  <tbody>
                    {view.sessions.map((s, i) => (
                      <tr key={i}>
                        <td><div className="who"><span className="av" style={{ background: s.color }}>{s.initials}</span><div><div className="nm">{s.nom}{s.coord ? <span className="coord">COORD</span> : null}</div><div className="rl">{s.role}</div></div></div></td>
                        <td><span className="salle"><MapPin className="w-[13px] h-[13px]" />{s.salle}</span></td>
                        <td>{s.matin ? <div className="cre">{s.matin.horaire}<div className={`st st-${s.matin.etatClass}`}>{s.matin.etat}</div></div> : <span className="dash">—</span>}</td>
                        <td>{s.apm ? <div className="cre">{s.apm.horaire}<div className={`st st-${s.apm.etatClass}`}>{s.apm.etat}</div></div> : <span className="dash">—</span>}</td>
                        <td><span className={`stat s-${s.statutClass}`}><span className="d" />{s.statut}</span></td>
                        <td className={s.conf === "ok" ? "c-ok" : "c-wa"}>{s.conf === "ok" ? <CheckCircle2 className="w-[19px] h-[19px]" /> : <Clock className="w-[19px] h-[19px]" />}</td>
                        <td><div className="acts"><b><Pencil className="w-[14px] h-[14px]" /></b><b><MessageSquare className="w-[14px] h-[14px]" /></b><b><MoreHorizontal className="w-[14px] h-[14px]" /></b></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="tbl-foot">
                  <span className="fi"><DoorOpen className="w-[14px] h-[14px]" />{view.sallesRatio}</span>
                  <span className="fi"><UserCog className="w-[14px] h-[14px]" />Coordinateur</span>
                  <Link className="link" href="/operations/planification">Ouvrir toutes les sessions →</Link>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <div className="panel aq">
                <div className="ph"><span className="t">À traiter maintenant</span>{view.actions.length > 0 ? <span className="count-red" style={{ marginLeft: "auto" }}>{view.actions.length}</span> : null}</div>
                {view.actions.length === 0 ? <div className="empty">Rien à traiter dans l’immédiat.</div> : view.actions.map((a, i) => {
                  const map = { critique: ["ico-red", <AlertTriangle key="i" className="w-[15px] h-[15px]" />], retard: ["ico-orange", <Clock key="i" className="w-[15px] h-[15px]" />], info: ["ico-blue", <Info key="i" className="w-[15px] h-[15px]" />], ok: ["ico-green", <CheckCircle2 key="i" className="w-[15px] h-[15px]" />] } as const;
                  const [cls, icon] = map[a.niveau];
                  return (
                    <div className="row" key={i}>
                      <span className={`ai ${cls}`}>{icon}</span>
                      <div className="tx"><div className="t">{a.titre}</div><div className="s">{a.detail}</div></div>
                      <span className={`go${a.niveau === "ok" ? " pri" : ""}`}>{a.cta}</span>
                    </div>
                  );
                })}
              </div>

              <div className="panel al" style={{ marginTop: 16 }}>
                <div className="ph"><span className="t">Alertes</span><Link className="link" href="/operations/incidents">Voir toutes ({k.alertesTotal})</Link></div>
                <div className="tabs">
                  <span>Toutes <span className="n">{k.alertesTotal}</span></span>
                  <span className="on">Critiques <span className="n">{k.alertesCritiques}</span></span>
                  <span>Retards <span className="n">{k.alertesRetards}</span></span>
                  <span>Infos <span className="n">{k.alertesInfos}</span></span>
                </div>
                {view.alerts.length === 0 ? <div className="empty" style={{ padding: "20px 15px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Aucune alerte active.</div> : view.alerts.map((a, i) => (
                  <div className={`row ${a.niveau}`} key={i}><span className="abar" /><div className="tx"><div className={`lv lv-${a.niveau}`}>{a.lvLabel}</div><div className="t">{a.titre}</div><div className="s">{a.detail}</div></div><span className="tm">{a.heure}</span></div>
                ))}
                <div className="al-foot"><Settings className="w-[14px] h-[14px]" />Gérer les alertes</div>
              </div>

              <div className="sum-h"><span className="navsec" style={{ padding: "14px 2px 8px", color: "var(--text-secondary)" }}>RÉCAPITULATIF</span><span className="lbl">Aujourd’hui</span></div>
              <div className="sum">
                <div className="sc cr"><AlertTriangle className="w-[17px] h-[17px]" style={{ margin: "0 auto" }} /><div className="n">{k.alertesCritiques}</div><div className="l">Critiques</div></div>
                <div className="sc rt"><Clock className="w-[17px] h-[17px]" style={{ margin: "0 auto" }} /><div className="n">{k.alertesRetards}</div><div className="l">Retards</div></div>
                <div className="sc if"><Info className="w-[17px] h-[17px]" style={{ margin: "0 auto" }} /><div className="n">{k.alertesInfos}</div><div className="l">Informations</div></div>
                <div className="sc tt"><LayoutGrid className="w-[17px] h-[17px]" style={{ margin: "0 auto" }} /><div className="n">{k.alertesTotal}</div><div className="l">Total alertes</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
