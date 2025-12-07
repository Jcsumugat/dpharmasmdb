import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    FileText, ArrowLeft, Calendar, Phone, Package, Clock, CheckCircle, XCircle,
    AlertCircle, Download, Eye, Loader2, DollarSign, CreditCard, MapPin,
    ShoppingCart, User, MessageSquare, TrendingUp
} from 'lucide-react';

export default function Detail({ prescription: initialPrescription }) {
    const [prescription, setPrescription] = useState(initialPrescription);
    const [loading, setLoading] = useState(!initialPrescription);
    const [showImageModal, setShowImageModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!initialPrescription) {
            fetchPrescriptionDetails();
        }
    }, []);

    const fetchPrescriptionDetails = async () => {
        const pathParts = window.location.pathname.split('/');
        const prescriptionId = pathParts[pathParts.length - 1];

        try {
            const response = await fetch(`/customer/api/prescriptions/${prescriptionId}`);
            const data = await response.json();

            if (data.success) {
                setPrescription(data.prescription);
            } else {
                alert('Failed to load prescription details');
            }
        } catch (error) {
            console.error('Failed to fetch prescription:', error);
            alert('Failed to load prescription details');
        } finally {
            setLoading(false);
        }
    };

    const viewDocument = () => {
        const prescriptionId = prescription._id || prescription.id;
        window.open(`/customer/api/prescriptions/${prescriptionId}/download`, '_blank');
    };

    const handleCancelOrder = async () => {
        if (!prescription.order) return;

        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason || !reason.trim()) return;

        setCancelling(true);
        try {
            const prescriptionId = prescription._id || prescription.id;
            const response = await fetch(`/customer/api/prescriptions/${prescriptionId}/cancel-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ reason: reason.trim() })
            });

            const data = await response.json();

            if (data.success) {
                alert('Order cancelled successfully');
                fetchPrescriptionDetails();
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    const calculateTotal = (items) => {
        if (!items || items.length === 0) return 0;
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending Review' },
            approved: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, label: 'Approved' },
            completed: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
            declined: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Declined' },
            cancelled: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: XCircle, label: 'Cancelled' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 ${badge.color}`}>
                <Icon className="w-5 h-5" />
                {badge.label}
            </span>
        );
    };

    const getOrderStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending' },
            confirmed: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
            processing: { color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Processing' },
            ready_for_pickup: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Ready for Pickup' },
            completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed' },
            cancelled: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' }
        };

        const badge = badges[status] || badges.pending;

        return (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
            paid: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Paid' },
            failed: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Failed' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${badge.color}`}>
                <Icon className="w-4 h-4" />
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <CustomerLayout>
                <Head title="Loading..." />
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
                        <p className="text-gray-600 font-medium">Loading prescription details...</p>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    if (!prescription) {
        return (
            <CustomerLayout>
                <Head title="Not Found" />
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
                    <div className="text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prescription Not Found</h2>
                        <p className="text-gray-600 mb-6">The prescription you're looking for doesn't exist.</p>
                        <Link
                            href="/customer/prescriptions"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Prescriptions
                        </Link>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <Head title={`Prescription ${prescription.prescription_number}`} />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="max-w-6xl mx-auto p-6 lg:p-8">
                    {/* Back Button */}
                    <Link
                        href="/customer/prescriptions"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Prescriptions
                    </Link>

                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                                    {prescription.prescription_number}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    {getStatusBadge(prescription.status)}
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 ${
                                        prescription.order_type === 'prescription'
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}>
                                        {prescription.order_type === 'prescription' ? (
                                            <>
                                                <FileText className="w-5 h-5" />
                                                Prescription
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-5 h-5" />
                                                Online Order
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={viewDocument}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all shadow-sm"
                                >
                                    <Eye className="w-5 h-5" />
                                    View Document
                                </button>
                                <button
                                    onClick={() => setShowImageModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    Download
                                </button>
                            </div>
                        </div>

                        {/* Basic Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Submitted</p>
                                    <p className="text-sm font-bold text-blue-900">{formatDate(prescription.created_at)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Contact</p>
                                    <p className="text-sm font-bold text-green-900">{prescription.mobile_number}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Document</p>
                                    <p className="text-xs font-bold text-purple-900 truncate">{prescription.original_filename}</p>
                                    <p className="text-xs text-purple-600">{(prescription.file_size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Information */}
                    {prescription.order && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Package className="w-6 h-6 text-blue-600" />
                                    Order Information
                                </h2>
                                <div className="flex items-center gap-3">
                                    {getOrderStatusBadge(prescription.order.status)}
                                    {getPaymentStatusBadge(prescription.order.payment_status)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Total Items</p>
                                    <p className="text-3xl font-bold text-blue-900">{prescription.items?.length || 0}</p>
                                </div>

                                {prescription.items && prescription.items.length > 0 && (
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
                                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Total Amount</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            {formatCurrency(calculateTotal(prescription.items))}
                                        </p>
                                    </div>
                                )}

                                {prescription.order.payment_method && (
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Payment Method</p>
                                        <p className="text-lg font-bold text-purple-900 capitalize flex items-center gap-2">
                                            <CreditCard className="w-5 h-5" />
                                            {prescription.order.payment_method}
                                        </p>
                                    </div>
                                )}

                                {prescription.order.completed_at && (
                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border-2 border-amber-200">
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Completed On</p>
                                        <p className="text-xs font-bold text-amber-900">
                                            {formatDate(prescription.order.completed_at)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Cancel Order Button */}
                            {prescription.order.status !== 'completed' && prescription.order.status !== 'cancelled' && (
                                <div className="pt-4 border-t">
                                    <button
                                        onClick={handleCancelOrder}
                                        disabled={cancelling}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all disabled:opacity-50"
                                    >
                                        {cancelling ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Cancelling...
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-5 h-5" />
                                                Cancel Order
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Items Section */}
                    {prescription.items && prescription.items.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-green-600" />
                                Order Items ({prescription.items.length})
                            </h2>
                            <div className="space-y-3">
                                {prescription.items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.product_name}</p>
                                            {item.brand_name && (
                                                <p className="text-sm text-gray-600">{item.brand_name}</p>
                                            )}
                                            {item.generic_name && (
                                                <p className="text-xs text-gray-500 mt-0.5">{item.generic_name}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-gray-600">
                                                    Qty: <span className="font-semibold text-gray-900">{item.quantity}</span>
                                                </span>
                                                <span className="text-gray-600">
                                                    Price: <span className="font-semibold text-gray-900">{formatCurrency(item.unit_price)}</span>
                                                </span>
                                                {item.unit && item.unit_quantity && item.unit_quantity > 1 && (
                                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        {item.unit} of {item.unit_quantity} {item.form_type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </p>
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold mt-2 ${
                                                item.status === 'available'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-6 border-t-2 border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {formatCurrency(calculateTotal(prescription.items))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pre-Selected Items */}
                    {prescription.requested_items && prescription.requested_items.length > 0 && !prescription.items && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-purple-600" />
                                Pre-Selected Items ({prescription.requested_items.length})
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                These items are pending pharmacist verification
                            </p>
                            <div className="space-y-3">
                                {prescription.requested_items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.product_name}</p>
                                            {item.brand_name && (
                                                <p className="text-sm text-gray-600">{item.brand_name}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="text-gray-600">
                                                    Qty: <span className="font-semibold text-gray-900">{item.quantity}</span>
                                                </span>
                                                <span className="text-gray-600">
                                                    Price: <span className="font-semibold text-gray-900">{formatCurrency(item.unit_price)}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-purple-900">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </p>
                                            <span className="inline-flex px-2 py-1 rounded text-xs font-semibold mt-2 bg-yellow-100 text-yellow-800">
                                                Pending
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-6 border-t-2 border-purple-200 bg-purple-50 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-purple-900">Estimated Total:</span>
                                    <span className="text-2xl font-bold text-purple-600">
                                        {formatCurrency(calculateTotal(prescription.requested_items))}
                                    </span>
                                </div>
                                <p className="text-xs text-purple-700 mt-2">* Subject to pharmacist verification</p>
                            </div>
                        </div>
                    )}

                    {/* Notes and Messages */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {prescription.notes && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-gray-600" />
                                    Your Notes
                                </h3>
                                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                                    {prescription.notes}
                                </p>
                            </div>
                        )}

                        {prescription.admin_message && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                    Pharmacy Message
                                </h3>
                                <p className="text-amber-800 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-200">
                                    {prescription.admin_message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-5xl w-full">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <XCircle className="w-8 h-8" />
                        </button>
                        <div className="bg-white rounded-2xl p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">{prescription.original_filename}</h3>
                            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
                                {prescription.file_mime_type?.includes('pdf') ? (
                                    <iframe
                                        src={`/customer/api/prescriptions/${prescription._id || prescription.id}/download`}
                                        className="w-full h-[600px]"
                                        title="Prescription PDF"
                                    />
                                ) : (
                                    <img
                                        src={`/storage/${prescription.file_path}`}
                                        alt="Prescription"
                                        className="max-w-full max-h-[600px] object-contain"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}
