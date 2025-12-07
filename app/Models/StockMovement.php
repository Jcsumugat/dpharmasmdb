<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class StockMovement extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'stock_movements';

    protected $fillable = [
        'product_id',
        'batch_id',
        'type',
        'quantity',
        'reference_type',
        'reference_id',
        'notes',
        'performed_by',
        'timestamp',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'timestamp' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Movement types
    const TYPE_PURCHASE = 'purchase';
    const TYPE_SALE = 'sale';
    const TYPE_POS_TRANSACTION = 'pos_transaction';
    const TYPE_STOCK_ADDITION = 'stock_addition';
    const TYPE_ADJUSTMENT = 'adjustment';
    const TYPE_EXPIRED = 'expired';
    const TYPE_MANUAL = 'manual';

    // Boot method to sync timestamp with created_at
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->timestamp) {
                $model->timestamp = now();
            }
            if (!$model->created_at) {
                $model->created_at = $model->timestamp ?? now();
            }
        });
    }

    // Relationships
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    // Static factory methods
    public static function recordMovement($productId, $type, $quantity, $referenceType = null, $referenceId = null, $notes = null, $batchId = null, $performedBy = null)
    {
        $timestamp = now();

        return self::create([
            'product_id' => $productId,
            'batch_id' => $batchId,
            'type' => $type,
            'quantity' => $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'performed_by' => $performedBy ?? auth()->id(),
            'timestamp' => $timestamp,
            'created_at' => $timestamp,
        ]);
    }

    // Scopes
    public function scopeByProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeStockIn($query)
    {
        return $query->where('quantity', '>', 0);
    }

    public function scopeStockOut($query)
    {
        return $query->where('quantity', '<', 0);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    // Helper method to get the effective date (tries created_at first, falls back to timestamp)
    public function getEffectiveDateAttribute()
    {
        return $this->created_at ?? $this->timestamp;
    }
}
