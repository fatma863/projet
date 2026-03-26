<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Notification::where('user_id', Auth::id())
            ->orderByDesc('created_at');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'notifications' => NotificationResource::collection($notifications),
            'unread_count'  => Notification::where('user_id', Auth::id())->whereNull('read_at')->count(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'total'        => $notifications->total(),
            ],
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
}
