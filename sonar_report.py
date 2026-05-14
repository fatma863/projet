"""
SonarCloud / SonarQube Premium Full Report Generator
=====================================================
"""

import argparse
import base64
import datetime as dt
import html
import os
import sys
from typing import Any, Dict, List, Optional

import requests

DEFAULT_TOKEN = "0569a05eff8dcb1b84d6e98cba04e8d6d9b5dedb"
DEFAULT_ORG = "fatma863"
DEFAULT_HOST = "https://sonarcloud.io"
DEFAULT_PROJECTS = [
    "fatma863_projet",
]

METRIC_KEYS = ",".join([
    "alert_status",
    "bugs", "reliability_rating", "reliability_remediation_effort",
    "vulnerabilities", "security_rating", "security_remediation_effort",
    "security_hotspots", "security_hotspots_reviewed", "security_review_rating",
    "code_smells", "sqale_rating", "sqale_index", "sqale_debt_ratio",
    "coverage", "line_coverage", "branch_coverage",
    "lines_to_cover", "uncovered_lines", "tests", "test_errors", "test_failures",
    "duplicated_lines_density", "duplicated_blocks", "duplicated_files", "duplicated_lines",
    "ncloc", "lines", "statements", "functions", "classes", "files", "comment_lines_density",
    "cognitive_complexity", "complexity",
    "new_bugs", "new_vulnerabilities", "new_code_smells", "new_coverage",
    "new_duplicated_lines_density", "new_security_hotspots",
])

RATING_MAP = {"1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E",
              1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}
RATING_COLOR = {"A": "#00aa5b", "B": "#9bc53d", "C": "#f4c430",
                "D": "#f0883e", "E": "#e53e3e"}
SEVERITY_COLOR = {"BLOCKER": "#991b1b", "CRITICAL": "#dc2626",
                  "MAJOR": "#f59e0b", "MINOR": "#10b981", "INFO": "#3b82f6"}
TYPE_ICON = {"BUG": "🐛", "VULNERABILITY": "🛡️", "CODE_SMELL": "💨",
             "SECURITY_HOTSPOT": "🔥"}


class SonarClient:
    def __init__(self, host: str, token: str):
        self.host = host.rstrip("/")
        auth = base64.b64encode(f"{token}:".encode()).decode()
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Basic {auth}"})

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict:
        url = f"{self.host}/api/{path.lstrip('/')}"
        r = self.session.get(url, params=params or {}, timeout=90)
        if r.status_code >= 400:
            raise RuntimeError(f"Sonar API {path} -> {r.status_code}: {r.text[:300]}")
        return r.json()

    def paged(self, path: str, params: Dict[str, Any], key: str,
              page_size: int = 500, max_pages: int = 200) -> List[Dict]:
        items: List[Dict] = []
        params = dict(params)
        params["ps"] = page_size
        for page in range(1, max_pages + 1):
            params["p"] = page
            data = self.get(path, params)
            chunk = data.get(key, [])
            items.extend(chunk)
            total = data.get("paging", {}).get("total", len(items))
            if len(items) >= total or not chunk:
                break
            if page * page_size >= 10000:
                break
        return items


