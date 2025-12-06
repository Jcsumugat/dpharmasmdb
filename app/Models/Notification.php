<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Carbon\Carbon;

class Notification extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
        'is_read',
        'priority',
        'action_url',
        'action_text',
        'icon',
        'color'
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Notification types
    const TYPE_ORDER_PLACED = 'order_placed';
    const TYPE_ORDER_CONFIRMED = 'order_confirmed';
    const TYPE_ORDER_PROCESSING = 'order_processing';
    const TYPE_ORDER_READY = 'order_ready';
    const TYPE_ORDER_COMPLETED = 'order_completed';
    const TYPE_ORDER_CANCELLED = 'order_cancelled';
    
    const TYPE_PRESCRIPTION_UPLOADED = 'prescription_uploaded';
    const TYPE_PRESCRIPTION_VERIFIED = 'prescription_verified';
    const TYPE_PRESCRIPTION_REJECTED = 'prescription_rejected';
    const TYPE_PRESCRIPTION_EXPIRING = 'prescription_expiring';
    
    const TYPE_PAYMENT_RECEIVED = 'payment_received';
    const TYPE_PAYMENT_FAILED = 'payment_failed';
    
    const TYPE_MESSAGE_RECEIVED = 'message_received';
    const TYPE_CONVERSATION_CLOSED = 'conversation_closed';
    
    const TYPE_STOCK_LOW = 'stock_low';
    const TYPE_STOCK_OUT = 'stock_out';
    const TYPE_PRODUCT_EXPIRING = 'product_expiring';
    
    const TYPE_SYSTEM = 'system';
    const TYPE_PROMOTIONAL = 'promotional';

    // Priority levels
    const PRIORITY_LOW = 'low';
    const PRIORITY_MEDIUM = 'medium';
    const PRIORITY_HIGH = 'high';
    const PRIORITY_URGENT = 'urgent';

    /**
     * Relationship with User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope: Read notifications
     */
    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    /**
     * Scope: By type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: By priority
     */
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope: Recent notifications
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', Carbon::now()->subDays($days));
    }

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        $this->update([
            'is_read' => true,
            'read_at' => Carbon::now()
        ]);
    }

    /**
     * Mark notification as unread
     */
    public function markAsUnread()
    {
        $this->update([
            'is_read' => false,
            'read_at' => null
        ]);
    }

    /**
     * Get notification icon based on type
     */
    public function getIconAttribute($value)
    {
        if ($value) {
            return $value;
        }

        return match($this->type) {
            self::TYPE_ORDER_PLACED => 'ShoppingCart',
            self::TYPE_ORDER_CONFIRMED => 'CheckCircle',
            self::TYPE_ORDER_PROCESSING => 'Package',
            self::TYPE_ORDER_READY => 'Bell',
            self::TYPE_ORDER_COMPLETED => 'CheckCircle2',
            self::TYPE_ORDER_CANCELLED => 'XCircle',
            
            self::TYPE_PRESCRIPTION_UPLOADED => 'FileText',
            self::TYPE_PRESCRIPTION_VERIFIED => 'ShieldCheck',
            self::TYPE_PRESCRIPTION_REJECTED => 'ShieldAlert',
            self::TYPE_PRESCRIPTION_EXPIRING => 'Clock',
            
            self::TYPE_PAYMENT_RECEIVED => 'DollarSign',
            self::TYPE_PAYMENT_FAILED => 'AlertCircle',
            
            self::TYPE_MESSAGE_RECEIVED => 'MessageSquare',
            self::TYPE_CONVERSATION_CLOSED => 'MessageCircle',
            
            self::TYPE_STOCK_LOW => 'AlertTriangle',
            self::TYPE_STOCK_OUT => 'XOctagon',
            self::TYPE_PRODUCT_EXPIRING => 'Calendar',
            
            self::TYPE_PROMOTIONAL => 'Gift',
            default => 'Bell'
        };
    }

    /**
     * Get notification color based on type/priority
     */
    public function getColorAttribute($value)
    {
        if ($value) {
            return $value;
        }

        if ($this->priority === self::PRIORITY_URGENT) {
            return 'red';
        }

        return match($this->type) {
            self::TYPE_ORDER_PLACED, self::TYPE_ORDER_CONFIRMED => 'blue',
            self::TYPE_ORDER_COMPLETED => 'green',
            self::TYPE_ORDER_CANCELLED, self::TYPE_PAYMENT_FAILED => 'red',
            self::TYPE_PRESCRIPTION_VERIFIED => 'green',
            self::TYPE_PRESCRIPTION_REJECTED => 'red',
            self::TYPE_STOCK_LOW, self::TYPE_PRESCRIPTION_EXPIRING => 'yellow',
            self::TYPE_STOCK_OUT => 'red',
            self::TYPE_PROMOTIONAL => 'purple',
            default => 'gray'
        };
    }

    /**
     * Create notification for user
     */
    public static function createForUser($userId, $type, $title, $message, $data = [], $priority = self::PRIORITY_MEDIUM)
    {
        return self::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'is_read' => false,
            'priority' => $priority,
            'action_url' => $data['action_url'] ?? null,
            'action_text' => $data['action_text'] ?? null
        ]);
    }

    /**
     * Create notification for multiple users
     */
    public static function createForUsers($userIds, $type, $title, $message, $data = [], $priority = self::PRIORITY_MEDIUM)
    {
        $notifications = [];
        foreach ($userIds as $userId) {
            $notifications[] = [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'is_read' => false,
                'priority' => $priority,
                'action_url' => $data['action_url'] ?? null,
                'action_text' => $data['action_text'] ?? null,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ];
        }

        return self::insert($notifications);
    }

    /**
     * Get time ago in human readable format
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }
}