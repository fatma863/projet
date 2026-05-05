# Système ML — Recommandation d'assignation de tâches

## Vue d'ensemble

Le système ML est un **microservice Python indépendant** (FastAPI) qui recommande le meilleur membre de projet à assigner à une tâche. Il fonctionne en parallèle du backend Laravel et communique avec lui via HTTP.

```
Navigateur
    │
    ▼
React (Vite)
    │  POST /api/projects/:id/auto-assign
    ▼
Laravel (API)
    │  GET http://python-service/recommend
    ▼
Python ML Service (FastAPI)
    │
    ▼
Base de données MySQL (partagée)
```

---

## Architecture des fichiers

```
python/ml/
├── app.py          # Serveur FastAPI — définit les routes HTTP
├── recommender.py  # Moteur ML — entraînement + inférence
├── features.py     # Extraction de features — produit les vecteurs numériques
├── ml_config.py    # Constantes partagées — poids et labels des features
├── database.py     # Connexion MySQL + helpers SQL
├── train.py        # Script CLI pour entraîner le modèle manuellement
├── main.py         # Point d'entrée pour Render (import de app.py)
├── requirements.txt
├── runtime.txt     # Force Python 3.11.9 sur Render
└── models/
    ├── task_assignment.joblib       # Modèle sérialisé
    └── task_assignment_meta.joblib  # Métriques et importances
```

---

## Flux complet — "Créer une tâche et obtenir une recommandation"

```
1. L'utilisateur remplit les étapes 1-3 du formulaire (titre, dates, spécialité)
2. À l'étape 4, React appelle automatiquement :
      GET /api/projects/:id/auto-assign?specialty_ids[]=2&priority=high&complexity=7
3. Laravel (SpecialtyController) transmet la requête au Python service :
      GET http://python-service/recommend  (body JSON avec les attributs de la tâche)
4. Python répond avec une liste de candidats classés par score
5. React affiche le meilleur candidat + le détail des 22 features
6. L'utilisateur accepte ou choisit manuellement
7. À la sauvegarde, Laravel persiste l'assignee_id dans la base
```

---

## Le modèle ML

### Algorithme

Le modèle est un **classifieur binaire** qui prédit la probabilité qu'un membre réussisse une tâche donnée (livraison à temps + heures respectées).

| Condition | Modèle utilisé |
|-----------|---------------|
| ≥ 40 échantillons étiquetés | **GBM + Random Forest (Voting Ensemble)** |
| 10–39 échantillons | **Régression Logistique** (fallback) |
| < 10 échantillons | **Poids fixes** (heuristique, pas de ML) |

Le pipeline sklearn est :
```
StandardScaler → CalibratedClassifierCV(VotingClassifier(GBM + RF))
```

La calibration transforme les sorties brutes en probabilités fiables [0, 1].

### Label d'entraînement

Un label `y = 1` (succès) est attribué à une assignation si :
- La tâche est en `workflow_status = 'done'`
- **ET** livrée à temps : `updated_at ≤ due_date` (ou sans date limite)
- **ET** heures respectées : `actual_hours ≤ estimated_hours × 1.3` (ou sans estimation)

Sinon `y = 0`.

### Persistance

Le modèle entraîné est sauvegardé via `joblib` dans `models/` :
- `task_assignment.joblib` — le pipeline sklearn complet
- `task_assignment_meta.joblib` — métriques (accuracy, F1) + importances des features

---

## Les 22 features

Chaque candidat est représenté par un vecteur de **22 dimensions normalisées [0, 1]**.

### Groupe 1 — Compétences (Skill Match)

| Feature | Description | Calcul |
|---------|-------------|--------|
| `specialty_exact_match` | Le membre possède exactement la spécialité requise | 1.0 si match parfait, 0.0 sinon |
| `specialty_partial_match` | Proportion de spécialités requises que le membre possède | `matched / required` |
| `specialty_breadth` | Polyvalence globale du membre | `nb_spécialités / 10` |

### Groupe 2 — Charge de travail (Workload)

