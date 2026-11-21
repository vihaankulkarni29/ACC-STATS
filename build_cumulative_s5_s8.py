import csv, json, os, math
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))
SEASONS = [
    {"season": 5, "label": "ACC Season 5", "file": os.path.join(ROOT, "ACC Season 5", "ACC5_Season5_Definitive_Player_Scorecard.csv"), "manifest": os.path.join(ROOT, "ACC Season 5", "matches_manifest.csv")},
    {"season": 6, "label": "ACC Season 6", "file": os.path.join(ROOT, "ACC Season 6", "ACC6_Season6_Definitive_Player_Scorecard.csv"), "manifest": os.path.join(ROOT, "ACC Season 6", "matches_manifest.csv")},
    {"season": 7, "label": "ACC Season 7", "file": os.path.join(ROOT, "ACC7_Season7_Definitive_Player_Scorecard.csv"), "manifest": os.path.join(ROOT, "matches_manifest.csv")},
    {"season": 8, "label": "ACC Season 8", "file": os.path.join(ROOT, "ACC Season 8", "ACC8_Season8_Definitive_Player_Scorecard.csv"), "manifest": os.path.join(ROOT, "ACC Season 8", "matches_manifest.csv")},
]

SUM_FIELDS = [
    "matches_played","bat_innings","not_outs","runs","balls_faced","fours","sixes","ducks",
    "30s","50s","100s","bowl_innings","maidens","runs_conceded","wickets","wides","no_balls","dots",
    "3_wicket_hauls","5_wicket_hauls"
]
INT_FIELDS = set(SUM_FIELDS)

def to_int(x):
    try:
        if x is None or x == "":
            return 0
        return int(float(x))
    except Exception:
        return 0

def to_float(x):
    try:
        if x is None or x == "":
            return 0.0
        return float(x)
    except Exception:
        return 0.0

def parse_overs_to_balls(overs_str):
    # format O.B where B is balls in over (0-5)
    if overs_str is None or overs_str == "":
        return 0
    s = str(overs_str).strip()
    if s == "":
        return 0
    if "." in s:
        o, b = s.split(".", 1)
        oi = to_int(o)
        bi = to_int(b)
        # CricHeroes uses .0-.5 as balls, but be defensive
        if bi > 5:
            # maybe decimal overs; unlikely, treat as balls? fallback
            bi = 0
        return oi * 6 + bi
    return to_int(s) * 6

def balls_to_overs(balls):
    balls = int(balls)
    return f"{balls // 6}.{balls % 6}"

def parse_highest(hs):
    s = str(hs or "").strip()
    not_out = s.endswith("*")
    num = s[:-1] if not_out else s
    return to_int(num), not_out

def format_highest(runs, not_out):
    return f"{int(runs)}{'*' if not_out else ''}"

def parse_best_bowling(bb):
    s = str(bb or "").strip()
    if not s:
        return None
    if "/" in s:
        w, r = s.split("/", 1)
        return (to_int(w), to_int(r))
    return None

def format_best_bowling(bb):
    if not bb:
        return ""
    return f"{bb[0]}/{bb[1]}"

def norm_name(name):
    return " ".join(str(name or "").strip().lower().split())

def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def read_manifest_ids(path):
    if not os.path.exists(path):
        return set()
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    ids = set()
    for r in rows:
        mid = r.get("match_id") or r.get("id")
        if mid:
            ids.add(str(mid).strip())
    return ids