def fetch_all(client: SonarClient, project_key: str, organization: Optional[str]) -> Dict[str, Any]:
    org_param = {"organization": organization} if organization else {}

    print(f"  [1/6] project metadata...")
    try:
        project = client.get("components/show", {"component": project_key, **org_param}).get("component", {})
    except Exception as e:
        print(f"    ! {e}")
        project = {"key": project_key, "name": project_key}

    print(f"  [2/6] measures...")
    measures_resp = client.get("measures/component", {
        "component": project_key, "metricKeys": METRIC_KEYS, **org_param,
    })
    measures = {m["metric"]: m.get("value", m.get("periods", [{}])[0].get("value", "-"))
                for m in measures_resp.get("component", {}).get("measures", [])}

    print(f"  [3/6] quality gate...")
    try:
        qg_status = client.get("qualitygates/project_status", {"projectKey": project_key}).get("projectStatus", {})
    except Exception:
        qg_status = {}

    print(f"  [4/6] ALL open issues (paginated)...")
    issues = client.paged("issues/search", {
        "componentKeys": project_key, "resolved": "false",
        "s": "SEVERITY", "asc": "false", **org_param,
    }, key="issues")
    print(f"        -> {len(issues)} issues retrieved")

    print(f"  [5/6] ALL security hotspots...")
    try:
        hotspots = client.paged("hotspots/search", {
            "projectKey": project_key, "status": "TO_REVIEW", **org_param,
        }, key="hotspots")
    except Exception as e:
        print(f"    ! {e}")
        hotspots = []
    print(f"        -> {len(hotspots)} hotspots retrieved")

    print(f"  [6/6] analysis history...")
    try:
        history = client.get("measures/search_history", {
            "component": project_key,
            "metrics": "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc",
            "ps": 1000,
        }).get("measures", [])
    except Exception:
        history = []

    return {
        "project": project, "measures": measures, "quality_gate": qg_status,
        "issues": issues, "hotspots": hotspots, "history": history,
    }


def fmt_rating(val: str) -> str:
    return RATING_MAP.get(val, RATING_MAP.get(str(val), "-"))


def fmt_duration(minutes_str: str) -> str:
    try:
        m = int(float(minutes_str))
    except (TypeError, ValueError):
        return "-"
    if m < 60:
        return f"{m}min"
    if m < 60 * 8:
        return f"{m // 60}h {m % 60}min"
    d = m // (60 * 8)
    rem = m % (60 * 8)
    return f"{d}d {rem // 60}h"


def esc(s: Any) -> str:
    return html.escape(str(s)) if s is not None else ""


def rating_badge(letter: str, size: int = 44) -> str:
    color = RATING_COLOR.get(letter, "#94a3b8")
    return (f'<span class="rating-circle" style="width:{size}px;height:{size}px;'
            f'line-height:{size}px;background:{color};font-size:{int(size*0.5)}px;">{letter}</span>')


def kpi_card(label: str, value: str, sub: str, color: str, icon: str) -> str:
    return f"""
    <div class="kpi">
      <div class="kpi-head">
        <span class="kpi-icon" style="background:{color}15;color:{color};">{icon}</span>
        <span class="kpi-label">{esc(label)}</span>
      </div>
      <div class="kpi-value" style="color:{color};">{value}</div>
      <div class="kpi-sub">{esc(sub)}</div>
    </div>"""