| Feature | Description | Calcul |
|---------|-------------|--------|
| `current_task_load` | Tâches actives en cours | `1 - nb_actives / 8` (inversé : plus c'est haut, plus libre) |
| `capacity_utilization` | Saturation d'allocation | `1 - allocation_totale / 100` |
| `overdue_ratio_inv` | Proportion de tâches NON en retard | `1 - nb_retard / nb_actives` |

### Groupe 3 — Performance historique

| Feature | Description | Calcul |
|---------|-------------|--------|
| `overall_completion_rate` | Taux de tâches terminées sur toute l'histoire | `done / total` |
| `on_time_rate` | Taux de livraison à temps (tâches avec date limite) | `on_time / avec_due_date` |
| `hours_accuracy` | Précision des estimations d'heures | `1 - erreur_relative_moyenne` |

### Groupe 4 — Affinité tâche

| Feature | Description | Calcul |
|---------|-------------|--------|
| `same_priority_success` | Taux de succès sur des tâches de même priorité | `done_same_priority / same_priority` |
| `same_type_success` | Taux de succès sur des tâches de même type | `done_same_type / same_type` |
| `complexity_affinity` | Adéquation entre complexité de la tâche et profil habituel | Gaussienne centrée sur la complexité moyenne du membre |

### Groupe 5 — Contexte projet

| Feature | Description | Calcul |
|---------|-------------|--------|
| `project_familiarity` | Nombre de tâches terminées dans CE projet | `min(done_in_project / 10, 1)` |
| `team_familiarity` | Projets communs passés avec les autres membres | `nb_projets_communs / 5` |
| `project_role_weight` | Importance du rôle dans le projet | admin/chef=1.0, member=0.7, guest=0.3 |

### Groupe 6 — Tendance récente (30 jours)

| Feature | Description | Calcul |
|---------|-------------|--------|
| `recent_velocity` | Tâches terminées dans les 30 derniers jours | `nb_done_30j / 15` |
| `performance_trend` | Évolution du taux on-time (30j vs 30j-60j) | `delta_rate` normalisé sur [-0.5, 0.5] |
| `recent_on_time_rate` | Taux de livraison à temps sur les 30 derniers jours | `on_time_30j / avec_due_30j` |

### Groupe 7 — Risque

| Feature | Description | Calcul |
|---------|-------------|--------|
| `at_risk_tasks_inv` | Absence de tâches actuellement à risque | `1 - nb_at_risk / 5` |
| `experience_depth` | Profondeur d'expérience globale (nb tâches done) | `min(done_total / 100, 1)` |
| `collaboration_score` | Historique de collaboration avec les membres du projet | `nb_tâches_partagées / 10` |
| `sprint_alignment` | Déjà actif dans ce sprint | 0.9 si oui, 0.4 si non |

---

## Poids par défaut (mode heuristique)

Quand il n'y a pas encore assez de données pour entraîner le modèle, les features sont combinées via un **produit scalaire pondéré** :

```python
score = Σ (feature_value × weight) / Σ weights  × 100
```

Les poids les plus importants :
- `specialty_exact_match` → **4.0** (la spécialité prime avant tout)
- `specialty_partial_match` → **2.5**
- `current_task_load` → **2.5** (charge de travail)
- `on_time_rate` → **2.5** (ponctualité historique)
- `recent_on_time_rate` → **2.0** (ponctualité récente)

---

## Sélection des candidats

Avant de scorer, le service identifie qui peut être assigné :

```
1. Membres explicites du projet (project_user + project_members)
        ↓ si vide
2. Membres de l'équipe associée au projet (team_user)
        ↓ si vide
3. Tous les utilisateurs actifs non-admin (max 20)
```

Les administrateurs sont **toujours exclus** du pool de candidats.

---

## Endpoints API

| Méthode | URL | Description |
|---------|-----|-------------|
| `POST` | `/recommend` | Recommander pour une tâche (pas encore créée) |
| `GET` | `/recommend/{task_id}` | Recommander pour une tâche existante par ID |
| `POST` | `/train` | Déclencher un ré-entraînement |
| `GET` | `/model-info` | Métriques du modèle + importances des features |
| `POST` | `/feedback/{task_id}` | Enregistrer le résultat d'une tâche (signal d'entraînement) |
| `GET` | `/health` | Vérification de disponibilité |

---

## Entraînement

### Quand entraîner ?

Le modèle se ré-entraîne en appelant `POST /train` (ou via le script CLI `train.py`).  
Il nécessite **au minimum 10 tâches terminées** dans la base. Avec 40+, le modèle ensemble GBM+RF est utilisé.

### Données d'entraînement

Le service lit directement dans MySQL la table `task_assignments` jointe avec `tasks` :
```sql
SELECT ta.user_id, t.priority, t.complexity, t.estimated_hours,
       t.actual_hours, t.due_date, t.updated_at, ...
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
WHERE t.workflow_status = 'done'
```

### Métriques retournées

```json
{
  "status": "trained",
  "model_label": "GBM+RF Ensemble",
  "n_samples": 87,
  "accuracy": 0.821,
  "precision": 0.794,
  "recall": 0.836,
  "f1": 0.814
}
```

---

## Intégration Laravel ↔ Python

### Côté Laravel — `PythonMLClient.php`

```php
// Appel depuis AIService::suggestBestUser()
$result = $this->mlClient->recommend($task, $project->id, 1);
$bestId = $result['best_user_id'] ?? null;
```

Variables d'environnement Laravel :
```
ML_SERVICE_URL=https://votre-service.onrender.com
ML_SERVICE_TIMEOUT=10
```

### Côté Python — Variables d'environnement

```
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

En local, ces valeurs sont dans `python/ml/.env` (ignoré par git).  
En production (Render), elles sont définies dans le dashboard.

---

## Réponse complète d'une recommandation

```json
{
  "best_user_id": 5,
  "candidates": [
    {
      "user_id": 5,
      "name": "Alice Martin",
      "score": 78.4,
      "relative_score": 100,
      "feature_breakdown": {
        "specialty_exact_match": { "value": 1.0, "label": "Compétences exactes requises" },
        "current_task_load":     { "value": 0.75, "label": "Charge de travail actuelle" },
        "on_time_rate":          { "value": 0.88, "label": "Taux de livraison à temps (historique)" }
      },
      "stats": {
        "tasks_done": 14,
        "tasks_total": 17,
        "avg_hours": 6.2,
        "avg_days": 4.1,
        "on_time_pct": 85
      },
      "strengths":  ["Compétences exactes requises", "Livraison à temps récente"],
      "weaknesses": ["Charge de travail actuelle"]
    }
  ],
  "model_info": {
    "is_trained": true,
    "model_label": "GBM+RF Ensemble",
    "n_samples": 87,
    "accuracy": 0.821,
    "f1": 0.814,
    "feature_count": 22
  }
}
```

---

## Déploiement

| Environnement | URL | Commande |
|---------------|-----|---------|
| Local | `http://127.0.0.1:8001` | `uvicorn app:app --reload --port 8001` |
| Render | `https://xxx.onrender.com` | `uvicorn main:app --host 0.0.0.0 --port 10000` |

**Root directory sur Render :** `python/ml`  
**Build command :** `pip install -r requirements.txt`  
**Python version :** 3.11.9 (forcé via `runtime.txt`)
