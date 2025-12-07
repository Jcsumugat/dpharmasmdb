import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
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
    FileText
} from 'lucide-react';

export default function OrderDetail() {
    const { order: initialOrder } = usePage().props;
    const [order, setOrder] = useState(initialOrder);
    const [loading, setLoading] = useState(!initialOrder);

    useEffect(() => {
        if (!initialOrder) {
            loadOrder();
        }
    }, []);

    const loadOrder = async () => {
        setLoading(true);
        try {
            // Extract order ID from URL
            const pathParts = window.location.pathname.split('/');
            const orderId = pathParts[pathParts.length - 1];

            const response = await fetch(route('customer.api.orders.index'));
            const data = await response.json();

            if (data.success) {
                const orders = data.orders?.data || data.orders || [];
                const foundOrder = orders.find(o => (o.id || o._id) === orderId);

                if (foundOrder) {
                    setOrder(foundOrder);
                } else {
                    console.error('Order not found');
                }
            }
        } catch (error) {
            console.error('Failed to load order:', error);
        } finally {
            setLoading(false);
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
            <CustomerLayout>
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-12">
                            <div className="flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                <p className="text-gray-600">Loading order details...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    const items = parseItems(order.items);
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <button
                        onClick={() => router.visit(route('customer.orders'))}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Orders
                    </button>

                    {/* Header */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                    Order {order.order_id}
                                </h1>
                                <p className="text-gray-600">
                                    Placed on {formatDate(order.created_at)}
                                </p>
                            </div>
                            {getStatusBadge(order.status)}
                        </div>

                        {/* Status Alert */}
                        {order.status === 'ready_for_pickup' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <div className="flex gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900">Your order is ready for pickup!</p>
                                        <p className="text-sm text-green-700 mt-1">
                                            Please visit our pharmacy to collect your order. Bring a valid ID for verification.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {order.status === 'preparing' && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-purple-900">Your order is being prepared</p>
                                        <p className="text-sm text-purple-700 mt-1">
                                            We'll notify you when your order is ready for pickup.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Order Items */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                                <div className="space-y-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                                            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Package className="w-8 h-8 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                                                <p className="text-sm text-gray-600">
                                                    {item.generic_name && `${item.generic_name} • `}
                                                    {item.dosage && `${item.dosage} • `}
                                                    {item.form}
                                                </p>
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
                        </div>

                        {/* Order Summary & Info */}
                        <div className="space-y-6">
                            {/* Order Summary */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                                    </div>
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
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
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

                            {/* Pickup Info */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup Information</h2>
                                <div className="space-y-3">
                                    <div className="flex gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">Digital Pharma</p>
                                            <p className="text-gray-600">Cebu City, Philippines</p>
                                        </div>
                                    </div>
                                    {order.mobile_number && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-900">{order.mobile_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Prescription Link */}
                            {order.prescription_id && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex gap-3">
                                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-900">Prescription Order</p>
                                            <button
                                                onClick={() => router.visit(route('customer.prescriptions.detail', order.prescription_id))}
                                                className="text-sm text-blue-700 hover:text-blue-800 font-medium mt-1 underline"
                                            >
                                                View prescription details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
