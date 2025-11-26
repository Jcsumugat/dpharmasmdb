<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Category;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use MongoDB\BSON\ObjectId;

class ProductController extends Controller
{
    /**
     * Get all products with available stock
     */
    public function index(Request $request)
    {
        $query = Product::query();

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%")
                  ->orWhere('brand_name', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by stock status
        if ($request->has('stock_status')) {
            switch ($request->stock_status) {
                case 'in_stock':
                    // Products with available stock
                    $query->where('stock_quantity', '>', 0);
                    break;
                case 'low_stock':
                    // Products at or below reorder level
                    $query->whereRaw('stock_quantity <= reorder_level')
                          ->where('stock_quantity', '>', 0);
                    break;
                case 'out_of_stock':
                    $query->where('stock_quantity', 0);
                    break;
            }
        }

        $products = $query->with(['category', 'supplier'])
                          ->orderBy('product_name')
                          ->paginate(20);

        // Enhance with batch information
        $products->getCollection()->transform(function ($product) {
            $availableBatches = $product->getAvailableBatches();

            $product->available_stock = $availableBatches->sum('quantity_remaining');
            $product->batch_count = $availableBatches->count();
            $product->earliest_expiry = $availableBatches->first()['expiration_date'] ?? null;
            $product->current_price = $product->getCurrentPrice();

            return $product;
        });

        return response()->json([
            'success' => true,
            'products' => $products
        ]);
    }

    /**
     * Create new product
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:100',
            'product_code' => 'nullable|string|unique:products,product_code',
            'generic_name' => 'nullable|string|max:100',
            'brand_name' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:100',
            'product_type' => 'required|string|in:OTC,Prescription',
            'form_type' => 'required|string',
            'dosage_unit' => 'required|string',
            'classification' => 'required|integer|min:1|max:13',
            'category_id' => 'nullable|string',
            'supplier_id' => 'nullable|string',
            'reorder_level' => 'required|integer|min:0',
            'unit' => 'required|string',
            'unit_quantity' => 'required|numeric|min:0.01',
            'storage_requirements' => 'nullable|string',
        ]);

        // Generate product code if not provided
        if (!$validated['product_code']) {
            $validated['product_code'] = $this->generateProductCode();
        }

        $validated['stock_quantity'] = 0; // Initially zero, updated when batches added
        $validated['batches'] = []; // Empty array for embedded batches

        $product = Product::create($validated);

        Log::info('Product created', ['product_id' => $product->_id]);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'product' => $product
        ], 201);
    }

    /**
     * Update product
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'product_name' => 'sometimes|string|max:100',
            'generic_name' => 'nullable|string|max:100',
            'brand_name' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:100',
            'product_type' => 'sometimes|string|in:OTC,Prescription',
            'form_type' => 'sometimes|string',
            'dosage_unit' => 'sometimes|string',
            'classification' => 'sometimes|integer|min:1|max:13',
            'reorder_level' => 'sometimes|integer|min:0',
            'storage_requirements' => 'nullable|string',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'product' => $product
        ]);
    }

    /**
     * Delete product
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        // Check if product has batches with stock
        if ($product->getAvailableStock() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete product with available stock'
            ], 400);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully'
        ]);
    }

    /**
     * Add batch to product
     */
    public function addBatch(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'batch_number' => 'required|string',
            'expiration_date' => 'required|date|after:today',
            'quantity_received' => 'required|integer|min:1',
            'unit_cost' => 'required|numeric|min:0',
            'sale_price' => 'required|numeric|min:0',
            'received_date' => 'required|date|before_or_equal:today',
            'supplier_id' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $batch = $product->addBatch($validated);

            // Record stock movement
            StockMovement::recordMovement(
                $product->_id,
                StockMovement::TYPE_PURCHASE,
                $validated['quantity_received'],
                'purchase',
                null,
                "New batch added: {$validated['batch_number']}",
                $batch['_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Batch added successfully',
                'batch' => $batch,
                'product_stock' => $product->fresh()->stock_quantity
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to add batch', [
                'product_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add batch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update batch
     */
    public function updateBatch(Request $request, $productId, $batchId)
    {
        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'expiration_date' => 'sometimes|date',
            'unit_cost' => 'sometimes|numeric|min:0',
            'sale_price' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $batch = $product->updateBatch($batchId, $validated);

            return response()->json([
                'success' => true,
                'message' => 'Batch updated successfully',
                'batch' => $batch
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update batch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stock out (reduce stock using FIFO)
     */
    public function stockOut(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $usedBatches = $product->reduceStock(
                $validated['quantity'],
                $validated['reason']
            );

            // Record stock movement
            StockMovement::recordMovement(
                $product->_id,
                'sale',
                -$validated['quantity'],
                'manual',
                null,
                $validated['notes'] ?? $validated['reason']
            );

            return response()->json([
                'success' => true,
                'message' => 'Stock reduced successfully',
                'batches_used' => $usedBatches,
                'new_stock' => $product->fresh()->stock_quantity
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get product batches
     */
    public function getBatches($id)
    {
        $product = Product::findOrFail($id);

        $availableBatches = $product->getAvailableBatches();
        $expiredBatches = $product->getExpiredBatches();

        return response()->json([
            'success' => true,
            'available_batches' => $availableBatches,
            'expired_batches' => $expiredBatches,
            'summary' => [
                'total_available' => $availableBatches->sum('quantity_remaining'),
                'total_expired' => $expiredBatches->sum('quantity_remaining'),
                'batch_count' => $availableBatches->count()
            ]
        ]);
    }

    /**
     * Generate unique product code
     */
    private function generateProductCode()
    {
        do {
            $code = 'P' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
        } while (Product::where('product_code', $code)->exists());

        return $code;
    }

    /**
     * Get low stock products
     */
    public function lowStock()
    {
        $products = Product::where(function($query) {
            $query->whereRaw('stock_quantity <= reorder_level')
                  ->where('stock_quantity', '>', 0);
        })->with(['category', 'supplier'])
          ->orderBy('stock_quantity', 'asc')
          ->get();

        return response()->json([
            'success' => true,
            'products' => $products
        ]);
    }

    /**
     * Get expiring products
     */
    public function expiringSoon(Request $request)
    {
        $days = $request->get('days', 30);

        $products = Product::all()->filter(function($product) use ($days) {
            $batches = collect($product->batches ?? []);
            return $batches->filter(function($batch) use ($days) {
                $expiryDate = \Carbon\Carbon::parse($batch['expiration_date']);
                return $expiryDate->lte(now()->addDays($days))
                    && $expiryDate->gt(now())
                    && $batch['quantity_remaining'] > 0;
            })->isNotEmpty();
        })->values();

        return response()->json([
            'success' => true,
            'products' => $products
        ]);
    }
}
