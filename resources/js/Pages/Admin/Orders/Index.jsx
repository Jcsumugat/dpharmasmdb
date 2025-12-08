import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Search,
    Eye,
    ShoppingBag,
    Calendar,
    DollarSign,
    MapPin,
    User,
    Phone,
    Filter,
    CheckSquare,
    Ban,
    AlertCircle
} from 'lucide-react';

export default function OrdersIndex() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0
    });

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const response = await fetch(route('admin.api.orders.index') + '?' + params.toString());
            const data = await response.json();

            if (data.success) {
                const ordersList = data.orders?.data || data.orders || [];
                setOrders(Array.isArray(ordersList) ? ordersList : []);
                calculateStats(ordersList);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (ordersData) => {
        if (!Array.isArray(ordersData)) {
            setStats({ total: 0, pending: 0, preparing: 0, ready: 0, completed: 0 });
            return;
        }

        const stats = {
            total: ordersData.length,
            pending: ordersData.filter(o => o.status === 'pending').length,
            preparing: ordersData.filter(o => o.status === 'preparing').length,
            ready: ordersData.filter(o => o.status === 'ready_for_pickup').length,
            completed: ordersData.filter(o => o.status === 'completed').length
        };
        setStats(stats);
    };

    const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        const searchLower = searchQuery.toLowerCase();
        const customerName = order.customer ?
            `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase() : '';

        return (
            order.order_id?.toLowerCase().includes(searchLower) ||
            order.mobile_number?.toLowerCase().includes(searchLower) ||
            customerName.includes(searchLower)
        );
    }) : [];

    const handleMarkReady = async (orderId) => {
        if (!confirm('Mark this order as ready for pickup?')) return;

        setActionLoading(orderId);
        try {
            const response = await fetch(route('admin.api.orders.mark-ready', orderId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();
            if (data.success) {
                loadOrders();
                alert('Order marked as ready for pickup. Customer has been notified.');
            } else {
                alert(data.message || 'Failed to update order');
            }
        } catch (error) {
            console.error('Failed to mark ready:', error);
            alert('Failed to update order');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCompletePickup = async (orderId) => {
        if (!confirm('Confirm payment received and complete this order?')) return;

        const notes = prompt('Add any notes (optional):');

        setActionLoading(orderId);
        try {
            const response = await fetch(route('admin.api.orders.complete-pickup', orderId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    payment_received: true,
                    notes: notes
                })
            });

            const data = await response.json();
            if (data.success) {
                loadOrders();
                alert('Order completed successfully!');
            } else {
                alert(data.message || 'Failed to complete order');
            }
        } catch (error) {
            console.error('Failed to complete order:', error);
            alert('Failed to complete order');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelOrder = async (orderId) => {
        const reason = prompt('Enter cancellation reason:');
        if (!reason) return;

        setActionLoading(orderId);
        try {
            const response = await fetch(route('admin.api.orders.cancel', orderId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();
            if (data.success) {
                loadOrders();
                alert('Order cancelled successfully');
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
            preparing: { color: 'bg-purple-100 text-purple-800', label: 'Preparing', icon: Package },
            ready_for_pickup: { color: 'bg-green-100 text-green-800', label: 'Ready for Pickup', icon: ShoppingBag },
            completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed', icon: CheckCircle },
            cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                <Icon className="w-4 h-4" />
                {badge.label}
            </span>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
            paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
            failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
        };

        const badge = badges[status] || badges.pending;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewOrder = (orderId) => {
        if (!orderId) return;
        const id = typeof orderId === 'object' ? String(orderId) : orderId;
        router.visit(route('admin.orders.detail', { id: id }));
    };

    const parseItems = (itemsData) => {
        if (Array.isArray(itemsData)) return itemsData;
        if (typeof itemsData === 'string') {
            try {
                return JSON.parse(itemsData);
            } catch {
                return [];
            }
        }
        return [];
    };

    return (
        <AuthenticatedLayout>
            <Head title="Orders Management" />

            <div className="p-6 md:p-10">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
                        <p className="text-gray-600 mt-2">Manage pickup orders and prepare them for customers</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Orders</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Preparing</p>
                                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.preparing}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Ready</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.ready}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-2xl font-bold text-gray-600 mt-1">{stats.completed}</p>
                                </div>
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-gray-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by order number, customer name, or mobile..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="md:w-64">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">All Orders</option>
                                    <option value="pending">Pending</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="ready_for_pickup">Ready for Pickup</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Loading orders...</p>
                                </div>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <ShoppingBag className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                                    <p className="text-gray-500 text-center">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'No orders have been placed yet'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const items = parseItems(order.items);
                                const isActionLoading = actionLoading === (order.id || order._id);

                                return (
                                    <div key={order.id || order._id} className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow shadow-sm">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {order.order_id}
                                                        </h3>
                                                        {getStatusBadge(order.status)}
                                                        {order.prescription_id && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Has Prescription
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Customer Info */}
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4" />
                                                            <span className="font-medium">
                                                                {order.customer ?
                                                                    `${order.customer.first_name} ${order.customer.last_name}` :
                                                                    'Unknown Customer'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone className="w-4 h-4" />
                                                            <span>{order.mobile_number}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{formatDate(order.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleViewOrder(order.id || order._id)}
                                                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View Details
                                                </button>
                                            </div>

                                            {/* Order Items Preview */}
                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                                                <div className="space-y-2">
                                                    {items.slice(0, 2).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <Package className="w-5 h-5 text-indigo-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                                                <p className="text-gray-500">Qty: {item.quantity}</p>
                                                            </div>
                                                            {item.unit_price && (
                                                                <p className="font-medium text-gray-900">
                                                                    ₱{(item.unit_price * item.quantity).toFixed(2)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {items.length > 2 && (
                                                        <p className="text-sm text-gray-500 pl-13">
                                                            +{items.length - 2} more items
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {order.notes && (
                                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-xs font-medium text-gray-700 mb-1">Customer Notes:</p>
                                                    <p className="text-sm text-gray-600">{order.notes}</p>
                                                </div>
                                            )}

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span className="capitalize">{order.payment_method}</span>
                                                        {getPaymentStatusBadge(order.payment_status)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Total Amount */}
                                                    {order.total_amount && (
                                                        <div className="text-right mr-4">
                                                            <p className="text-sm text-gray-600">Total</p>
                                                            <p className="text-xl font-bold text-gray-900">
                                                                ₱{Number(order.total_amount).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    {order.status === 'preparing' && (
                                                        <button
                                                            onClick={() => handleMarkReady(order.id || order._id)}
                                                            disabled={isActionLoading}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isActionLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <CheckSquare className="w-4 h-4" />
                                                            )}
                                                            Mark Ready
                                                        </button>
                                                    )}

                                                    {order.status === 'ready_for_pickup' && (
                                                        <button
                                                            onClick={() => handleCompletePickup(order.id || order._id)}
                                                            disabled={isActionLoading}
                                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isActionLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="w-4 h-4" />
                                                            )}
                                                            Complete Pickup
                                                        </button>
                                                    )}

                                                    {(order.status === 'pending' || order.status === 'preparing') && (
                                                        <button
                                                            onClick={() => handleCancelOrder(order.id || order._id)}
                                                            disabled={isActionLoading}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isActionLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Ban className="w-4 h-4" />
                                                            )}
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
