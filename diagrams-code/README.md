# Codes sources PlantUML — TAC-TIC IntelliPM

Ce dossier contient tous les diagrammes UML du rapport PFE en format PlantUML (`.puml`).

## Structure

```
diagrams-code/
├── ch2/          # Chapitre 2 — Étude préliminaire
├── sprint1/      # Sprint 1 — Gestion des utilisateurs
├── sprint2/      # Sprint 2 — Gestion des projets et équipes
├── sprint3/      # Sprint 3 — Gestion des tâches et Kanban
├── sprint4/      # Sprint 4 — Planification visuelle et notifications
└── sprint5/      # Sprint 5 — Intelligence artificielle
```

## Export en PNG

### Option 1 — CLI PlantUML (jar)
```bash
# Installer Java 11+ et télécharger plantuml.jar
# https://plantuml.com/download

# Exporter un fichier
java -jar plantuml.jar -tpng diagrams-code/sprint1/use_case.puml -o ../rapport-latex/figures/

# Exporter tous les fichiers d'un dossier
java -jar plantuml.jar -tpng "diagrams-code/**/*.puml" -o rapport-latex/figures/
```

### Option 2 — Extension VS Code
Installer **PlantUML** (jebbs.plantuml), ouvrir un `.puml` et `Alt+D` pour prévisualiser.
Clic droit → "Export Current Diagram" → PNG → sauvegarder dans `rapport-latex/figures/`.

### Option 3 — PlantUML Online
Coller le contenu du `.puml` sur https://www.plantuml.com/plantuml/uml/
puis télécharger en PNG.

## Nommage des fichiers exportés

| Fichier `.puml` | Fichier PNG attendu dans `figures/` |
|-----------------|-------------------------------------|
| `ch2/global_use_case.puml` | `ch2_global_use_case.png` |
| `ch2/class_diagram_global.puml` | `ch2_class_diagram.png` |
| `sprint1/use_case.puml` | `sprint1_use_case.png` |
| `sprint1/sequence_login.puml` | `sprint1_sequence_login.png` |
| `sprint1/class_diagram.puml` | `sprint1_class.png` |
| `sprint2/use_case.puml` | `sprint2_use_case.png` |
| `sprint2/sequence_invite.puml` | `sprint2_sequence_invite.png` |
| `sprint2/class_diagram.puml` | `sprint2_class.png` |
| `sprint3/use_case.puml` | `sprint3_use_case.png` |
| `sprint3/sequence_kanban.puml` | `sprint3_sequence_kanban.png` |
| `sprint3/class_diagram.puml` | `sprint3_class.png` |
| `sprint4/use_case.puml` | `sprint4_use_case.png` |
| `sprint4/sequence_notif.puml` | `sprint4_sequence_notif.png` |
| `sprint4/class_diagram.puml` | `sprint4_class.png` |
| `sprint5/use_case.puml` | `sprint5_use_case.png` |
| `sprint5/sequence_ml.puml` | `sprint5_sequence_ml.png` |
| `sprint5/class_diagram.puml` | `sprint5_class.png` |
