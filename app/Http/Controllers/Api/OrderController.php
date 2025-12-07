<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\Product;
use App\Models\PosTransaction;
use App\Models\StockMovement;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Create order from checkout (Pick-up only)
     */
    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'items' => 'required|json',
                'has_prescription' => 'required|boolean',
                'prescription_file' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'mobile_number' => 'required|string',
                'notes' => 'nullable|string',
                'payment_method' => 'required|string|in:cash,gcash,paymaya',
            ]);

            // Parse cart items
            $cartItems = json_decode($validated['items'], true);

            if (empty($cartItems)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty'
                ], 400);
            }

            // Log cart structure for debugging
            \Log::info('Cart items received', ['items' => $cartItems]);

            $prescriptionId = null;
            $orderType = $validated['has_prescription'] ? 'prescription' : 'online_order';

            // Handle prescription upload if provided
            if ($validated['has_prescription'] && $request->hasFile('prescription_file')) {
                try {
                    $prescription = $this->handlePrescriptionUpload($request, $cartItems);
                    $prescriptionId = (string) $prescription->_id;
                } catch (\Exception $e) {
                    \Log::error('Prescription upload failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw new \Exception('Failed to upload prescription: ' . $e->getMessage());
                }
            }

            // Validate stock availability
            $orderItems = [];
            $subtotal = 0;

            foreach ($cartItems as $item) {
                // Get product ID from the item
                $productId = $item['id'] ?? $item['product_id'] ?? null;

                if (!$productId) {
                    \Log::error('Invalid cart item structure', ['item' => $item]);
                    throw new \Exception("Invalid product data in cart");
                }

                $product = Product::find($productId);

                if (!$product) {
                    throw new \Exception("Product not found: " . ($item['product_name'] ?? 'Unknown'));
                }

                if (!$product->canFulfillQuantity($item['quantity'])) {
                    throw new \Exception("Insufficient stock for {$product->product_name}. Available: {$product->getAvailableStock()}");
                }

                $itemTotal = $product->getCurrentPrice() * $item['quantity'];
                $subtotal += $itemTotal;

                $orderItems[] = [
                    'product_id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'brand_name' => $product->brand_name ?? '',
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->getCurrentPrice(),
                    'subtotal' => $itemTotal,
                    'available' => true
                ];
            }

            // Calculate totals
            $taxAmount = $subtotal * 0.12;
            $totalAmount = $subtotal + $taxAmount;

            // Generate order ID
            $orderId = $this->generateOrderId($orderType);

            // Create order (Pick-up workflow)
            $order = Order::create([
                'order_id' => $orderId,
                'customer_id' => auth()->id(),
                'prescription_id' => $prescriptionId,
                'items' => $orderItems,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'status' => $validated['has_prescription'] ? 'pending' : 'preparing',
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'order_type' => 'pickup',
                'mobile_number' => $validated['mobile_number'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Reserve inventory immediately
            foreach ($orderItems as $item) {
                try {
                    $product = Product::find($item['product_id']);
                    if (!$product) {
                        throw new \Exception("Product not found: {$item['product_name']}");
                    }

                    $product->reduceStock($item['quantity'], 'order_reservation');

                    // Record stock movement
                    StockMovement::create([
                        'product_id' => (string) $product->_id,
                        'type' => 'sale',
                        'quantity' => -$item['quantity'],
                        'reference_type' => 'order',
                        'reference_id' => (string) $order->_id,
                        'notes' => "Order #{$orderId} - Stock reserved for pickup",
                        'performed_by' => auth()->id(),
                        'timestamp' => now()
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Stock reservation failed', [
                        'product_id' => $item['product_id'],
                        'error' => $e->getMessage()
                    ]);
                    // Continue with other items even if one fails
                }
            }

            // Update prescription with order reference
            if ($prescriptionId) {
                Prescription::where('_id', $prescriptionId)->update([
                    'order_id' => (string) $order->_id,
                    'status' => 'pending'
                ]);
            }

            // Send notification to admin
            NotificationService::notifyAdmins(
                'new_order',
                'New Order for Pick-up',
                "Order #{$orderId} from " . auth()->user()->first_name . " " . auth()->user()->last_name . " is ready to prepare.",
                [
                    'order_id' => (string) $order->_id,
                    'customer_name' => auth()->user()->first_name . " " . auth()->user()->last_name,
                    'total_amount' => $totalAmount,
                    'has_prescription' => $validated['has_prescription'],
                    'mobile_number' => $validated['mobile_number']
                ]
            );

            // Send notification to customer
            $customerMessage = $validated['has_prescription']
                ? "Your order #{$orderId} has been received. We'll notify you once your prescription is verified and your order is ready for pickup."
                : "Your order #{$orderId} is being prepared. We'll notify you when it's ready for pickup at our pharmacy.";

            NotificationService::notifyCustomer(
                auth()->id(),
                'order_received',
                'Order Received',
                $customerMessage,
                [
                    'order_id' => (string) $order->_id,
                    'total_amount' => $totalAmount,
                    'payment_method' => $validated['payment_method']
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully. You will be notified when ready for pickup.',
                'order' => [
                    'id' => (string) $order->_id,
                    'order_id' => $order->order_id,
                    'status' => $order->status,
                    'total_amount' => $order->total_amount,
                    'payment_method' => $order->payment_method
                ]
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Order creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single order details
     */
    public function show($id)
    {
        try {
            $order = Order::with(['customer', 'prescription'])
                ->where('_id', $id)
                ->firstOrFail();

            return response()->json([
                'success' => true,
                'order' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }
    }
    
    /**
     * Handle prescription file upload
     */
    private function handlePrescriptionUpload(Request $request, array $cartItems)
    {
        $file = $request->file('prescription_file');
        $fileName = Str::random(40) . '.' . $file->getClientOriginalExtension();
        $filePath = $file->storeAs('prescriptions', $fileName, 'public');

        // Generate file hash for duplicate detection
        $fileHash = hash_file('sha256', $file->getRealPath());

        // Generate prescription number
        $prescriptionNumber = $this->generatePrescriptionNumber();

        // Extract text items from cart for prescription
        $prescriptionItems = array_map(function ($item) {
            return [
                'product_name' => $item['product_name'],
                'quantity' => $item['quantity'],
                'status' => 'pending'
            ];
        }, $cartItems);

        // Create prescription
        $prescription = Prescription::create([
            'prescription_number' => $prescriptionNumber,
            'customer_id' => auth()->id(),
            'file_path' => $filePath,
            'original_filename' => $file->getClientOriginalName(),
            'file_mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_hash' => $fileHash,
            'is_encrypted' => false,
            'order_type' => 'prescription',
            'status' => 'pending',
            'items' => $prescriptionItems,
            'mobile_number' => $request->mobile_number,
            'token' => Str::random(32),
            'duplicate_check_status' => 'pending'
        ]);

        return $prescription;
    }

    /**
     * Mark order as ready for pickup (Admin action)
     */
    public function markReadyForPickup(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if (!in_array($order->status, ['pending', 'approved', 'preparing'])) {
            return response()->json([
                'success' => false,
                'message' => 'Order cannot be marked as ready'
            ], 400);
        }

        $order->update([
            'status' => 'ready_for_pickup',
            'ready_at' => now()
        ]);

        // Update prescription if exists
        if ($order->prescription_id) {
            Prescription::where('_id', $order->prescription_id)->update([
                'status' => 'approved'
            ]);
        }

        // Notify customer
        NotificationService::notifyCustomer(
            $order->customer_id,
            'order_ready',
            'Order Ready for Pickup! 🎉',
            "Great news! Your order #{$order->order_id} is ready for pickup at our pharmacy. Total: ₱" . number_format($order->total_amount, 2),
            [
                'order_id' => (string) $order->_id,
                'total_amount' => $order->total_amount,
                'payment_method' => $order->payment_method
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Order marked as ready for pickup. Customer has been notified.',
            'order' => $order->fresh()
        ]);
    }

    /**
     * Complete order at pickup (Payment collected)
     */
    public function completePickup(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->status !== 'ready_for_pickup') {
            return response()->json([
                'success' => false,
                'message' => 'Order is not ready for pickup'
            ], 400);
        }

        $validated = $request->validate([
            'payment_received' => 'required|boolean',
            'notes' => 'nullable|string'
        ]);

        if (!$validated['payment_received']) {
            return response()->json([
                'success' => false,
                'message' => 'Payment must be received before completing order'
            ], 400);
        }

        try {
            $order->update([
                'status' => 'completed',
                'payment_status' => 'paid',
                'completed_at' => now(),
                'pickup_notes' => $validated['notes'] ?? null
            ]);

            // Update prescription if exists
            if ($order->prescription_id) {
                Prescription::where('_id', $order->prescription_id)->update([
                    'status' => 'completed',
                    'completed_at' => now()
                ]);
            }

            // Notify customer
            NotificationService::notifyCustomer(
                $order->customer_id,
                'order_completed',
                'Order Completed ✅',
                "Thank you for picking up order #{$order->order_id}. We hope to see you again!",
                ['order_id' => (string) $order->_id]
            );

            return response()->json([
                'success' => true,
                'message' => 'Order completed successfully',
                'order' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate order ID
     */
    private function generateOrderId($type = 'online_order')
    {
        $prefix = $type === 'prescription' ? 'RX' : 'OD';
        $date = now()->format('Ymd');

        // Get today's order count
        $count = Order::where('order_id', 'like', "{$prefix}{$date}%")->count() + 1;

        return $prefix . $date . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate prescription number
     */
    private function generatePrescriptionNumber()
    {
        $date = now()->format('Ymd');
        $count = Prescription::where('prescription_number', 'like', "RX{$date}%")->count() + 1;

        return 'RX' . $date . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get orders
     */
    public function index(Request $request)
    {
        $query = Order::with(['prescription', 'customer']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'orders' => $orders
        ]);
    }

    /**
     * Get customer's checkout orders (no prescription)
     */
    public function customerOrders(Request $request)
    {
        $query = Order::query()
            ->where('customer_id', auth()->id())
            ->whereNull('prescription_id'); // Only orders without prescription

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'orders' => $orders
        ]);
    }

    /**
     * Cancel order
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel completed order'
            ], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        try {
            // Return stock to inventory
            foreach ($order->items as $item) {
                $product = Product::find($item['product_id']);
                if ($product) {
                    $product->stock_quantity += $item['quantity'];
                    $product->save();

                    // Record stock movement
                    StockMovement::create([
                        'product_id' => $product->_id,
                        'type' => 'adjustment',
                        'quantity' => $item['quantity'],
                        'reference_type' => 'order_cancellation',
                        'reference_id' => $order->_id,
                        'notes' => "Order #{$order->order_id} cancelled - Stock returned",
                        'performed_by' => auth()->id(),
                        'timestamp' => now()
                    ]);
                }
            }

            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $validated['reason']
            ]);

            // Update prescription status
            if ($order->prescription_id) {
                Prescription::where('_id', $order->prescription_id)->update([
                    'status' => 'cancelled'
                ]);
            }

            // Notify customer
            NotificationService::notifyCustomer(
                $order->customer_id,
                'order_cancelled',
                'Order Cancelled',
                "Order #{$order->order_id} has been cancelled. Reason: {$validated['reason']}",
                ['order_id' => (string) $order->_id]
            );

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled and stock returned',
                'order' => $order->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process POS transaction
     */
    public function processPOS(Request $request)
    {
        $validated = $request->validate([
            'customer_type' => 'required|string|in:walk_in,regular',
            'customer_name' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|string|in:cash,card,gcash,paymaya',
            'amount_paid' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        try {
            $subtotal = 0;
            $processedItems = [];

            // Validate and calculate
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if (!$product->canFulfillQuantity($item['quantity'])) {
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for {$product->product_name}"
                    ], 400);
                }

                $price = $product->getCurrentPrice();
                $total = $price * $item['quantity'];
                $subtotal += $total;

                $processedItems[] = [
                    'product_id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'brand_name' => $product->brand_name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $price,
                    'total_price' => $total,
                ];
            }

            $discountAmount = $validated['discount_amount'] ?? 0;
            $totalAmount = $subtotal - $discountAmount;
            $changeAmount = $validated['amount_paid'] - $totalAmount;

            if ($changeAmount < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient payment'
                ], 400);
            }

            // Create transaction
            $transaction = PosTransaction::create([
                'transaction_id' => PosTransaction::generateTransactionId(),
                'customer_type' => $validated['customer_type'],
                'customer_name' => $validated['customer_name'],
                'items' => $processedItems,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'amount_paid' => $validated['amount_paid'],
                'change_amount' => $changeAmount,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
                'processed_by' => auth()->id(),
            ]);

            // Reduce stock for each item
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                $product->reduceStock($item['quantity'], 'pos_sale');

                StockMovement::create([
                    'product_id' => $product->_id,
                    'type' => 'pos_transaction',
                    'quantity' => -$item['quantity'],
                    'reference_type' => 'pos_transaction',
                    'reference_id' => $transaction->_id,
                    'notes' => "POS Transaction #{$transaction->transaction_id}",
                    'performed_by' => auth()->id(),
                    'timestamp' => now()
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaction completed',
                'transaction' => $transaction,
                'change_amount' => $changeAmount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
