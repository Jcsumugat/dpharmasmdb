import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Bell,
    CheckCircle,
    XCircle,
    AlertCircle,
    Package,
    FileText,
    DollarSign,
    MessageSquare,
    AlertTriangle,
    Gift,
    Trash2,
    Check,
    Filter,
    Search
} from 'lucide-react';

export default function NotificationsIndex() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotifications, setSelectedNotifications] = useState([]);
    const [filters, setFilters] = useState({
        status: '',
        type: 'all',
        priority: '',
        search: ''
    });
    const [counts, setCounts] = useState({
        total: 0,
        unread: 0,
        read: 0,
        urgent: 0
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0
    });
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, [filters.status, filters.type, filters.priority, pagination.current_page]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                per_page: pagination.per_page,
                ...(filters.status && { status: filters.status }),
                ...(filters.type !== 'all' && { type: filters.type }),
                ...(filters.priority && { priority: filters.priority }),
                ...(filters.search && { search: filters.search })
            });

            const response = await fetch(`/admin/api/notifications?${params}`);
            const data = await response.json();

            if (data.success) {
                setNotifications(data.notifications.data || []);
                setPagination({
                    current_page: data.notifications.current_page,
                    last_page: data.notifications.last_page,
                    per_page: data.notifications.per_page,
                    total: data.notifications.total
                });
                setCounts(data.counts || counts);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            const response = await fetch(`/admin/api/notifications/${id}/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAsUnread = async (id) => {
        try {
            const response = await fetch(`/admin/api/notifications/${id}/mark-unread`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to mark notification as unread:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!confirm('Mark all notifications as read?')) return;

        setActionLoading(true);
        try {
            const response = await fetch('/admin/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
                setSelectedNotifications([]);
                alert('All notifications marked as read');
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            alert('Failed to mark all notifications as read');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkSelectedAsRead = async () => {
        if (selectedNotifications.length === 0) {
            alert('Please select notifications first');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch('/admin/api/notifications/mark-multiple-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ notification_ids: selectedNotifications })
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
                setSelectedNotifications([]);
                alert('Selected notifications marked as read');
            }
        } catch (error) {
            console.error('Failed to mark selected as read:', error);
            alert('Failed to mark selected notifications as read');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteNotification = async (id) => {
        if (!confirm('Delete this notification?')) return;

        try {
            const response = await fetch(`/admin/api/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
            alert('Failed to delete notification');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedNotifications.length === 0) {
            alert('Please select notifications first');
            return;
        }

        if (!confirm(`Delete ${selectedNotifications.length} selected notification(s)?`)) return;

        setActionLoading(true);
        try {
            const response = await fetch('/admin/api/notifications/delete-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ notification_ids: selectedNotifications })
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
                setSelectedNotifications([]);
                alert('Selected notifications deleted');
            }
        } catch (error) {
            console.error('Failed to delete selected:', error);
            alert('Failed to delete selected notifications');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteAllRead = async () => {
        if (!confirm('Delete all read notifications? This cannot be undone.')) return;

        setActionLoading(true);
        try {
            const response = await fetch('/admin/api/notifications/delete-all-read', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchNotifications();
                alert('All read notifications deleted');
            }
        } catch (error) {
            console.error('Failed to delete all read:', error);
            alert('Failed to delete all read notifications');
        } finally {
            setActionLoading(false);
        }
    };

    const handleNotificationClick = (notification) => {
        // Mark as read if unread
        if (!notification.is_read) {
            handleMarkAsRead(notification._id);
        }

        // Navigate to action URL if exists
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
    };

    const toggleSelectNotification = (id) => {
        setSelectedNotifications(prev =>
            prev.includes(id)
                ? prev.filter(nId => nId !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedNotifications.length === notifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(notifications.map(n => n._id));
        }
    };

    const getIcon = (type) => {
        const iconMap = {
            order_placed: Package,
            order_confirmed: CheckCircle,
            order_processing: Package,
            order_ready: Bell,
            order_completed: CheckCircle,
            order_cancelled: XCircle,
            prescription_uploaded: FileText,
            prescription_verified: CheckCircle,
            prescription_rejected: XCircle,
            prescription_expiring: AlertCircle,
            payment_received: DollarSign,
            payment_failed: AlertCircle,
            message_received: MessageSquare,
            stock_low: AlertTriangle,
            stock_out: XCircle,
            product_expiring: AlertCircle,
            promotional: Gift,
            system: Bell
        };

        const Icon = iconMap[type] || Bell;
        return <Icon className="w-5 h-5" />;
    };

    const getIconColor = (color) => {
        const colorMap = {
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            red: 'text-red-600 bg-red-100',
            yellow: 'text-yellow-600 bg-yellow-100',
            purple: 'text-purple-600 bg-purple-100',
            gray: 'text-gray-600 bg-gray-100'
        };
        return colorMap[color] || 'text-gray-600 bg-gray-100';
    };

    const getPriorityBadge = (priority) => {
        const badges = {
            urgent: 'bg-red-100 text-red-800 border-red-200',
            high: 'bg-orange-100 text-orange-800 border-orange-200',
            medium: 'bg-blue-100 text-blue-800 border-blue-200',
            low: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return badges[priority] || badges.medium;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, current_page: 1 }));
        fetchNotifications();
    };

    return (
        <AuthenticatedLayout>
            <Head title="Notifications" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
                    <p className="text-gray-600">Stay updated with your pharmacy activities</p>
                </div>

                {/* Actions Bar */}
                {selectedNotifications.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-indigo-900">
                                {selectedNotifications.length} notification(s) selected
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleMarkSelectedAsRead}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4 inline mr-1" />
                                    Mark Read
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4 inline mr-1" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="space-y-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    placeholder="Search notifications..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700"
                            >
                                Search
                            </button>
                        </form>

                        {/* Status Filter */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === ''
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: 'unread' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'unread'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Unread
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: 'read' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'read'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Read
                                </button>
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Type</label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.type === 'all'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All Types
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, type: 'order_placed' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.type === 'order_placed'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Orders
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, type: 'prescription_uploaded' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.type === 'prescription_uploaded'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Prescriptions
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, type: 'stock_low' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.type === 'stock_low'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Stock Alerts
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, type: 'payment_received' }))}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.type === 'payment_received'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Payments
                                </button>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        <div className="pt-4 border-t flex flex-wrap gap-3">
                            <button
                                onClick={handleMarkAllAsRead}
                                disabled={actionLoading || counts.unread === 0}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Mark All as Read
                            </button>
                            <button
                                onClick={handleDeleteAllRead}
                                disabled={actionLoading || counts.read === 0}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete All Read
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20">
                            <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No notifications found</p>
                            <p className="text-gray-400 text-sm mt-2">You're all caught up!</p>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedNotifications.length === notifications.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Select All
                                    </span>
                                </label>
                            </div>

                            {/* Notifications */}
                            <div className="divide-y divide-gray-200">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`px-6 py-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(notification._id)}
                                                onChange={() => toggleSelectNotification(notification._id)}
                                                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                onClick={(e) => e.stopPropagation()}
                                            />

                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconColor(notification.color)}`}>
                                                {getIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start justify-between gap-4 mb-1">
                                                    <div className="flex-1">
                                                        <h3 className={`text-sm font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                                            }`}>
                                                            {notification.title}
                                                            {!notification.is_read && (
                                                                <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full inline-block"></span>
                                                            )}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {notification.priority !== 'medium' && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(notification.priority)}`}>
                                                                {notification.priority.toUpperCase()}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(notification.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                {notification.action_url && (
                                                    <div className="mt-2">
                                                        <span className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                                                            {notification.action_text || 'View Details'} →
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions Menu */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {notification.is_read ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsUnread(notification._id);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Mark as unread"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification._id);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNotification(notification._id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {!loading && notifications.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                                {pagination.total} notifications
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                                    disabled={pagination.current_page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                                    disabled={pagination.current_page === pagination.last_page}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}