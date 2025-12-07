import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Search, X, Plus, Trash2, FileText, Package, Eye, Loader2, Minus, CheckCircle } from 'lucide-react';

export default function PrescriptionsIndex() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        order_type: '',
        search: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        declined: 0
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0
    });
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [approvalItems, setApprovalItems] = useState([]);
    const [adminMessage, setAdminMessage] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Product search for adding items
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        fetchPrescriptions();
    }, [filters.status, filters.order_type, pagination.current_page]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                ...(filters.status && { status: filters.status }),
                ...(filters.order_type && { order_type: filters.order_type }),
                ...(filters.search && { search: filters.search })
            });

            const response = await fetch(`/admin/api/prescriptions?${params}`);
            const data = await response.json();

            if (data.success) {
                setPrescriptions(data.prescriptions.data || []);
                setPagination({
                    current_page: data.prescriptions.current_page,
                    last_page: data.prescriptions.last_page,
                    per_page: data.prescriptions.per_page,
                    total: data.prescriptions.total
                });
                setStats(data.stats || stats);
            }
        } catch (error) {
            console.error('Failed to fetch prescriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Search products from inventory
    const searchProducts = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(`/admin/api/products?search=${encodeURIComponent(query)}&per_page=10`);
            const data = await response.json();

            if (data.success && data.products) {
                setSearchResults(data.products.data || []);
            }
        } catch (error) {
            console.error('Product search failed:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Debounce product search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (productSearch) {
                searchProducts(productSearch);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearch]);

    const handleStatusFilter = (status) => {
        setFilters(prev => ({ ...prev, status }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleTypeFilter = (orderType) => {
        setFilters(prev => ({ ...prev, order_type: orderType }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleViewDetails = async (prescription) => {
        const prescriptionId = prescription._id || prescription.id;

        if (!prescriptionId) {
            console.error('No prescription ID found:', prescription);
            alert('Unable to load prescription details - missing ID');
            return;
        }

        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}`);
            const data = await response.json();
            if (data.success) {
                // Ensure the prescription object has both _id and id for compatibility
                const prescriptionData = {
                    ...data.prescription,
                    _id: data.prescription._id || data.prescription.id,
                    id: data.prescription.id || data.prescription._id
                };
                setSelectedPrescription(prescriptionData);
                setShowDetailsModal(true);
            } else {
                console.error('Failed to fetch prescription:', data);
                alert(data.message || 'Failed to load prescription details');
            }
        } catch (error) {
            console.error('Failed to fetch prescription details:', error);
            alert('Failed to load prescription details. Please try again.');
        }
    };

    const handleViewImage = (prescription) => {
        const prescriptionId = prescription._id || prescription.id;

        if (!prescriptionId) {
            console.error('No prescription ID found:', prescription);
            alert('Unable to view file - missing prescription ID');
            return;
        }

        setSelectedPrescription(prescription);
        setShowImageModal(true);
    };

    const handleInitiateApproval = (prescription) => {
        setSelectedPrescription(prescription);

        // Use customer's pre-selected items if available
        if (prescription.requested_items && prescription.requested_items.length > 0) {
            setApprovalItems(prescription.requested_items.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                brand_name: item.brand_name || '',
                generic_name: item.generic_name || '',
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0,
                unit: item.unit || 'piece',
                unit_quantity: item.unit_quantity || 1,
                form_type: item.form_type || 'piece',
                status: 'available'
            })));
        } else if (prescription.items && prescription.items.length > 0) {
            setApprovalItems(prescription.items);
        } else {
            setApprovalItems([]);
        }

        setShowDetailsModal(false);
        setShowApproveModal(true);
    };

    const handleAddProductToApproval = (product) => {
        const productId = product._id || product.id;
        const sellingPrice = product.selling_price || product.sale_price || 0;

        // Check if product already exists
        const existingIndex = approvalItems.findIndex(item => item.product_id === productId);

        if (existingIndex >= 0) {
            // Increment quantity if exists
            const newItems = [...approvalItems];
            newItems[existingIndex].quantity += 1;
            setApprovalItems(newItems);
        } else {
            // Add new item
            setApprovalItems([...approvalItems, {
                product_id: productId,
                product_name: product.product_name || 'Unknown Product',
                brand_name: product.brand_name || product.manufacturer || '',
                generic_name: product.generic_name || '',
                quantity: 1,
                unit_price: sellingPrice,
                unit: product.display_unit || product.unit || 'piece',
                unit_quantity: product.display_unit_quantity || product.unit_quantity || 1,
                form_type: product.form_type || 'piece',
                status: 'available'
            }]);
        }

        setProductSearch('');
        setSearchResults([]);
    };

    const handleAddEmptyItem = () => {
        setApprovalItems([...approvalItems, {
            product_id: '',
            product_name: '',
            brand_name: '',
            quantity: 1,
            unit_price: 0,
            status: 'available'
        }]);
    };

    const handleRemoveItem = (index) => {
        setApprovalItems(approvalItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...approvalItems];
        newItems[index][field] = value;
        setApprovalItems(newItems);
    };

    const handleUpdateQuantity = (index, delta) => {
        const newItems = [...approvalItems];
        const newQuantity = Math.max(1, newItems[index].quantity + delta);
        newItems[index].quantity = newQuantity;
        setApprovalItems(newItems);
    };

    const formatUnitDisplay = (item) => {
        if (!item.unit_quantity || item.unit_quantity === 1) {
            return item.form_type ? item.form_type.charAt(0).toUpperCase() + item.form_type.slice(1) : 'Piece';
        }

        const pluralForm = item.form_type ?
            (item.form_type.endsWith('s') ? item.form_type : item.form_type + 's') :
            'pieces';

        return `${item.unit} of ${item.unit_quantity} ${pluralForm}`;
    };

    const handleApprovePrescription = async () => {
        if (!selectedPrescription) return;

        const prescriptionId = selectedPrescription._id || selectedPrescription.id;

        if (!prescriptionId) {
            alert('Unable to approve prescription - missing ID');
            return;
        }

        const invalidItems = approvalItems.some(item =>
            !item.product_name || item.quantity < 1 || item.unit_price < 0
        );

        if (invalidItems) {
            alert('Please fill in all item details correctly');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    items: approvalItems,
                    admin_message: adminMessage
                })
            });

            const data = await response.json();

            if (data.success) {
                setShowApproveModal(false);
                setApprovalItems([]);
                setAdminMessage('');
                fetchPrescriptions();
                alert('Prescription approved and order created successfully!');
            } else {
                alert(data.message || 'Failed to approve prescription');
            }
        } catch (error) {
            console.error('Error approving prescription:', error);
            alert('Failed to approve prescription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeclinePrescription = async () => {
        if (!selectedPrescription || !declineReason.trim()) {
            alert('Please provide a decline reason');
            return;
        }

        const prescriptionId = selectedPrescription._id || selectedPrescription.id;

        if (!prescriptionId) {
            alert('Unable to decline prescription - missing ID');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ reason: declineReason })
            });

            const data = await response.json();

            if (data.success) {
                setShowDeclineModal(false);
                setShowDetailsModal(false);
                setDeclineReason('');
                fetchPrescriptions();
                alert('Prescription declined successfully');
            } else {
                alert(data.message || 'Failed to decline prescription');
            }
        } catch (error) {
            console.error('Error declining prescription:', error);
            alert('Failed to decline prescription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateOrderStatus = async () => {
        if (!selectedPrescription || !orderStatus) return;

        const prescriptionId = selectedPrescription._id || selectedPrescription.id;

        if (!prescriptionId) {
            alert('Unable to update order status - missing ID');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/update-order-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ status: orderStatus })
            });

            const data = await response.json();

            if (data.success) {
                setShowOrderStatusModal(false);
                setOrderStatus('');
                fetchPrescriptions();
                alert('Order status updated successfully');
            } else {
                alert(data.message || 'Failed to update order status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Failed to update order status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdatePaymentStatus = async () => {
        if (!selectedPrescription || !paymentStatus) return;

        const prescriptionId = selectedPrescription._id || selectedPrescription.id;

        if (!prescriptionId) {
            alert('Unable to update payment status - missing ID');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/update-payment-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    payment_status: paymentStatus,
                    payment_method: paymentMethod || undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                setShowPaymentModal(false);
                setPaymentStatus('');
                setPaymentMethod('');
                fetchPrescriptions();
                alert('Payment status updated successfully');
            } else {
                alert(data.message || 'Failed to update payment status');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Failed to update payment status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteOrder = async (prescriptionId) => {
        if (!confirm('Complete this order? This will reduce stock and mark as completed.')) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/complete-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ payment_method: 'cash' })
            });

            const data = await response.json();

            if (data.success) {
                fetchPrescriptions();
                setShowDetailsModal(false);
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

    const handleCancelOrder = async (prescriptionId) => {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/cancel-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (data.success) {
                fetchPrescriptions();
                setShowDetailsModal(false);
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
            approved: 'bg-green-100 text-green-800 border-green-200',
            declined: 'bg-red-100 text-red-800 border-red-200',
            completed: 'bg-blue-100 text-blue-800 border-blue-200',
            cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getOrderStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            processing: 'bg-purple-100 text-purple-800',
            ready_for_pickup: 'bg-green-100 text-green-800',
            completed: 'bg-green-600 text-white',
            cancelled: 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeBadge = (type) => {
        const badges = {
            prescription: 'bg-purple-100 text-purple-800 border-purple-200',
            online_order: 'bg-indigo-100 text-indigo-800 border-indigo-200'
        };
        return badges[type] || 'bg-gray-100 text-gray-800 border-gray-200';
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

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Prescriptions & Orders Management" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Prescriptions & Orders</h1>
                    <p className="text-gray-600">Review prescriptions and manage orders from submission to completion</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                        <p className="text-sm text-yellow-700 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                        <p className="text-sm text-green-700 mb-1">Approved</p>
                        <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <p className="text-sm text-blue-700 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-blue-800">{stats.completed}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                        <p className="text-sm text-red-700 mb-1">Declined</p>
                        <p className="text-2xl font-bold text-red-800">{stats.declined}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="space-y-4">
                        {/* Status Filters */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleStatusFilter('')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === ''
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All Status
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('pending')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'pending'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Pending Review
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('approved')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'approved'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Active Orders
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('completed')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'completed'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Completed
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('declined')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'declined'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Declined
                                </button>
                            </div>
                        </div>

                        {/* Type Filters */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Order Type</label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleTypeFilter('')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.order_type === ''
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All Types
                                </button>
                                <button
                                    onClick={() => handleTypeFilter('prescription')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.order_type === 'prescription'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Prescription
                                </button>
                                <button
                                    onClick={() => handleTypeFilter('online_order')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.order_type === 'online_order'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Online Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prescriptions/Orders List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="text-center py-20">
                            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No prescriptions/orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Prescription #</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Order Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {prescriptions.map((prescription) => {
                                        const prescriptionId = prescription._id || prescription.id;

                                        return (
                                            <tr key={prescriptionId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm font-semibold text-gray-900">
                                                        {prescription.prescription_number}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {prescription.customer?.first_name} {prescription.customer?.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {prescription.mobile_number}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadge(prescription.order_type)}`}>
                                                        {prescription.order_type === 'prescription' ? (
                                                            <><FileText className="w-3 h-3" /> RX</>
                                                        ) : (
                                                            <><Package className="w-3 h-3" /> Order</>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(prescription.status)}`}>
                                                        {prescription.status?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {prescription.order ? (
                                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getOrderStatusBadge(prescription.order.status)}`}>
                                                            {prescription.order.status?.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No order</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <span className="font-semibold text-gray-900">
                                                            {prescription.items?.length || prescription.requested_items?.length || 0}
                                                        </span>
                                                        <span className="text-gray-600"> items</span>
                                                        {prescription.requested_items && prescription.requested_items.length > 0 && !prescription.items && (
                                                            <span className="ml-2 text-xs text-blue-600">(Pre-selected)</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {prescription.items?.length > 0 ? (
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(calculateTotal(prescription.items))}
                                                        </span>
                                                    ) : prescription.requested_items?.length > 0 ? (
                                                        <span className="text-sm font-semibold text-blue-600">
                                                            {formatCurrency(calculateTotal(prescription.requested_items))}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-600">
                                                        {formatDate(prescription.created_at)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(prescription)}
                                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                        >
                                                            Details
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewImage(prescription)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                        >
                                                            View File
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && prescriptions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                                {pagination.total} records
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
            {/* Details Modal */}
            {showDetailsModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Prescription & Order Details</h2>
                                <p className="text-sm text-gray-600">{selectedPrescription.prescription_number}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Prescription Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Prescription #</label>
                                    <p className="font-mono font-bold text-gray-900">{selectedPrescription.prescription_number}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Prescription Status</label>
                                    <p>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(selectedPrescription.status)}`}>
                                            {selectedPrescription.status?.toUpperCase()}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Customer</label>
                                    <p className="text-gray-900">{selectedPrescription.customer?.first_name} {selectedPrescription.customer?.last_name}</p>
                                    <p className="text-sm text-gray-500">{selectedPrescription.customer?.email || ''}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Mobile</label>
                                    <p className="text-gray-900">{selectedPrescription.mobile_number}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Type</label>
                                    <p>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadge(selectedPrescription.order_type)}`}>
                                            {selectedPrescription.order_type === 'prescription' ? 'Prescription' : 'Online Order'}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Date Submitted</label>
                                    <p className="text-gray-900">{formatDate(selectedPrescription.created_at)}</p>
                                </div>
                            </div>

                            {/* Order Info (if exists) */}
                            {selectedPrescription.order && (
                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Order Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Order Status</label>
                                            <p>
                                                <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${getOrderStatusBadge(selectedPrescription.order.status)}`}>
                                                    {selectedPrescription.order.status?.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Payment Status</label>
                                            <p>
                                                <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${getPaymentStatusBadge(selectedPrescription.order.payment_status)}`}>
                                                    {selectedPrescription.order.payment_status?.toUpperCase()}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-600">Payment Method</label>
                                            <p className="text-gray-900">{selectedPrescription.order.payment_method?.toUpperCase() || 'Not set'}</p>
                                        </div>
                                        {selectedPrescription.order.completed_at && (
                                            <div>
                                                <label className="text-sm font-semibold text-gray-600">Completed At</label>
                                                <p className="text-gray-900">{formatDate(selectedPrescription.order.completed_at)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedPrescription.notes && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 block mb-2">Customer Notes</label>
                                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedPrescription.notes}</p>
                                </div>
                            )}

                            {/* Admin Message */}
                            {selectedPrescription.admin_message && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 block mb-2">Admin Message</label>
                                    <p className="text-gray-900 bg-blue-50 p-3 rounded-lg">{selectedPrescription.admin_message}</p>
                                </div>
                            )}

                            {/* Customer Pre-Selected Items */}
                            {selectedPrescription.requested_items && selectedPrescription.requested_items.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-blue-600" />
                                        Customer Pre-Selected Items
                                        <span className="text-sm font-normal text-blue-600">(Not yet verified)</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedPrescription.requested_items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item.product_name}</p>
                                                    {item.brand_name && (
                                                        <p className="text-sm text-gray-600">{item.brand_name}</p>
                                                    )}
                                                    <p className="text-sm text-gray-600">
                                                        Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                                                        {item.unit && item.unit_quantity && item.unit_quantity > 1 && (
                                                            <span className="ml-2 text-xs text-gray-500">
                                                                ({item.unit} of {item.unit_quantity} {item.form_type})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-gray-900">
                                                    {formatCurrency(item.unit_price * item.quantity)}
                                                </p>
                                            </div>
                                        ))}
                                        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-blue-900">Estimated Total:</span>
                                                <span className="text-lg font-bold text-blue-900">
                                                    {formatCurrency(calculateTotal(selectedPrescription.requested_items))}
                                                </span>
                                            </div>
                                            <p className="text-xs text-blue-700 mt-1">* Subject to pharmacist verification</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Approved Items */}
                            {selectedPrescription.items && selectedPrescription.items.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">Approved Order Items</h3>
                                    <div className="space-y-2">
                                        {selectedPrescription.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item.product_name}</p>
                                                    {item.brand_name && (
                                                        <p className="text-sm text-gray-600">{item.brand_name}</p>
                                                    )}
                                                    <p className="text-sm text-gray-600">
                                                        Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                                                        {item.unit && item.unit_quantity && item.unit_quantity > 1 && (
                                                            <span className="ml-2 text-xs text-gray-500">
                                                                ({item.unit} of {item.unit_quantity} {item.form_type})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mt-1 ${item.status === 'available'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-gray-900">
                                                    {formatCurrency(item.unit_price * item.quantity)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t pt-3 mt-3">
                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>Total Amount:</span>
                                            <span className="text-indigo-600">{formatCurrency(calculateTotal(selectedPrescription.items))}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* File Info */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 block mb-2">Prescription File</label>
                                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-900">{selectedPrescription.original_filename}</p>
                                        <p className="text-xs text-gray-500">{(selectedPrescription.file_size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => handleViewImage(selectedPrescription)}
                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View File
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t space-y-3">
                                {selectedPrescription.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleInitiateApproval(selectedPrescription)}
                                            className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                                        >
                                            Approve & Create Order
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                setShowDeclineModal(true);
                                            }}
                                            className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}

                                {selectedPrescription.status === 'approved' && selectedPrescription.order && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    setOrderStatus(selectedPrescription.order.status);
                                                    setShowOrderStatusModal(true);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                                            >
                                                Update Order Status
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPaymentStatus(selectedPrescription.order.payment_status);
                                                    setPaymentMethod(selectedPrescription.order.payment_method || '');
                                                    setShowPaymentModal(true);
                                                }}
                                                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                                            >
                                                Update Payment
                                            </button>
                                        </div>
                                        {selectedPrescription.order.status !== 'completed' && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleCompleteOrder(selectedPrescription._id)}
                                                    disabled={actionLoading}
                                                    className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    Complete Order
                                                </button>
                                                <button
                                                    onClick={() => handleCancelOrder(selectedPrescription._id)}
                                                    disabled={actionLoading}
                                                    className="flex-1 px-4 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    Cancel Order
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal with Product Search and Image Reference */}
            {showApproveModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-7xl my-8 max-h-[95vh] flex flex-col">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Approve Prescription & Create Order</h2>
                                    <p className="text-sm text-gray-600">{selectedPrescription.prescription_number}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setShowDetailsModal(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Split View Content */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Left Side - Product Search and Order Items */}
                            <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
                                <div className="space-y-6">
                                    {/* Product Search */}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Search & Add Products from Inventory</label>
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by product name, brand, or generic name..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                {searchLoading && (
                                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-600 animate-spin" />
                                                )}
                                            </div>

                                            {/* Search Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-indigo-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                                                    {searchResults.map((product) => (
                                                        <button
                                                            key={product._id || product.id}
                                                            type="button"
                                                            onClick={() => handleAddProductToApproval(product)}
                                                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-gray-900 truncate">{product.product_name}</p>
                                                                    <p className="text-sm text-gray-600 truncate">{product.brand_name || product.manufacturer}</p>
                                                                    {product.generic_name && (
                                                                        <p className="text-xs text-gray-500 truncate">{product.generic_name}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className="text-sm font-bold text-indigo-600">
                                                                        ₱{(product.selling_price || product.sale_price || 0).toFixed(2)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Stock: {product.stock_quantity || 0}
                                                                    </p>
                                                                    {product.display_unit && product.display_unit_quantity > 1 && (
                                                                        <p className="text-xs text-blue-600">
                                                                            {product.display_unit} of {product.display_unit_quantity}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <span>💡</span>
                                            <span>Reference the prescription image on the right while searching</span>
                                        </p>
                                    </div>

                                    {/* Customer Pre-Selected Items Preview */}
                                    {selectedPrescription.requested_items && selectedPrescription.requested_items.length > 0 && (
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                            <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                Customer's Pre-Selected Items
                                            </h4>
                                            <p className="text-xs text-blue-700 mb-3">These items were pre-selected by the customer. Verify against prescription.</p>
                                            <div className="space-y-2">
                                                {selectedPrescription.requested_items.map((item, index) => (
                                                    <div key={index} className="text-xs bg-white rounded-lg p-2 border border-blue-200">
                                                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                                                        {item.brand_name && (
                                                            <p className="text-gray-600">{item.brand_name}</p>
                                                        )}
                                                        <p className="text-gray-600 mt-1">Qty: {item.quantity} × ₱{item.unit_price.toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Items List */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-semibold text-gray-700">
                                                Order Items ({approvalItems.length})
                                            </label>
                                        </div>

                                        {approvalItems.length === 0 ? (
                                            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                                                <p className="text-gray-600 font-medium">No items added yet</p>
                                                <p className="text-sm text-gray-500 mt-2">Search and add products from inventory</p>
                                                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-600">
                                                    <Search className="w-4 h-4" />
                                                    <span>Use the search bar above</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {approvalItems.map((item, index) => (
                                                    <div key={index} className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-indigo-300 transition-colors">
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-gray-900 text-base">{item.product_name}</p>
                                                                {item.brand_name && (
                                                                    <p className="text-sm text-gray-600">{item.brand_name}</p>
                                                                )}
                                                                {item.generic_name && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">{item.generic_name}</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                <span className="text-sm font-medium">Remove</span>
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600 block mb-1">Unit Price</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₱</span>
                                                                    <input
                                                                        type="number"
                                                                        value={item.unit_price}
                                                                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600 block mb-1">Quantity</label>
                                                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateQuantity(index, -1)}
                                                                        className="p-1.5 bg-white hover:bg-gray-200 rounded transition-colors"
                                                                    >
                                                                        <Minus className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                        min="1"
                                                                        className="flex-1 px-2 py-1.5 border-0 bg-transparent text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateQuantity(index, 1)}
                                                                        className="p-1.5 bg-white hover:bg-gray-200 rounded transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {item.unit && item.unit_quantity && item.unit_quantity > 1 && (
                                                            <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 flex items-center gap-1">
                                                                <Package className="w-3 h-3" />
                                                                <span>Unit: {formatUnitDisplay(item)}</span>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">Subtotal:</span>
                                                            <span className="text-lg font-bold text-indigo-600">
                                                                {formatCurrency(item.quantity * item.unit_price)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {approvalItems.length > 0 && (
                                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-xl mt-4 shadow-lg">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm opacity-90 mb-1">Total Order Amount</p>
                                                        <p className="text-3xl font-bold">{formatCurrency(calculateTotal(approvalItems))}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm opacity-90">{approvalItems.length} items</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Message */}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">Message to Customer (Optional)</label>
                                        <textarea
                                            value={adminMessage}
                                            onChange={(e) => setAdminMessage(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            rows="3"
                                            placeholder="Add any additional message for the customer (e.g., availability notes, alternatives suggested, etc.)"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Prescription Image Reference */}
                            <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
                                <div className="sticky top-0 bg-gray-50 pb-3 mb-3 border-b border-gray-300 z-10">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                        Prescription Reference
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">{selectedPrescription.original_filename}</p>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    {selectedPrescription.file_mime_type?.includes('pdf') ? (
                                        <iframe
                                            src={`/admin/api/prescriptions/${selectedPrescription._id || selectedPrescription.id}/download`}
                                            className="w-full h-[calc(100vh-300px)]"
                                            title="Prescription PDF"
                                        />
                                    ) : (
                                        <div className="p-2">
                                            <img
                                                src={`/storage/${selectedPrescription.file_path}`}
                                                alt="Prescription"
                                                className="w-full h-auto rounded"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                    <p className="text-sm text-indigo-800 flex items-start gap-2">
                                        <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span><strong>Tip:</strong> Cross-reference this prescription while searching products on the left. Verify medicine names, dosages, and quantities.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-6 py-4 rounded-b-2xl">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setShowDetailsModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApprovePrescription}
                                    disabled={actionLoading || approvalItems.length === 0}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Approving Order...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Approve & Create Order
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Decline Modal */}
            {showDeclineModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Decline Prescription</h2>
                        <p className="text-sm text-gray-600 mb-4">{selectedPrescription.prescription_number}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Reason for Declining *
                                </label>
                                <textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    rows="4"
                                    placeholder="Explain why this prescription is being declined..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeclineModal(false);
                                        setShowDetailsModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeclinePrescription}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Declining...' : 'Decline'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Status Update Modal */}
            {showOrderStatusModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Order Status</h2>
                        <p className="text-sm text-gray-600 mb-4">Order #{selectedPrescription.order?.order_id}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Order Status</label>
                                <select
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="processing">Processing</option>
                                    <option value="ready_for_pickup">Ready for Pickup</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowOrderStatusModal(false)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateOrderStatus}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Status Update Modal */}
            {showPaymentModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Payment Status</h2>
                        <p className="text-sm text-gray-600 mb-4">Order #{selectedPrescription.order?.order_id}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status</label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select method...</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="gcash">GCash</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdatePaymentStatus}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Updating...' : 'Update Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {showImageModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-5xl w-full">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <div className="bg-white rounded-2xl p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedPrescription.original_filename}</h3>
                            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
                                {selectedPrescription.file_mime_type?.includes('pdf') ? (
                                    <iframe
                                        src={`/admin/api/prescriptions/${selectedPrescription._id}/download`}
                                        className="w-full h-[600px]"
                                        title="Prescription PDF"
                                    />
                                ) : (
                                    <img
                                        src={`/storage/${selectedPrescription.file_path}`}
                                        alt="Prescription"
                                        className="max-w-full max-h-[600px] object-contain"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
