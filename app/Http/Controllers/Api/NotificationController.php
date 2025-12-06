<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get all notifications for admin/staff
     */
    public function index(Request $request)
    {
        $query = Notification::query()->where('user_id', Auth::id());

        // Filter by read status
        if ($request->has('status')) {
            if ($request->status === 'unread') {
                $query->unread();
            } elseif ($request->status === 'read') {
                $query->read();
            }
        }

        // Filter by type
        if ($request->has('type') && $request->type !== 'all') {
            $query->ofType($request->type);
        }

        // Filter by priority
        if ($request->has('priority')) {
            $query->byPriority($request->priority);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $notifications = $query->paginate($perPage);

        // Get counts
        $counts = [
            'total' => Notification::where('user_id', Auth::id())->count(),
            'unread' => Notification::where('user_id', Auth::id())->unread()->count(),
            'read' => Notification::where('user_id', Auth::id())->read()->count(),
            'urgent' => Notification::where('user_id', Auth::id())
                ->where('priority', Notification::PRIORITY_URGENT)
                ->unread()
                ->count()
        ];

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'counts' => $counts
        ]);
    }

    /**
     * Get notifications for customer
     */
    public function customerNotifications(Request $request)
    {
        return $this->index($request);
    }

    /**
     * Get unread notification count
     */
    public function getUnreadCount()
    {
        $count = Notification::where('user_id', Auth::id())
            ->unread()
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }

    /**
     * Get recent notifications (for dropdown/bell icon)
     */
    public function getRecent(Request $request)
    {
        $limit = $request->input('limit', 5);
        
        $notifications = Notification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        $unreadCount = Notification::where('user_id', Auth::id())
            ->unread()
            ->count();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Mark single notification as read
     */
    public function markAsRead($id)
    {
        $notification = Notification::where('_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'notification' => $notification
        ]);
    }

    /**
     * Mark single notification as unread
     */
    public function markAsUnread($id)
    {
        $notification = Notification::where('_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $notification->markAsUnread();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as unread',
            'notification' => $notification
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead()
    {
        Notification::where('user_id', Auth::id())
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Mark multiple notifications as read
     */
    public function markMultipleAsRead(Request $request)
    {
        $request->validate([
            'notification_ids' => 'required|array',
            'notification_ids.*' => 'required|string'
        ]);

        Notification::whereIn('_id', $request->notification_ids)
            ->where('user_id', Auth::id())
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Selected notifications marked as read'
        ]);
    }

    /**
     * Delete single notification
     */
    public function destroy($id)
    {
        $notification = Notification::where('_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted successfully'
        ]);
    }

    /**
     * Delete multiple notifications
     */
    public function destroyMultiple(Request $request)
    {
        $request->validate([
            'notification_ids' => 'required|array',
            'notification_ids.*' => 'required|string'
        ]);

        Notification::whereIn('_id', $request->notification_ids)
            ->where('user_id', Auth::id())
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Selected notifications deleted successfully'
        ]);
    }

    /**
     * Delete all read notifications
     */
    public function deleteAllRead()
    {
        Notification::where('user_id', Auth::id())
            ->read()
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'All read notifications deleted successfully'
        ]);
    }

    /**
     * Get notification statistics
     */
    public function getStats()
    {
        $userId = Auth::id();

        $stats = [
            'total' => Notification::where('user_id', $userId)->count(),
            'unread' => Notification::where('user_id', $userId)->unread()->count(),
            'read' => Notification::where('user_id', $userId)->read()->count(),
            'today' => Notification::where('user_id', $userId)
                ->whereDate('created_at', today())
                ->count(),
            'this_week' => Notification::where('user_id', $userId)
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'by_type' => Notification::where('user_id', $userId)
                ->selectRaw('type, count(*) as count')
                ->groupBy('type')
                ->get()
                ->pluck('count', 'type'),
            'by_priority' => Notification::where('user_id', $userId)
                ->selectRaw('priority, count(*) as count')
                ->groupBy('priority')
                ->get()
                ->pluck('count', 'priority')
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}