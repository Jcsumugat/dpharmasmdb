import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    Bell,
    BellRing,
    Package,
    FileText,
    MessageSquare,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Trash2,
    Check,
    Filter,
    MoreVertical,
    AlertCircle,
    ShoppingBag,
    DollarSign,
    Info
} from 'lucide-react';

export default function NotificationsIndex() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [selectedIds, setSelectedIds] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        loadNotifications();
    }, [filter]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            // Fix: Backend expects 'status' parameter with values 'unread' or 'read'
            if (filter === 'unread') params.append('status', 'unread');
            if (filter === 'read') params.append('status', 'read');

            const response = await fetch(route('customer.api.notifications.index') + '?' + params.toString());
            const data = await response.json();

            if (data.success) {
                // Fix: Laravel pagination returns data in notifications.data
                const notificationsList = data.notifications?.data || [];
                setNotifications(Array.isArray(notificationsList) ? notificationsList : []);

                // Store pagination info
                setPagination({
                    current_page: data.notifications?.current_page,
                    last_page: data.notifications?.last_page,
                    total: data.notifications?.total,
                    per_page: data.notifications?.per_page
                });
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const response = await fetch(route('customer.api.notifications.mark-read', id), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();
            if (data.success) {
                setNotifications(prevNotifications =>
                    Array.isArray(prevNotifications)
                        ? prevNotifications.map(n => n._id === id ? { ...n, is_read: true, read_at: new Date() } : n)
                        : []
                );
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        setActionLoading(true);
        try {
            const response = await fetch(route('customer.api.notifications.mark-all-read'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();
            if (data.success) {
                loadNotifications();
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const deleteNotification = async (id) => {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            const response = await fetch(route('customer.api.notifications.destroy', id), {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();
            if (data.success) {
                setNotifications(prevNotifications =>
                    Array.isArray(prevNotifications)
                        ? prevNotifications.filter(n => n._id !== id)
                        : []
                );
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (!notification.is_read) {
            markAsRead(notification._id);
        }

        // Navigate to action URL if exists
        if (notification.action_url) {
            router.visit(notification.action_url);
        } else if (notification.data?.action_url) {
            router.visit(notification.data.action_url);
        }
    };

    const getNotificationIcon = (type) => {
        const icons = {
            order_placed: ShoppingBag,
            order_received: ShoppingBag,
            new_order: ShoppingBag,
            order_confirmed: CheckCircle,
            order_processing: Clock,
            order_ready: BellRing,
            order_completed: CheckCircle,
            order_cancelled: XCircle,
            prescription_uploaded: FileText,
            prescription_verified: CheckCircle,
            prescription_rejected: XCircle,
            payment_received: DollarSign,
            message_received: MessageSquare,
            system: Info,
            promotional: Bell
        };

        return icons[type] || Bell;
    };

    const getNotificationColor = (type) => {
        const colors = {
            order_placed: 'bg-blue-100 text-blue-600',
            order_received: 'bg-blue-100 text-blue-600',
            new_order: 'bg-blue-100 text-blue-600',
            order_confirmed: 'bg-green-100 text-green-600',
            order_processing: 'bg-purple-100 text-purple-600',
            order_ready: 'bg-green-100 text-green-600',
            order_completed: 'bg-gray-100 text-gray-600',
            order_cancelled: 'bg-red-100 text-red-600',
            prescription_uploaded: 'bg-blue-100 text-blue-600',
            prescription_verified: 'bg-green-100 text-green-600',
            prescription_rejected: 'bg-red-100 text-red-600',
            payment_received: 'bg-green-100 text-green-600',
            message_received: 'bg-blue-100 text-blue-600',
            system: 'bg-gray-100 text-gray-600',
            promotional: 'bg-yellow-100 text-yellow-600'
        };

        return colors[type] || 'bg-gray-100 text-gray-600';
    };

    const getPriorityBadge = (priority) => {
        const badges = {
            urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
            high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
            medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
            low: { color: 'bg-gray-100 text-gray-800', label: 'Low' }
        };

        const badge = badges[priority] || badges.medium;

        return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    // Safe calculation of unread count with array check (use is_read instead of read)
    const unreadCount = Array.isArray(notifications)
        ? notifications.filter(n => !n.is_read).length
        : 0;

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                                <p className="text-gray-500 mt-2">
                                    Stay updated with your orders and prescriptions
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                                    <BellRing className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-900">
                                        {unreadCount} unread
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filter === 'unread'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Unread
                                </button>
                                <button
                                    onClick={() => setFilter('read')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filter === 'read'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Read
                                </button>
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Loading notifications...</p>
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No notifications
                                    </h3>
                                    <p className="text-gray-500 text-center">
                                        {filter === 'unread'
                                            ? "You're all caught up!"
                                            : "You don't have any notifications yet"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = getNotificationIcon(notification.type);
                                const iconColor = getNotificationColor(notification.type);

                                return (
                                    <div
                                        key={notification._id}
                                        className={`bg-white rounded-xl border transition-all cursor-pointer ${
                                            notification.is_read
                                                ? 'border-gray-200 hover:shadow-sm'
                                                : 'border-blue-200 bg-blue-50/50 hover:shadow-md'
                                        }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="p-4">
                                            <div className="flex gap-4">
                                                {/* Icon */}
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h3 className={`font-semibold ${
                                                            notification.is_read ? 'text-gray-900' : 'text-blue-900'
                                                        }`}>
                                                            {notification.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            {notification.priority && (
                                                                <div>
                                                                    {getPriorityBadge(notification.priority)}
                                                                </div>
                                                            )}
                                                            {!notification.is_read && (
                                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {notification.message}
                                                    </p>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(notification.created_at)}
                                                        </span>

                                                        {(notification.action_url || notification.data?.action_url) && (
                                                            <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                                                                {notification.action_text || notification.data?.action_text || 'View'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-start gap-2">
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification._id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification._id);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination Info */}
                    {pagination && pagination.total > 0 && (
                        <div className="mt-6 text-center text-sm text-gray-500">
                            Showing {notifications.length} of {pagination.total} notifications
                        </div>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
