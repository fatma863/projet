import requests
import json
from datetime import datetime

# ================= CONFIG =================
SONAR_HOST_URL = "https://sonarcloud.io"
ORGANIZATION = "fatma863"
PROJECT_KEY = "fatma863_projet"
SONAR_TOKEN = "71c93dbe4436e571ea8079a672713bbe786c4a1e"
BRANCH = "master"

OUTPUT_FILE = "sonar-premium-report.html"

# Enhanced metrics
METRICS = ",".join([
    "coverage", "bugs", "vulnerabilities", "code_smells", "duplicated_lines_density",
    "ncloc", "reliability_rating", "security_rating", "sqale_rating",
    "reliability_rating", "security_rating", "sqale_rating",  # A/B/C/D/E
    "new_reliability_rating", "new_security_rating", "new_maintainability_rating"
])

auth = (SONAR_TOKEN, "")

# ================= FETCH DATA =================
def get_measures():
    url = f"{SONAR_HOST_URL}/api/measures/component"
    params = {
        "component": PROJECT_KEY,
        "metricKeys": METRICS,
        "branch": BRANCH
    }
    resp = requests.get(url, auth=auth, params=params)
    resp.raise_for_status()
    return resp.json()

def get_quality_gate():
    url = f"{SONAR_HOST_URL}/api/qualitygates/project_status"
    params = {
        "projectKey": PROJECT_KEY,
        "branch": BRANCH
    }
    resp = requests.get(url, auth=auth, params=params)
    resp.raise_for_status()
    return resp.json()

def get_all_issues():
    """Fetch ALL issues with pagination"""
    issues = []
    page = 1
    while True:
        url = f"{SONAR_HOST_URL}/api/issues/search"
        params = {
            "componentKeys": PROJECT_KEY,
            "branch": BRANCH,
            "ps": 500,           # max allowed
            "p": page,
            "additionalFields": "comments"
        }
        resp = requests.get(url, auth=auth, params=params)
        resp.raise_for_status()
        data = resp.json()
        
        batch = data.get("issues", [])
        issues.extend(batch)
        
        if len(batch) < 500:
            break
        page += 1
    return {"issues": issues, "total": len(issues)}

