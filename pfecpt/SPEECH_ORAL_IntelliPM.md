# TAC-TIC IntelliPM — Speech Oral par Slide
> Présentation PFE — Fatma Rejeb — ISET Rades 2026  
> Durée estimée : 8 à 10 minutes

---

## ⬛ OUVERTURE (avant la Slide 1)

> *(Choisir une ouverture parmi les 5 proposées — Recommandation : Ouverture 2)*

**Ouverture recommandée :**

> Bonjour à toutes et à tous,
> C'est avec un grand plaisir que je me présente devant vous aujourd'hui pour vous présenter mon projet de fin d'études intitulé **TAC-TIC IntelliPM**, une plateforme intelligente de gestion de projets.
> Je souhaite tout d'abord exprimer ma sincère gratitude à mon encadrant pour son accompagnement, sa disponibilité et ses précieux conseils tout au long de ce travail.
> Mes remerciements s'adressent également aux membres du jury ainsi qu'au président du jury pour l'honneur qu'ils me font en évaluant ce travail.

---

## 🖼️ Slide 1 — Page de titre

**Speech :**
> Permettez-moi de vous présenter **TAC-TIC IntelliPM** — une plateforme SaaS de gestion de projets intelligente, développée dans le cadre de mon projet de fin d'études.
> Cette application combine un backend **Laravel 12**, un frontend **React 19**, un service de machine learning en **Python**, et une communication en temps réel via **WebSocket**.
> C'est une solution complète, pensée pour les équipes agiles modernes.

---

## 🖼️ Slide 2 — Plan de la présentation

**Speech :**
> Pour structurer ma présentation, je vais vous guider à travers sept grandes parties.
> Je commencerai par le **contexte et la problématique**, avant de vous présenter l'application dans sa globalité.
> Ensuite, j'aborderai l'**architecture technique**, puis je passerai en revue les **six sprints** réalisés.
> Je m'arrêterai plus longuement sur la partie **Intelligence Artificielle**, qui est au cœur du projet.
> Et je terminerai par les **résultats qualité** et ma **conclusion**.

---

## 🖼️ Slide 3 — Contexte & Problématique

**Speech :**
> Le point de départ de ce projet, c'est un constat simple : les équipes de développement souffrent d'une vraie **fragmentation des outils** — Excel pour les tâches, l'email pour les invitations, des tableaux blancs pour le suivi.
> Il n'y a pas de visibilité en temps réel, pas d'affectation intelligente des ressources, et aucune détection précoce des risques.
> Face à ces problèmes, nous avons développé **TAC-TIC IntelliPM** : une seule plateforme centralisée qui répond à tous ces besoins — temps réel, IA intégrée, RBAC granulaire et audit complet.

---

## 🖼️ Slide 4 — Présentation de l'application (KPIs)

**Speech :**
> Pour vous donner une idée de l'envergure du projet, voici quelques chiffres clés.
> L'application compte **6 sprints** réalisés, **29 contrôleurs API**, plus de **120 routes backend**, **25 modèles de base de données**, un moteur ML avec **22 features**, et **12 événements WebSocket** pour la communication en temps réel.
> Ce n'est pas un prototype — c'est une application **enterprise-grade**, fonctionnelle et déployable.

**Interprétation :**
> Ces chiffres montrent la complétude du projet. Chaque fonctionnalité est couverte de bout en bout, du backend au frontend, en passant par l'IA.

---

## 🖼️ Slide 5 — Architecture technique

**Speech :**
> L'architecture repose sur quatre couches distinctes.
> Le **frontend React 19** communique avec le **backend Laravel 12** via une API REST sécurisée par des tokens Sanctum.
> Laravel interroge ensuite la **base de données MySQL**, et délègue les calculs complexes au **service ML Python** hébergé sur FastAPI.
> En parallèle, un serveur **WebSocket Reverb** assure la communication en temps réel entre tous les clients connectés.
> Chaque couche est indépendante, ce qui rend l'architecture scalable et facile à maintenir.

**Interprétation :**
> Cette architecture distribuée assure une séparation claire des responsabilités — chaque service fait une chose et la fait bien.

---

## 🖼️ Slide 6 — Sprints 1 & 2

**Speech :**
> Les deux premiers sprints ont posé les **fondations de l'application**.
> Sprint 1 : j'ai mis en place l'authentification complète avec **Laravel Sanctum**, le système de rôles **Spatie**, et le dashboard avec les KPIs principaux.
> Sprint 2 : j'ai développé la gestion des projets et des équipes — création, invitation par email, rôles par projet, et un chef de projet visible directement sur chaque carte.
> Ces deux sprints ont établi la base sur laquelle tous les modules suivants sont construits.

---

## 🖼️ Slide 7 — Sprints 3 & 4

**Speech :**
> Sprint 3 s'attaque au cœur de la gestion de tâches : un **wizard en 4 étapes** pour créer une tâche, un **Kanban drag-and-drop**, des dépendances entre tâches avec détection de cycles, et les commentaires avec mentions @utilisateur.
> Sprint 4 apporte la **planification visuelle** : le diagramme de Gantt interactif avec déplacement de barres, l'algorithme du chemin critique CPM, et la synchronisation en temps réel via les 12 événements WebSocket.
> C'est à ce stade que l'application est devenue vraiment **collaborative et vivante**.

---

## 🖼️ Slide 8 — Sprint 5 — IA & ML

