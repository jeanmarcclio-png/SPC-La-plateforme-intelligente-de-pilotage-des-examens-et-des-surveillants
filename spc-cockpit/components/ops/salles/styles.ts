// Styles de l'écran Salles — module neutre (SANS "use client").
// Il DOIT rester hors du composant client : les exports d'un module client
// sont transformés en références par Next.js et n'arrivent pas au serveur.
// La palette de base vient de COMMAND_CSS (components/ops/command/shell).

export const SALLES_CSS = `
.ckp .flt{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 24px;border-bottom:1px solid var(--border-soft);background:rgba(10,32,84,.35)}
.ckp .fld{display:flex;flex-direction:column;gap:4px;min-width:150px}
.ckp .fld > span{font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--text-muted)}
.ckp .ipt,.ckp select.ipt{height:36px;border:1px solid var(--border-default);background:var(--bg-panel);color:var(--text-primary);border-radius:9px;padding:0 11px;font-size:12.5px;font-weight:600;width:100%;appearance:none}
.ckp select.ipt{background-image:linear-gradient(45deg,transparent 50%,var(--text-secondary) 50%),linear-gradient(135deg,var(--text-secondary) 50%,transparent 50%);background-position:calc(100% - 15px) 16px,calc(100% - 10px) 16px;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:30px}
.ckp .ipt::placeholder{color:var(--text-disabled)}
.ckp .srch{position:relative;flex:1;min-width:190px}
.ckp .srch svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text-muted)}
.ckp .srch .ipt{padding-left:33px}
.ckp .chipbtn{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:9px;border:1px solid var(--border-default);background:var(--bg-panel);color:var(--text-primary);font-size:12px;font-weight:650;cursor:pointer}
.ckp .chipbtn:hover{background:var(--bg-panel-hover)}
.ckp .chipbtn .n{min-width:18px;height:18px;border-radius:999px;background:var(--purple-ai);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px}

.ckp .skpis{display:grid;grid-template-columns:repeat(7,1fr);gap:11px}
.ckp .skpi{border:1px solid var(--border-default);background:var(--bg-panel);border-radius:12px;padding:13px 13px 12px;box-shadow:0 2px 8px rgba(0,8,30,.16)}
.ckp .skpi .ico{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:9px}
.ckp .skpi .val{font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.ckp .skpi .k{font-size:11px;font-weight:650;color:var(--text-secondary);margin-top:6px;line-height:1.3}
.ckp .skpi .sub{font-size:10.5px;color:var(--text-muted);margin-top:3px}
.ckp .ico-green{background:rgba(54,212,119,.15);color:var(--green-bright)}
.ckp .ico-purple{background:rgba(139,92,246,.18);color:#b79bff}
.ckp .ico-blue{background:rgba(46,123,255,.16);color:var(--blue-bright)}
.ckp .ico-red{background:rgba(240,68,75,.15);color:var(--red-critical)}
.ckp .ico-orange{background:rgba(245,158,11,.15);color:var(--orange-warning)}
.ckp .ico-amber{background:rgba(255,159,28,.15);color:#FF9F1C}
.ckp .ico-cyan{background:rgba(41,151,255,.15);color:var(--cyan-info)}

.ckp .secttl{display:flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;color:var(--text-secondary);margin:20px 0 10px}
.ckp .alrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:11px}
.ckp .alc{display:flex;align-items:center;gap:10px;border:1px solid var(--border-default);background:var(--bg-panel);border-radius:11px;padding:11px 12px}
.ckp .alc .tx{min-width:0;flex:1}
.ckp .alc .t{font-size:12.5px;font-weight:700;line-height:1.25}
.ckp .alc .s{font-size:11px;color:var(--text-muted);margin-top:2px}
.ckp .alc .go{flex:none;height:29px;padding:0 11px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:var(--text-primary);font-size:11.5px;font-weight:650;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.ckp .alc .go:hover{background:var(--bg-panel-hover)}
.ckp .alc.critique{border-color:rgba(240,68,75,.42);background:linear-gradient(90deg,rgba(240,68,75,.12),var(--bg-panel) 62%)}
.ckp .alc.critique .t{color:#FF8D91}
.ckp .alc.vigilance{border-color:rgba(245,158,11,.38);background:linear-gradient(90deg,rgba(245,158,11,.10),var(--bg-panel) 62%)}
.ckp .alc.vigilance .t{color:#F6BE55}
.ckp .alc.info{border-color:rgba(41,151,255,.34)}
.ckp .alc.info .t{color:#7FC0FF}
.ckp .alc.ia{border-color:rgba(139,92,246,.40);background:linear-gradient(90deg,rgba(139,92,246,.12),var(--bg-panel) 62%)}
.ckp .alc.ia .t{color:#BFA6FF}

.ckp .board{display:grid;grid-template-columns:minmax(0,1fr) 318px;gap:14px;align-items:start}
.ckp .pnl{border:1px solid var(--border-default);background:var(--bg-panel);border-radius:13px;overflow:hidden}
.ckp .pnl-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:13px 15px;border-bottom:1px solid var(--border-soft)}
.ckp .pnl-h h2{font-size:14px;font-weight:750;margin:0}
.ckp .pnl-h .sp{margin-left:auto;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.ckp .tgl{display:flex;border:1px solid var(--border-default);border-radius:8px;overflow:hidden}
.ckp .tgl button{width:32px;height:29px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;color:var(--text-secondary);cursor:pointer}
.ckp .tgl button[aria-pressed="true"]{background:var(--bg-active-nav);color:#fff}

.ckp .lgd{display:flex;flex-wrap:wrap;gap:13px;padding:9px 15px;border-bottom:1px solid var(--border-soft);font-size:11px;color:var(--text-muted)}
.ckp .lgd i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle}
.ckp .lgd b{color:var(--text-secondary);font-weight:650}

.ckp .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:11px;padding:14px 15px}
.ckp .grp{padding:14px 15px 0}
.ckp .grp h3{font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--text-disabled);margin:0 0 9px}
.ckp .rc{position:relative;text-align:left;border:1px solid var(--border-default);background:var(--bg-panel-soft);border-radius:11px;padding:12px;cursor:pointer;color:inherit;font:inherit;width:100%;display:block}
.ckp .rc:hover{background:var(--bg-panel-hover)}
.ckp .rc .nm{font-size:13px;font-weight:750;display:flex;align-items:center;gap:6px;min-width:0}
.ckp .rc .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ckp .rc .tags{display:flex;gap:4px;margin-left:auto;flex:none}
.ckp .tag{font-size:9px;font-weight:800;letter-spacing:.03em;border-radius:4px;padding:2px 4px;line-height:1.35}
.ckp .tag-tt{background:rgba(41,151,255,.18);color:#7FC0FF}
.ckp .tag-pmr{background:rgba(245,158,11,.18);color:#F6BE55}
.ckp .rc .bar{height:4px;border-radius:3px;background:rgba(255,255,255,.08);margin:10px 0 8px;overflow:hidden}
.ckp .rc .bar i{display:block;height:100%;border-radius:3px}
.ckp .rc .mt{display:flex;align-items:baseline;gap:7px;font-size:11.5px;color:var(--text-secondary)}
.ckp .rc .mt .pc{font-weight:800;margin-left:auto}
.ckp .rc .lo{font-size:10.5px;color:var(--text-muted);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ckp .rc .lvl{display:inline-block;margin-top:8px;font-size:9px;font-weight:800;letter-spacing:.05em;border-radius:4px;padding:2px 6px;text-transform:uppercase}
.ckp .rc.critique{border-color:rgba(240,68,75,.45)}
.ckp .rc.critique .lvl{background:rgba(240,68,75,.16);color:#FF8D91}
.ckp .rc.vigilance .lvl{background:rgba(245,158,11,.15);color:#F6BE55}
.ckp .rc.normale .lvl{background:rgba(46,123,255,.16);color:#8FBAFF}
.ckp .rc.faible .lvl{background:rgba(54,212,119,.14);color:#6BE0A3}
.ckp .rc.inutilisee .lvl{background:rgba(255,255,255,.07);color:var(--text-muted)}
.ckp .rc[aria-pressed="true"]{border-color:var(--blue-bright);box-shadow:0 0 0 1px var(--blue-bright),0 6px 20px rgba(46,123,255,.20)}
.ckp .addc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-height:118px;border:1px dashed var(--border-strong);background:transparent;border-radius:11px;color:var(--text-secondary);font-size:12px;font-weight:650;cursor:pointer}
.ckp .addc:hover{background:var(--bg-panel-hover);color:#fff}

.ckp .side-pnl{position:sticky;top:0}
.ckp .side-pnl .hd{display:flex;align-items:flex-start;gap:9px;padding:14px 15px 11px;border-bottom:1px solid var(--border-soft)}
.ckp .side-pnl .hd h2{font-size:17px;font-weight:800;margin:0}
.ckp .side-pnl .cls{margin-left:auto;background:transparent;border:0;color:var(--text-muted);cursor:pointer;padding:2px}
.ckp .side-pnl .cls:hover{color:#fff}
.ckp .blk{padding:13px 15px;border-bottom:1px solid var(--border-soft)}
.ckp .blk h3{font-size:11px;font-weight:750;color:var(--text-secondary);margin:0 0 9px;letter-spacing:.03em}
.ckp .kv{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;padding:3px 0}
.ckp .kv dt{color:var(--text-muted)}
.ckp .kv dd{margin:0;font-weight:650;text-align:right}
.ckp .donut{display:flex;align-items:center;gap:14px}
.ckp .donut .lg{font-size:11px;display:flex;flex-direction:column;gap:5px;flex:1}
.ckp .donut .lg div{display:flex;align-items:center;gap:7px;color:var(--text-muted)}
.ckp .donut .lg b{margin-left:auto;color:var(--text-primary)}
.ckp .donut .lg i{width:7px;height:7px;border-radius:50%}
.ckp .note{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:650;border-radius:7px;padding:6px 9px;background:rgba(240,68,75,.13);color:#FF8D91;margin-bottom:6px}
.ckp .qa{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ckp .qa button,.ckp .qa a{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:33px;border-radius:8px;border:1px solid var(--border-strong);background:transparent;color:var(--text-primary);font-size:11.5px;font-weight:650;cursor:pointer;text-decoration:none}
.ckp .qa button:hover,.ckp .qa a:hover{background:var(--bg-panel-hover)}
.ckp .qa .danger{grid-column:1/-1;border-color:rgba(240,68,75,.45);color:#FF8D91}
.ckp .qa .danger:hover{background:rgba(240,68,75,.14)}

.ckp .tbl-wrap{overflow-x:auto}
.ckp table.tb{width:100%;border-collapse:collapse;min-width:900px}
.ckp table.tb th{text-align:left;font-size:9.5px;font-weight:750;letter-spacing:.09em;color:var(--text-muted);text-transform:uppercase;padding:9px 13px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
.ckp table.tb td{padding:10px 13px;font-size:12px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
.ckp table.tb tbody tr:hover{background:var(--bg-row-hover)}
.ckp table.tb tbody tr[aria-selected="true"]{background:var(--bg-active-nav)}
.ckp table.tb .mini{height:4px;width:64px;border-radius:3px;background:rgba(255,255,255,.08);display:inline-block;overflow:hidden;vertical-align:middle;margin-right:7px}
.ckp table.tb .mini i{display:block;height:100%;border-radius:3px}
.ckp .ia{display:inline-flex;gap:5px}
.ckp .ia button{width:27px;height:27px;border-radius:7px;border:1px solid var(--border-default);background:transparent;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer}
.ckp .ia button:hover{background:var(--bg-panel-hover);color:#fff}
.ckp .ia button.dg:hover{background:rgba(240,68,75,.16);color:#FF8D91;border-color:rgba(240,68,75,.4)}
.ckp .empty{padding:38px 15px;text-align:center;color:var(--text-muted);font-size:12.5px}
.ckp .dot-st{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:6px}

@media(max-width:1240px){.ckp .skpis{grid-template-columns:repeat(4,1fr)}.ckp .board{grid-template-columns:1fr}.ckp .side-pnl{position:static}}
@media(max-width:760px){.ckp .skpis{grid-template-columns:repeat(2,1fr)}.ckp .flt{padding:12px 16px}.ckp .fld{min-width:132px;flex:1}.ckp .grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}}
`;
