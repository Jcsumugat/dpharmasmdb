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
use Carbon\Carbon;

class ProductController extends Controller
{
    public function store(Request $request)
    {
        try {
            // Log incoming request for debugging
            \Log::info('Product creation request received', [
                'data' => $request->all()
            ]);

            $validated = $request->validate([
                'product_name' => 'required|string|max:100',
                'product_code' => 'nullable|string|unique:products,product_code',
                'generic_name' => 'nullable|string|max:100',
                'brand_name' => 'nullable|string|max:100',
                'manufacturer' => 'nullable|string|max:100',
                'product_type' => 'required|string',
                'form_type' => 'required|string',
                'dosage_unit' => 'required|string',
                'classification' => 'required|integer',
                'category_id' => 'nullable|string',
                'supplier_id' => 'nullable|string',
                'reorder_level' => 'required|integer|min:0',
                'unit' => 'required|string',
                'unit_quantity' => 'required|numeric|min:0.01',
                'storage_requirements' => 'nullable|string',
            ]);

            // Generate product code if not provided
            if (empty($validated['product_code'])) {
                $validated['product_code'] = $this->generateProductCode();
            }

            // CRITICAL: Ensure proper data types
            $validated['classification'] = (int) $validated['classification'];
            $validated['reorder_level'] = (int) $validated['reorder_level'];
            $validated['unit_quantity'] = (float) $validated['unit_quantity'];

            // Debug log to verify the value
            \Log::info('Creating product with unit_quantity', [
                'unit_quantity' => $validated['unit_quantity'],
                'type' => gettype($validated['unit_quantity']),
                'all_data' => $validated
            ]);

            // Initialize stock and batches
            $validated['stock_quantity'] = 0;
            $validated['batches'] = [];

            $product = Product::create($validated);

            // Verify it was saved correctly
            $savedProduct = Product::find($product->_id);
            \Log::info('Product created successfully', [
                'product_id' => $savedProduct->_id,
                'unit' => $savedProduct->unit,
                'unit_quantity' => $savedProduct->unit_quantity,
                'unit_quantity_type' => gettype($savedProduct->unit_quantity)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'product' => $savedProduct
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed', [
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Failed to create product', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create product: ' . $e->getMessage()
            ], 500);
        }
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
            'product_type' => 'sometimes|string',
            'form_type' => 'sometimes|string',
            'dosage_unit' => 'sometimes|string',
            'classification' => 'sometimes|integer',
            'reorder_level' => 'sometimes|integer|min:0',
            'unit' => 'sometimes|string',
            'unit_quantity' => 'sometimes|numeric|min:0.01',
            'storage_requirements' => 'nullable|string',
        ]);

        // Ensure proper data types if fields are present
        if (isset($validated['classification'])) {
            $validated['classification'] = (int) $validated['classification'];
        }
        if (isset($validated['reorder_level'])) {
            $validated['reorder_level'] = (int) $validated['reorder_level'];
        }
        if (isset($validated['unit_quantity'])) {
            $validated['unit_quantity'] = (float) $validated['unit_quantity'];
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'product' => $product
        ]);
    }

    /**
     * Get all products with available stock
     */
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%")
                    ->orWhere('brand_name', 'like', "%{$search}%");
            });
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('stock_status')) {
            switch ($request->stock_status) {
                case 'in_stock':
                    $query->where('stock_quantity', '>', 0);
                    break;
                case 'low_stock':
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
     * Delete product
     */
    public function destroy($id)
    {
        $product = Product::findOrFail($id);

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
        try {
            $product = Product::findOrFail($id);

            $validated = $request->validate([
                'batch_number' => 'nullable|string',
                'expiration_date' => 'required|date|after:today',
                'quantity_received' => 'required|numeric|min:1',
                'unit_cost' => 'required|numeric|min:0',
                'sale_price' => 'required|numeric|min:0',
                'received_date' => 'required|date|before_or_equal:today',
                'supplier_id' => 'nullable|string',
                'unit' => 'nullable|string',
                'unit_quantity' => 'nullable|numeric|min:0.01',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Generate batch number if not provided
            if (empty($validated['batch_number'])) {
                $validated['batch_number'] = $this->generateBatchNumber($product);
            }

            // Check for duplicate batch number
            $existingBatch = collect($product->batches ?? [])
                ->firstWhere('batch_number', $validated['batch_number']);

            if ($existingBatch) {
                return response()->json([
                    'success' => false,
                    'message' => "Batch number '{$validated['batch_number']}' already exists"
                ], 422);
            }

            // Prepare batch data
            $batchData = [
                'batch_number' => $validated['batch_number'],
                'expiration_date' => $validated['expiration_date'],
                'quantity_received' => (int) $validated['quantity_received'],
                'quantity_remaining' => (int) $validated['quantity_received'],
                'unit_cost' => (float) $validated['unit_cost'],
                'sale_price' => (float) $validated['sale_price'],
                'received_date' => $validated['received_date'],
                'supplier_id' => $validated['supplier_id'] ?? $product->supplier_id,
                'notes' => $validated['notes'] ?? null,
                // FIX: Include unit and unit_quantity
                // Use batch-specific values if provided, otherwise inherit from product
                'unit' => $validated['unit'] ?? $product->unit,
                'unit_quantity' => isset($validated['unit_quantity'])
                    ? (float) $validated['unit_quantity']
                    : (float) $product->unit_quantity,
            ];

            // Debug log
            Log::info('Adding batch with unit data', [
                'product_id' => $product->_id,
                'batch_data' => $batchData
            ]);

            $batch = $product->addBatch($batchData);

            // Record stock movement
            StockMovement::recordMovement(
                $product->_id,
                'purchase',
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
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to add batch', [
                'product_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
        try {
            $product = Product::findOrFail($productId);

            $validated = $request->validate([
                'expiration_date' => 'sometimes|date',
                'unit_cost' => 'sometimes|numeric|min:0',
                'sale_price' => 'sometimes|numeric|min:0',
                'notes' => 'nullable|string',
            ]);

            // Add logging to debug
            Log::info('Updating batch', [
                'product_id' => $productId,
                'batch_id' => $batchId,
                'data' => $validated
            ]);

            $batch = $product->updateBatch($batchId, $validated);

            return response()->json([
                'success' => true,
                'message' => 'Batch updated successfully',
                'batch' => $batch
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update batch', [
                'product_id' => $productId,
                'batch_id' => $batchId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

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
     * Generate unique batch number for a product
     */
    private function generateBatchNumber($product)
    {
        $yearMonth = Carbon::now()->format('Ym');
        $productCode = $product->product_code ?? 'PROD';
        $existingBatches = collect($product->batches ?? []);
        $prefix = "BTH-{$yearMonth}-{$productCode}";

        $highestSequence = 0;
        foreach ($existingBatches as $batch) {
            if (isset($batch['batch_number']) && str_starts_with($batch['batch_number'], $prefix)) {
                $parts = explode('-', $batch['batch_number']);
                if (count($parts) >= 4) {
                    $sequence = (int) end($parts);
                    if ($sequence > $highestSequence) {
                        $highestSequence = $sequence;
                    }
                }
            }
        }

        $nextSequence = str_pad($highestSequence + 1, 3, '0', STR_PAD_LEFT);
        return "{$prefix}-{$nextSequence}";
    }

    /**
     * Get low stock products
     */
    public function lowStock()
    {
        $products = Product::where(function ($query) {
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

        $products = Product::all()->filter(function ($product) use ($days) {
            $batches = collect($product->batches ?? []);
            return $batches->filter(function ($batch) use ($days) {
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
