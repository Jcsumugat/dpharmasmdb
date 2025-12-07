<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Order extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'orders';

    protected $fillable = [
        'order_id',
        'prescription_id',
        'customer_id',
        'items',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'status',
        'payment_method',
        'payment_status',
        'order_type', // 'pickup', 'delivery'
        'mobile_number',
        'notes',
        'ready_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'pickup_notes',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'float',
        'tax_amount' => 'float',
        'discount_amount' => 'float',
        'total_amount' => 'float',
        'ready_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_PREPARING = 'preparing';
    const STATUS_READY = 'ready_for_pickup';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    // Payment status constants
    const PAYMENT_PENDING = 'pending';
    const PAYMENT_PAID = 'paid';
    const PAYMENT_FAILED = 'failed';

    // Relationships
    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'prescription_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    // Calculated Properties
    public function getTotalAmount()
    {
        return $this->total_amount ?? collect($this->items)->sum(function ($item) {
            return ($item['quantity'] ?? 0) * ($item['unit_price'] ?? 0);
        });
    }

    public function getTotalItems()
    {
        return collect($this->items)->sum('quantity');
    }

    // Item Operations
    public function addItem($itemData)
    {
        $items = $this->items ?? [];
        $items[] = $itemData;
        $this->items = $items;
        $this->save();
    }

    public function updateItemStatus($index, $status)
    {
        $items = $this->items;
        if (isset($items[$index])) {
            $items[$index]['status'] = $status;
            $this->items = $items;
            $this->save();
        }
    }

    // Status Management
    public function markAsCompleted()
    {
        $this->status = self::STATUS_COMPLETED;
        $this->payment_status = self::PAYMENT_PAID;
        $this->completed_at = now();
        $this->save();
    }

    public function markAsReadyForPickup()
    {
        $this->status = self::STATUS_READY;
        $this->ready_at = now();
        $this->save();
    }

    public function cancel($reason = null)
    {
        $this->status = self::STATUS_CANCELLED;
        $this->cancelled_at = now();
        if ($reason) {
            $this->cancellation_reason = $reason;
        }
        $this->save();
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopePreparing($query)
    {
        return $query->where('status', self::STATUS_PREPARING);
    }

    public function scopeReadyForPickup($query)
    {
        return $query->where('status', self::STATUS_READY);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', self::STATUS_CANCELLED);
    }

    public function scopeByCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    public function scopeWithoutPrescription($query)
    {
        return $query->whereNull('prescription_id');
    }

    public function scopeWithPrescription($query)
    {
        return $query->whereNotNull('prescription_id');
    }

    // Helper methods
    public function isPickupOrder()
    {
        return $this->order_type === 'pickup';
    }

    public function hasPrescription()
    {
        return !empty($this->prescription_id);
    }

    public function canBeCancelled()
    {
        return !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED]);
    }

    public function canBeMarkedReady()
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PREPARING]);
    }

    public function canBeCompleted()
    {
        return $this->status === self::STATUS_READY;
    }
}
