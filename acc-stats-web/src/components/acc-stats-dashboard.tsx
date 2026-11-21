"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type MouseEvent } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Download, Filter, LayoutDashboard, Moon, Search, Sun, Trophy, Users, X, Target, Flame, Shield, ChevronRight, GitCompareArrows, Medal } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import "@fontsource-variable/manrope";
import data from "@/data/acc_stats.json";

type Player = {
  acc_cumulative_id: string;
  player_name: string;
  cricheroes_player_id: number | string;
  teams_all: string;
  seasons_played: number;
  season_list: string;
  matches_played: number;
  bat_innings: number;
  runs: number;
  balls_faced: number;
  highest_score: string;
  batting_average: number;
  batting_strike_rate: number;
  not_outs: number;
  fours: number;
  sixes: number;
  ducks: number;
  "30s": number;
  "50s": number;
  "100s": number;
  bowl_innings: number;
  overs_bowled: string;
  wickets: number;
  best_bowling: string;
  bowling_average: number;
  economy: number;
  bowling_strike_rate: number;
  runs_conceded: number;
  maidens: number;
  dots: number;
  wides: number;
  no_balls: number;
  "3_wicket_hauls": number;
  "5_wicket_hauls": number;
  matches_s5: number;
  matches_s6: number;
  matches_s7: number;
  matches_s8: number;
  played_s5: number;
  played_s6: number;
  played_s7: number;
  played_s8: number;
  balls_bowled: number;
  name_variants: string;
  season_player_ids: string;
  match_ids_all: string;
  batting_rank: number;
  bowling_rank: number;
  fielding_rank: number;
  catches: number;
  stumpings: number;
  run_outs: number;
  fielding_dismissals: number;
};

const PLAYERS = data as Player[];
const BG = "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1800&q=80";

const number = new Intl.NumberFormat("en-US");
const fmt = (n: number) => number.format(Math.round(n));
const fmt1 = (n: number) => n.toFixed(1);
const fmt2 = (n: number) => n.toFixed(2);

function saveCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type View = "overview" | "batting" | "bowling" | "players" | "compare";
const views = [
  { id: "overview" as View, label: "Overview", short: "Overview", icon: LayoutDashboard, description: "ACC Seasons 5–8 cumulative snapshot.", prompt: "Show me the tournament overview." },
  { id: "batting" as View, label: "Batting", short: "Batting", icon: Trophy, description: "Top run scorers, strike rates, and batting leaders.", prompt: "Who dominated with the bat?" },
  { id: "bowling" as View, label: "Bowling", short: "Bowling", icon: Target, description: "Wicket takers, economy, and bowling leaders.", prompt: "Who took the most wickets?" },
  { id: "players" as View, label: "Players", short: "Players", icon: Users, description: "Search and inspect every cumulative player record.", prompt: "Find any player's cumulative stats." },
  { id: "compare" as View, label: "Compare", short: "Compare", icon: GitCompareArrows, description: "Head-to-head metric comparison between two players.", prompt: "Compare two players." },
];

type SortKey = "runs" | "batting_average" | "batting_strike_rate" | "sixes" | "fours" | "wickets" | "economy" | "bowling_average" | "matches_played";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(m.matches);
    m.addEventListener("change", u); u();
    return () => m.removeEventListener("change", u);
  }, []);
  return reduced;
}

gsap.registerPlugin(useGSAP);

function Panel({ title, subtitle, action, className = "", children }: { title: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode; }) {
  return <section className={`gd-panel ${className}`} data-gd-enter>
    <header className="gd-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>
    {children}
  </section>;
}

function Metric({ title, icon, value, format = fmt, detail, tone }: { title: string; icon: ReactNode; value: number; format?: (n:number)=>string; detail?: string; tone?: "teal"|"coral"; }) {
  const text = format(value);
  return <article className="gd-metric" data-tone={tone} data-gd-enter>
    <div className="gd-metric-head"><span>{title}</span><span className="gd-metric-icon" aria-hidden="true">{icon}</span></div>
    <strong className="gd-metric-value"><span data-gd-count={value} data-format={format === fmt1 ? "1" : format === fmt2 ? "2" : "0"} aria-hidden="true">{text}</span><span className="gd-sr">{text}</span></strong>
    <div className="gd-metric-caption">{detail && <span>{detail}</span>}</div>
  </article>;
}

function BarList({ items, valueKey, labelKey, max, tone = "teal" }: { items: Player[]; valueKey: keyof Player; labelKey?: "player_name"; max?: number; tone?: "teal"|"coral"|"ink"|"ochre"; }) {
  const m = max ?? Math.max(1, ...items.map(i => Number(i[valueKey]) || 0));
  return <div style={{display:"grid",gap:8}}>
    {items.map((p, i) => {
      const v = Number(p[valueKey]) || 0;
      return <div key={p.acc_cumulative_id} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 56px",gap:8,alignItems:"center"}}>
        <span style={{fontSize:10,color:"var(--gd-muted)",fontWeight:800}}>{i+1}</span>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,fontWeight:750}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.player_name}</span></div>
          <div className="gd-mix-track" style={{marginTop:4,height:6}}><i className="gd-fill" data-tone={tone} style={{width:`${(v/m)*100}%`}} /></div>
        </div>
        <strong style={{fontSize:11,textAlign:"end"}}>{fmt(v)}</strong>
      </div>;
    })}
  </div>;
}

function RankBadge({ label, rank }: { label: string; rank: number }) {
  return <div style={{display:"flex",alignItems:"center",gap:6,border:"1px solid var(--gd-line)",borderRadius:10,padding:"6px 10px",background:"var(--gd-inner)"}}>
    <Medal size={14} aria-hidden="true" /><span style={{fontSize:11,color:"var(--gd-muted)"}}>{label}</span><strong style={{marginLeft:"auto",fontSize:12}}>#{rank}</strong>
  </div>;
}

function PlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="gd-dialog" ref={ref} onClose={onClose} onClick={(e)=>{ if(e.target===e.currentTarget) e.currentTarget.close(); }}>
    <section className="gd-dialog-inner">
      <header><h2 style={{fontSize:20}}>{player.player_name}</h2><button type="button" className="gd-icon-button" aria-label="Close" onClick={()=>ref.current?.close()}><X aria-hidden="true"/></button></header>
      <p style={{color:"var(--gd-muted)",fontSize:12,marginBottom:12}}>{player.acc_cumulative_id} · {player.teams_all.replaceAll("|", ", ")} · Seasons {player.season_list.replaceAll("|", ", ")}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:12}}>
        <RankBadge label="Batting" rank={player.batting_rank} />
        <RankBadge label="Bowling" rank={player.bowling_rank} />
        <RankBadge label="Fielding" rank={player.fielding_rank} />
      </div>
      <div className="gd-work-facts" style={{gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
        {[["Matches",player.matches_played],["Runs",player.runs],["HS",player.highest_score],["Avg",fmt2(player.batting_average)],["SR",fmt2(player.batting_strike_rate)],["4s/6s",`${player.fours}/${player.sixes}`],["Wickets",player.wickets],["Best",player.best_bowling||"-"],["Econ",fmt2(player.economy)],["Bowl Avg",player.wickets?fmt2(player.bowling_average):"-"],["Overs",player.overs_bowled],["Fielding",`${player.fielding_dismissals} (Ct ${player.catches}/St ${player.stumpings}/RO ${player.run_outs})`]].map(([l,v])=>(
          <div key={String(l)}><dt>{l}</dt><dd>{String(v)}</dd></div>
        ))}
      </div>
    </section>
  </dialog>;
}

function Dock({ active, select }: { active: View; select: (v:View)=>void }) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = nav.current, ind = marker.current; if(!c||!ind) return;
    const adj = () => { const cur = c.querySelector<HTMLElement>('[aria-current="page"]'); if(!cur) return; ind.style.width=cur.offsetWidth+"px"; ind.style.height=cur.offsetHeight+"px"; ind.style.transform=`translate(${cur.offsetLeft}px,${cur.offsetTop}px)`; ind.dataset.ready="true"; };
    const ro = new ResizeObserver(adj); ro.observe(c); c.querySelectorAll("a").forEach(a=>ro.observe(a)); adj(); return ()=>ro.disconnect();
  }, [active]);
  const onSelect = (e: MouseEvent<HTMLAnchorElement>, id: View) => { if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey) return; e.preventDefault(); select(id); };
  return <nav ref={nav} className="gd-dock gd-dock-bottom" aria-label="Views">
    <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
    {views.map(({id,label,short,icon:Icon}) => (
      <a href={`#${id}`} key={id} aria-label={label} aria-current={active===id?"page":undefined} onClick={(e)=>onSelect(e,id)}>
        <Icon aria-hidden="true" /><span className="gd-dock-text" aria-hidden="true">{label}</span><span className="gd-dock-short" aria-hidden="true">{short}</span>
      </a>
    ))}
  </nav>;
}

function DockSide({ active, select }: { active: View; select: (v:View)=>void }) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = nav.current, ind = marker.current; if(!c||!ind) return;
    const adj = () => { const cur = c.querySelector<HTMLElement>('[aria-current="page"]'); if(!cur) return; ind.style.width=cur.offsetWidth+"px"; ind.style.height=cur.offsetHeight+"px"; ind.style.transform=`translate(${cur.offsetLeft}px,${cur.offsetTop}px)`; ind.dataset.ready="true"; };
    const ro = new ResizeObserver(adj); ro.observe(c); c.querySelectorAll("a").forEach(a=>ro.observe(a)); adj(); return ()=>ro.disconnect();
  }, [active]);
  const onSelect = (e: MouseEvent<HTMLAnchorElement>, id: View) => { if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey) return; e.preventDefault(); select(id); };
  return <nav ref={nav} className="gd-dock gd-dock-side" aria-label="Workspace shortcuts">
    <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
    {views.map(({id,label,icon:Icon}) => (
      <a href={`#${id}`} key={id} aria-label={label} aria-current={active===id?"page":undefined} onClick={(e)=>onSelect(e,id)}>
        <Icon aria-hidden="true" /><span className="gd-dock-tip" aria-hidden="true">{label}</span>
      </a>
    ))}
  </nav>;
}

