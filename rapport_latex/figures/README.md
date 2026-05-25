# Dossier `figures/`

Ce dossier contient toutes les images du rapport LaTeX.  
En l'absence d'une image, le rapport compile quand même grâce au pattern `\IfFileExists`.

## Liste des figures à insérer

### Pages de garde et préambule
| Fichier | Description |
|---------|-------------|
| `logo_iset.png` | Logo de l'ISET Sfax |
| `logo_tactic.png` | Logo TAC-TIC / Groupe New Ways |

### Chapitre 1
| Fichier | Description |
|---------|-------------|
| `organigramme_tactic.png` | Organigramme de l'entreprise TAC-TIC |
| `cycle_scrum.png` | Cycle Scrum : Product Backlog → Sprint → Incrément |

### Chapitre 2
| Fichier | Description |
|---------|-------------|
| `ch2_global_use_case.png` | Diagramme global des cas d'utilisation |
| `ch2_architecture_couches.png` | Architecture en 5 couches |
| `ch2_architecture_distribuee.png` | Architecture distribuée (déploiement) |
| `ch2_class_diagram.png` | Diagramme de classes global (18 entités) |
| `ch2_erd.png` | Schéma ERD (42 tables) |

### Sprint 1
| Fichier | Description |
|---------|-------------|
| `sprint1_use_case.png` | Cas d'utilisation Sprint 1 |
| `sprint1_sequence_login.png` | Séquence connexion Sanctum |
| `sprint1_class.png` | Diagramme de classes Sprint 1 |
| `sprint1_01_login.png` | Interface — Page de connexion |
| `sprint1_02_dashboard_kpi.png` | Interface — Dashboard KPI admin |
| `sprint1_03_dashboard_charts.png` | Interface — Dashboard charts |
| `sprint1_04_settings_profil.png` | Interface — Paramètres profil |
| `sprint1_07_settings_notifs.png` | Interface — Préférences notifications |

### Sprint 2
| Fichier | Description |
|---------|-------------|
| `sprint2_use_case.png` | Cas d'utilisation Sprint 2 |
| `sprint2_sequence_invite.png` | Séquence invitation email |
| `sprint2_class.png` | Diagramme de classes Sprint 2 |
| `sprint2_08_projects_list.png` | Interface — Liste des projets |
| `sprint2_09_project_kpi.png` | Interface — Dashboard projet KPI |
| `sprint2_10_project_charts.png` | Interface — Dashboard projet charts |
| `sprint2_11_teams.png` | Interface — Page Équipes |
| `sprint2_12_users_admin.png` | Interface — Administration utilisateurs |

### Sprint 3
| Fichier | Description |
|---------|-------------|
| `sprint3_use_case.png` | Cas d'utilisation Sprint 3 |
| `sprint3_sequence_kanban.png` | Séquence déplacement Kanban |
| `sprint3_class.png` | Diagramme de classes Sprint 3 |
| `sprint3_13_tasks_global.png` | Interface — Vue globale tâches |
| `sprint3_14_kanban.png` | Interface — Tableau Kanban |
| `sprint3_15_task_step1.png` | Interface — Wizard étape 1 |
| `sprint3_16_task_step2.png` | Interface — Wizard étape 2 |
| `sprint3_17_task_step3.png` | Interface — Wizard étape 3 |
| `sprint3_18_task_step4_ml.png` | Interface — Wizard étape 4 (IA) |

### Sprint 4
| Fichier | Description |
|---------|-------------|
| `sprint4_use_case.png` | Cas d'utilisation Sprint 4 |
| `sprint4_sequence_notif.png` | Séquence notification retard |
| `sprint4_class.png` | Diagramme de classes Sprint 4 |
| `sprint4_19_gantt.png` | Interface — Diagramme de Gantt |
| `sprint4_20_calendar.png` | Interface — Calendrier mensuel |
| `sprint4_21_notifications.png` | Interface — Centre de notifications |

### Sprint 5
| Fichier | Description |
|---------|-------------|
| `sprint5_use_case.png` | Cas d'utilisation Sprint 5 |
| `sprint5_sequence_ml.png` | Séquence pipeline ML |
| `sprint5_class.png` | Diagramme de classes Sprint 5 |
| `sprint5_22_ai_home.png` | Interface — Page IA accueil |
| `sprint5_23_ai_estimate.png` | Interface — Résultat estimation |
| `sprint5_25_ai_chat.png` | Interface — Chat assistant IA |

## Format recommandé
- **PNG** à 150 dpi minimum (300 dpi préféré pour impression)
- Largeur utile : 1600–2400 px (pour `width=0.85\textwidth` en A4)
- Fond blanc ou transparent

## Export depuis PlantUML
Voir `../../diagrams-code/README.md` pour la commande d'export.
