<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Conversation extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'conversations';

    protected $fillable = [
        'customer_id',
        'admin_id',
        'title',
        'type',
        'status',
        'priority',
        'messages',
        'last_message_at',
    ];

    protected $casts = [
        'messages' => 'array',
        'last_message_at' => 'datetime',
    ];

    // Relationships
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    // Message Operations
    public function addMessage($messageData)
    {
        $messages = $this->messages ?? [];

        $newMessage = array_merge([
            '_id' => new \MongoDB\BSON\ObjectId(),
            'timestamp' => now(),
            'is_read' => false,
        ], $messageData);

        $messages[] = $newMessage;
        $this->messages = $messages;
        $this->last_message_at = now();
        $this->save();

        return $newMessage;
    }

    public function markMessagesAsRead($senderId, $senderType)
    {
        $messages = $this->messages;
        $updated = false;

        foreach ($messages as &$message) {
            if ($message['sender_id'] != $senderId && $message['sender_type'] != $senderType) {
                if (!$message['is_read']) {
                    $message['is_read'] = true;
                    $updated = true;
                }
            }
        }

        if ($updated) {
            $this->messages = $messages;
            $this->save();
        }
    }

    public function getUnreadCount($userId, $userType)
    {
        return collect($this->messages)->filter(function ($message) use ($userId, $userType) {
            return !$message['is_read']
                && $message['sender_id'] != $userId
                && $message['sender_type'] != $userType;
        })->count();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    public function scopeByAdmin($query, $adminId)
    {
        return $query->where('admin_id', $adminId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }
}