def main():
    qa = {
        "seasons": [],
        "identity_conflicts": {"same_id_different_names": [], "same_name_different_ids": []},
        "missing_cricheroes_player_id": [],
        "totals_reconciliation": {},
        "match_integrity": {"player_season_mismatch": [], "unknown_match_ids": []},
        "anomalies": [],
    }
    metadata = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "rules_version": "acc-cumulative-s5-s8-v1",
        "seasons": [s["season"] for s in SEASONS],
        "sources": [],
    }

    breakdown_rows = []
    season_totals = {f: 0 for f in SUM_FIELDS}
    season_totals["balls_bowled"] = 0
    all_manifest_ids = {}  # season -> set

    for s in SEASONS:
        path = s["file"]
        manifest_ids = read_manifest_ids(s["manifest"])
        all_manifest_ids[s["season"]] = manifest_ids
        rows = read_csv(path)
        metadata["sources"].append({"season": s["season"], "label": s["label"], "file": os.path.relpath(path, ROOT), "manifest": os.path.relpath(s["manifest"], ROOT), "rows": len(rows)})
        qa["seasons"].append({"season": s["season"], "file": os.path.relpath(path, ROOT), "players": len(rows), "manifest_matches": len(manifest_ids)})

        for r in rows:
            cid = str(r.get("cricheroes_player_id") or "").strip()
            if not cid:
                qa["missing_cricheroes_player_id"].append({"season": s["season"], "season_player_id": r.get("player_id"), "name": r.get("player_name")})
            name = str(r.get("player_name") or "").strip()
            match_ids = [m.strip() for m in str(r.get("match_ids") or "").split("|") if m.strip()]
            balls_bowled = parse_overs_to_balls(r.get("overs_bowled"))

            # per-row totals for reconciliation
            for f in SUM_FIELDS:
                season_totals[f] += to_int(r.get(f))
            season_totals["balls_bowled"] += balls_bowled

            # match integrity
            mp = to_int(r.get("matches_played"))
            if len(set(match_ids)) != mp:
                qa["match_integrity"]["player_season_mismatch"].append({
                    "season": s["season"], "cricheroes_player_id": cid, "name": name,
                    "matches_played": mp, "distinct_match_ids": len(set(match_ids))
                })
            if manifest_ids:
                unknown = [m for m in match_ids if m not in manifest_ids]
                if unknown:
                    qa["match_integrity"]["unknown_match_ids"].append({
                        "season": s["season"], "cricheroes_player_id": cid, "name": name, "unknown": unknown[:10], "unknown_count": len(unknown)
                    })

            b = {k: r.get(k) for k in r.keys()}
            b["season"] = s["season"]
            b["season_label"] = s["label"]
            b["balls_bowled"] = balls_bowled
            b["_match_ids_list"] = match_ids
            breakdown_rows.append(b)

    # identity conflict checks across all seasons
    id_to_names = defaultdict(Counter)
    name_to_ids = defaultdict(set)
    for b in breakdown_rows:
        cid = str(b.get("cricheroes_player_id") or "").strip()
        name = str(b.get("player_name") or "").strip()
        if cid:
            id_to_names[cid][name] += 1
        if norm_name(name):
            name_to_ids[norm_name(name)].add(cid)
    for cid, names in id_to_names.items():
        if len([n for n in names if n]) > 1:
            qa["identity_conflicts"]["same_id_different_names"].append({"cricheroes_player_id": cid, "name_variants": dict(names)})
    for nname, ids in name_to_ids.items():
        real_ids = {i for i in ids if i}
        if len(real_ids) > 1:
            # report with display names
            displays = sorted({b.get("player_name","").strip() for b in breakdown_rows if norm_name(b.get("player_name")) == nname})
            qa["identity_conflicts"]["same_name_different_ids"].append({"normalized_name": nname, "display_names": displays, "cricheroes_player_ids": sorted(real_ids)})

    # build cumulative
    cum = {}
    for b in breakdown_rows:
        cid = str(b.get("cricheroes_player_id") or "").strip()
        if not cid:
            # should not happen; isolate by synthetic key
            cid = f"__missing__:{norm_name(b.get('player_name'))}:{b.get('season')}:{b.get('player_id')}"
            qa["anomalies"].append({"type": "missing_cid_synthetic_key", "key": cid})
        p = cum.get(cid)
        if not p:
            p = {
                "cricheroes_player_id": str(b.get("cricheroes_player_id") or "").strip(),
                "name_counts": Counter(),
                "name_variants": set(),
                "teams": set(),
                "seasons": set(),
                "season_player_ids": {},
                "matches_by_season": {5:0,6:0,7:0,8:0},
                "match_ids": set(),
                "balls_bowled": 0,
                "highest_runs": 0,
                "highest_not_out": False,
                "best_bowling": None, # (w,r)
            }
            for f in SUM_FIELDS:
                p[f] = 0
            cum[cid] = p

        name = str(b.get("player_name") or "").strip()
        if name:
            p["name_counts"][name] += 1
            p["name_variants"].add(name)
        teams = [t.strip() for t in str(b.get("team(s)") or "").split("|") if t.strip()]
        p["teams"].update(teams)
        season = int(b.get("season"))
        p["seasons"].add(season)
        p["season_player_ids"][season] = b.get("player_id")
        p["matches_by_season"][season] += to_int(b.get("matches_played"))
        for mid in b.get("_match_ids_list", []):
            p["match_ids"].add(mid)

        for f in SUM_FIELDS:
            p[f] += to_int(b.get(f))
        p["balls_bowled"] += int(b.get("balls_bowled") or 0)

        hs_runs, hs_no = parse_highest(b.get("highest_score"))
        if hs_runs > p["highest_runs"] or (hs_runs == p["highest_runs"] and hs_no and not p["highest_not_out"]):
            p["highest_runs"] = hs_runs
            p["highest_not_out"] = hs_no

        bb = parse_best_bowling(b.get("best_bowling"))
        if bb:
            if p["best_bowling"] is None or bb[0] > p["best_bowling"][0] or (bb[0] == p["best_bowling"][0] and bb[1] < p["best_bowling"][1]):
                p["best_bowling"] = bb

    # finalize cumulative rows
    cumulative_rows = []
    cum_totals = {f: 0 for f in SUM_FIELDS}
    cum_totals["balls_bowled"] = 0
    for cid, p in cum.items():
        runs = p["runs"]
        balls_faced = p["balls_faced"]
        bat_innings = p["bat_innings"]
        not_outs = p["not_outs"]
        wickets = p["wickets"]
        runs_conceded = p["runs_conceded"]
        balls_bowled = p["balls_bowled"]

        dismissals = bat_innings - not_outs
        if dismissals > 0:
            bat_avg = round(runs / dismissals, 2)
        elif bat_innings > 0 and not_outs == bat_innings:
            bat_avg = round(float(runs), 2)
        else:
            bat_avg = 0.0
        bat_sr = round((runs / balls_faced) * 100, 2) if balls_faced > 0 else 0.0
        bowl_avg = round(runs_conceded / wickets, 2) if wickets > 0 else 0.0
        econ = round(runs_conceded / (balls_bowled / 6), 2) if balls_bowled > 0 else 0.0
        bowl_sr = round(balls_bowled / wickets, 2) if wickets > 0 else 0.0

        canonical_name = p["name_counts"].most_common(1)[0][0] if p["name_counts"] else ""
        seasons_played = sorted(p["seasons"])
        row = {
            "cricheroes_player_id": p["cricheroes_player_id"],
            "player_name": canonical_name,
            "name_variants": "|".join(sorted(p["name_variants"])),
            "teams_all": "|".join(sorted(p["teams"])),
            "seasons_played": len(seasons_played),
            "season_list": "|".join(str(s) for s in seasons_played),
            "matches_played": p["matches_played"],
            "matches_s5": p["matches_by_season"][5],
            "matches_s6": p["matches_by_season"][6],
            "matches_s7": p["matches_by_season"][7],
            "matches_s8": p["matches_by_season"][8],
            "played_s5": 1 if p["matches_by_season"][5] > 0 else 0,
            "played_s6": 1 if p["matches_by_season"][6] > 0 else 0,
            "played_s7": 1 if p["matches_by_season"][7] > 0 else 0,
            "played_s8": 1 if p["matches_by_season"][8] > 0 else 0,
            "bat_innings": bat_innings,
            "not_outs": not_outs,
            "runs": runs,
            "balls_faced": balls_faced,
            "highest_score": format_highest(p["highest_runs"], p["highest_not_out"]),
            "batting_average": bat_avg,
            "batting_strike_rate": bat_sr,
            "fours": p["fours"],
            "sixes": p["sixes"],
            "ducks": p["ducks"],
            "30s": p["30s"],
            "50s": p["50s"],
            "100s": p["100s"],
            "bowl_innings": p["bowl_innings"],
            "overs_bowled": balls_to_overs(balls_bowled),
            "balls_bowled": balls_bowled,
            "maidens": p["maidens"],
            "runs_conceded": runs_conceded,
            "wickets": wickets,
            "best_bowling": format_best_bowling(p["best_bowling"]),
            "bowling_average": bowl_avg,
            "economy": econ,
            "bowling_strike_rate": bowl_sr,
            "wides": p["wides"],
            "no_balls": p["no_balls"],
            "dots": p["dots"],
            "3_wicket_hauls": p["3_wicket_hauls"],
            "5_wicket_hauls": p["5_wicket_hauls"],
            "season_player_ids": "|".join(f"S{s}:{p['season_player_ids'][s]}" for s in seasons_played if s in p["season_player_ids"]),
            "match_ids_all": "|".join(sorted(p["match_ids"], key=lambda x: int(x) if str(x).isdigit() else str(x))),
        }
        cumulative_rows.append(row)
        for f in SUM_FIELDS:
            cum_totals[f] += row[f]
        cum_totals["balls_bowled"] += balls_bowled

    cumulative_rows.sort(key=lambda r: (-r["runs"], -r["wickets"], -r["batting_strike_rate"], r["player_name"].lower()))
    for i, r in enumerate(cumulative_rows, start=1):
        r["acc_cumulative_id"] = f"ACC-C{i:03d}"

    # order columns
    cum_cols = [
        "acc_cumulative_id","cricheroes_player_id","player_name","name_variants","teams_all",
        "seasons_played","season_list","matches_played","matches_s5","matches_s6","matches_s7","matches_s8",
        "played_s5","played_s6","played_s7","played_s8",
        "bat_innings","not_outs","runs","balls_faced","highest_score","batting_average","batting_strike_rate",
        "fours","sixes","ducks","30s","50s","100s",
        "bowl_innings","overs_bowled","balls_bowled","maidens","runs_conceded","wickets","best_bowling",
        "bowling_average","economy","bowling_strike_rate","wides","no_balls","dots","3_wicket_hauls","5_wicket_hauls",
        "season_player_ids","match_ids_all"
    ]

    # breakdown columns: keep original + season fields
    # original columns in same order as source
    src_cols = [
        "player_id","cricheroes_player_id","player_name","team(s)","matches_played","bat_innings","not_outs","runs","balls_faced","highest_score","batting_average","batting_strike_rate","fours","sixes","ducks","30s","50s","100s","bowl_innings","overs_bowled","maidens","runs_conceded","wickets","best_bowling","bowling_average","economy","bowling_strike_rate","wides","no_balls","dots","3_wicket_hauls","5_wicket_hauls","match_ids"
    ]
    bd_cols = ["season","season_label"] + src_cols + ["balls_bowled"]

    # QA reconciliation
    mismatches = []
    for f in SUM_FIELDS + ["balls_bowled"]:
        sv = season_totals.get(f, 0)
        cv = cum_totals.get(f, 0)
        if sv != cv:
            mismatches.append({"field": f, "season_sum": sv, "cumulative_sum": cv})
    qa["totals_reconciliation"] = {
        "season_sum": season_totals,
        "cumulative_sum": cum_totals,
        "mismatches": mismatches,
        "ok": len(mismatches) == 0,
    }
    qa["counts"] = {
        "breakdown_rows": len(breakdown_rows),
        "expected_breakdown_rows": sum(len(read_csv(s["file"])) for s in SEASONS),
        "cumulative_unique_players": len(cumulative_rows),
        "seasons": {s["season"]: len(read_csv(s["file"])) for s in SEASONS},
    }

    # spot checks - top 10 by runs
    qa["spot_check_top_runs"] = [
        {k: r[k] for k in ["acc_cumulative_id","player_name","cricheroes_player_id","seasons_played","matches_played","runs","wickets","highest_score","best_bowling"]}
        for r in cumulative_rows[:10]
    ]

    # write outputs
    cum_path = os.path.join(ROOT, "ACC_Cumulative_S5-S8_Player_Scorecard.csv")
    bd_path = os.path.join(ROOT, "ACC_S5-S8_Player_Season_Breakdown.csv")
    qa_path = os.path.join(ROOT, "ACC_Cumulative_S5-S8_QA_Report.json")
    meta_path = os.path.join(ROOT, "ACC_Cumulative_S5-S8_Metadata.json")

    with open(cum_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cum_cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(cumulative_rows)

    with open(bd_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=bd_cols, extrasaction="ignore")
        w.writeheader()
        for b in breakdown_rows:
            out = dict(b)
            out.pop("_match_ids_list", None)
            w.writerow(out)

    metadata["outputs"] = {
        "cumulative_csv": os.path.relpath(cum_path, ROOT),
        "breakdown_csv": os.path.relpath(bd_path, ROOT),
        "qa_json": os.path.relpath(qa_path, ROOT),
        "metadata_json": os.path.relpath(meta_path, ROOT),
    }
    metadata["counts"] = qa["counts"]
    metadata["totals_ok"] = qa["totals_reconciliation"]["ok"]

    with open(qa_path, "w", encoding="utf-8") as f:
        json.dump(qa, f, ensure_ascii=False, indent=2)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print("cumulative_rows", len(cumulative_rows))
    print("breakdown_rows", len(breakdown_rows))
    print("reconciliation_ok", qa["totals_reconciliation"]["ok"])
    print("mismatches", qa["totals_reconciliation"]["mismatches"])
    print("id_name_conflicts", len(qa["identity_conflicts"]["same_id_different_names"]))
    print("name_id_conflicts", len(qa["identity_conflicts"]["same_name_different_ids"]))
    print("missing_cid", len(qa["missing_cricheroes_player_id"]))
    print("match_integrity_mismatch", len(qa["match_integrity"]["player_season_mismatch"]))
    print("unknown_match_ids", len(qa["match_integrity"]["unknown_match_ids"]))
    for r in cumulative_rows[:10]:
        print(r["acc_cumulative_id"], r["player_name"], "S", r["season_list"], "M", r["matches_played"], "R", r["runs"], "W", r["wickets"])

if __name__ == "__main__":
    main()
