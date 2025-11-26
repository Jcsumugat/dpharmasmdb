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
        'status',
        'payment_method',
        'payment_status',
        'completed_at',
    ];

    protected $casts = [
        'items' => 'array',
        'completed_at' => 'datetime',
    ];

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
        return collect($this->items)->sum(function ($item) {
            return $item['quantity'] * $item['unit_price'];
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
        $items[$index]['status'] = $status;
        $this->items = $items;
        $this->save();
    }

    // Status Management
    public function markAsCompleted()
    {
        $this->status = 'completed';
        $this->payment_status = 'paid';
        $this->completed_at = now();
        $this->save();
    }

    public function cancel()
    {
        $this->status = 'cancelled';
        $this->save();
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }
}
