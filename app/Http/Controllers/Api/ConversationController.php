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
        // Use the default auth (should work for customers)
        $customer = Auth::user();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        try {
            $conversations = Conversation::where('customer_id', (string)$customer->_id)
                ->with('admin')
                ->orderBy('last_message_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'conversations' => $conversations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to load conversations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new conversation
     */
    public function store(Request $request)
    {
        $customer = Auth::user();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:prescription_inquiry,order_concern,general_support,complaint,product_inquiry',
            'title' => 'nullable|string',
        ]);

        try {
            $conversation = Conversation::create([
                'customer_id' => (string)$customer->_id,
                'admin_id' => null, // Will be assigned by admin
                'title' => $validated['title'] ?? $this->getDefaultTitle($validated['type']),
                'type' => $validated['type'],
                'status' => 'pending', // Start as pending until admin responds
                'priority' => 'normal',
                'messages' => [],
                'last_message_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'conversation' => $conversation
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to create conversation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get conversation details
     */
    public function show($id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        try {
            $conversation = Conversation::findOrFail($id);

            // Check if user has access to this conversation
            if ($user->role === 'customer' && (string)$conversation->customer_id !== (string)$user->_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Forbidden'
                ], 403);
            }

            // Load relationships
            $conversation->load(['customer', 'admin']);

            // Filter out internal notes for customers
            if ($user->role === 'customer') {
                $messages = collect($conversation->messages)->filter(function ($message) {
                    return !($message['is_internal_note'] ?? false);
                })->values()->all();

                $conversation->messages = $messages;
            }

            return response()->json([
                'success' => true,
                'conversation' => $conversation
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to load conversation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send message
     */
    public function sendMessage(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        $validated = $request->validate([
            'message' => 'required_without:attachments|string|max:5000',
            'message_type' => 'nullable|string|in:text,file,image,system',
            'is_internal_note' => 'nullable',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // 10MB max
        ]);

        try {
            $conversation = Conversation::findOrFail($id);

            // Check access
            if ($user->role === 'customer' && (string)$conversation->customer_id !== (string)$user->_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Forbidden'
                ], 403);
            }

            // Customers cannot send internal notes
            if ($user->role === 'customer' && ($validated['is_internal_note'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Forbidden'
                ], 403);
            }

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
                'sender_type' => $user->role === 'customer' ? 'customer' : 'admin',
                'sender_id' => (string)$user->_id,
                'message' => $validated['message'] ?? '',
                'message_type' => $validated['message_type'] ?? ($attachments ? 'file' : 'text'),
                'attachments' => $attachments,
                'is_internal_note' => filter_var($request->input('is_internal_note', false), FILTER_VALIDATE_BOOLEAN),
            ];

            $message = $conversation->addMessage($messageData);

            // Update conversation status to active if it was pending
            if ($conversation->status === 'pending' && $user->role !== 'customer') {
                $conversation->status = 'active';
                $conversation->save();
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'conversation' => $conversation->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to send message',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark conversation as read
     */
    public function markAsRead($id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        try {
            $conversation = Conversation::findOrFail($id);

            // Check access
            if ($user->role === 'customer' && (string)$conversation->customer_id !== (string)$user->_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Forbidden'
                ], 403);
            }

            $userType = $user->role === 'customer' ? 'customer' : 'admin';
            $conversation->markMessagesAsRead((string)$user->_id, $userType);

            return response()->json([
                'success' => true,
                'message' => 'Marked as read'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to mark as read',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update conversation status
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:active,resolved,closed,pending',
        ]);

        try {
            $conversation = Conversation::findOrFail($id);

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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update status',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unread count for user
     */
    public function getUnreadCount()
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized'
            ], 401);
        }

        try {
            $userType = $user->role === 'customer' ? 'customer' : 'admin';
            $query = Conversation::query();

            if ($user->role === 'customer') {
                $query->where('customer_id', (string)$user->_id);
            } else {
                $query->where('admin_id', (string)$user->_id);
            }

            $conversations = $query->get();

            $unreadCount = $conversations->sum(function ($conversation) use ($user, $userType) {
                return $conversation->getUnreadCount((string)$user->_id, $userType);
            });

            return response()->json([
                'success' => true,
                'unread_count' => $unreadCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get unread count',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get default title for conversation type
     */
    private function getDefaultTitle($type)
    {
        $titles = [
            'prescription_inquiry' => 'Prescription Inquiry',
            'order_concern' => 'Order Concern',
            'general_support' => 'General Support',
            'complaint' => 'Complaint',
            'product_inquiry' => 'Product Inquiry'
        ];

        return $titles[$type] ?? 'New Conversation';
    }
}
