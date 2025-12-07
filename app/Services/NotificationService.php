<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Generic method to notify all admins
     */
    public static function notifyAdmins($type, $title, $message, $data = [], $priority = Notification::PRIORITY_MEDIUM)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                $type,
                $title,
                $message,
                $data,
                $priority
            );
        }
    }

    /**
     * Generic method to notify a specific customer
     */
    public static function notifyCustomer($customerId, $type, $title, $message, $data = [], $priority = Notification::PRIORITY_MEDIUM)
    {
        Notification::createForUser(
            $customerId,
            $type,
            $title,
            $message,
            $data,
            $priority
        );
    }

    /**
     * Notify about new order (to admin/staff)
     */
    public static function notifyNewOrder($order)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_ORDER_PLACED,
                'New Order Received',
                "Order #{$order->order_number} has been placed by {$order->customer->first_name} {$order->customer->last_name}",
                [
                    'order_id' => (string) $order->_id,
                    'order_number' => $order->order_number,
                    'action_url' => "/admin/orders",
                    'action_text' => 'View Order'
                ],
                Notification::PRIORITY_HIGH
            );
        }
    }

    /**
     * Notify customer about order status change
     */
    public static function notifyOrderStatusChange($order, $newStatus)
    {
        $messages = [
            'confirmed' => 'Your order has been confirmed and is being prepared',
            'processing' => 'Your order is now being processed',
            'ready_for_pickup' => 'Your order is ready for pickup',
            'completed' => 'Your order has been completed',
            'cancelled' => 'Your order has been cancelled'
        ];

        $types = [
            'confirmed' => Notification::TYPE_ORDER_CONFIRMED,
            'processing' => Notification::TYPE_ORDER_PROCESSING,
            'ready_for_pickup' => Notification::TYPE_ORDER_READY,
            'completed' => Notification::TYPE_ORDER_COMPLETED,
            'cancelled' => Notification::TYPE_ORDER_CANCELLED
        ];

        $priorities = [
            'confirmed' => Notification::PRIORITY_MEDIUM,
            'processing' => Notification::PRIORITY_MEDIUM,
            'ready_for_pickup' => Notification::PRIORITY_HIGH,
            'completed' => Notification::PRIORITY_LOW,
            'cancelled' => Notification::PRIORITY_MEDIUM
        ];

        Notification::createForUser(
            $order->customer_id,
            $types[$newStatus] ?? Notification::TYPE_ORDER_PLACED,
            'Order Status Updated',
            $messages[$newStatus] ?? "Your order status has been updated",
            [
                'order_id' => (string) $order->_id,
                'order_number' => $order->order_number,
                'status' => $newStatus,
                'action_url' => "/customer/orders/{$order->_id}",
                'action_text' => 'View Order'
            ],
            $priorities[$newStatus] ?? Notification::PRIORITY_MEDIUM
        );
    }

    /**
     * Notify about prescription upload (to admin/staff)
     */
    public static function notifyPrescriptionUploaded($prescription)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_PRESCRIPTION_UPLOADED,
                'New Prescription Uploaded',
                "A prescription has been uploaded by {$prescription->customer->first_name} {$prescription->customer->last_name}",
                [
                    'prescription_id' => (string) $prescription->_id,
                    'action_url' => "/admin/prescriptions",
                    'action_text' => 'Review Prescription'
                ],
                Notification::PRIORITY_HIGH
            );
        }
    }

    /**
     * Notify customer about prescription verification
     */
    public static function notifyPrescriptionVerified($prescription)
    {
        Notification::createForUser(
            $prescription->customer_id,
            Notification::TYPE_PRESCRIPTION_VERIFIED,
            'Prescription Verified',
            'Your prescription has been verified and approved',
            [
                'prescription_id' => (string) $prescription->_id,
                'action_url' => "/customer/prescriptions/{$prescription->_id}",
                'action_text' => 'View Prescription'
            ],
            Notification::PRIORITY_MEDIUM
        );
    }

    /**
     * Notify customer about prescription rejection
     */
    public static function notifyPrescriptionRejected($prescription, $reason)
    {
        Notification::createForUser(
            $prescription->customer_id,
            Notification::TYPE_PRESCRIPTION_REJECTED,
            'Prescription Rejected',
            "Your prescription has been rejected. Reason: {$reason}",
            [
                'prescription_id' => (string) $prescription->_id,
                'reason' => $reason,
                'action_url' => "/customer/prescriptions/{$prescription->_id}",
                'action_text' => 'View Details'
            ],
            Notification::PRIORITY_HIGH
        );
    }

    /**
     * Notify about payment received
     */
    public static function notifyPaymentReceived($order)
    {
        // Notify customer
        Notification::createForUser(
            $order->customer_id,
            Notification::TYPE_PAYMENT_RECEIVED,
            'Payment Received',
            "Your payment of ₱{$order->total_amount} has been received",
            [
                'order_id' => (string) $order->_id,
                'order_number' => $order->order_number,
                'amount' => $order->total_amount,
                'action_url' => "/customer/orders/{$order->_id}",
                'action_text' => 'View Order'
            ],
            Notification::PRIORITY_MEDIUM
        );

        // Notify admin
        $admins = User::whereIn('role', ['admin', 'staff'])->get();
        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_PAYMENT_RECEIVED,
                'Payment Received',
                "Payment of ₱{$order->total_amount} received for order #{$order->order_number}",
                [
                    'order_id' => (string) $order->_id,
                    'order_number' => $order->order_number,
                    'amount' => $order->total_amount,
                    'action_url' => "/admin/orders",
                    'action_text' => 'View Order'
                ],
                Notification::PRIORITY_MEDIUM
            );
        }
    }

    /**
     * Notify about new message
     */
    public static function notifyNewMessage($conversation, $message, $recipientId)
    {
        Notification::createForUser(
            $recipientId,
            Notification::TYPE_MESSAGE_RECEIVED,
            'New Message',
            substr($message->message, 0, 100) . (strlen($message->message) > 100 ? '...' : ''),
            [
                'conversation_id' => (string) $conversation->_id,
                'message_id' => (string) $message->_id,
                'action_url' => auth()->user()->role === 'customer'
                    ? "/customer/conversations/{$conversation->_id}"
                    : "/admin/conversations/{$conversation->_id}",
                'action_text' => 'View Message'
            ],
            Notification::PRIORITY_MEDIUM
        );
    }

    /**
     * Notify about low stock (to admin/staff)
     */
    public static function notifyLowStock($product)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_STOCK_LOW,
                'Low Stock Alert',
                "{$product->product_name} stock is running low ({$product->stock_quantity} {$product->unit} remaining)",
                [
                    'product_id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'stock_quantity' => $product->stock_quantity,
                    'action_url' => "/admin/products/{$product->_id}/edit",
                    'action_text' => 'Manage Stock'
                ],
                Notification::PRIORITY_HIGH
            );
        }
    }

    /**
     * Notify about out of stock (to admin/staff)
     */
    public static function notifyOutOfStock($product)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_STOCK_OUT,
                'Out of Stock Alert',
                "{$product->product_name} is now out of stock",
                [
                    'product_id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'action_url' => "/admin/products/{$product->_id}/edit",
                    'action_text' => 'Restock Now'
                ],
                Notification::PRIORITY_URGENT
            );
        }
    }

    /**
     * Notify about expiring products (to admin/staff)
     */
    public static function notifyProductExpiring($product, $batch)
    {
        $admins = User::whereIn('role', ['admin', 'staff'])->get();

        foreach ($admins as $admin) {
            Notification::createForUser(
                $admin->_id,
                Notification::TYPE_PRODUCT_EXPIRING,
                'Product Expiring Soon',
                "{$product->product_name} (Batch: {$batch->batch_number}) expires on {$batch->expiry_date->format('M d, Y')}",
                [
                    'product_id' => (string) $product->_id,
                    'batch_id' => (string) $batch->_id,
                    'product_name' => $product->product_name,
                    'batch_number' => $batch->batch_number,
                    'expiry_date' => $batch->expiry_date->toDateString(),
                    'action_url' => "/admin/products/{$product->_id}/batches",
                    'action_text' => 'View Batch'
                ],
                Notification::PRIORITY_HIGH
            );
        }
    }

    /**
     * Send promotional notification to customers
     */
    public static function sendPromotionalNotification($customerIds, $title, $message, $actionUrl = null)
    {
        foreach ($customerIds as $customerId) {
            Notification::createForUser(
                $customerId,
                Notification::TYPE_PROMOTIONAL,
                $title,
                $message,
                [
                    'action_url' => $actionUrl,
                    'action_text' => 'Learn More'
                ],
                Notification::PRIORITY_LOW
            );
        }
    }

    /**
     * Send system notification
     */
    public static function sendSystemNotification($userIds, $title, $message, $priority = Notification::PRIORITY_MEDIUM)
    {
        foreach ($userIds as $userId) {
            Notification::createForUser(
                $userId,
                Notification::TYPE_SYSTEM,
                $title,
                $message,
                [],
                $priority
            );
        }
    }
}
