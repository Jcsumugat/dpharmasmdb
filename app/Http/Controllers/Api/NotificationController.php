<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get notifications for current user
     */
    public function index(Request $request)
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;
        $recipientType = $isCustomer ? 'customer' : 'admin';

        $query = Notification::where('recipient_id', $user->_id)
                            ->where('recipient_type', $recipientType);

        // Filter by read status
        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $notifications = $query->orderBy('created_at', 'desc')
                              ->paginate(20);

        return response()->json([
            'success' => true,
            'notifications' => $notifications
        ]);
    }

    /**
     * Get unread count
     */
    public function unreadCount()
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;
        $recipientType = $isCustomer ? 'customer' : 'admin';

        $count = Notification::where('recipient_id', $user->_id)
                            ->where('recipient_type', $recipientType)
                            ->where('is_read', false)
                            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $count
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($id)
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $notification = Notification::where('_id', $id)
                                   ->where('recipient_id', $user->_id)
                                   ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'notification' => $notification
        ]);
    }

    /**
     * Mark all as read
     */
    public function markAllAsRead()
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;
        $recipientType = $isCustomer ? 'customer' : 'admin';

        $updated = Notification::where('recipient_id', $user->_id)
                              ->where('recipient_type', $recipientType)
                              ->where('is_read', false)
                              ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json([
            'success' => true,
            'updated_count' => $updated
        ]);
    }

    /**
     * Delete notification
     */
    public function destroy($id)
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $notification = Notification::where('_id', $id)
                                   ->where('recipient_id', $user->_id)
                                   ->firstOrFail();

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted'
        ]);
    }

    /**
     * Create notification (for system use)
     */
    public static function create($recipientId, $recipientType, $title, $message, $type = 'general', $referenceType = null, $referenceId = null)
    {
        return Notification::createForUser(
            $recipientId,
            $title,
            $message,
            $type,
            $referenceType,
            $referenceId,
            $recipientType
        );
    }
}
