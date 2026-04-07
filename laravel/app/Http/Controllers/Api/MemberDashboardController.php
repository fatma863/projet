<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MemberDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MemberDashboardController extends Controller
{
    private const CACHE_TTL_SECONDS = 45;

    public function __construct(
        private readonly MemberDashboardService $memberDashboardService,
    ) {}

    /**
     * Tableau de bord membre : tâches assignées, charge, échéances, blocages Gantt.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $key = 'member_dashboard_'.$user->id;
        $payload = Cache::remember($key, self::CACHE_TTL_SECONDS, fn () => $this->memberDashboardService->buildPayload($user));

        return response()->json($payload);
    }

    /**
     * Sous-ensemble pour polling léger (même cache que index).
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $key = 'member_dashboard_'.$user->id;
        $payload = Cache::remember($key, self::CACHE_TTL_SECONDS, fn () => $this->memberDashboardService->buildPayload($user));

        return response()->json([
            'summary' => $payload['summary'],
        ]);
    }
}
