<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PrescriptionController extends Controller
{
    /**
     * Get prescriptions with filters (Admin view)
     */
    public function index(Request $request)
    {
        $query = Prescription::query()->with(['customer', 'order']);

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by order type
        if ($request->has('order_type') && $request->order_type !== 'all') {
            $query->where('order_type', $request->order_type);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('prescription_number', 'like', "%{$search}%")
                  ->orWhere('mobile_number', 'like', "%{$search}%");
            });
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $prescriptions = $query->paginate($request->input('per_page', 20));

        // Add statistics
        $stats = [
            'total' => Prescription::count(),
            'pending' => Prescription::where('status', 'pending')->count(),
            'approved' => Prescription::where('status', 'approved')->count(),
            'completed' => Prescription::where('status', 'completed')->count(),
            'declined' => Prescription::where('status', 'declined')->count(),
        ];

        return response()->json([
            'success' => true,
            'prescriptions' => $prescriptions,
            'stats' => $stats
        ]);
    }

    /**
     * Get customer's prescriptions
     */
    public function customerPrescriptions(Request $request)
    {
        $query = Prescription::query()
            ->where('customer_id', Auth::id())
            ->with('order');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $prescriptions = $query->orderBy('created_at', 'desc')
                              ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'prescriptions' => $prescriptions
        ]);
    }

    /**
     * Get single prescription with order details
     */
    public function show($id)
    {
        $prescription = Prescription::with(['customer', 'order'])->findOrFail($id);

        // Check authorization
        $user = Auth::user();
        if ($user->role === 'customer' && $user->_id != $prescription->customer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'prescription' => $prescription
        ]);
    }

    /**
     * Upload prescription (Customer action)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mobile_number' => 'required|string',
            'prescription_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string',
            'order_type' => 'required|in:prescription,online_order',
        ]);

        $customer = Auth::user();

        try {
            $file = $request->file('prescription_file');

            // Store file
            $path = $file->store('prescriptions/' . date('Y/m'), 'public');

            // Generate unique token
            $token = Str::random(32);

            // Generate prescription number
            $prescriptionNumber = $this->generatePrescriptionNumber($validated['order_type']);

            // Create prescription
            $prescription = Prescription::create([
                'prescription_number' => $prescriptionNumber,
                'customer_id' => $customer->_id,
                'file_path' => $path,
                'original_filename' => $file->getClientOriginalName(),
                'file_mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'is_encrypted' => false,
                'mobile_number' => $validated['mobile_number'],
                'notes' => $validated['notes'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => 'pending',
                'token' => $token,
                'items' => [],
            ]);

            // Notify admin/staff about new prescription
            NotificationService::notifyPrescriptionUploaded($prescription);

            return response()->json([
                'success' => true,
                'message' => 'Prescription uploaded successfully. Our staff will review it shortly.',
                'prescription' => $prescription,
                'token' => $token
            ], 201);
        } catch (\Exception $e) {
            Log::error('Prescription upload failed', [
                'customer_id' => $customer->_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload prescription. Please try again.'
            ], 500);
        }
    }

    /**
     * Approve prescription with items and create order (Admin action)
     */
    public function verify($id, Request $request)
    {
        $prescription = Prescription::findOrFail($id);

        if ($prescription->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending prescriptions can be approved'
            ], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.status' => 'required|string|in:available,out_of_stock',
            'admin_message' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            // Validate product availability
            $processedItems = [];
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($item['status'] === 'available' && !$product->canFulfillQuantity($item['quantity'])) {
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for {$product->product_name}"
                    ], 400);
                }

                $processedItems[] = [
                    'product_id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'brand_name' => $product->brand_name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'status' => $item['status'],
                ];
            }

            // Update prescription
            $prescription->update([
                'items' => $processedItems,
                'status' => 'approved',
                'admin_message' => $validated['admin_message'] ?? null,
                'notes' => isset($validated['notes']) ? $prescription->notes . "\nAdmin: " . $validated['notes'] : $prescription->notes,
            ]);

            // Calculate totals
            $subtotal = collect($processedItems)->sum('total_price');

            // Create order
            $order = Order::create([
                'order_id' => $prescription->prescription_number,
                'prescription_id' => $prescription->_id,
                'customer_id' => $prescription->customer_id,
                'items' => $processedItems,
                'status' => 'pending',
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            // Notify customer about prescription verification
            NotificationService::notifyPrescriptionVerified($prescription);

            return response()->json([
                'success' => true,
                'message' => 'Prescription approved and order created successfully',
                'prescription' => $prescription->fresh(['order']),
                'order' => $order
            ]);
        } catch (\Exception $e) {
            Log::error('Prescription approval failed', [
                'prescription_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve prescription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject prescription (Admin action)
     */
    public function reject($id, Request $request)
    {
        $prescription = Prescription::findOrFail($id);

        if ($prescription->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending prescriptions can be rejected'
            ], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $prescription->decline($validated['reason']);

        // Notify customer about prescription rejection
        NotificationService::notifyPrescriptionRejected($prescription, $validated['reason']);

        return response()->json([
            'success' => true,
            'message' => 'Prescription rejected',
            'prescription' => $prescription
        ]);
    }

    /**
     * Complete order/prescription (Admin action - process sale)
     */
    public function completeOrder($id, Request $request)
    {
        $prescription = Prescription::with('order')->findOrFail($id);

        if (!$prescription->order) {
            return response()->json([
                'success' => false,
                'message' => 'No order found for this prescription'
            ], 400);
        }

        $order = $prescription->order;

        if ($order->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Order already completed'
            ], 400);
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|in:cash,card,gcash',
            'amount_paid' => 'nullable|numeric|min:0',
        ]);

        try {
            // Process each item - reduce stock using FIFO
            foreach ($order->items as $item) {
                if ($item['status'] === 'available') {
                    $product = Product::findOrFail($item['product_id']);

                    // Reduce stock (FIFO)
                    $product->reduceStock($item['quantity'], 'sale');

                    // Record stock movement
                    StockMovement::recordMovement(
                        $product->_id,
                        StockMovement::TYPE_SALE,
                        -$item['quantity'],
                        'sale',
                        $order->_id,
                        "Order #{$order->order_id} - Prescription #{$prescription->prescription_number}"
                    );
                }
            }

            // Update order status
            $order->markAsCompleted();
            $order->update(['payment_method' => $validated['payment_method']]);

            // Update prescription status
            $prescription->complete();

            // Notify customer about order completion
            NotificationService::notifyOrderStatusChange($order, 'completed');

            // Notify about payment if amount is provided
            if (isset($validated['amount_paid'])) {
                NotificationService::notifyPaymentReceived($order);
            }

            return response()->json([
                'success' => true,
                'message' => 'Order completed successfully',
                'prescription' => $prescription->fresh(['order']),
                'order' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Order completion failed', [
                'prescription_id' => $id,
                'order_id' => $order->_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel order (Admin or Customer action)
     */
    public function cancelOrder($id, Request $request)
    {
        $prescription = Prescription::with('order')->findOrFail($id);

        if (!$prescription->order) {
            return response()->json([
                'success' => false,
                'message' => 'No order found for this prescription'
            ], 400);
        }

        $order = $prescription->order;

        if ($order->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel completed order'
            ], 400);
        }

        if ($order->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Order already cancelled'
            ], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        // Check authorization for customer
        $user = Auth::user();
        if ($user->role === 'customer' && $user->_id != $prescription->customer_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to cancel this order'
            ], 403);
        }

        $order->cancel();
        $order->update(['cancellation_reason' => $validated['reason']]);

        // Update prescription status
        $prescription->update(['status' => 'cancelled']);

        // Notify about cancellation
        NotificationService::notifyOrderStatusChange($order, 'cancelled');

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully',
            'prescription' => $prescription->fresh(['order']),
            'order' => $order->fresh()
        ]);
    }

    /**
     * Update order status (Admin action)
     */
    public function updateOrderStatus($id, Request $request)
    {
        $prescription = Prescription::with('order')->findOrFail($id);

        if (!$prescription->order) {
            return response()->json([
                'success' => false,
                'message' => 'No order found for this prescription'
            ], 400);
        }

        $order = $prescription->order;

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,processing,ready_for_pickup,completed,cancelled'
        ]);

        $oldStatus = $order->status;
        $newStatus = $validated['status'];

        $order->update([
            'status' => $newStatus,
            'updated_at' => now()
        ]);

        // Update prescription status accordingly
        if ($newStatus === 'completed') {
            $prescription->complete();
        } elseif ($newStatus === 'cancelled') {
            $prescription->update(['status' => 'cancelled']);
        }

        // Notify customer about status change
        if ($oldStatus !== $newStatus) {
            NotificationService::notifyOrderStatusChange($order, $newStatus);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully',
            'prescription' => $prescription->fresh(['order']),
            'order' => $order->fresh()
        ]);
    }

    /**
     * Update payment status (Admin action)
     */
    public function updatePaymentStatus($id, Request $request)
    {
        $prescription = Prescription::with('order')->findOrFail($id);

        if (!$prescription->order) {
            return response()->json([
                'success' => false,
                'message' => 'No order found for this prescription'
            ], 400);
        }

        $order = $prescription->order;

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,paid,failed',
            'payment_method' => 'nullable|in:cash,card,gcash'
        ]);

        $order->update([
            'payment_status' => $validated['payment_status'],
            'payment_method' => $validated['payment_method'] ?? $order->payment_method,
        ]);

        // Notify if payment received
        if ($validated['payment_status'] === 'paid') {
            NotificationService::notifyPaymentReceived($order);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment status updated successfully',
            'order' => $order->fresh()
        ]);
    }

    /**
     * View prescription file
     */
    public function download($id)
    {
        $prescription = Prescription::findOrFail($id);

        // Check authorization
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Customer can only view their own prescriptions
        if ($user->role === 'customer' && $user->_id != $prescription->customer_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        if (!Storage::disk('public')->exists($prescription->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $prescription->file_path,
            $prescription->original_filename
        );
    }

    /**
     * Get order timeline/history
     */
    public function getOrderTimeline($id)
    {
        $prescription = Prescription::with('order')->findOrFail($id);

        if (!$prescription->order) {
            return response()->json([
                'success' => false,
                'message' => 'No order found for this prescription'
            ], 400);
        }

        $timeline = [
            [
                'status' => 'prescription_uploaded',
                'title' => 'Prescription Uploaded',
                'timestamp' => $prescription->created_at,
                'description' => 'Customer uploaded prescription'
            ]
        ];

        if ($prescription->status === 'approved') {
            $timeline[] = [
                'status' => 'prescription_approved',
                'title' => 'Prescription Approved',
                'timestamp' => $prescription->updated_at,
                'description' => 'Prescription verified and order created'
            ];
        }

        if ($prescription->status === 'declined') {
            $timeline[] = [
                'status' => 'prescription_declined',
                'title' => 'Prescription Declined',
                'timestamp' => $prescription->updated_at,
                'description' => $prescription->admin_message ?? 'Prescription was declined'
            ];
        }

        if ($prescription->order->status === 'completed') {
            $timeline[] = [
                'status' => 'order_completed',
                'title' => 'Order Completed',
                'timestamp' => $prescription->order->completed_at,
                'description' => 'Order has been completed and items dispensed'
            ];
        }

        return response()->json([
            'success' => true,
            'timeline' => $timeline
        ]);
    }

    /**
     * Generate prescription number
     */
    private function generatePrescriptionNumber($orderType)
    {
        $prefix = $orderType === 'prescription' ? 'RX' : 'OD';
        $count = Prescription::where('order_type', $orderType)->count() + 1;
        return $prefix . str_pad($count, 5, '0', STR_PAD_LEFT);
    }
}