CSS = """
:root {
  --navy:#0b1e3f; --navy2:#162b54; --teal:#128c7e; --teal2:#1aaf9e;
  --bg:#f5f7fb; --surface:#ffffff; --border:#e5e9f2;
  --text:#0f172a; --text2:#64748b; --text3:#94a3b8;
  --shadow:0 1px 2px rgba(15,23,42,.04), 0 4px 24px rgba(15,23,42,.06);
  --shadow-lg:0 10px 40px rgba(11,30,63,.12);
}
* { box-sizing:border-box; }
html,body { margin:0; padding:0; }
body {
  font-family:-apple-system,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg); color:var(--text); font-size:14px; line-height:1.55;
  -webkit-font-smoothing:antialiased;
}
.container { max-width:1320px; margin:0 auto; padding:40px 36px 60px; }
.hero {
  position:relative; overflow:hidden;
  background:linear-gradient(135deg,#0b1e3f 0%,#162b54 45%,#0e6b62 100%);
  color:#fff; padding:56px 56px 48px; border-radius:24px;
  box-shadow:var(--shadow-lg); margin-bottom:40px;
}
.hero::before{
  content:""; position:absolute; inset:0;
  background:radial-gradient(circle at 85% 15%, rgba(26,175,158,.25), transparent 50%),
             radial-gradient(circle at 15% 85%, rgba(18,140,126,.2), transparent 50%);
  pointer-events:none;
}
.hero > * { position:relative; }
.hero .tag {
  display:inline-block; font-size:11px; letter-spacing:2.5px; font-weight:600;
  text-transform:uppercase; opacity:.75; margin-bottom:14px;
  padding:6px 14px; border:1px solid rgba(255,255,255,.25); border-radius:20px;
}
.hero h1 { margin:0 0 10px; font-size:40px; font-weight:700; letter-spacing:-0.8px; }
.hero .sub { opacity:.82; font-size:15px; }
.hero .sub code { background:rgba(255,255,255,.12); padding:2px 10px; border-radius:6px; font-size:13px;}
.hero-footer { display:flex; align-items:center; gap:16px; margin-top:28px; flex-wrap:wrap; }
.qg-badge {
  display:inline-flex; align-items:center; gap:10px; padding:12px 24px;
  border-radius:50px; font-weight:700; font-size:14px; letter-spacing:1.2px;
  box-shadow:0 4px 20px rgba(0,0,0,.2);
}
.qg-badge::before { content:""; width:10px; height:10px; border-radius:50%; background:#fff; }
.hero-stats { display:flex; gap:24px; color:rgba(255,255,255,.85); font-size:13px; }
.hero-stats div { border-left:1px solid rgba(255,255,255,.2); padding-left:16px; }
.hero-stats div:first-child { border-left:0; padding-left:0; }
.hero-stats b { display:block; color:#fff; font-size:18px; font-weight:700; }
h2 {
  font-size:20px; font-weight:700; margin:48px 0 18px; color:var(--navy);
  display:flex; align-items:center; gap:12px;
}
h2::before { content:""; width:4px; height:22px; background:var(--teal); border-radius:2px; }
h2 .count {
  font-size:12px; font-weight:600; color:var(--text2);
  background:var(--surface); padding:3px 10px; border-radius:12px;
  border:1px solid var(--border);
}
.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
.kpi {
  background:var(--surface); border:1px solid var(--border); border-radius:16px;
  padding:22px 24px; box-shadow:var(--shadow); transition:transform .15s;
}
.kpi:hover { transform:translateY(-2px); }
.kpi-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.kpi-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; }
.kpi-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text2); font-weight:600; }
.kpi-value { font-size:32px; font-weight:700; line-height:1; }
.kpi-sub { font-size:12px; color:var(--text2); margin-top:6px; }
.card {
  background:var(--surface); border:1px solid var(--border); border-radius:16px;
  padding:28px; box-shadow:var(--shadow); margin-bottom:20px;
}
.card.pad0 { padding:0; overflow:hidden; }
.ratings { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.rating-box { text-align:center; padding:22px 16px; background:#f8fafc; border:1px solid var(--border); border-radius:14px; }
.rating-box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text2); margin-bottom:14px; font-weight:600; }
.rating-circle {
  display:inline-block; border-radius:50%; color:#fff;
  text-align:center; font-weight:700; box-shadow:0 4px 12px rgba(0,0,0,.15);
}
table { width:100%; border-collapse:collapse; font-size:13px; }
thead th {
  text-align:left; padding:14px 16px; background:#f8fafc;
  color:var(--text2); font-weight:600; text-transform:uppercase;
  font-size:10.5px; letter-spacing:1px; border-bottom:1px solid var(--border);
}
td { padding:12px 16px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
tbody tr:hover td { background:#fafbfd; }
tbody tr:last-child td { border-bottom:none; }
.mono { font-family:"SF Mono",Consolas,"Roboto Mono",monospace; font-size:12px; color:var(--text); }
.small { font-size:11px; color:var(--text2); }
.pill {
  display:inline-block; padding:3px 10px; border-radius:20px; color:#fff;
  font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase;
}
.bar-row { display:grid; grid-template-columns:96px 1fr 56px; align-items:center; gap:14px; margin:12px 0; }
.bar-label { font-size:11px; font-weight:700; color:var(--text2); letter-spacing:.5px; }
.bar-track { background:#f1f5f9; border-radius:20px; height:24px; overflow:hidden; border:1px solid var(--border); }
.bar-fill { height:100%; border-radius:20px; background-image:linear-gradient(90deg,rgba(255,255,255,.25),transparent); }
.bar-count { text-align:right; font-weight:700; color:var(--navy); font-size:14px; }
.toc {
  display:flex; flex-wrap:wrap; gap:10px; padding:20px 28px;
  background:var(--surface); border:1px solid var(--border);
  border-radius:16px; margin-bottom:32px; box-shadow:var(--shadow);
}
.toc a { font-size:12px; color:var(--navy); text-decoration:none; font-weight:600; padding:8px 14px; border-radius:20px; background:#f1f5f9; transition:all .15s; }
.toc a:hover { background:var(--teal); color:#fff; }
.metric-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.metric-item { padding:16px 20px; background:#f8fafc; border:1px solid var(--border); border-radius:12px; }
.metric-item .lbl { font-size:10.5px; text-transform:uppercase; letter-spacing:1px; color:var(--text2); font-weight:600; margin-bottom:6px; }
.metric-item .val { font-size:22px; font-weight:700; color:var(--navy); }
footer { margin-top:60px; padding:28px; text-align:center; color:var(--text3); font-size:12px; border-top:1px solid var(--border); }
footer b { color:var(--navy); }
.fab {
  position:fixed; bottom:28px; right:28px; z-index:1000;
  background:linear-gradient(135deg,#0b1e3f 0%,#128c7e 100%);
  color:#fff; border:none; border-radius:50px;
  padding:14px 22px; font-size:13px; font-weight:700;
  letter-spacing:.5px; cursor:pointer; box-shadow:0 8px 28px rgba(11,30,63,.4);
  display:inline-flex; align-items:center; gap:10px; font-family:inherit; transition:all .2s;
}
.fab:hover { transform:translateY(-2px); }
.fab svg { width:18px; height:18px; }
"""