export default function AccStatsDashboard() {
  const [view, setView] = useState<View>("overview");
  const [active, setActive] = useState<View>("overview");
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("All teams");
  const [season, setSeason] = useState("All seasons");
  const [selected, setSelected] = useState<Player | null>(null);
  const [sortBat, setSortBat] = useState<SortKey>("runs");
  const [sortBowl, setSortBowl] = useState<SortKey>("wickets");
  const [cmpA, setCmpA] = useState<string>(PLAYERS[0]?.acc_cumulative_id || "");
  const [cmpB, setCmpB] = useState<string>(PLAYERS[1]?.acc_cumulative_id || "");
  const [cmpExtra1, setCmpExtra1] = useState<string>("fielding_dismissals");
  const [cmpExtra2, setCmpExtra2] = useState<string>("matches_played");
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const pending = useRef<View>("overview");
  const exit = useRef<gsap.core.Tween|null>(null);
  const reduced = useReducedMotion();
  const { contextSafe } = useGSAP({ scope: root });

  const teams = useMemo(() => ["All teams", ...Array.from(new Set(PLAYERS.flatMap(p=>p.teams_all.split("|").map(s=>s.trim()).filter(Boolean)))).sort()], []);
  const seasons = ["All seasons","5","6","7","8"];

  const filtered = useMemo(() => PLAYERS.filter(p => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || [p.player_name,p.acc_cumulative_id,p.teams_all,p.season_list].join(" ").toLowerCase().includes(q);
    const matchTeam = team === "All teams" || p.teams_all.split("|").includes(team);
    const matchSeason = season === "All seasons" || p.season_list.split("|").includes(season);
    return matchQ && matchTeam && matchSeason;
  }), [query, team, season]);

  const totals = useMemo(() => {
    const t = { players: filtered.length, matches: 96, runs:0, wickets:0, fours:0, sixes:0, balls:0, inns:0, runsConceded:0, ballsBowled:0 };
    for (const p of filtered) { t.runs+=p.runs; t.wickets+=p.wickets; t.fours+=p.fours; t.sixes+=p.sixes; t.balls+=p.balls_faced; t.inns+=p.bat_innings; t.runsConceded+=p.runs_conceded; t.ballsBowled+=p.balls_bowled; }
    return t;
  }, [filtered]);

  const topRun = useMemo(() => [...filtered].sort((a,b)=>b.runs-a.runs).slice(0,8), [filtered]);
  const topWkt = useMemo(() => [...filtered].sort((a,b)=>b.wickets-a.wickets || a.bowling_average-b.bowling_average).slice(0,8), [filtered]);
  const seasonAgg = useMemo(() => [5,6,7,8].map(s => {
    const key = `matches_s${s}` as keyof Player;
    const played = PLAYERS.filter(p => (p[key] as number) > 0).length;
    const runs = PLAYERS.reduce((sum,p)=> sum + (s===5?p.matches_s5:s===6?p.matches_s6:s===7?p.matches_s7:p.matches_s8) * 0, 0); // placeholder
    return { label:`S${s}`, played };
  }), []);
  // better season runs/wickets from breakdown not loaded; compute from cumulative by summing per-season? We have matches_s* counts only.
  // Use players played per season and totals from known metadata:
  const seasonBars = [
    { label:"S5", runs:2839, wickets:95, players:92 },
    { label:"S6", runs:3019, wickets:122, players:100 },
    { label:"S7", runs:3221, wickets:89, players:110 },
    { label:"S8", runs:3009, wickets:86, players:100 },
  ];

  const batRows = useMemo(() => [...filtered].sort((a,b)=> {
    const dir = sortBat === "batting_average" || sortBat === "economy" || sortBat === "bowling_average" ? 1 : -1;
    const av = Number(a[sortBat]||0), bv = Number(b[sortBat]||0);
    return dir === -1 ? bv-av : av-bv;
  }).slice(0,15), [filtered, sortBat]);

  const bowlRows = useMemo(() => [...filtered].filter(p=>p.bowl_innings>0).sort((a,b)=> {
    const dir = sortBowl === "economy" || sortBowl === "bowling_average" ? 1 : -1;
    const av = Number(a[sortBowl]||0), bv = Number(b[sortBowl]||0);
    if (av===0 && bv===0) return 0;
    if (av===0) return 1; if (bv===0) return -1;
    return dir === -1 ? bv-av : av-bv;
  }).slice(0,15), [filtered, sortBowl]);

  const changeView = contextSafe((next: View) => {
    if (pending.current === next) return;
    pending.current = next; setActive(next); exit.current?.kill();
    if (reduced || !content.current) { setView(next); return; }
    if (next === view) { exit.current = gsap.to(content.current, { opacity:1, filter:"blur(0px)", duration:.18, clearProps:"opacity,filter" }); return; }
    exit.current = gsap.to(content.current, { opacity:0, filter:"blur(8px)", duration:.14, ease:"power1.in", onComplete:()=>setView(next) });
  });
  const selectView = (next: View) => { changeView(next); };

  useEffect(() => { scrollArea.current?.scrollTo({top:0}); }, [view]);

  useGSAP(() => {
    const layer = content.current; if(!layer) return;
    const counts = layer.querySelectorAll<HTMLElement>("[data-gd-count]");
    gsap.set(layer, { clearProps:"opacity,filter" });
    if (reduced) { counts.forEach(el=>{ const v=Number(el.dataset.gdCount); const f=el.dataset.format; el.textContent = f==="1"?fmt1(v):f==="2"?fmt2(v):fmt(v); }); return; }
    const tl = gsap.timeline({ defaults:{ ease:"power3.out" } });
    tl.fromTo(layer,{opacity:.55,filter:"blur(5px)"},{opacity:1,filter:"blur(0px)",clearProps:"opacity,filter",duration:.32},0);
    tl.from("[data-gd-enter]",{y:18,opacity:0,stagger:.045,duration:.5,clearProps:"transform,opacity"},.035);
    const bars = layer.querySelectorAll(".gd-fill"); if(bars.length) tl.from(bars,{scaleX:0,transformOrigin:"left center",duration:.58,stagger:.03,clearProps:"transform"},.18);
    counts.forEach((el,i)=>{ const v=Number(el.dataset.gdCount); const f=el.dataset.format; const c={v:0}; tl.to(c,{v,duration:.75,onUpdate:()=>{ el.textContent=f==="1"?fmt1(c.v):f==="2"?fmt2(c.v):fmt(c.v); }},.08+i*.02); });
  }, { scope: content, dependencies:[view, filtered.length, sortBat, sortBowl, reduced], revertOnUpdate:true });

  const exportPlayers = () => {
    const cols = ["acc_cumulative_id","player_name","teams_all","seasons_played","matches_played","runs","batting_average","batting_strike_rate","highest_score","wickets","best_bowling","economy"];
    saveCsv("acc-cumulative-filtered.csv", [cols, ...filtered.map(p=>cols.map(c=>String((p as any)[c]??"")))]);
  };

  const current = views.find(v=>v.id===view)!;
  const battingSR = totals.balls ? (totals.runs/totals.balls)*100 : 0;
  const bowlEcon = totals.ballsBowled ? (totals.runsConceded/(totals.ballsBowled/6)) : 0;

  return <div className="gd-app" data-theme={theme} ref={root} style={{ "--gd-panel-frost":"14px" } as CSSProperties}>
    <style>{dashboardStyles}</style>
    <img className="gd-background" src={BG} alt="" aria-hidden="true" fetchPriority="high" />
    <div className="gd-surround">
      <header className="gd-top">
        <div className="gd-brand"><span className="gd-logo" aria-hidden="true"><Trophy size={20}/></span><div><strong>ACC STATS</strong><small>Seasons 5â€“8 cumulative</small></div></div>
        <label className="gd-ask" style={{cursor:"text"}}>
          <span className="gd-orb" aria-hidden="true" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={current.prompt} aria-label="Search players" style={{flex:1,minWidth:0,border:0,background:"transparent",outline:"none",fontSize:12,fontWeight:750}} />
          <Search aria-hidden="true" className="gd-ask-search" />
        </label>
        <div className="gd-top-actions">
          <button type="button" className="gd-icon-button" aria-label={theme==="light"?"Switch to dark theme":"Switch to light theme"} onClick={()=>setTheme(theme==="light"?"dark":"light")}>{theme==="light"?<Moon aria-hidden="true"/>:<Sun aria-hidden="true"/>}</button>
          <button type="button" className="gd-icon-button" aria-label="Export filtered CSV" onClick={exportPlayers}><Download aria-hidden="true"/></button>
        </div>
      </header>

      <div className="gd-stage-wrap">
        <DockSide active={active} select={selectView} />
        <main className="gd-stage">
          <div className="gd-stage-scroll" ref={scrollArea}>
            <header className="gd-view-head">
              <div><h1>{current.label}</h1><p>{current.description}</p></div>
              <div className="gd-view-actions">
                <label className="gd-filter"><Filter aria-hidden="true" /><select aria-label="Team filter" value={team} onChange={e=>setTeam(e.target.value)}>{teams.map(t=><option key={t}>{t}</option>)}</select></label>
                <label className="gd-filter"><Filter aria-hidden="true" /><select aria-label="Season filter" value={season} onChange={e=>setSeason(e.target.value)}>{seasons.map(s=><option key={s} value={s}>{s==="All seasons"?s:`Season ${s}`}</option>)}</select></label>
              </div>
            </header>
            <div className="gd-content" ref={content} key={view}>
              {view==="overview" && <div className="gd-analytics">
                <div className="gd-metric-grid">
                  <Metric title="Players" icon={<Users/>} value={totals.players} detail="unique cumulative players" tone="teal" />
                  <Metric title="Total Runs" icon={<Trophy/>} value={totals.runs} detail={`${fmt(totals.fours)} fours Â· ${fmt(totals.sixes)} sixes`} />
                  <Metric title="Total Wickets" icon={<Target/>} value={totals.wickets} detail={`econ ${fmt2(bowlEcon)}`} />
                  <Metric title="Batting SR" icon={<Flame/>} value={battingSR} format={fmt2} detail={`${fmt(totals.inns)} batting innings`} />
                </div>
                <div className="gd-analytics-grid">
                  <Panel title="Season totals" subtitle="Runs and wickets by season (all matches)">
                    <div style={{display:"grid",gap:10}}>
                      {seasonBars.map(s=>{ const maxR=3221; return <div key={s.label} style={{display:"grid",gridTemplateColumns:"44px 1fr 1fr",gap:10,alignItems:"center"}}>
                        <strong style={{fontSize:12}}>{s.label}</strong>
                        <div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--gd-muted)"}}><span>Runs</span><span>{fmt(s.runs)}</span></div><div className="gd-mix-track" style={{height:7,marginTop:4}}><i className="gd-fill" data-tone="teal" style={{width:`${s.runs/maxR*100}%`}} /></div></div>
                        <div><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--gd-muted)"}}><span>Wickets</span><span>{fmt(s.wickets)}</span></div><div className="gd-mix-track" style={{height:7,marginTop:4}}><i className="gd-fill" data-tone="coral" style={{width:`${s.wickets/122*100}%`}} /></div></div>
                      </div>; })}
                    </div>
                  </Panel>
                  <Panel title="Top run scorers" subtitle="Cumulative S5â€“S8">
                    <BarList items={topRun} valueKey="runs" tone="teal" />
                  </Panel>
                </div>
                <Panel title="Top wicket takers" subtitle="Cumulative S5â€“S8">
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
                    <BarList items={topWkt.slice(0,4)} valueKey="wickets" tone="coral" />
                    <BarList items={topWkt.slice(4,8)} valueKey="wickets" tone="coral" />
                  </div>
                </Panel>
              </div>}

              {view==="batting" && <div className="gd-analytics">
                <div className="gd-metric-grid">
                  <Metric title="Runs" icon={<Trophy/>} value={totals.runs} tone="teal" />
                  <Metric title="Avg SR" icon={<Flame/>} value={battingSR} format={fmt2} />
                  <Metric title="Sixes" icon={<BarChart3/>} value={totals.sixes} />
                  <Metric title="Fours" icon={<BarChart3/>} value={totals.fours} />
                </div>
                <Panel title="Batting leaderboard" subtitle="Top 15 by selected metric" action={
                  <label className="gd-filter"><Filter aria-hidden="true"/><select value={sortBat} onChange={e=>setSortBat(e.target.value as SortKey)} aria-label="Sort batting">
                    <option value="runs">Runs</option><option value="batting_average">Average</option><option value="batting_strike_rate">Strike rate</option><option value="sixes">Sixes</option><option value="fours">Fours</option>
                  </select></label>
                }>
                  <div className="gd-table-scroll"><table>
                    <thead><tr><th>#</th><th>Player</th><th>Teams</th><th>Mat</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th></tr></thead>
                    <tbody>{batRows.map((p,i)=><tr key={p.acc_cumulative_id} onClick={()=>setSelected(p)} style={{cursor:"pointer"}}>
                      <td>{i+1}</td><td>{p.player_name}</td><td>{p.teams_all.replaceAll("|",", ")}</td><td>{p.matches_played}</td><td>{p.runs}</td><td>{p.highest_score}</td><td>{fmt2(p.batting_average)}</td><td>{fmt2(p.batting_strike_rate)}</td><td>{p.fours}</td><td>{p.sixes}</td>
                    </tr>)}</tbody>
                  </table></div>
                </Panel>
              </div>}

              {view==="bowling" && <div className="gd-analytics">
                <div className="gd-metric-grid">
                  <Metric title="Wickets" icon={<Target/>} value={totals.wickets} tone="teal" />
                  <Metric title="Economy" icon={<Shield/>} value={bowlEcon} format={fmt2} />
                  <Metric title="Runs Conceded" icon={<BarChart3/>} value={totals.runsConceded} />
                  <Metric title="Dots" icon={<BarChart3/>} value={filtered.reduce((s,p)=>s+p.dots,0)} />
                </div>
                <Panel title="Bowling leaderboard" subtitle="Top 15 by selected metric" action={
                  <label className="gd-filter"><Filter aria-hidden="true"/><select value={sortBowl} onChange={e=>setSortBowl(e.target.value as SortKey)} aria-label="Sort bowling">
                    <option value="wickets">Wickets</option><option value="economy">Economy</option><option value="bowling_average">Average</option><option value="matches_played">Matches</option>
                  </select></label>
                }>
                  <div className="gd-table-scroll"><table>
                    <thead><tr><th>#</th><th>Player</th><th>Teams</th><th>Mat</th><th>Ov</th><th>Wkts</th><th>BBI</th><th>Avg</th><th>Econ</th><th>Dots</th></tr></thead>
                    <tbody>{bowlRows.map((p,i)=><tr key={p.acc_cumulative_id} onClick={()=>setSelected(p)} style={{cursor:"pointer"}}>
                      <td>{i+1}</td><td>{p.player_name}</td><td>{p.teams_all.replaceAll("|",", ")}</td><td>{p.matches_played}</td><td>{p.overs_bowled}</td><td>{p.wickets}</td><td>{p.best_bowling||"-"}</td><td>{p.wickets?fmt2(p.bowling_average):"-"}</td><td>{fmt2(p.economy)}</td><td>{p.dots}</td>
                    </tr>)}</tbody>
                  </table></div>
                </Panel>
              </div>}

              {view==="players" && <div className="gd-analytics">
                <Panel title="All players" subtitle={`${filtered.length} players · click a row for details`} action={<button type="button" className="gd-secondary" onClick={exportPlayers}><Download aria-hidden="true"/>Export CSV</button>}>
                  <div className="gd-table-scroll"><table>
                    <thead><tr><th>ID</th><th>Player</th><th>Bat#</th><th>Bowl#</th><th>Fld#</th><th>Teams</th><th>S</th><th>Mat</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>Wkts</th><th>BBI</th><th>Econ</th></tr></thead>
                    <tbody>{filtered.map(p=><tr key={p.acc_cumulative_id} onClick={()=>setSelected(p)} style={{cursor:"pointer"}}>
                      <td>{p.acc_cumulative_id}</td><td>{p.player_name}</td><td>#{p.batting_rank}</td><td>#{p.bowling_rank}</td><td>#{p.fielding_rank}</td><td>{p.teams_all.replaceAll("|",", ")}</td><td>{p.seasons_played}</td><td>{p.matches_played}</td><td>{p.runs}</td><td>{p.highest_score}</td><td>{fmt2(p.batting_average)}</td><td>{fmt2(p.batting_strike_rate)}</td><td>{p.wickets}</td><td>{p.best_bowling||"-"}</td><td>{fmt2(p.economy)}</td>
                    </tr>)}</tbody>
                  </table></div>
                  {filtered.length===0 && <p className="gd-empty" role="status">No players match filters.</p>}
                </Panel>
              </div>}

              {view==="compare" && (() => {
                const a = PLAYERS.find(p=>p.acc_cumulative_id===cmpA) || PLAYERS[0];
                const b = PLAYERS.find(p=>p.acc_cumulative_id===cmpB) || PLAYERS[1];
                const extraOptions = [
                  { key: "matches_played", label: "Matches" },
                  { key: "fielding_dismissals", label: "Fielding dismissals" },
                  { key: "catches", label: "Catches" },
                  { key: "fours", label: "Fours" },
                  { key: "sixes", label: "Sixes" },
                  { key: "not_outs", label: "Not outs" },
                  { key: "batting_rank", label: "Batting rank" },
                  { key: "bowling_rank", label: "Bowling rank" },
                  { key: "fielding_rank", label: "Fielding rank" },
                ];
                const fmtVal = (key:string, p:Player) => {
                  const v:any = (p as any)[key];
                  if (key==="batting_average"||key==="batting_strike_rate"||key==="bowling_average"||key==="economy"||key==="bowling_strike_rate") return fmt2(Number(v||0));
                  if (key==="overs_bowled"||key==="best_bowling"||key==="highest_score") return String(v||"-");
                  if (key.includes("rank")) return `#${v}`;
                  return String(v??0);
                };
                const numVal = (key:string, p:Player) => {
                  const v:any = (p as any)[key];
                  if (key==="best_bowling") { const m=String(v||"0/0").match(/(\d+)\/(\d+)/); return m?Number(m[1])*1000-Number(m[2]):0; }
                  if (key==="highest_score") { return Number(String(v||"0").replace("*",""))||0; }
                  if (key.includes("rank")) return -Number(v||9999);
                  if (key==="bowling_average"||key==="economy"||key==="bowling_strike_rate") return -Number(v||99999);
                  return Number(v||0);
                };
                const metrics = [
                  { key: "runs", label: "Runs", group: "Batting" },
                  { key: "batting_average", label: "Batting Avg", group: "Batting" },
                  { key: "batting_strike_rate", label: "Strike Rate", group: "Batting" },
                  { key: "wickets", label: "Wickets", group: "Bowling" },
                  { key: "bowling_average", label: "Bowling Avg", group: "Bowling" },
                  { key: "economy", label: "Economy", group: "Bowling" },
                  { key: cmpExtra1, label: extraOptions.find(x=>x.key===cmpExtra1)?.label||cmpExtra1, group: "Extra" },
                  { key: cmpExtra2, label: extraOptions.find(x=>x.key===cmpExtra2)?.label||cmpExtra2, group: "Extra" },
                ];
                return <div className="gd-analytics">
                  <Panel title="Compare players" subtitle="8-metric head-to-head comparison" action={<div className="gd-table-tools">
                    <label className="gd-filter"><span style={{fontSize:11,color:"var(--gd-muted)"}}>A</span><select value={cmpA} onChange={e=>setCmpA(e.target.value)} aria-label="Player A">{PLAYERS.map(p=><option key={p.acc_cumulative_id} value={p.acc_cumulative_id}>{p.player_name}</option>)}</select></label>
                    <label className="gd-filter"><span style={{fontSize:11,color:"var(--gd-muted)"}}>B</span><select value={cmpB} onChange={e=>setCmpB(e.target.value)} aria-label="Player B">{PLAYERS.map(p=><option key={p.acc_cumulative_id} value={p.acc_cumulative_id}>{p.player_name}</option>)}</select></label>
                  </div>}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center",marginBottom:16}}>
                      <div style={{textAlign:"center",padding:12,border:"1px solid var(--gd-line)",borderRadius:14,background:"var(--gd-inner)"}}>
                        <strong style={{fontSize:16}}>{a.player_name}</strong>
                        <div style={{fontSize:11,color:"var(--gd-muted)",marginTop:4}}>{a.teams_all.replaceAll("|",", ")}</div>
                        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Bat #{a.batting_rank}</span><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Bowl #{a.bowling_rank}</span><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Fld #{a.fielding_rank}</span></div>
                      </div>
                      <div style={{fontWeight:800,color:"var(--gd-muted)"}}>VS</div>
                      <div style={{textAlign:"center",padding:12,border:"1px solid var(--gd-line)",borderRadius:14,background:"var(--gd-inner)"}}>
                        <strong style={{fontSize:16}}>{b.player_name}</strong>
                        <div style={{fontSize:11,color:"var(--gd-muted)",marginTop:4}}>{b.teams_all.replaceAll("|",", ")}</div>
                        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Bat #{b.batting_rank}</span><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Bowl #{b.bowling_rank}</span><span className="gd-metric" style={{minBlockSize:0,padding:"4px 8px",fontSize:11}}>Fld #{b.fielding_rank}</span></div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      <label className="gd-filter"><span style={{fontSize:11,color:"var(--gd-muted)"}}>Extra 1</span><select value={cmpExtra1} onChange={e=>setCmpExtra1(e.target.value)}>{extraOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
                      <label className="gd-filter"><span style={{fontSize:11,color:"var(--gd-muted)"}}>Extra 2</span><select value={cmpExtra2} onChange={e=>setCmpExtra2(e.target.value)}>{extraOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
                    </div>
                    <div style={{display:"grid",gap:8}}>
                      {metrics.map(m => {
                        const av=numVal(m.key,a); const bv=numVal(m.key,b);
                        const aWins = av>bv; const bWins = bv>av;
                        const max=Math.max(Math.abs(Number((a as any)[m.key])||0), Math.abs(Number((b as any)[m.key])||0), 1);
                        const aRaw = Math.abs(Number((a as any)[m.key])||0);
                        const bRaw = Math.abs(Number((b as any)[m.key])||0);
                        return <div key={m.key} style={{display:"grid",gridTemplateColumns:"1fr 140px 1fr",gap:10,alignItems:"center"}}>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:aWins?800:600,fontSize:13,color:aWins?"var(--gd-teal)":"var(--gd-ink)"}}>{fmtVal(m.key,a)}</div>
                            <div className="gd-mix-track" style={{marginTop:4,height:6}}><div style={{display:"flex",justifyContent:"flex-end"}}><i className="gd-fill" data-tone={aWins?"teal":"ink"} style={{width:`${(aRaw/max)*100}%`}} /></div></div>
                          </div>
                          <div style={{textAlign:"center"}}><div style={{fontSize:11,fontWeight:750}}>{m.label}</div><div style={{fontSize:9,color:"var(--gd-muted)"}}>{m.group}</div></div>
                          <div>
                            <div style={{fontWeight:bWins?800:600,fontSize:13,color:bWins?"var(--gd-teal)":"var(--gd-ink)"}}>{fmtVal(m.key,b)}</div>
                            <div className="gd-mix-track" style={{marginTop:4,height:6}}><i className="gd-fill" data-tone={bWins?"teal":"ink"} style={{width:`${(bRaw/max)*100}%`}} /></div>
                          </div>
                        </div>;
                      })}
                    </div>
                  </Panel>
                </div>;
              })()}
            </div>
          </div>
        </main>
        <Dock active={active} select={selectView} />
      </div>
      <footer className="gd-footer"><span>ACC Seasons 5–8 · {fmt(PLAYERS.length)} players · 96 matches</span></footer>
    </div>
    {selected && <PlayerDialog player={selected} onClose={()=>setSelected(null)} />}
  </div>;
}

