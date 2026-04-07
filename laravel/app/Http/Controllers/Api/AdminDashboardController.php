<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class AdminDashboardController extends Controller
{
    public function __construct(
        private readonly AdminDashboardService $adminDashboardService,
    ) {}

    /**
     * Indicateurs globaux (administrateurs applicatifs).
     */
    public function index(): JsonResponse
    {
        $payload = Cache::remember(
            AdminDashboardService::CACHE_KEY,
            AdminDashboardService::CACHE_TTL_SECONDS,
            fn () => $this->adminDashboardService->buildPayload()
        );

        return response()->json([
            'dashboard' => $payload,
        ]);
    }
}