def build_html(project_key: str, data: Dict[str, Any]) -> str:
    p = data["project"]
    m = data["measures"]
    qg = data["quality_gate"]
    issues = data["issues"]
    hotspots = data["hotspots"]

    name = p.get("name", project_key)
    gen_date = dt.datetime.now().strftime("%B %d, %Y at %H:%M")

    qg_status = qg.get("status", "NONE")
    qg_map = {"OK": ("#00aa5b", "QUALITY GATE PASSED"),
              "ERROR": ("#e53e3e", "QUALITY GATE FAILED"),
              "WARN": ("#f59e0b", "QUALITY GATE WARNING")}
    qg_color, qg_label = qg_map.get(qg_status, ("#64748b", "QUALITY GATE N/A"))

    rel_rating = fmt_rating(m.get("reliability_rating", "-"))
    sec_rating = fmt_rating(m.get("security_rating", "-"))
    sqale_rating = fmt_rating(m.get("sqale_rating", "-"))
    sec_review_rating = fmt_rating(m.get("security_review_rating", "-"))

    by_sev: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    by_file: Dict[str, int] = {}
    by_rule: Dict[str, int] = {}
    for i in issues:
        by_sev[i.get("severity", "INFO")] = by_sev.get(i.get("severity", "INFO"), 0) + 1
        by_type[i.get("type", "CODE_SMELL")] = by_type.get(i.get("type", "CODE_SMELL"), 0) + 1
        comp = i.get("component", "").split(":")[-1]
        by_file[comp] = by_file.get(comp, 0) + 1
        rule = i.get("rule", "")
        by_rule[rule] = by_rule.get(rule, 0) + 1

    kpis = "".join([
        kpi_card("Bugs", m.get("bugs", "0"), f"Reliability rating {rel_rating}", RATING_COLOR.get(rel_rating, "#0b1e3f"), "🐛"),
        kpi_card("Vulnerabilities", m.get("vulnerabilities", "0"), f"Security rating {sec_rating}", RATING_COLOR.get(sec_rating, "#0b1e3f"), "🛡️"),
        kpi_card("Security Hotspots", m.get("security_hotspots", "0"), f"Review rating {sec_review_rating}", RATING_COLOR.get(sec_review_rating, "#0b1e3f"), "🔥"),
        kpi_card("Code Smells", m.get("code_smells", "0"), f"Maintainability {sqale_rating}", RATING_COLOR.get(sqale_rating, "#0b1e3f"), "💨"),
        kpi_card("Duplications", f"{m.get('duplicated_lines_density', '0')}%", f"{m.get('duplicated_blocks', '0')} duplicated blocks", "#8b5cf6", "📑"),
        kpi_card("Lines of Code", m.get("ncloc", "0"), f"{m.get('files', '0')} files analyzed", "#128c7e", "📏"),
        kpi_card("Technical Debt", fmt_duration(m.get("sqale_index", "0")), f"Debt ratio {m.get('sqale_debt_ratio', '0')}%", "#f0883e", "⏱️"),
    ])

    total_issues = sum(by_sev.values()) or 1
    sev_rows = ""
    for sev in ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]:
        c = by_sev.get(sev, 0)
        pct = (c / total_issues) * 100
        color = SEVERITY_COLOR[sev]
        sev_rows += f'<div class="bar-row"><div class="bar-label">{sev}</div><div class="bar-track"><div class="bar-fill" style="width:{pct:.1f}%;background:{color};"></div></div><div class="bar-count">{c}</div></div>'

    type_rows = ""
    total_t = sum(by_type.values()) or 1
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        pct = (c / total_t) * 100
        type_rows += f"<tr><td>{TYPE_ICON.get(t,'•')} <b>{esc(t)}</b></td><td>{c}</td><td>{pct:.1f}%</td></tr>"

    issues_rows = ""
    for i in issues:
        sev = i.get("severity", "INFO")
        color = SEVERITY_COLOR.get(sev, "#94a3b8")
        comp = esc(i.get("component", "").split(":")[-1])
        line = i.get("line", "-")
        msg = esc(i.get("message", ""))
        rule = esc(i.get("rule", ""))
        effort = esc(i.get("effort", "-"))
        itype = i.get("type", "")
        issues_rows += f'<tr><td><span class="pill" style="background:{color};">{sev}</span></td><td>{TYPE_ICON.get(itype,"•")} {esc(itype)}</td><td class="mono">{comp}{":"+str(line) if line != "-" else ""}</td><td>{msg}</td><td class="mono small">{rule}</td><td>{effort}</td></tr>'
    if not issues_rows:
        issues_rows = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;">✨ No open issues — clean code!</td></tr>'

    hotspot_rows = ""
    for h in hotspots:
        prob = h.get("vulnerabilityProbability", "LOW")
        color = {"HIGH": "#991b1b", "MEDIUM": "#dc2626", "LOW": "#f59e0b"}.get(prob, "#94a3b8")
        comp = esc(h.get("component", "").split(":")[-1])
        line = h.get("line", "-")
        msg = esc(h.get("message", ""))
        cat = esc(h.get("securityCategory", ""))
        hotspot_rows += f'<tr><td><span class="pill" style="background:{color};">{prob}</span></td><td>{cat}</td><td class="mono">{comp}{":"+str(line) if line != "-" else ""}</td><td>{msg}</td></tr>'
    if not hotspot_rows:
        hotspot_rows = '<tr><td colspan="4" style="text-align:center;padding:32px;color:#94a3b8;">🔒 No hotspots to review</td></tr>'

    top_files = sorted(by_file.items(), key=lambda x: -x[1])
    top_files_rows = "".join(f"<tr><td class='mono'>{esc(f)}</td><td><b>{c}</b></td></tr>" for f, c in top_files) or '<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:24px;">—</td></tr>'

    top_rules = sorted(by_rule.items(), key=lambda x: -x[1])[:25]
    top_rules_rows = "".join(f"<tr><td class='mono small'>{esc(r)}</td><td><b>{c}</b></td></tr>" for r, c in top_rules) or '<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:24px;">—</td></tr>'

    qg_rows = ""
    for cond in qg.get("conditions", []):
        status = cond.get("status", "")
        scolor = "#00aa5b" if status == "OK" else "#e53e3e"
        qg_rows += f'<tr><td class="mono">{esc(cond.get("metricKey",""))}</td><td>{esc(cond.get("comparator",""))} {esc(cond.get("errorThreshold",""))}</td><td><b>{esc(cond.get("actualValue","-"))}</b></td><td><span class="pill" style="background:{scolor};">{status}</span></td></tr>'
    if not qg_rows:
        qg_rows = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px;">No conditions defined</td></tr>'

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SonarCloud Report — {esc(name)}</title>
<style>{CSS}</style>
</head>
<body>
  <button class="fab" onclick="window.print()" title="Download as PDF">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Download PDF
  </button>
  <div class="container">
    <div class="hero">
      <div class="tag">◆ PREMIUM CODE QUALITY REPORT</div>
      <h1>{esc(name)}</h1>
      <div class="sub">Project key: <code>{esc(project_key)}</code> &nbsp;·&nbsp; Generated {gen_date}</div>
      <div class="hero-footer">
        <span class="qg-badge" style="background:{qg_color};color:#fff;">{qg_label}</span>
        <div class="hero-stats">
          <div><b>{len(issues)}</b>Open Issues</div>
          <div><b>{len(hotspots)}</b>Hotspots</div>
          <div><b>{m.get('ncloc','0')}</b>Lines of Code</div>
          <div><b>{m.get('files','0')}</b>Files</div>
        </div>
      </div>
    </div>
    <nav class="toc">
      <a href="#summary">Executive Summary</a>
      <a href="#ratings">Ratings</a>
      <a href="#gate">Quality Gate</a>
      <a href="#severity">Severity</a>
      <a href="#types">Issue Types</a>
      <a href="#issues">All Issues ({len(issues)})</a>
      <a href="#hotspots">All Hotspots ({len(hotspots)})</a>
      <a href="#size">Size &amp; Complexity</a>
    </nav>
    <h2 id="summary">Executive Summary</h2>
    <div class="kpi-grid">{kpis}</div>
    <h2 id="ratings">Ratings Overview</h2>
    <div class="card">
      <div class="ratings">
        <div class="rating-box"><div class="lbl">Reliability</div>{rating_badge(rel_rating)}<div class="small" style="margin-top:10px;">{m.get('bugs','0')} bugs</div></div>
        <div class="rating-box"><div class="lbl">Security</div>{rating_badge(sec_rating)}<div class="small" style="margin-top:10px;">{m.get('vulnerabilities','0')} vulns</div></div>
        <div class="rating-box"><div class="lbl">Security Review</div>{rating_badge(sec_review_rating)}<div class="small" style="margin-top:10px;">{m.get('security_hotspots_reviewed','0')}% reviewed</div></div>
        <div class="rating-box"><div class="lbl">Maintainability</div>{rating_badge(sqale_rating)}<div class="small" style="margin-top:10px;">{fmt_duration(m.get('sqale_index','0'))} debt</div></div>
      </div>
    </div>
    <h2 id="gate">Quality Gate Conditions</h2>
    <div class="card pad0"><table><thead><tr><th>Metric</th><th>Threshold</th><th>Actual</th><th>Status</th></tr></thead><tbody>{qg_rows}</tbody></table></div>
    <h2 id="severity">Issues by Severity</h2>
    <div class="card">{sev_rows}</div>
    <h2 id="types">Issue Types</h2>
    <div class="card pad0"><table><thead><tr><th>Type</th><th>Count</th><th>Share</th></tr></thead><tbody>{type_rows or '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px;">—</td></tr>'}</tbody></table></div>
    <h2 id="issues">All Open Issues <span class="count">{len(issues)} total</span></h2>
    <div class="card pad0"><table><thead><tr><th>Severity</th><th>Type</th><th>Location</th><th>Message</th><th>Rule</th><th>Effort</th></tr></thead><tbody>{issues_rows}</tbody></table></div>
    <h2 id="hotspots">All Security Hotspots <span class="count">{len(hotspots)} total</span></h2>
    <div class="card pad0"><table><thead><tr><th>Risk</th><th>Category</th><th>Location</th><th>Message</th></tr></thead><tbody>{hotspot_rows}</tbody></table></div>
    <h2 id="size">Size &amp; Complexity</h2>
    <div class="card">
      <div class="metric-grid">
        <div class="metric-item"><div class="lbl">Lines of Code</div><div class="val">{m.get('ncloc','-')}</div></div>
        <div class="metric-item"><div class="lbl">Total Lines</div><div class="val">{m.get('lines','-')}</div></div>
        <div class="metric-item"><div class="lbl">Files</div><div class="val">{m.get('files','-')}</div></div>
        <div class="metric-item"><div class="lbl">Classes</div><div class="val">{m.get('classes','-')}</div></div>
        <div class="metric-item"><div class="lbl">Functions</div><div class="val">{m.get('functions','-')}</div></div>
        <div class="metric-item"><div class="lbl">Statements</div><div class="val">{m.get('statements','-')}</div></div>
        <div class="metric-item"><div class="lbl">Cyclomatic Complexity</div><div class="val">{m.get('complexity','-')}</div></div>
        <div class="metric-item"><div class="lbl">Cognitive Complexity</div><div class="val">{m.get('cognitive_complexity','-')}</div></div>
        <div class="metric-item"><div class="lbl">Comment Density</div><div class="val">{m.get('comment_lines_density','-')}%</div></div>
      </div>
    </div>
    <footer><b>SonarCloud Premium Report</b> · Generated {gen_date}<br>{len(issues)} issues · {len(hotspots)} hotspots · {m.get('ncloc','0')} LOC · {m.get('files','0')} files analyzed</footer>
  </div>