const dashboardStyles = `
.gd-app {
  --gd-ink: #25201e; --gd-muted: #423731; --gd-line: rgb(74 49 33 / 15%); --gd-grid: rgb(74 49 33 / 19%);
  --gd-rim: rgb(255 253 246 / 51%); --gd-edge-light: rgb(255 254 247 / 84%); --gd-edge-shade: rgb(57 40 28 / 19%);
  --gd-gloss: rgb(255 251 242 / 45%); --gd-frame: rgb(247 234 219 / 23%); --gd-rail: rgb(241 222 206 / 48%);
  --gd-card: rgb(250 242 232 / 46%); --gd-card-light: rgb(255 251 245 / 34%); --gd-raised: rgb(255 249 243 / 81%);
  --gd-inner: rgb(255 250 245 / 37%); --gd-surface: #f6ece2; --gd-track: rgb(81 49 32 / 14%);
  --gd-primary: #261e1b; --gd-primary-ink: #fffaf5; --gd-pick: #fff9f3; --gd-pick-ink: #241b17;
  --gd-coral: #a43c27; --gd-teal: #09644f; --gd-ochre: #996300; --gd-graph-ink: #40332d; --gd-focus: #194b48; --gd-dark-shadow: 35 21 14;
  inline-size:100%; min-inline-size:0; flex:1 1 100%; position:relative; isolation:isolate; min-block-size:100svh; background:#ab8e76; color:var(--gd-ink); color-scheme:light;
  font-family:"Manrope Variable",Manrope,system-ui,sans-serif; font-size:13px; font-weight:550; font-variant-numeric:tabular-nums;
}
.gd-app[data-theme="dark"] {
  --gd-ink:#fff6e9; --gd-muted:#e5d5c7; --gd-line:rgb(243 221 198 / 19%); --gd-grid:rgb(243 221 198 / 19%);
  --gd-rim:rgb(255 236 212 / 31%); --gd-edge-light:rgb(255 242 225 / 49%); --gd-edge-shade:rgb(11 6 5 / 30%);
  --gd-gloss:rgb(255 237 213 / 13%); --gd-frame:rgb(42 31 29 / 52%); --gd-rail:rgb(45 32 30 / 59%);
  --gd-card:rgb(47 36 34 / 53%); --gd-card-light:rgb(106 88 81 / 30%); --gd-raised:rgb(80 67 61 / 82%);
  --gd-inner:rgb(78 61 56 / 49%); --gd-surface:#3b302c; --gd-track:rgb(245 226 212 / 16%);
  --gd-primary:#f3ddca; --gd-primary-ink:#231a16; --gd-pick:#f9eee0; --gd-pick-ink:#241b17;
  --gd-coral:#ff9177; --gd-teal:#75dac0; --gd-ochre:#f1be58; --gd-graph-ink:#e7d9cd; --gd-focus:#f9bf9b; --gd-dark-shadow:10 4 3;
  background:#40322b; color-scheme:dark;
}
.gd-app *, .gd-app *::before, .gd-app *::after { box-sizing:border-box; }
.gd-app :where(button,input,select){ color:inherit; font:inherit; }
.gd-app :where(button,a,input,select):focus-visible{ outline:2px solid var(--gd-focus); outline-offset:3px; }
.gd-app a{ color:inherit; text-decoration:none; } .gd-app button{ cursor:pointer; }
.gd-app :where(h1,h2,h3,p,figure){ margin:0; } .gd-app svg{ flex:none; }
.gd-sr{ position:absolute; inline-size:1px; block-size:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.gd-background,.gd-app::before{ position:fixed; z-index:-2; inset:0; inline-size:100%; block-size:100%; pointer-events:none; }
.gd-background{ object-fit:cover; object-position:center 40%; filter:sepia(.18) saturate(.72) brightness(.72); }
.gd-app::before{ content:""; z-index:-1; background:linear-gradient(116deg,rgb(73 48 37 / 35%),transparent 43%,rgb(162 101 63 / 24%) 76%,transparent 100%),linear-gradient(0deg,rgb(53 33 25 / 34%),transparent 58%); }
.gd-app[data-theme="dark"] .gd-background{ filter:sepia(.12) saturate(.65) brightness(.48); }
.gd-surround{ inline-size:min(calc(100% - 100px),1380px); margin-inline:auto; padding-block:24px 8px; }
.gd-top,.gd-dock{ border:1px solid var(--gd-rim); background:linear-gradient(165deg,var(--gd-gloss),transparent 32% 73%,var(--gd-gloss)),var(--gd-rail); box-shadow:inset 1px 1px 1px var(--gd-edge-light),inset -1px -1px 1px var(--gd-edge-shade),inset 0 -2px 5px var(--gd-gloss),0 7px 20px rgb(var(--gd-dark-shadow) / 17%); backdrop-filter:blur(15px) saturate(1.35); -webkit-backdrop-filter:blur(15px) saturate(1.35); }
.gd-top{ display:grid; grid-template-columns:minmax(0,1fr) minmax(240px,400px) minmax(0,1fr); align-items:center; gap:12px; min-block-size:60px; border-radius:999px; padding:6px 9px 6px 13px; }
.gd-brand{ display:flex; align-items:center; gap:10px; min-inline-size:0; padding-inline-start:3px; }
.gd-logo{ inline-size:35px; block-size:35px; display:grid; place-items:center; border-radius:50%; background:var(--gd-pick); color:var(--gd-pick-ink); box-shadow:inset 0 0 0 1px var(--gd-gloss),0 2px 7px rgb(var(--gd-dark-shadow) / 12%); }
.gd-brand strong{ display:block; font-size:12px; letter-spacing:.17em; line-height:1.1; font-weight:850; }
.gd-brand small{ display:block; margin-block-start:3px; font-size:10px; color:var(--gd-muted); }
.gd-ask{ position:relative; display:flex; align-items:center; gap:10px; min-block-size:43px; max-inline-size:100%; border:1px solid var(--gd-line); border-radius:999px; background:var(--gd-inner); box-shadow:inset 0 1px 0 var(--gd-gloss); padding:4px 13px 4px 9px; text-align:start; }
.gd-ask:hover,.gd-icon-button:hover{ background:var(--gd-raised); }
.gd-orb{ flex:none; inline-size:25px; block-size:25px; border-radius:50%; background:radial-gradient(ellipse at 32% 24%,#faf7fe 5%,#72ecf1 25%,transparent 58%),radial-gradient(ellipse at 67% 54%,#e1b7f9,#815add 55%,#353467 79%); box-shadow:inset 0 0 0 .75px rgb(246 245 255 / 75%),inset 0 -2px 5px #604db4,0 0 0 3px rgb(91 70 115 / 13%),0 2px 8px rgb(71 46 113 / 35%); }
.gd-ask-search{ margin-inline-start:auto; width:15px; height:15px; color:var(--gd-muted); }
.gd-top-actions{ display:flex; justify-content:flex-end; gap:6px; }
.gd-icon-button{ position:relative; min-inline-size:44px; min-block-size:44px; display:inline-grid; place-items:center; border-radius:999px; border:1px solid var(--gd-line); padding:0; background:var(--gd-inner); }
.gd-icon-button svg{ width:17px; height:17px; stroke-width:1.75; }
.gd-stage-wrap{ position:relative; margin-block:11px 0; }
.gd-stage{ color:var(--gd-ink); border:1px solid var(--gd-rim); border-radius:34px; background:linear-gradient(148deg,var(--gd-gloss),transparent 19% 77%,color-mix(in srgb,var(--gd-gloss) 48%,transparent)),var(--gd-frame); box-shadow:inset 1px 1px 1px var(--gd-edge-light),inset -1px -1px 1px var(--gd-edge-shade),inset 0 0 7px var(--gd-gloss),0 1px 3px rgb(var(--gd-dark-shadow) / 17%),0 22px 72px rgb(var(--gd-dark-shadow) / 22%); backdrop-filter:blur(var(--gd-panel-frost,12px)) saturate(1.24); -webkit-backdrop-filter:blur(var(--gd-panel-frost,12px)) saturate(1.24); }
.gd-stage-scroll{ block-size:max(605px,min(865px,calc(100svh - 165px))); overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:var(--gd-line) transparent; border-radius:inherit; padding:clamp(19px,2.15vw,35px) clamp(25px,3.2vw,49px) 41px; }
.gd-view-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px 22px; margin-block-end:19px; }
.gd-view-head h1{ font-size:clamp(29px,3.35vw,49px); font-weight:760; line-height:1.03; letter-spacing:-.062em; }
.gd-view-head p{ color:var(--gd-muted); font-size:13px; margin-block-start:8px; }
.gd-view-actions{ display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:7px; }
.gd-primary,.gd-secondary{ display:inline-flex; justify-content:center; align-items:center; gap:7px; min-block-size:40px; padding:7px 12px; font-size:11.5px; font-weight:790; line-height:1.2; border-radius:999px; border:1px solid transparent; }
.gd-primary{ background:var(--gd-primary); color:var(--gd-primary-ink); } .gd-secondary{ background:var(--gd-raised); border-color:var(--gd-rim); color:var(--gd-ink); }
.gd-content{ min-inline-size:0; }
.gd-analytics,.gd-metric-grid,.gd-analytics-grid{ display:grid; gap:12px; } .gd-metric-grid{ grid-template-columns:repeat(4,minmax(0,1fr)); } .gd-analytics-grid{ grid-template-columns:minmax(0,1.75fr) minmax(0,1fr); }
.gd-panel,.gd-metric{ min-inline-size:0; border:1px solid var(--gd-rim); border-radius:20px; background:linear-gradient(144deg,var(--gd-card-light),transparent 66%),var(--gd-card); box-shadow:inset 0 1px 1px var(--gd-edge-light),inset 0 -1px 1px var(--gd-edge-shade),0 6px 18px rgb(var(--gd-dark-shadow) / 9%); }
.gd-panel{ padding:15px 16px; } .gd-panel-head{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:7px 12px; margin-block-end:12px; }
.gd-panel-head h2{ font-size:14px; font-weight:810; letter-spacing:-.024em; } .gd-panel-head p{ font-size:11px; color:var(--gd-muted); margin-block-start:3px; }
.gd-metric{ display:flex; flex-direction:column; justify-content:space-between; min-block-size:112px; padding:11px 12px; }
.gd-metric[data-tone="teal"]{ --gd-coral:#ffc8b8; --gd-teal:#b8f1dd; --gd-muted:#e4f5ef; color:#fff; border-color:rgb(196 248 231 / 55%); background:radial-gradient(ellipse at 5% -20%,#3a9381,transparent 68%),linear-gradient(145deg,#1e7461,#08443a); box-shadow:inset 0 1px 2px rgb(214 252 240 / 45%),0 6px 14px rgb(19 78 64 / 17%); }
.gd-metric-head{ display:flex; justify-content:space-between; align-items:center; gap:4px; min-inline-size:0; font-size:11px; font-weight:740; }
.gd-metric-icon{ display:grid; place-items:center; flex:none; color:inherit; inline-size:28px; block-size:28px; border-radius:10px; background:var(--gd-inner); box-shadow:inset 0 1px 0 var(--gd-gloss); }
.gd-metric[data-tone="teal"] .gd-metric-icon{ background:rgb(235 255 247 / 16%); }
.gd-metric-value{ display:block; font-size:clamp(22px,2.35vw,35px); line-height:1.05; margin-block:3px 7px; letter-spacing:-.052em; font-weight:815; }
.gd-metric-caption{ display:flex; flex-wrap:wrap; align-items:center; gap:4px; color:var(--gd-muted); font-size:10px; font-weight:680; }
.gd-table-tools{ display:flex; flex-wrap:wrap; align-items:center; gap:7px; max-inline-size:100%; }
.gd-search,.gd-filter{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--gd-line); border-radius:10px; background:var(--gd-inner); min-block-size:35px; padding:0 8px; }
.gd-search svg,.gd-filter svg{ width:13px; height:13px; color:var(--gd-muted); }
.gd-filter select{ border:0; background:transparent; padding:5px 0; min-inline-size:0; font-size:11px; }
.gd-filter select option{ color:var(--gd-ink); background:var(--gd-surface); }
.gd-table-scroll{ max-inline-size:100%; overflow:auto; scrollbar-width:thin; }
.gd-table-scroll table{ inline-size:100%; border-spacing:0; text-align:start; }
.gd-table-scroll th,.gd-table-scroll td{ padding:9px 10px; text-align:start; }
.gd-table-scroll th{ background:var(--gd-inner); font-size:10px; color:var(--gd-muted); font-weight:800; white-space:nowrap; }
.gd-table-scroll td{ white-space:nowrap; font-size:11px; }
.gd-table-scroll td:first-child{ font-weight:750; }
.gd-table-scroll tr + tr td{ border-top:1px solid var(--gd-line); }
.gd-table-scroll tbody tr:hover{ background:var(--gd-inner); }
.gd-empty{ padding:12px 3px; color:var(--gd-muted); font-size:12px; }
.gd-mix-track{ display:block; height:7px; border-radius:999px; overflow:hidden; background:var(--gd-track); }
.gd-mix-track .gd-fill{ display:block; block-size:100%; border-radius:inherit; background:var(--gd-series); transform-origin:left center; }
.gd-app [data-tone="ink"]{ --gd-series:var(--gd-graph-ink); } .gd-app [data-tone="coral"]{ --gd-series:var(--gd-coral); } .gd-app [data-tone="teal"]{ --gd-series:var(--gd-teal); } .gd-app [data-tone="ochre"]{ --gd-series:var(--gd-ochre); }
.gd-dock{ position:absolute; z-index:3; display:flex; align-items:center; gap:3px; padding:4px; border-radius:999px; }
.gd-dock-side{ flex-direction:column; left:-24px; top:clamp(66px,16vh,153px); }
.gd-dock-bottom{ left:50%; bottom:-24px; translate:-50% 0; }
.gd-dock a{ z-index:1; position:relative; display:flex; gap:6px; justify-content:center; align-items:center; min-inline-size:44px; min-block-size:44px; padding:0 13px; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; }
.gd-dock-side a{ padding:0; } .gd-dock a svg{ width:16px; height:16px; stroke-width:1.9; }
.gd-dock a[aria-current="page"]{ color:var(--gd-pick-ink); } .gd-dock a:not([aria-current="page"]):hover{ background:var(--gd-inner); }
.gd-dock-indicator{ position:absolute; inset:0 auto auto 0; pointer-events:none; visibility:hidden; border-radius:999px; background:var(--gd-pick); box-shadow:inset 0 1px 0 white,0 2px 7px rgb(var(--gd-dark-shadow) / 16%); }
.gd-dock-indicator[data-ready="true"]{ visibility:visible; transition:transform .36s cubic-bezier(.24,.89,.26,1),width .36s cubic-bezier(.24,.89,.26,1),height .36s cubic-bezier(.24,.89,.26,1); }
.gd-dock-side .gd-dock-text,.gd-dock-short{ display:none; }
.gd-dock-tip{ display:none; position:absolute; left:calc(100% + 7px); z-index:1; pointer-events:none; color:var(--gd-ink); background:var(--gd-surface); padding:6px 9px; border:1px solid var(--gd-rim); border-radius:7px; box-shadow:0 3px 8px rgb(var(--gd-dark-shadow) / 17%); }
.gd-dock-side a:is(:hover,:focus-visible) .gd-dock-tip{ display:inline; }
.gd-footer{ padding:33px 3px 1px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
.gd-footer > *{ border-radius:999px; padding:5px 8px; color:var(--gd-ink); font-size:10px; font-weight:740; background:var(--gd-raised); min-block-size:24px; display:flex; align-items:center; gap:4px; }
.gd-footer a svg{ width:10px; height:10px; }
.gd-dialog{ max-inline-size:min(calc(100% - 26px),720px); inline-size:100%; border-radius:23px; border:1px solid var(--gd-rim); color:var(--gd-ink); padding:0; background:var(--gd-surface); box-shadow:0 20px 80px rgb(var(--gd-dark-shadow) / 38%); }
.gd-dialog::backdrop{ background:rgb(30 21 17 / 43%); backdrop-filter:blur(5px); }
.gd-dialog-inner{ padding:18px; } .gd-dialog-inner > header{ display:flex; gap:10px; align-items:center; justify-content:space-between; margin-bottom:13px; }
.gd-dialog-inner h2{ font-size:24px; font-weight:830; letter-spacing:-.045em; }
.gd-work-facts{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
.gd-work-facts div{ border:1px solid var(--gd-line); border-radius:9px; padding:8px; }
.gd-work-facts dt{ font-size:11px; color:var(--gd-muted); } .gd-work-facts dd{ margin:4px 0 0; font-weight:790; font-size:12px; }
@media (max-width:1060px){ .gd-surround{ inline-size:calc(100% - 74px); } .gd-stage-scroll{ padding-inline:29px; } .gd-analytics-grid{ grid-template-columns:minmax(0,1fr); } }
@media (max-width:760px){
  .gd-surround{ padding-top:11px; padding-bottom:calc(73px + env(safe-area-inset-bottom)); inline-size:calc(100% - 24px); }
  .gd-top{ grid-template-columns:minmax(0,1fr) auto; padding:7px 9px; gap:6px 12px; border-radius:21px; }
  .gd-ask{ grid-area:2/1/3/-1; min-block-size:41px; } .gd-top-actions{ grid-area:1/2; }
  .gd-stage{ border-radius:23px; } .gd-stage-scroll{ block-size:auto; padding:15px 13px 17px; overflow:visible; }
  .gd-view-head{ align-items:flex-start; flex-direction:column; gap:10px; margin-bottom:14px; }
  .gd-metric-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } .gd-dock-side{ display:none; }
  .gd-dock-bottom{ position:fixed; inset:auto 11px calc(9px + env(safe-area-inset-bottom)); translate:none; justify-content:space-between; }
  .gd-dock-bottom a{ flex:1; flex-direction:column; gap:2px; padding:3px 5px; min-block-size:47px; line-height:1.2; font-size:9.5px; }
  .gd-dock-bottom .gd-dock-text{ display:none; } .gd-dock-bottom .gd-dock-short{ display:inline; }
}
@media (prefers-reduced-motion: reduce){ .gd-app *, .gd-app *::before, .gd-app *::after{ animation-duration:.01ms !important; transition-duration:.01ms !important; } }
`;

