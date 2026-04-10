<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client OpenRouter : accès aux LLMs (Llama, Mistral, GPT-4o, etc.) via une API unifiée.
 */
class OpenRouterService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://openrouter.ai/api/v1';

    /** Modèles de secours si le modèle principal est rate-limité ou indisponible */
    private const FALLBACK_MODELS = [
        'openai/gpt-oss-20b:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'liquid/lfm-2.5-1.2b-instruct:free',
        'google/gemma-3-12b-it:free',
        'nousresearch/hermes-3-llama-3.1-405b:free',
    ];

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.api_key', '');
        $this->model  = config('services.openrouter.model', 'google/gemma-3-27b-it:free');
    }

    public function isAvailable(): bool
    {
        return $this->apiKey !== '';
    }

    /**
     * Appel au modèle avec fallback automatique sur rate-limit (429).
     */
    public function chat(string $userMessage, string $systemPrompt = '', int $maxTokens = 800): ?string
    {
        if (! $this->isAvailable()) {
            return null;
        }

        $messages = [];
        if ($systemPrompt !== '') {
            $messages[] = ['role' => 'system', 'content' => $systemPrompt];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        // Liste des modèles à essayer : modèle configuré + fallbacks (sans doublons)
        $candidates = array_unique(array_merge([$this->model], self::FALLBACK_MODELS));

        foreach ($candidates as $model) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer '.$this->apiKey,
                    'HTTP-Referer'  => config('app.url', 'http://localhost:8000'),
                    'X-Title'       => config('app.name', 'Gestion Projets PFE'),
                ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                    'model'       => $model,
                    'messages'    => $messages,
                    'max_tokens'  => $maxTokens,
                    'temperature' => 0.3,
                ]);

                if ($response->successful()) {
                    return $response->json('choices.0.message.content');
                }

                // Rate-limit ou modèle introuvable : essayer le suivant
                if (in_array($response->status(), [429, 404], true)) {
                    Log::info('[OpenRouter] Modèle '.$model.' indisponible ('.$response->status().'), passage au suivant.');
                    continue;
                }

                Log::warning('[OpenRouter] Erreur API', [
                    'model'  => $model,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;

            } catch (\Throwable $e) {
                Log::error('[OpenRouter] Exception HTTP', ['model' => $model, 'error' => $e->getMessage()]);
                return null;
            }
        }

        Log::warning('[OpenRouter] Tous les modèles sont rate-limités.');
        return null;
    }

    /**
     * Analyse de risque enrichie par IA pour une tâche.
     *
     * @param  array<string, mixed>  $taskContext
     * @return array{insights: array<int,string>, recommendations: array<int,string>}
     */
    public function enrichTaskRisk(array $taskContext): array
    {
        $system = <<<'SYS'
Tu es un expert en gestion de projet. Analyse la tâche fournie et génère :
1. 2 à 3 insights concis sur les risques (en français, ≤ 20 mots chacun).
2. 2 à 3 recommandations actionnables (en français, ≤ 25 mots chacune).
Réponds UNIQUEMENT en JSON valide avec les clés "insights" (tableau) et "recommendations" (tableau). Sans Markdown.
SYS;

        $prompt = json_encode($taskContext, JSON_UNESCAPED_UNICODE);
        $raw = $this->chat($prompt, $system, 400);

        return $this->parseJsonResponse($raw, ['insights' => [], 'recommendations' => []]);
    }

    /**
     * Justification IA de l'estimation d'une tâche.
     */
    public function justifyEstimate(array $taskContext): string
    {
        $system = <<<'SYS'
Tu es un expert en estimation de tâches logicielles. En une phrase claire et concise (max 40 mots, en français),
justifie l'estimation de durée fournie en tenant compte du contexte de la tâche.
Réponds uniquement avec la phrase de justification, sans Markdown ni guillemets.
SYS;

        $prompt = json_encode($taskContext, JSON_UNESCAPED_UNICODE);
        $result = $this->chat($prompt, $system, 150);

        return $result ?? 'Estimation calculée à partir des règles métier et de l\'historique du projet.';
    }

    /**
     * Synthèse et recommandations IA pour un projet.
     *
     * @param  array<string, mixed>  $projectContext
     * @return array{synthesis: string, actions: array<int,string>}
     */
    public function synthesizeProject(array $projectContext): array
    {
        $system = <<<'SYS'
Tu es un expert en gestion de projet agile. À partir des métriques fournies, génère :
1. Une synthèse professionnelle du projet (2-3 phrases, en français).
2. 3 à 4 actions prioritaires concrètes et actionnables (en français, ≤ 30 mots chacune).
Réponds UNIQUEMENT en JSON valide avec les clés "synthesis" (chaîne) et "actions" (tableau). Sans Markdown.
SYS;

        $prompt = json_encode($projectContext, JSON_UNESCAPED_UNICODE);
        $raw = $this->chat($prompt, $system, 600);

        return $this->parseJsonResponse($raw, ['synthesis' => '', 'actions' => []]);
    }

    /**
     * Réponse libre à une question sur le projet (mode assistant conversationnel).
     */
    public function askAboutProject(string $question, array $projectContext = []): string
    {
        $system = <<<'SYS'
Tu es un assistant de gestion de projet. Règles strictes :
- Pour les salutations ou questions simples (ex: "bonjour", "merci", "ça va") : réponds en 1 phrase courte, naturelle, sans liste ni structure.
- Pour les questions métier (risques, priorités, planning, équipe) : réponds de façon concise et structurée avec des puces si nécessaire.
- N'utilise jamais de titres gras pour les réponses simples.
- Maximum 4 points si tu fais une liste.
- Ne génère pas de code. Réponds toujours en français.
SYS;

        $contextPart = $projectContext !== []
            ? "\n\nContexte du projet :\n".json_encode($projectContext, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            : '';

        $result = $this->chat($question.$contextPart, $system, 800);

        return $result ?? 'Je n\'ai pas pu traiter cette demande. Veuillez réessayer.';
    }

    /**
     * Analyse du risque de charge de travail d'un membre.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @return array<int, string>
     */
    public function analyzeWorkload(array $members): array
    {
        $system = <<<'SYS'
Tu es un expert RH en gestion d'équipes projet. À partir des métriques de charge fournies,
génère 2 à 4 recommandations concrètes et actionnables pour rééquilibrer la charge (en français, ≤ 30 mots chacune).
Réponds UNIQUEMENT en JSON valide : tableau de chaînes. Sans Markdown.
SYS;

        $raw = $this->chat(json_encode($members, JSON_UNESCAPED_UNICODE), $system, 400);
        if ($raw === null) {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return array_values(array_filter($decoded, 'is_string'));
        }

        return [];
    }

    /**
     * Parse une réponse JSON du LLM avec un fallback en cas d'échec.
     *
     * @template T
     * @param  T  $fallback
     * @return T
     */
    private function parseJsonResponse(?string $raw, mixed $fallback): mixed
    {
        if ($raw === null) {
            return $fallback;
        }

        // Supprime les blocs Markdown si le modèle en génère malgré la consigne
        $clean = preg_replace('/^```(?:json)?\s*/m', '', $raw);
        $clean = preg_replace('/\s*```$/m', '', $clean ?? $raw);

        $decoded = json_decode(trim($clean ?? ''), true);

        return is_array($decoded) ? $decoded : $fallback;
    }
}
