import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ArrowLeft,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    MapPin,
    Phone,
    User,
    Calendar,
    DollarSign,
    Loader2,
    AlertCircle,
    ShoppingBag,
    FileText,
    CheckSquare,
    Ban,
    Mail
} from 'lucide-react';

export default function OrderDetail() {
    const { order: initialOrder } = usePage().props;
    const [order, setOrder] = useState(initialOrder);
    const [loading, setLoading] = useState(!initialOrder);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!initialOrder) {
            loadOrder();
        }
    }, []);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const pathParts = window.location.pathname.split('/');
            const orderId = pathParts[pathParts.length - 1];

            const response = await fetch(route('admin.api.orders.show', orderId));
            const data = await response.json();

            if (data.success) {
                setOrder(data.order);
            }
        } catch (error) {
            console.error('Failed to load order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReady = async () => {
        if (!confirm('Mark this order as ready for pickup? The customer will be notified.')) return;

        setActionLoading(true);
        try {
            const response = await fetch(route('admin.api.orders.mark-ready', order._id || order.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();
            if (data.success) {
                setOrder(data.order);
                alert('Order marked as ready for pickup. Customer has been notified.');
            } else {
                alert(data.message || 'Failed to update order');
            }
        } catch (error) {
            console.error('Failed to mark ready:', error);
            alert('Failed to update order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompletePickup = async () => {
        if (!confirm('Confirm payment received and complete this order?')) return;

        const notes = prompt('Add any notes (optional):');

        setActionLoading(true);
        try {
            const response = await fetch(route('admin.api.orders.complete-pickup', order._id || order.id), {
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
                setOrder(data.order);
                alert('Order completed successfully!');
            } else {
                alert(data.message || 'Failed to complete order');
            }
        } catch (error) {
            console.error('Failed to complete order:', error);
            alert('Failed to complete order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        const reason = prompt('Enter cancellation reason:');
        if (!reason) return;

        setActionLoading(true);
        try {
            const response = await fetch(route('admin.api.orders.cancel', order._id || order.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();
            if (data.success) {
                setOrder(data.order);
                alert('Order cancelled successfully');
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order');
        } finally {
            setActionLoading(false);
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
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${badge.color}`}>
                <Icon className="w-5 h-5" />
                {badge.label}
            </div>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Payment' },
            paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
            failed: { color: 'bg-red-100 text-red-800', label: 'Payment Failed' }
        };

        const badge = badges[status] || badges.pending;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    if (loading || !order) {
        return (
            <AuthenticatedLayout>
                <Head title="Order Details" />
                <div className="p-6 md:p-10">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm">
                            <div className="flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                                <p className="text-gray-600">Loading order details...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const items = parseItems(order.items);
    const subtotal = order.subtotal || items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    return (
        <AuthenticatedLayout>
            <Head title={`Order ${order.order_id}`} />

            <div className="p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => router.visit(route('admin.orders'))}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Orders
                    </button>

                    {/* Header */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Order {order.order_id}
                                    </h1>
                                    {order.prescription_id && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                            <AlertCircle className="w-3 h-3" />
                                            Has Prescription
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600">
                                    Placed on {formatDate(order.created_at)}
                                </p>
                            </div>
                            {getStatusBadge(order.status)}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            {order.status === 'preparing' && (
                                <button
                                    onClick={handleMarkReady}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckSquare className="w-5 h-5" />
                                    )}
                                    Mark as Ready for Pickup
                                </button>
                            )}

                            {order.status === 'ready_for_pickup' && (
                                <button
                                    onClick={handleCompletePickup}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                    Complete Pickup
                                </button>
                            )}

                            {(order.status === 'pending' || order.status === 'preparing') && (
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={actionLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Ban className="w-5 h-5" />
                                    )}
                                    Cancel Order
                                </button>
                            )}

                            {order.prescription_id && (
                                <button
                                    onClick={() => router.visit(route('admin.prescriptions.detail', order.prescription_id))}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors ml-auto"
                                >
                                    <FileText className="w-5 h-5" />
                                    View Prescription
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Order Items */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                                <div className="space-y-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Package className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                                                {item.brand_name && (
                                                    <p className="text-sm text-gray-600">{item.brand_name}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-1">
                                                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                                    {item.unit_price && (
                                                        <p className="text-sm text-gray-600">
                                                            ₱{item.unit_price.toFixed(2)} each
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {item.unit_price && (
                                                <div className="text-right">
                                                    <p className="font-semibold text-gray-900">
                                                        ₱{(item.unit_price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer Notes */}
                            {order.notes && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer Notes</h2>
                                    <p className="text-gray-700">{order.notes}</p>
                                </div>
                            )}

                            {/* Pickup Notes (Admin) */}
                            {order.pickup_notes && (
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Pickup Notes</h2>
                                    <p className="text-gray-700">{order.pickup_notes}</p>
                                </div>
                            )}

                            {/* Cancellation Info */}
                            {order.status === 'cancelled' && order.cancellation_reason && (
                                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                                    <div className="flex gap-3">
                                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-red-900 mb-1">Order Cancelled</h3>
                                            <p className="text-sm text-red-700">Reason: {order.cancellation_reason}</p>
                                            {order.cancelled_at && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    Cancelled on {formatDate(order.cancelled_at)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Customer Information */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {order.customer ?
                                                    `${order.customer.first_name} ${order.customer.last_name}` :
                                                    'Unknown Customer'}
                                            </p>
                                        </div>
                                    </div>
                                    {order.customer?.email && (
                                        <div className="flex gap-2">
                                            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <p className="text-gray-700">{order.customer.email}</p>
                                        </div>
                                    )}
                                    {order.mobile_number && (
                                        <div className="flex gap-2">
                                            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <p className="text-gray-700">{order.mobile_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    {order.tax_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Tax (12%)</span>
                                            <span className="font-medium text-gray-900">₱{order.tax_amount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {order.discount_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Discount</span>
                                            <span className="font-medium text-green-600">
                                                -₱{order.discount_amount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="border-t border-gray-200 pt-3">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-900">Total</span>
                                            <span className="font-bold text-xl text-gray-900">
                                                ₱{(order.total_amount || subtotal).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <DollarSign className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Method:</span>
                                        <span className="font-medium text-gray-900 capitalize">
                                            {order.payment_method || 'Cash'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Status:</span>
                                        {getPaymentStatusBadge(order.payment_status)}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Order Placed</p>
                                            <p className="text-xs text-gray-600">{formatDate(order.created_at)}</p>
                                        </div>
                                    </div>
                                    {order.ready_at && (
                                        <div className="flex gap-3">
                                            <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Ready for Pickup</p>
                                                <p className="text-xs text-gray-600">{formatDate(order.ready_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {order.completed_at && (
                                        <div className="flex gap-3">
                                            <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Completed</p>
                                                <p className="text-xs text-gray-600">{formatDate(order.completed_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {order.cancelled_at && (
                                        <div className="flex gap-3">
                                            <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Cancelled</p>
                                                <p className="text-xs text-gray-600">{formatDate(order.cancelled_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
