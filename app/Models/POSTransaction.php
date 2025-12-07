<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class POSTransaction extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'pos_transactions';

    protected $fillable = [
        'transaction_id',
        'customer_type',
        'customer_name',
        'items',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'amount_paid',
        'change_amount',
        'payment_method',
        'status',
        'notes',
        'processed_by',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'float',
        'tax_amount' => 'float',
        'discount_amount' => 'float',
        'total_amount' => 'float',
        'amount_paid' => 'float',
        'change_amount' => 'float',
    ];

    // Relationships
    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // Item Operations
    public function addItem($itemData)
    {
        $items = $this->items ?? [];
        $items[] = $itemData;
        $this->items = $items;
        $this->recalculateTotals();
    }

    public function recalculateTotals()
    {
        $subtotal = collect($this->items)->sum('total_price');
        $this->subtotal = $subtotal;
        $this->total_amount = $subtotal + $this->tax_amount - $this->discount_amount;
        $this->change_amount = $this->amount_paid - $this->total_amount;
        $this->save();
    }

    // Scopes
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    // Generate Transaction ID
    public static function generateTransactionId()
    {
        $date = now()->format('Ymd');
        $count = self::whereDate('created_at', today())->count() + 1;
        return 'TXN-' . $date . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }
}