**Speech :**
> C'est le sprint qui donne son nom à la plateforme : **IntelliPM**.
> On a deux moteurs IA qui travaillent ensemble.
> D'un côté, un **LLM Llama 3.3 70B** via OpenRouter qui gère l'estimation narrative, la détection de risques, les recommandations et le chat assistant.
> De l'autre, un modèle **Machine Learning scikit-learn** entraîné sur **22 features** pour recommander le meilleur assigné pour chaque tâche.
> Ces 22 features couvrent les compétences, la charge de travail, l'historique de performance, l'affinité avec la tâche, et les tendances récentes.
> Le modèle s'améliore automatiquement à chaque tâche complétée grâce au mécanisme de feedback.

**Interprétation :**
> L'IA n'est pas un simple ajout cosmétique — elle est intégrée directement dans le workflow de création de tâche (étape 4 du wizard) et dans une page dédiée accessibles à tous les membres.

---

## 🖼️ Slide 9 — Sprint 6 — Audit · RBAC · Pause

**Speech :**
> Le dernier sprint a renforcé la dimension **enterprise** de la plateforme sur trois axes.
> D'abord, le **journal d'audit** : une timeline complète de toutes les actions, avec avant/après, niveaux de sévérité, analytics 28 jours, export CSV et rapport PDF imprimable.
> Ensuite, le **RBAC granulaire** : plus de 30 permissions organisées par module, des rôles dynamiques personnalisables, et une matrice visuelle rôles × permissions.
> Enfin, le système de **Pause/Reprise de projet** : quand un projet est mis en pause, toutes les modifications sont bloquées au niveau du serveur avec un code HTTP 423. Seuls l'administrateur ou le chef de projet peuvent reprendre le projet.

---

## 🖼️ Slide 10 — Aperçu de l'interface

**Speech :**
> Voici un aperçu des principales interfaces de l'application.
> On retrouve le **dashboard** avec les métriques en temps réel, le **Kanban board** avec le drag-and-drop, le **Gantt interactif** avec le chemin critique, la **page IA** avec les recommandations ML, la **matrice des permissions** et le **journal d'audit** avec ses analytics.
> L'interface est entièrement en français, conçue avec TailwindCSS dans un style SaaS moderne, cohérent et professionnel.

---

## 🖼️ Slide 11 — Qualité du code — SonarCloud

**Speech :**
> Sur le plan de la qualité du code, nous avons soumis l'application à l'analyse **SonarCloud**, et les résultats sont très satisfaisants.
> **Zéro bug critique**, zéro vulnérabilité de niveau High, un taux de duplication de seulement **1,8 %** côté React et **2,1 %** côté Laravel, et une couverture de tests de **81 %** et **87,7 %** respectivement.
> Le **Quality Gate est Passed** sur les deux projets.

**Interprétation :**
> Ces résultats ne sont pas le fruit du hasard. Ils sont le résultat d'un travail de refactorisation actif : suppression de composants morts, extraction de composants partagés, et une batterie de tests unitaires et d'intégration.

---

## 🖼️ Slide 12 — Conclusion & Perspectives

**Speech :**
> Pour conclure, TAC-TIC IntelliPM est une plateforme complète, fonctionnelle et de niveau enterprise.
> En six sprints, nous avons livré une application full-stack avec IA hybride, temps réel, RBAC granulaire, audit complet et une qualité de code certifiée SonarCloud.
> En termes de perspectives, plusieurs évolutions sont envisagées : une **application mobile**, des **rapports planifiés**, un entraînement ML **continu et auto-adaptatif**, l'intégration d'un **SSO OAuth2** et un déploiement cloud complet.
> Ce projet m'a permis de maîtriser des technologies modernes et de comprendre les enjeux d'un logiciel enterprise en conditions réelles.

---

## 🖼️ Slide 13 — Merci / Questions

**Speech :**
> Je vous remercie sincèrement pour votre attention et le temps que vous m'avez accordé.
> J'espère que cette présentation vous a permis de mieux comprendre le projet TAC-TIC IntelliPM et les défis relevés tout au long de ce travail.
> Je suis maintenant disponible pour répondre à vos questions.

---

## ⬛ CLÔTURE

> *(Choisir une clôture — Recommandation : Clôture 4)*

**Clôture recommandée :**

> Je vous remercie chaleureusement pour votre attention et votre présence.
> J'espère que cette présentation vous a permis de mieux comprendre le sujet traité.
> Je reste maintenant à votre disposition pour toute question ou remarque.

---

## 📋 Récapitulatif timing estimé

| Slide | Contenu | Durée estimée |
|---|---|---|
| Ouverture | Remerciements + intro | 1 min |
| Slides 1–2 | Titre + Plan | 30 sec |
| Slide 3 | Problématique | 45 sec |
| Slide 4 | KPIs application | 30 sec |
| Slide 5 | Architecture | 1 min |
| Slides 6–7 | Sprints 1 à 4 | 1 min 30 sec |
| Slide 8 | IA & ML | 1 min 30 sec |
| Slide 9 | Sprint 6 | 1 min |
| Slides 10–11 | Interface + Qualité | 1 min |
| Slide 12 | Conclusion | 45 sec |
| Slide 13 + Clôture | Merci + questions | 30 sec |
| **TOTAL** | | **~10 min** |

---

> 💡 **Conseil** : Imprimez ce speech, surlignez les phrases clés, et entraînez-vous 3 fois à voix haute avant le jour J.
