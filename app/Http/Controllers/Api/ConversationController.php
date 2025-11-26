<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ConversationController extends Controller
{
    /**
     * Get conversations (Admin view)
     */
    public function index(Request $request)
    {
        $query = Conversation::query();

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by assigned admin
        if ($request->has('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }

        $conversations = $query->with(['customer', 'admin'])
                              ->orderBy('last_message_at', 'desc')
                              ->paginate(20);

        return response()->json([
            'success' => true,
            'conversations' => $conversations
        ]);
    }

    /**
     * Get customer's conversations
     */
    public function customerConversations()
    {
        $customer = Auth::guard('customer')->user();

        if (!$customer) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $conversations = Conversation::where('customer_id', $customer->_id)
                                    ->with('admin')
                                    ->orderBy('last_message_at', 'desc')
                                    ->get();

        return response()->json([
            'success' => true,
            'conversations' => $conversations
        ]);
    }

    /**
     * Find or create conversation
     */
    public function findOrCreate(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|string',
            'type' => 'required|string|in:prescription_inquiry,order_concern,general_support,complaint,product_inquiry',
            'title' => 'nullable|string',
        ]);

        // Check for existing active conversation
        $conversation = Conversation::where('customer_id', $validated['customer_id'])
                                   ->whereIn('status', ['active', 'pending'])
                                   ->first();

        if (!$conversation) {
            $customer = User::findOrFail($validated['customer_id']);

            $conversation = Conversation::create([
                'customer_id' => $validated['customer_id'],
                'admin_id' => auth()->id(), // Current admin
                'title' => $validated['title'] ?? "Chat with {$customer->name}",
                'type' => $validated['type'],
                'status' => 'active',
                'priority' => 'normal',
                'messages' => [],
                'last_message_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'conversation' => $conversation->load(['customer', 'admin'])
        ]);
    }

    /**
     * Get conversation messages
     */
    public function getMessages($conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        // Authorize access
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Customer can only view their own conversations
        if ($user instanceof \App\Models\Customer && $user->_id != $conversation->customer_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $messages = collect($conversation->messages)->filter(function($message) use ($user) {
            // Filter out internal notes for customers
            if ($user instanceof \App\Models\Customer) {
                return !($message['is_internal_note'] ?? false);
            }
            return true;
        })->values();

        return response()->json([
            'success' => true,
            'messages' => $messages,
            'conversation' => $conversation
        ]);
    }

    /**
     * Send message
     */
    public function sendMessage(Request $request, $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $validated = $request->validate([
            'message' => 'required_without:attachments|string',
            'message_type' => 'nullable|string|in:text,file,image,system',
            'is_internal_note' => 'nullable|boolean',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;

        // Customers cannot send internal notes
        if ($isCustomer && ($validated['is_internal_note'] ?? false)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        try {
            $attachments = [];

            // Handle file attachments
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('chat-attachments/' . date('Y/m'), 'public');

                    $attachments[] = [
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'file_type' => $file->getClientOriginalExtension(),
                        'mime_type' => $file->getMimeType(),
                    ];
                }
            }

            $messageData = [
                'sender_type' => $isCustomer ? 'customer' : 'admin',
                'sender_id' => $user->_id,
                'message' => $validated['message'] ?? '',
                'message_type' => $validated['message_type'] ?? ($attachments ? 'file' : 'text'),
                'attachments' => $attachments,
                'is_internal_note' => $validated['is_internal_note'] ?? false,
            ];

            $message = $conversation->addMessage($messageData);

            return response()->json([
                'success' => true,
                'message' => $message,
                'conversation' => $conversation->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send message: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark conversation as read
     */
    public function markAsRead($conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;
        $userType = $isCustomer ? 'customer' : 'admin';

        $conversation->markMessagesAsRead($user->_id, $userType);

        return response()->json([
            'success' => true,
            'message' => 'Marked as read'
        ]);
    }

    /**
     * Update conversation status
     */
    public function updateStatus(Request $request, $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $validated = $request->validate([
            'status' => 'required|string|in:active,resolved,closed,pending',
        ]);

        $conversation->update(['status' => $validated['status']]);

        // Add system message
        $conversation->addMessage([
            'sender_type' => 'system',
            'sender_id' => null,
            'message' => "Conversation marked as {$validated['status']}",
            'message_type' => 'system',
        ]);

        return response()->json([
            'success' => true,
            'conversation' => $conversation->fresh()
        ]);
    }

    /**
     * Get unread count for user
     */
    public function getUnreadCount()
    {
        $user = Auth::user() ?? Auth::guard('customer')->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $isCustomer = $user instanceof \App\Models\Customer;
        $userType = $isCustomer ? 'customer' : 'admin';

        $query = Conversation::query();

        if ($isCustomer) {
            $query->where('customer_id', $user->_id);
        } else {
            $query->where('admin_id', $user->_id);
        }

        $conversations = $query->get();

        $unreadCount = $conversations->sum(function($conversation) use ($user, $userType) {
            return $conversation->getUnreadCount($user->_id, $userType);
        });

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount
        ]);
    }
}
