"""
Shared constants: default weights and human-readable feature labels.
Imported by recommender.py and app.py.
"""

DEFAULT_WEIGHTS: dict[str, float] = {
    # Skill match
    "specialty_exact_match":   4.0,
    "specialty_partial_match": 2.5,
    "specialty_breadth":       0.5,
    # Workload
    "current_task_load":       2.5,
    "capacity_utilization":    1.5,
    "overdue_ratio_inv":       1.5,
    # Historical performance
    "overall_completion_rate": 2.0,
    "on_time_rate":            2.5,
    "hours_accuracy":          0.8,
    # Task-specific affinity
    "same_priority_success":   1.5,
    "same_type_success":       1.2,
    "complexity_affinity":     1.0,
    # Context
    "project_familiarity":     1.5,
    "team_familiarity":        0.8,
    "project_role_weight":     0.5,
    # Trend
    "recent_velocity":         1.0,
    "performance_trend":       1.5,
    "recent_on_time_rate":     2.0,
    # Risk
    "at_risk_tasks_inv":       1.2,
    "experience_depth":        0.8,
    "collaboration_score":     0.8,
    "sprint_alignment":        0.6,
}

FEATURE_LABELS: dict[str, str] = {
    "specialty_exact_match":   "Compétences exactes requises",
    "specialty_partial_match": "Compétences partiellement correspondantes",
    "specialty_breadth":       "Polyvalence (nb de spécialités)",
    "current_task_load":       "Charge de travail actuelle",
    "capacity_utilization":    "Bande passante d'allocation",
    "overdue_ratio_inv":       "Ratio de tâches non-en-retard",
    "overall_completion_rate": "Taux de complétion global",
    "on_time_rate":            "Taux de livraison à temps (historique)",
    "hours_accuracy":          "Précision d'estimation des heures",
    "same_priority_success":   "Succès sur même niveau de priorité",
    "same_type_success":       "Succès sur même type de tâche",
    "complexity_affinity":     "Affinité avec la complexité requise",
    "project_familiarity":     "Familiarité avec ce projet",
    "team_familiarity":        "Historique de travail avec l'équipe",
    "project_role_weight":     "Niveau de rôle dans le projet",
    "recent_velocity":         "Vélocité récente (30 jours)",
    "performance_trend":       "Tendance de performance",
    "recent_on_time_rate":     "Livraison à temps récente (30 jours)",
    "at_risk_tasks_inv":       "Absence de tâches à risque",
    "experience_depth":        "Profondeur d'expérience",
    "collaboration_score":     "Score de collaboration",
    "sprint_alignment":        "Alignement sprint actuel",
}
