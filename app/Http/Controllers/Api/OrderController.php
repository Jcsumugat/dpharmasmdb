<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\Product;
use App\Models\PosTransaction;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
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
     * Complete order (process sale)
     */
    public function complete(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Order already completed'
            ], 400);
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|in:cash,card,gcash',
        ]);

        try {
            // Process each item - reduce stock using FIFO
            foreach ($order->items as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Reduce stock (FIFO)
                $usedBatches = $product->reduceStock($item['quantity'], 'sale');

                // Record stock movement
                StockMovement::recordMovement(
                    $product->_id,
                    StockMovement::TYPE_SALE,
                    -$item['quantity'],
                    'sale',
                    $order->_id,
                    "Order #{$order->order_id}"
                );
            }

            // Update order status
            $order->markAsCompleted();
            $order->update(['payment_method' => $validated['payment_method']]);

            // Update prescription if exists
            if ($order->prescription_id) {
                $prescription = Prescription::find($order->prescription_id);
                $prescription?->complete();
            }

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
     * Cancel order
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $order->cancel();
        $order->update(['cancellation_reason' => $validated['reason']]);

        // Update prescription status
        if ($order->prescription_id) {
            $prescription = Prescription::find($order->prescription_id);
            $prescription?->update(['status' => 'cancelled']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled',
            'order' => $order->fresh()
        ]);
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
            'payment_method' => 'required|string|in:cash,card,gcash',
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
                    'product_id' => $product->_id,
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

                StockMovement::recordMovement(
                    $product->_id,
                    StockMovement::TYPE_POS_TRANSACTION,
                    -$item['quantity'],
                    'pos_transaction',
                    $transaction->_id,
                    "POS Transaction #{$transaction->transaction_id}"
                );
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
