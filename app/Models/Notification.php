<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Notification extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'notifications';

    protected $fillable = [
        'recipient_id',
        'recipient_type',
        'title',
        'message',
        'type',
        'reference_type',
        'reference_id',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    // Relationships
    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    // Mark as read
    public function markAsRead()
    {
        $this->is_read = true;
        $this->read_at = now();
        $this->save();
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeForRecipient($query, $recipientId, $recipientType = 'admin')
    {
        return $query->where('recipient_id', $recipientId)
                     ->where('recipient_type', $recipientType);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Static factory methods
    public static function createForUser($recipientId, $title, $message, $type = 'general', $referenceType = null, $referenceId = null, $recipientType = 'admin')
    {
        return self::create([
            'recipient_id' => $recipientId,
            'recipient_type' => $recipientType,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'is_read' => false,
        ]);
    }
}
