<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Support\ApiPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $uid   = Auth::id();
        $query = Notification::where('user_id', $uid)->orderByDesc('created_at');

        // Clients ne reçoivent que les notifications liées à leurs projets invités
        if (Auth::user()->hasRole('client')) {
            $query->whereIn('type', $this->clientAllowedTypes());
        }

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        if ($request->filled('type')) {
            $types = $this->expandNotificationTypes((string) $request->input('type'));
            if ($types !== []) {
                $query->whereIn('type', $types);
            }
        }

        $notifications = $query->paginate(ApiPagination::perPage($request));

        // Le compteur non-lu respecte aussi le filtre de rôle client
        $unreadQuery = Notification::where('user_id', $uid)->whereNull('read_at');
        if (Auth::user()->hasRole('client')) {
            $unreadQuery->whereIn('type', $this->clientAllowedTypes());
        }
        $unreadCount = $unreadQuery->count();

        return response()->json([
            'notifications' => NotificationResource::collection($notifications),
            'unread_count'  => $unreadCount,
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'total'        => $notifications->total(),
            ],
        ]);
    }

    /**
     * Polling léger : compteur + derniers éléments.
     */
    public function summary(Request $request): JsonResponse
    {
        $uid = Auth::id();

        $scoped = Notification::query()->where('user_id', $uid);

        // Clients ne reçoivent que les notifications liées à leurs projets invités
        if (Auth::user()->hasRole('client')) {
            $scoped->whereIn('type', $this->clientAllowedTypes());
        }

        if ($request->filled('type')) {
            $types = $this->expandNotificationTypes((string) $request->input('type'));
            if ($types !== []) {
                $scoped->whereIn('type', $types);
            }
        }

        $unread = (clone $scoped)->whereNull('read_at')->count();
        $latest = (clone $scoped)->orderByDesc('created_at')->limit(12)->get();

        return response()->json([
            'unread_count' => $unread,
            'notifications' => NotificationResource::collection($latest),
        ]);
    }

    public function markAsRead(Notification $notification): JsonResponse
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403);
        }

        $notification->markAsRead();
        broadcast(new NotificationUpdated($notification->fresh()))->toOthers();

        return response()->json(['message' => 'Notification lue.']);
    }

    public function markAllAsRead(): JsonResponse
    {
        $unread = Notification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->get();

        Notification::whereIn('id', $unread->pluck('id'))
            ->update(['read_at' => now()]);

        foreach ($unread as $item) {
            $item->read_at = now();
            broadcast(new NotificationUpdated($item))->toOthers();
        }

        return response()->json(['message' => 'Toutes les notifications marquées comme lues.']);
    }

    /**
     * POST /notifications/read — body: { "notification_id": 1 } or { "all": true }
     */
    public function markReadFromBody(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            return $this->markAllAsRead();
        }

        $data = $request->validate([
            'notification_id' => 'required|integer|exists:notifications,id',
        ]);

        $notification = Notification::findOrFail($data['notification_id']);
        if ($notification->user_id !== Auth::id()) {
            abort(403);
        }

        $notification->markAsRead();
        broadcast(new NotificationUpdated($notification->fresh()))->toOthers();

        return response()->json(['message' => 'Notification lue.']);
    }

    /**
     * DELETE /notifications/{notification}
     */
    public function destroy(Notification $notification): JsonResponse
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification supprimée.']);
    }

    /**
     * DELETE /notifications — delete all read notifications for current user.
     */
    public function destroyRead(): JsonResponse
    {
        Notification::where('user_id', Auth::id())
            ->whereNotNull('read_at')
            ->delete();

        return response()->json(['message' => 'Notifications lues supprimées.']);
    }

    /**
     * GET /notifications/stats
     * Count per type (for the settings/analytics view).
     */
    public function stats(): JsonResponse
    {
        $uid   = Auth::id();
        $query = Notification::where('user_id', $uid);

        if (Auth::user()->hasRole('client')) {
            $query->whereIn('type', $this->clientAllowedTypes());
        }

        $counts = $query
            ->selectRaw('type, count(*) as total, sum(case when read_at is null then 1 else 0 end) as unread')
            ->groupBy('type')
            ->orderByDesc('total')
            ->get()
            ->keyBy('type');

        return response()->json(['data' => $counts]);
    }

    /**
     * Types de notifications autorisés pour le rôle client (liste blanche).
     * Seules les notifications liées au suivi du projet sont transmises.
     *
     * @return array<int, string>
     */
    private function clientAllowedTypes(): array
    {
        return [
            'project_created',
            'project_updated',
            'project_at_risk',
            'project_invitation',
            'invitation_received',
            'project_invitation_accepted',
        ];
    }

    /**
     * Filtres API : alias métier → types stockés en base.
     *
     * @return array<int, string>
     */
    private function expandNotificationTypes(string $raw): array
    {
        $parts = array_filter(array_map('trim', explode(',', $raw)));
        $out = [];

        foreach ($parts as $p) {
            $mapped = match ($p) {
                'task_overdue' => ['task_delayed'],
                'invitation' => ['project_invitation'],
                'comment_added' => ['comment_added'],
                default => [$p],
            };
            foreach ($mapped as $m) {
                $out[] = $m;
            }
        }

        return array_values(array_unique($out));
    }
}
