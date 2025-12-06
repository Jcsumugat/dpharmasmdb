import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function PrescriptionsIndex() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        order_type: '',
        search: ''
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
    const [declineReason, setDeclineReason] = useState('');
    const [approvalItems, setApprovalItems] = useState([]);
    const [adminMessage, setAdminMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPrescriptions();
    }, [filters.status, filters.order_type, pagination.current_page]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                ...(filters.status && { status: filters.status }),
                ...(filters.order_type && { order_type: filters.order_type })
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
            }
        } catch (error) {
            console.error('Failed to fetch prescriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusFilter = (status) => {
        setFilters(prev => ({ ...prev, status }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleTypeFilter = (orderType) => {
        setFilters(prev => ({ ...prev, order_type: orderType }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleViewDetails = (prescription) => {
        setSelectedPrescription(prescription);
        setShowDetailsModal(true);
    };

    const handleViewImage = (prescription) => {
        setSelectedPrescription(prescription);
        setShowImageModal(true);
    };

    const handleInitiateApproval = (prescription) => {
        setSelectedPrescription(prescription);
        // Initialize approval items if prescription already has items
        if (prescription.items && prescription.items.length > 0) {
            setApprovalItems(prescription.items);
        } else {
            setApprovalItems([{
                product_id: '',
                product_name: '',
                quantity: 1,
                unit_price: 0,
                status: 'available'
            }]);
        }
        setShowDetailsModal(false);
        setShowApproveModal(true);
    };

    const handleAddItem = () => {
        setApprovalItems([...approvalItems, {
            product_id: '',
            product_name: '',
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

    const handleApprovePrescription = async () => {
        if (!selectedPrescription) return;

        // Validate items
        const invalidItems = approvalItems.some(item =>
            !item.product_name || item.quantity < 1 || item.unit_price < 0
        );

        if (invalidItems) {
            alert('Please fill in all item details correctly');
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${selectedPrescription._id}/approve`, {
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
                alert('Prescription approved successfully!');
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

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/prescriptions/${selectedPrescription._id}/decline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ admin_message: declineReason })
            });

            const data = await response.json();

            if (data.success) {
                setShowDeclineModal(false);
                setShowDetailsModal(false);
                setDeclineReason('');
                fetchPrescriptions();
                alert('Prescription declined');
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

    const handleCompletePrescription = async (prescriptionId) => {
        if (!confirm('Mark this prescription as completed?')) return;

        try {
            const response = await fetch(`/admin/api/prescriptions/${prescriptionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();

            if (data.success) {
                fetchPrescriptions();
                alert('Prescription marked as completed');
            } else {
                alert(data.message || 'Failed to complete prescription');
            }
        } catch (error) {
            console.error('Error completing prescription:', error);
            alert('Failed to complete prescription');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            approved: 'bg-green-100 text-green-800 border-green-200',
            declined: 'bg-red-100 text-red-800 border-red-200',
            completed: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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
            <Head title="Prescriptions Management" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Prescriptions Management</h1>
                    <p className="text-gray-600">Review and manage customer prescription submissions</p>
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
                                    Pending
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('approved')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'approved'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Approved
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
                                <button
                                    onClick={() => handleStatusFilter('completed')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.status === 'completed'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Completed
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

                {/* Prescriptions List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="text-center py-20">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No prescriptions found</p>
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
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {prescriptions.map((prescription) => (
                                        <tr key={prescription._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-semibold text-gray-900">
                                                    {prescription.prescription_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {prescription.customer?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {prescription.mobile_number}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadge(prescription.order_type)}`}>
                                                    {prescription.order_type === 'prescription' ? 'RX' : 'Order'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(prescription.status)}`}>
                                                    {prescription.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900">
                                                    {prescription.items?.length || 0} items
                                                </span>
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
                                    ))}
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
                                {pagination.total} prescriptions
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
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Prescription Details</h2>
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
                            {/* Prescription Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Prescription #</label>
                                    <p className="font-mono font-bold text-gray-900">{selectedPrescription.prescription_number}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Status</label>
                                    <p>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(selectedPrescription.status)}`}>
                                            {selectedPrescription.status?.toUpperCase()}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Customer</label>
                                    <p className="text-gray-900">{selectedPrescription.customer?.name || 'N/A'}</p>
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

                            {/* Items */}
                            {selectedPrescription.items && selectedPrescription.items.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">Prescription Items</h3>
                                    <div className="space-y-2">
                                        {selectedPrescription.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item.product_name}</p>
                                                    <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
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
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-900">{selectedPrescription.original_filename}</p>
                                    <p className="text-xs text-gray-500">{(selectedPrescription.file_size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>

                            {/* Actions */}
                            {selectedPrescription.status === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => handleInitiateApproval(selectedPrescription)}
                                        className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                                    >
                                        Approve
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

                            {selectedPrescription.status === 'approved' && (
                                <div className="pt-4 border-t">
                                    <button
                                        onClick={() => handleCompletePrescription(selectedPrescription._id)}
                                        className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                                    >
                                        Mark as Completed
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-bold text-gray-900">Approve Prescription</h2>
                            <p className="text-sm text-gray-600">{selectedPrescription.prescription_number}</p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Items List */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-semibold text-gray-700">Prescription Items</label>
                                    <button
                                        onClick={handleAddItem}
                                        className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {approvalItems.map((item, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">Product Name</label>
                                                    <input
                                                        type="text"
                                                        value={item.product_name}
                                                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder="Enter product name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                        min="1"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">Price (₱)</label>
                                                    <input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="available">Available</option>
                                                        <option value="out_of_stock">Out of Stock</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    Subtotal: {formatCurrency(item.quantity * item.unit_price)}
                                                </div>
                                                {approvalItems.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total Amount:</span>
                                        <span className="text-indigo-600">{formatCurrency(calculateTotal(approvalItems))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Message */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Message to Customer (Optional)</label>
                                <textarea
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    rows="3"
                                    placeholder="Add any additional message for the customer..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setShowDetailsModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApprovePrescription}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Approving...' : 'Approve Prescription'}
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
                                    Reason for Declining
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

            {/* Image Modal */}
            {showImageModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-5xl w-full">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="bg-white rounded-2xl p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedPrescription.original_filename}</h3>
                            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
                                {selectedPrescription.file_mime_type?.includes('pdf') ? (
                                    <iframe
                                        src={`/admin/api/prescriptions/${selectedPrescription._id}/file`}
                                        className="w-full h-[600px]"
                                        title="Prescription PDF"
                                    />
                                ) : (
                                    <img
                                        src={`/admin/api/prescriptions/${selectedPrescription._id}/file`}
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