# ================= BUILD HTML =================
def generate_html(measures, quality, issues_data):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Extract measures
    measure_dict = {m['metric']: m.get('value') for m in measures["component"]["measures"]}
    
    # Quality Gate
    qg = quality.get("projectStatus", {})
    status = qg.get("status", "NONE")
    conditions = qg.get("conditions", [])
    
    # Color for status
    status_color = {
        "OK": "#10b981", "WARN": "#f59e0b", "ERROR": "#ef4444", "NONE": "#6b7280"
    }[status]
    
    # Issues summary
    total_issues = issues_data["total"]
    issues_by_type = {}
    for i in issues_data["issues"]:
        t = i.get('type', 'UNKNOWN')
        issues_by_type[t] = issues_by_type.get(t, 0) + 1

    # Build HTML
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SonarCloud • Premium Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
        <style>
            body {{ font-family: 'Inter', system-ui, sans-serif; }}
            .card {{ transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }}
            .card:hover {{ transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); }}
            .rating-A {{ background-color: #10b981; color: white; }}
            .rating-B {{ background-color: #84cc16; color: white; }}
            .rating-C {{ background-color: #eab308; color: white; }}
            .rating-D {{ background-color: #f97316; color: white; }}
            .rating-E {{ background-color: #ef4444; color: white; }}
        </style>
    </head>
    <body class="bg-gray-50 text-gray-800">
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h1 class="text-4xl font-bold text-indigo-600 flex items-center gap-3">
                        <i class="fas fa-shield-alt"></i> SonarCloud Report
                    </h1>
                    <p class="text-gray-600 mt-1">Project: <strong>{PROJECT_KEY}</strong> • Branch: <strong>{BRANCH}</strong></p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">Generated on</p>
                    <p class="font-medium">{now}</p>
                </div>
            </div>

            <!-- Quality Gate -->
            <div class="card bg-white rounded-2xl shadow p-8 mb-8">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <i class="fas fa-gate"></i> Quality Gate
                </h2>
                <div class="flex items-center gap-6">
                    <div class="text-6xl font-bold" style="color: {status_color}">{status}</div>
                    <div>
                        {''.join(f'<div class="text-sm"><span class="font-medium">{c["metricKey"]}</span>: {c["status"]}</div>' for c in conditions)}
                    </div>
                </div>
                {f'<p class="text-amber-600 mt-4"><i class="fas fa-info-circle"></i> No Quality Gate is associated with this project/branch.</p>' if status == "NONE" else ''}
            </div>

            <!-- Ratings -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {create_rating_card("Reliability", measure_dict.get("reliability_rating"), "🛡️")}
                {create_rating_card("Security", measure_dict.get("security_rating"), "🔒")}
                {create_rating_card("Maintainability", measure_dict.get("sqale_rating"), "🔧")}
            </div>

            <!-- Metrics -->
            <div class="card bg-white rounded-2xl shadow p-8 mb-8">
                <h2 class="text-2xl font-semibold mb-6">📊 Key Metrics</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {generate_metric_cards(measure_dict)}
                </div>
            </div>

            <!-- Issues -->
            <div class="card bg-white rounded-2xl shadow p-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold flex items-center gap-2">
                        <i class="fas fa-bug"></i> Issues ({total_issues})
                    </h2>
                    <div class="flex gap-2">
                        {''.join(f'<span class="px-3 py-1 bg-gray-100 rounded-full text-sm">{k}: {v}</span>' for k,v in issues_by_type.items())}
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="px-6 py-4 text-left">Type</th>
                                <th class="px-6 py-4 text-left">Severity</th>
                                <th class="px-6 py-4 text-left">Message</th>
                                <th class="px-6 py-4 text-left">Component</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generate_issues_rows(issues_data["issues"])}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def create_rating_card(title, rating, icon):
    if not rating:
        return ""
    color_class = f"rating-{rating}"
    return f"""
    <div class="card bg-white rounded-2xl shadow p-6 text-center">
        <div class="text-3xl mb-2">{icon}</div>
        <div class="text-sm text-gray-500">{title}</div>
        <div class="text-5xl font-bold mt-2 {color_class} inline-block px-6 py-2 rounded-xl">{rating}</div>
    </div>
    """

def generate_metric_cards(measure_dict):
    cards = ""
    important = ["coverage", "bugs", "vulnerabilities", "code_smells", "duplicated_lines_density", "ncloc"]
    for m in important:
        val = measure_dict.get(m, "N/A")
        cards += f"""
        <div class="bg-gray-50 rounded-xl p-5">
            <div class="text-sm text-gray-500">{m.replace('_', ' ').title()}</div>
            <div class="text-3xl font-semibold mt-1">{val}</div>
        </div>
        """
    return cards

def generate_issues_rows(issues):
    rows = ""
    severity_colors = {
        "BLOCKER": "text-red-600 font-bold",
        "CRITICAL": "text-orange-600",
        "MAJOR": "text-amber-600",
        "MINOR": "text-blue-600",
        "INFO": "text-gray-500"
    }
    for i in issues[:200]:  # Limit to 200 in HTML to avoid huge file
        sev = i.get('severity', '')
        rows += f"""
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-medium">{i.get('type')}</td>
            <td class="px-6 py-4 {severity_colors.get(sev, '')}">{sev}</td>
            <td class="px-6 py-4">{i.get('message')}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{i.get('component')}</td>
        </tr>
        """
    return rows

# ================= MAIN =================
if __name__ == "__main__":
    print("Fetching data from SonarCloud...")
    measures = get_measures()
    quality = get_quality_gate()
    issues = get_all_issues()

    print(f"✅ Fetched {issues['total']} issues")
    
    html = generate_html(measures, quality, issues)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"🚀 Ultra-premium report generated: {OUTPUT_FILE}")