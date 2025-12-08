<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\POSTransaction;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class POSController extends Controller
{
    /**
     * Search products for POS
     */
    public function searchProducts(Request $request)
    {
        $query = Product::query();

        // Search by name, code, or brand
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%")
                    ->orWhere('brand_name', 'like', "%{$search}%")
                    ->orWhere('generic_name', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->has('category') && $request->category) {
            $query->where('category_id', $request->category);
        }

        // Filter by form
        if ($request->has('form') && $request->form) {
            $query->where('form_type', $request->form);
        }

        // Only products with stock
        $query->where('stock_quantity', '>', 0);

        $products = $query->limit(50)->get()->map(function ($product) {
            // Get product ID - use id property or cast _id
            $productId = $product->id ?? (string) $product->_id;

            return [
                'id' => $productId,
                'product_name' => $product->product_name,
                'product_code' => $product->product_code,
                'brand_name' => $product->brand_name,
                'generic_name' => $product->generic_name,
                'unit_price' => $product->getCurrentPrice(),
                'stock_quantity' => $product->stock_quantity,
                'total_stock' => $product->getAvailableStock(),
                'batches' => $product->getAvailableBatches()->map(function ($batch) {
                    return [
                        'batch_number' => $batch['batch_number'],
                        'expiration_date' => $batch['expiration_date'],
                        'quantity_remaining' => $batch['quantity_remaining'],
                        'sale_price' => $batch['sale_price']
                    ];
                })
            ];
        });

        return response()->json([
            'success' => true,
            'products' => $products
        ]);
    }

    /**
     * Get single product details
     */
    public function getProduct($id)
    {
        try {
            $product = Product::findOrFail($id);

            // Get product ID - use id property or cast _id
            $productId = $product->id ?? (string) $product->_id;

            return response()->json([
                'success' => true,
                'product' => [
                    'id' => $productId,
                    'product_code' => $product->product_code,
                    'product_name' => $product->product_name,
                    'generic_name' => $product->generic_name,
                    'brand_name' => $product->brand_name,
                    'manufacturer' => $product->manufacturer,
                    'product_type' => $product->product_type,
                    'category' => $product->category,
                    'classification' => $product->classification,
                    'form_type' => $product->form_type,
                    'dosage_unit' => $product->dosage_unit,
                    'unit' => $product->unit,
                    'unit_quantity' => $product->unit_quantity,
                    'unit_price' => $product->getCurrentPrice(),
                    'stock_quantity' => $product->stock_quantity,
                    'total_stock' => $product->getAvailableStock(),
                    'reorder_level' => $product->reorder_level,
                    'storage_requirements' => $product->storage_requirements,
                    'supplier' => $product->supplier,
                    'batches' => $product->getAvailableBatches(),
                    'created_at' => $product->created_at,
                    'updated_at' => $product->updated_at,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }
    }

    /**
     * Process POS transaction
     */
    public function processTransaction(Request $request)
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
            'notes' => 'nullable|string',
        ]);

        try {
            $subtotal = 0;
            $processedItems = [];

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

                // 🔥 ADD THIS: Get unit_cost from first available batch (FIFO)
                $availableBatches = $product->getAvailableBatches();
                $firstBatch = $availableBatches->first();
                $unitCost = $firstBatch ? (float) $firstBatch['unit_cost'] : 0;

                $productId = $product->id ?? (string) $product->_id;

                $processedItems[] = [
                    'product_id' => $productId,
                    'product_name' => $product->product_name,
                    'brand_name' => $product->brand_name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $price,
                    'unit_cost' => $unitCost,
                    'total_price' => $total,
                ];
            }

            $discountAmount = $validated['discount_amount'] ?? 0;
            $taxAmount = 0;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;
            $changeAmount = $validated['amount_paid'] - $totalAmount;

            if ($changeAmount < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient payment'
                ], 400);
            }

            // Create transaction
            $transaction = POSTransaction::create([
                'transaction_id' => POSTransaction::generateTransactionId(),
                'customer_type' => $validated['customer_type'],
                'customer_name' => $validated['customer_name'],
                'items' => $processedItems,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'amount_paid' => $validated['amount_paid'],
                'change_amount' => $changeAmount,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
                'notes' => $validated['notes'],
                'processed_by' => auth()->id(),
            ]);

            $transactionId = $transaction->id ?? (string) $transaction->_id;

            // Reduce stock for each item
            foreach ($validated['items'] as $item) {
                try {
                    $product = Product::findOrFail($item['product_id']);
                    $productId = $product->id ?? (string) $product->_id;

                    \Log::info('Processing product for stock reduction', [
                        'product_id' => $productId,
                        'product_name' => $product->product_name,
                        'quantity_to_reduce' => $item['quantity']
                    ]);

                    // Reduce stock using FIFO
                    $product->reduceStock($item['quantity'], 'pos_sale');

                    // Record stock movement
                    try {
                        if (method_exists(StockMovement::class, 'recordMovement')) {
                            StockMovement::recordMovement(
                                $productId,
                                'pos_transaction',
                                -$item['quantity'],
                                'pos_transaction',
                                $transactionId,
                                "POS Transaction #{$transaction->transaction_id}"
                            );
                        } else {
                            StockMovement::create([
                                'product_id' => $productId,
                                'type' => 'pos_transaction',
                                'quantity' => -$item['quantity'],
                                'reference_type' => 'pos_transaction',
                                'reference_id' => $transactionId,
                                'notes' => "POS Transaction #{$transaction->transaction_id}",
                                'performed_by' => auth()->id(),
                                'timestamp' => now(),
                                'created_at' => now(),
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::error('Failed to create stock movement', [
                            'error' => $e->getMessage(),
                            'product_id' => $productId
                        ]);
                    }

                    \Log::info('Stock movement recorded successfully', [
                        'product_id' => $productId
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Failed to process stock for product', [
                        'product_id' => $item['product_id'],
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw $e;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaction completed successfully',
                'transaction' => $transaction,
                'change_amount' => $changeAmount
            ]);
        } catch (\Exception $e) {
            \Log::error('POS Transaction failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Transaction failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction history
     */
    public function getTransactions(Request $request)
    {
        $query = POSTransaction::with('processor');

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        $transactions = $query->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'transactions' => $transactions
        ]);
    }
}
