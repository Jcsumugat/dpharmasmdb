import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function OrdersIndex() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        search: ''
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0
    });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cancelReason, setCancelReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [filters.status, pagination.current_page]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                ...(filters.status && { status: filters.status })
            });

            const response = await fetch(`/admin/api/orders?${params}`);
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders.data || []);
                setPagination({
                    current_page: data.orders.current_page,
                    last_page: data.orders.last_page,
                    per_page: data.orders.per_page,
                    total: data.orders.total
                });
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusFilter = (status) => {
        setFilters(prev => ({ ...prev, status }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setShowDetailsModal(true);
    };

    const handleCompleteOrder = async () => {
        if (!selectedOrder) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/orders/${selectedOrder._id}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ payment_method: paymentMethod })
            });

            const data = await response.json();

            if (data.success) {
                setShowCompleteModal(false);
                setShowDetailsModal(false);
                fetchOrders();
                alert('Order completed successfully!');
            } else {
                alert(data.message || 'Failed to complete order');
            }
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason.trim()) {
            alert('Please provide a cancellation reason');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/orders/${selectedOrder._id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            const data = await response.json();

            if (data.success) {
                setShowCancelModal(false);
                setShowDetailsModal(false);
                setCancelReason('');
                fetchOrders();
                alert('Order cancelled successfully');
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Failed to cancel order');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            processing: 'bg-blue-100 text-blue-800 border-blue-200',
            ready: 'bg-purple-100 text-purple-800 border-purple-200',
            completed: 'bg-green-100 text-green-800 border-green-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Orders Management" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders Management</h1>
                    <p className="text-gray-600">Manage customer orders and prescriptions</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleStatusFilter('')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === ''
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All Orders
                        </button>
                        <button
                            onClick={() => handleStatusFilter('pending')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => handleStatusFilter('processing')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === 'processing'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Processing
                        </button>
                        <button
                            onClick={() => handleStatusFilter('ready')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === 'ready'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Ready
                        </button>
                        <button
                            onClick={() => handleStatusFilter('completed')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === 'completed'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Completed
                        </button>
                        <button
                            onClick={() => handleStatusFilter('cancelled')}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                filters.status === 'cancelled'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Cancelled
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Order ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {orders.map((order) => (
                                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-semibold text-gray-900">
                                                    #{order.order_id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.customer?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {order.customer?.email || ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900">
                                                    {order.items?.length || 0} items
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {formatCurrency(order.total_amount || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(order.status)}`}>
                                                    {order.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {formatDate(order.created_at)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleViewDetails(order)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && orders.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                                {pagination.total} orders
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                                    disabled={pagination.current_page === 1}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                                    disabled={pagination.current_page === pagination.last_page}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Order ID</label>
                                    <p className="font-mono font-bold text-gray-900">#{selectedOrder.order_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Status</label>
                                    <p>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(selectedOrder.status)}`}>
                                            {selectedOrder.status?.toUpperCase()}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Customer</label>
                                    <p className="text-gray-900">{selectedOrder.customer?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Date</label>
                                    <p className="text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Order Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="font-semibold text-gray-900">
                                                {formatCurrency(item.unit_price * item.quantity)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Total Amount:</span>
                                    <span className="text-indigo-600">{formatCurrency(selectedOrder.total_amount || 0)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            {selectedOrder.status === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setShowCompleteModal(true);
                                        }}
                                        className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                                    >
                                        Complete Order
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setShowCancelModal(true);
                                        }}
                                        className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                                    >
                                        Cancel Order
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Order Modal */}
            {showCompleteModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Order</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="gcash">GCash</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteOrder}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Processing...' : 'Complete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Order Modal */}
            {showCancelModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Order</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Cancellation Reason
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    rows="3"
                                    placeholder="Enter reason for cancellation..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Cancelling...' : 'Cancel Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