</body>
</html>"""


def generate_one(client: SonarClient, project_key: str, organization: Optional[str],
                 out_path: str) -> Optional[str]:
    print(f"\n--- {project_key} ---")
    try:
        data = fetch_all(client, project_key, organization)
    except Exception as e:
        print(f"  [ERROR] Failed: {e}")
        return None

    html_str = build_html(project_key, data)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_str)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"  [OK] {os.path.basename(out_path)} ({size_kb:.1f} KB)")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project_key", nargs="?", default=None)
    ap.add_argument("--host", default=DEFAULT_HOST)
    ap.add_argument("--org", default=DEFAULT_ORG)
    ap.add_argument("--token", default=os.environ.get("SONAR_TOKEN", DEFAULT_TOKEN))
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    project_keys = [args.project_key] if args.project_key else DEFAULT_PROJECTS

    out_dir = os.path.dirname(os.path.abspath(__file__))
    print("============================================================")
    print("  SonarCloud Premium Report Generator")
    print("============================================================")

    client = SonarClient(args.host, args.token)
    results = []
    for key in project_keys:
        ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_key = key.replace(":", "_").replace("/", "_")
        out_path = args.out or os.path.join(out_dir, f"sonar_{safe_key}_{ts}.html")
        path = generate_one(client, key, args.org, out_path)
        if path:
            results.append(path)

    print(f"\n--- Done --- {len(results)} report(s)")
    for r in results:
        print(f"  - {r}")
    return 0 if results else 1


if __name__ == "__main__":
    sys.exit(main())
