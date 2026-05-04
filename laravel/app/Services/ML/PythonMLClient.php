<?php

namespace App\Services\ML;

use App\Models\Task;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * HTTP client for the FastAPI Python ML microservice (port 8001).
 *
 * Config key: ML_SERVICE_URL (default http://127.0.0.1:8001)
 */
class PythonMLClient
{
    private string $baseUrl;
    private int    $timeoutSeconds;

    public function __construct()
    {
        $this->baseUrl        = rtrim(config('services.ml_python.url', 'http://127.0.0.1:8001'), '/');
        $this->timeoutSeconds = (int) config('services.ml_python.timeout', 3);
    }

    public function recommendForNewTask(array $taskAttributes, int $projectId, int $topN = 5): array
    {
        $payload = array_merge($taskAttributes, [
            'project_id' => $projectId,
            'top_n'      => $topN,
        ]);

        return $this->post('/recommend', $payload) ?? $this->unavailableResponse();
    }

    public function recommend(Task $task, ?int $projectId = null, int $topN = 5): array
    {
        return $this->get("/recommend/{$task->id}", ['top_n' => $topN]) ?? $this->unavailableResponse();
    }

    public function modelInfo(): array
    {
        return $this->get('/model-info') ?? [
            'is_trained'    => false,
            'weight_source' => 'unavailable',
            'feature_count' => 22,
            'error'         => 'Python ML service unreachable',
        ];
    }

    public function retrain(): array
    {
        return $this->post('/train', []) ?? [
            'status'  => 'error',
            'message' => 'Python ML service unreachable. Start uvicorn first.',
        ];
    }

    public function recordOutcome(Task $task): void
    {
        $onTime  = $task->due_date && $task->updated_at?->lte($task->due_date);
        $hoursOk = !$task->estimated_hours || !$task->actual_hours
            || ($task->actual_hours / max($task->estimated_hours, 0.1)) <= 1.3;

        $this->post("/feedback/{$task->id}", [
            'task_id'  => $task->id,
            'on_time'  => $onTime,
            'hours_ok' => $hoursOk,
        ]);
    }

    // -------------------------------------------------------------------------
    // HTTP helpers
    // -------------------------------------------------------------------------

    private function post(string $path, array $payload): ?array
    {
        try {
            $res = Http::timeout($this->timeoutSeconds)
                ->post($this->baseUrl . $path, $payload);

            if ($res->successful()) {
                return $res->json();
            }

            Log::warning('[ML] Python service returned ' . $res->status() . ' on POST ' . $path, [
                'body' => $res->body(),
            ]);
            return null;
        } catch (\Throwable $e) {
            Log::debug('[ML] Python service unreachable on POST ' . $path . ': ' . $e->getMessage());
            return null;
        }
    }

    private function get(string $path, array $query = []): ?array
    {
        try {
            $res = Http::timeout($this->timeoutSeconds)
                ->get($this->baseUrl . $path, $query);

            if ($res->successful()) {
                return $res->json();
            }

            return null;
        } catch (\Throwable $e) {
            Log::debug('[ML] Python service unreachable on GET ' . $path . ': ' . $e->getMessage());
            return null;
        }
    }

    private function unavailableResponse(): array
    {
        return [
            'best_user_id' => null,
            'candidates'   => [],
            'model_info'   => [
                'is_trained'    => false,
                'weight_source' => 'unavailable',
                'error'         => 'Python ML service is not running. Start it with: uvicorn app:app --port 8001',
            ],
        ];
    }
}
