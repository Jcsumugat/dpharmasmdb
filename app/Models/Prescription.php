<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Prescription extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'prescriptions';

    protected $fillable = [
        'prescription_number',
        'customer_id',
        'file_path',
        'original_filename',
        'file_mime_type',
        'file_size',
        'is_encrypted',
        'file_hash',
        'perceptual_hash',
        'duplicate_check_status',
        'duplicate_of_id',
        'similarity_score',
        'duplicate_checked_at',
        'extracted_text',
        'doctor_name',
        'prescription_issue_date',
        'prescription_expiry_date',
        'order_type',
        'status',
        'mobile_number',
        'notes',
        'admin_message',
        'items',
        'qr_code_path',
        'token',
        'completed_at',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'is_encrypted' => 'boolean',
        'similarity_score' => 'float',
        'duplicate_checked_at' => 'datetime',
        'prescription_issue_date' => 'date',
        'prescription_expiry_date' => 'date',
        'items' => 'array',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function duplicateOf()
    {
        return $this->belongsTo(Prescription::class, 'duplicate_of_id');
    }

    public function order()
    {
        return $this->hasOne(Order::class, 'prescription_id');
    }

    // Item Operations
    public function addItem($itemData)
    {
        $items = $this->items ?? [];
        $items[] = $itemData;
        $this->items = $items;
        $this->save();
    }

    public function updateItem($index, $itemData)
    {
        $items = $this->items;
        $items[$index] = array_merge($items[$index], $itemData);
        $this->items = $items;
        $this->save();
    }

    public function removeItem($index)
    {
        $items = $this->items;
        unset($items[$index]);
        $this->items = array_values($items);
        $this->save();
    }

    // Status Management
    public function approve()
    {
        $this->status = 'approved';
        $this->save();
    }

    public function decline($message = null)
    {
        $this->status = 'declined';
        if ($message) {
            $this->admin_message = $message;
        }
        $this->save();
    }

    public function complete()
    {
        $this->status = 'completed';
        $this->completed_at = now();
        $this->save();
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeByCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    public function scopeDuplicates($query)
    {
        return $query->where('duplicate_check_status', 'duplicate');
    }
}
