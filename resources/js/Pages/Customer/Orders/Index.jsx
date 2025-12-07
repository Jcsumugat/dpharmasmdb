import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
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
    FileText
} from 'lucide-react';

export default function OrdersIndex() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0
    });

    // Load orders
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

            const response = await fetch(route('customer.api.orders.index') + '?' + params.toString());
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders.data || []);
                calculateStats(data.orders.data || []);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (ordersData) => {
        const stats = {
            total: ordersData.length,
            pending: ordersData.filter(o => o.status === 'pending').length,
            preparing: ordersData.filter(o => o.status === 'preparing').length,
            ready: ordersData.filter(o => o.status === 'ready_for_pickup').length,
            completed: ordersData.filter(o => o.status === 'completed').length
        };
        setStats(stats);
    };

    // Filter orders by search
    const filteredOrders = orders.filter(order => {
        const searchLower = searchQuery.toLowerCase();
        return (
            order.order_id?.toLowerCase().includes(searchLower) ||
            order.mobile_number?.toLowerCase().includes(searchLower)
        );
    });

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
        router.visit(route('customer.orders.detail', orderId));
    };

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                        <p className="text-gray-500 mt-2">Orders placed through online checkout</p>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">Looking for prescription orders?</p>
                                <p className="text-sm text-blue-700 mt-1">
                                    Orders that require prescription verification are shown in the{' '}
                                    <button
                                        onClick={() => router.visit(route('customer.prescriptions'))}
                                        className="font-semibold underline hover:text-blue-800"
                                    >
                                        Prescriptions
                                    </button>
                                    {' '}page.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
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

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Preparing</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.preparing}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Ready for Pickup</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.ready}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</p>
                                </div>
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-gray-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by order number or mobile..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="md:w-64">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Orders</option>
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
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Loading your orders...</p>
                                </div>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <ShoppingBag className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                                    <p className="text-gray-500 text-center mb-6">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'You haven\'t placed any orders yet'}
                                    </p>
                                    <button
                                        onClick={() => router.visit(route('customer.products'))}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        Browse Products
                                    </button>
                                </div>
                            </div>
                        ) : (
                            filteredOrders.map((order) => (
                                <div key={order._id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {order.order_id}
                                                    </h3>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{formatDate(order.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>Pickup Order</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleViewOrder(order._id)}
                                                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View Details
                                            </button>
                                        </div>

                                        {/* Order Items Preview */}
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-2">Items:</p>
                                            <div className="space-y-2">
                                                {(order.items || []).slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-sm">
                                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <Package className="w-5 h-5 text-blue-600" />
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
                                                {(order.items || []).length > 3 && (
                                                    <p className="text-sm text-gray-500 pl-13">
                                                        +{order.items.length - 3} more items
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Order Footer */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                            <div className="flex items-center gap-4">
                                                {order.payment_method && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span className="capitalize">{order.payment_method}</span>
                                                        {getPaymentStatusBadge(order.payment_status)}
                                                    </div>
                                                )}
                                            </div>
                                            {order.total_amount && (
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Total Amount</p>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        ₱{Number(order.total_amount).toFixed(2)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ready for Pickup Alert */}
                                        {order.status === 'ready_for_pickup' && (
                                            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex gap-3">
                                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-medium text-green-900">Ready for Pickup!</p>
                                                        <p className="text-sm text-green-700 mt-1">
                                                            Your order is ready. Please visit our pharmacy to collect it.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
