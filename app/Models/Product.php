<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Product extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'products';

    protected $fillable = [
        'product_code',
        'product_name',
        'generic_name',
        'brand_name',
        'manufacturer',
        'product_type',
        'form_type',
        'dosage_unit',
        'classification',
        'category_id',
        'supplier_id',
        'stock_quantity',
        'reorder_level',
        'unit',
        'unit_quantity',
        'batches',
        'notification_sent_at',
        'storage_requirements',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
        'reorder_level' => 'integer',
        'unit_quantity' => 'float',
        'notification_sent_at' => 'datetime',
    ];

    // Classification constants
    const CLASSIFICATIONS = [
        1 => 'Antibiotic',
        2 => 'Analgesic',
        3 => 'Antipyretic',
        4 => 'Anti-inflammatory',
        5 => 'Antacid',
        6 => 'Antihistamine',
        7 => 'Antihypertensive',
        8 => 'Antidiabetic',
        9 => 'Vitamin',
        10 => 'Mineral',
        11 => 'Supplement',
        12 => 'Topical',
        13 => 'Other',
    ];

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    // Batch Operations (Working with Embedded Batches)
    public function getAvailableBatches()
    {
        if (!$this->batches) return collect([]);

        return collect($this->batches)->filter(function ($batch) {
            return isset($batch['quantity_remaining'])
                && $batch['quantity_remaining'] > 0
                && isset($batch['expiration_date'])
                && Carbon::parse($batch['expiration_date'])->isFuture();
        })->sortBy('expiration_date') // FIFO - Sort by expiration date (earliest first)
          ->values(); // Reset array keys
    }

    public function getExpiredBatches()
    {
        if (!$this->batches) return collect([]);

        return collect($this->batches)->filter(function ($batch) {
            return isset($batch['quantity_remaining'])
                && $batch['quantity_remaining'] > 0
                && isset($batch['expiration_date'])
                && Carbon::parse($batch['expiration_date'])->isPast();
        });
    }

    public function getBatchById($batchId)
    {
        if (!$this->batches) return null;

        $searchId = $batchId instanceof \MongoDB\BSON\ObjectId
            ? $batchId
            : new \MongoDB\BSON\ObjectId($batchId);

        return collect($this->batches)->first(function ($batch) use ($searchId) {
            $batchObjectId = $this->extractBatchId($batch);
            return $batchObjectId && $batchObjectId == $searchId;
        });
    }

    /**
     * Helper method to safely extract batch ID from batch array
     */
    private function extractBatchId($batch)
    {
        if (isset($batch['_id'])) {
            return $batch['_id'] instanceof \MongoDB\BSON\ObjectId
                ? $batch['_id']
                : new \MongoDB\BSON\ObjectId($batch['_id']);
        } elseif (isset($batch['id'])) {
            if ($batch['id'] instanceof \MongoDB\BSON\ObjectId) {
                return $batch['id'];
            } elseif (is_array($batch['id']) && isset($batch['id']['$oid'])) {
                return new \MongoDB\BSON\ObjectId($batch['id']['$oid']);
            } elseif (is_string($batch['id'])) {
                return new \MongoDB\BSON\ObjectId($batch['id']);
            }
        }
        return null;
    }

    // Stock Management
    public function getAvailableStock()
    {
        return $this->getAvailableBatches()->sum('quantity_remaining');
    }

    public function isLowStock()
    {
        return $this->getAvailableStock() <= $this->reorder_level;
    }

    public function canFulfillQuantity($quantity)
    {
        return $this->getAvailableStock() >= $quantity;
    }

    /**
     * Allocate quantity using FIFO from available batches - FIXED
     */
    public function allocateQuantity($requestedQuantity)
    {
        $availableBatches = $this->getAvailableBatches();
        $allocation = [];
        $remainingQuantity = $requestedQuantity;
        $totalAvailable = $availableBatches->sum('quantity_remaining');

        if ($totalAvailable < $requestedQuantity) {
            return [
                'success' => false,
                'shortage' => $requestedQuantity - $totalAvailable,
                'available' => $totalAvailable,
                'batches' => [],
            ];
        }

        foreach ($availableBatches as $index => $batch) {
            if ($remainingQuantity <= 0) break;

            $quantityFromBatch = min($remainingQuantity, $batch['quantity_remaining']);

            // CRITICAL FIX: Safely get batch ID with isset checks
            $batchId = null;
            if (isset($batch['_id'])) {
                $batchId = $batch['_id'];
            } elseif (isset($batch['id'])) {
                $batchId = $batch['id'];
            } else {
                // Last resort: use index
                $batchId = $index;
            }

            $allocation[] = [
                'batch_id' => $batchId,
                'batch_number' => isset($batch['batch_number']) ? $batch['batch_number'] : 'Unknown',
                'quantity' => $quantityFromBatch,
                'unit_cost' => isset($batch['unit_cost']) ? $batch['unit_cost'] : 0,
                'sale_price' => isset($batch['sale_price']) ? $batch['sale_price'] : 0,
                'expiration_date' => isset($batch['expiration_date']) ? $batch['expiration_date'] : null,
            ];

            $remainingQuantity -= $quantityFromBatch;
        }

        return [
            'success' => true,
            'batches' => $allocation,
            'total_cost' => collect($allocation)->sum(fn($item) => $item['quantity'] * $item['unit_cost']),
            'total_revenue' => collect($allocation)->sum(fn($item) => $item['quantity'] * $item['sale_price']),
        ];
    }

    public function reduceStock($quantity, $reason = 'sale')
    {
        $allocation = $this->allocateQuantity($quantity);

        if (!$allocation['success']) {
            throw new \Exception("Insufficient stock. Shortage: {$allocation['shortage']} units");
        }

        $batches = $this->batches;
        $totalReduced = 0;

        foreach ($allocation['batches'] as $allocatedBatch) {
            // Handle both ObjectId and index-based IDs
            $searchId = $allocatedBatch['batch_id'];

            if ($searchId instanceof \MongoDB\BSON\ObjectId || is_string($searchId)) {
                // Convert to ObjectId if it's a string
                if (is_string($searchId) && strlen($searchId) == 24) {
                    try {
                        $searchId = new \MongoDB\BSON\ObjectId($searchId);
                    } catch (\Exception $e) {
                        // Not a valid ObjectId string, will use direct comparison
                    }
                }

                $batchIndex = collect($batches)->search(function ($batch) use ($searchId) {
                    $batchObjectId = $this->extractBatchId($batch);

                    if (!$batchObjectId) return false;

                    // Compare as strings for safety
                    return (string)$batchObjectId === (string)$searchId;
                });
            } else {
                // It's an index
                $batchIndex = $searchId;
            }

            if ($batchIndex !== false && isset($batches[$batchIndex])) {
                $batches[$batchIndex]['quantity_remaining'] -= $allocatedBatch['quantity'];
                $totalReduced += $allocatedBatch['quantity'];
            }
        }

        $this->batches = $batches;
        $this->stock_quantity -= $totalReduced;
        $this->save();

        return $allocation['batches'];
    }

    /**
     * Add new batch
     */
    public function addBatch($batchData)
    {
        $batches = $this->batches ?? [];

        $newBatch = [
            '_id' => new \MongoDB\BSON\ObjectId(),
            'batch_number' => $batchData['batch_number'],
            'expiration_date' => $batchData['expiration_date'],
            'quantity_received' => (int) $batchData['quantity_received'],
            'quantity_remaining' => (int) ($batchData['quantity_remaining'] ?? $batchData['quantity_received']),
            'unit_cost' => (float) $batchData['unit_cost'],
            'sale_price' => (float) $batchData['sale_price'],
            'received_date' => $batchData['received_date'] ?? now(),
            'supplier_id' => $batchData['supplier_id'] ?? $this->supplier_id,
            'notes' => $batchData['notes'] ?? null,
            'unit' => $batchData['unit'] ?? $this->unit,
            'unit_quantity' => isset($batchData['unit_quantity'])
                ? (float) $batchData['unit_quantity']
                : (float) ($this->unit_quantity ?? 1),
            'expiration_notification_sent_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $batches[] = $newBatch;
        $this->batches = $batches;

        // Recalculate total stock from available batches
        $this->stock_quantity = $this->getAvailableStock();
        $this->save();

        return $newBatch;
    }

    /**
     * Update batch
     */
    public function updateBatch($batchId, $updateData)
    {
        $batches = $this->batches;

        // Convert string batchId to ObjectId for comparison
        $searchId = $batchId instanceof \MongoDB\BSON\ObjectId
            ? $batchId
            : new \MongoDB\BSON\ObjectId($batchId);

        \Log::info('Searching for batch', [
            'search_id' => (string)$searchId,
            'batch_count' => count($batches),
        ]);

        $batchIndex = collect($batches)->search(function ($batch) use ($searchId) {
            $batchObjectId = $this->extractBatchId($batch);
            return $batchObjectId && (string)$batchObjectId === (string)$searchId;
        });

        \Log::info('Batch search result', [
            'found' => $batchIndex !== false,
            'index' => $batchIndex
        ]);

        if ($batchIndex === false) {
            throw new \Exception("Batch not found");
        }

        $batches[$batchIndex] = array_merge($batches[$batchIndex], $updateData);
        $batches[$batchIndex]['updated_at'] = now();

        $this->batches = $batches;
        $this->stock_quantity = $this->getAvailableStock();
        $this->save();

        return $batches[$batchIndex];
    }

    // Pricing
    public function getCurrentPrice()
    {
        $nextBatch = $this->getAvailableBatches()->first();
        return $nextBatch ? (float) $nextBatch['sale_price'] : 0.0;
    }

    public function getCurrentUnitCost()
    {
        $nextBatch = $this->getAvailableBatches()->first();
        return $nextBatch ? (float) $nextBatch['unit_cost'] : 0.0;
    }

    // Scopes
    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    public function scopeLowStock($query)
    {
        return $query->where(function ($q) {
            $q->whereRaw('stock_quantity <= reorder_level');
        });
    }

    public function scopeExpiringSoon($query, $days = 30)
    {
        $targetDate = Carbon::now()->addDays($days);
        return $query->where('batches.expiration_date', '<=', $targetDate);
    }

    // Accessors
    public function getClassificationNameAttribute()
    {
        return self::CLASSIFICATIONS[$this->classification] ?? 'Unknown';
    }

    public function getStockStatusAttribute()
    {
        $available = $this->getAvailableStock();
        if ($available <= 0) return 'Out of Stock';
        if ($this->isLowStock()) return 'Low Stock';
        return 'In Stock';
    }
}
