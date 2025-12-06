import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CustomersIndex() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        restricted: 0,
        deactivated: 0,
        deleted: 0
    });
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
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [durationDays, setDurationDays] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [filters.status, filters.search, pagination.current_page]);

    const fetchStats = async () => {
        try {
            const response = await fetch('/admin/api/customers/stats');
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search })
            });

            const response = await fetch(`/admin/api/customers?${params}`);
            const data = await response.json();

            if (data.success) {
                setCustomers(data.customers.data || []);
                setPagination({
                    current_page: data.customers.current_page,
                    last_page: data.customers.last_page,
                    per_page: data.customers.per_page,
                    total: data.customers.total
                });
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusFilter = (status) => {
        setFilters(prev => ({ ...prev, status }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, search: searchInput }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
    };

    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        setShowDetailsModal(true);
    };

    const handleInitiateStatusChange = (customer) => {
        setSelectedCustomer(customer);
        setNewStatus(customer.status);
        setDurationDays('');
        setShowDetailsModal(false);
        setShowStatusModal(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedCustomer || !newStatus) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/admin/api/customers/${selectedCustomer._id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    status: newStatus,
                    ...(durationDays && { duration_days: parseInt(durationDays) })
                })
            });

            const data = await response.json();

            if (data.success) {
                setShowStatusModal(false);
                fetchCustomers();
                fetchStats();
                alert('Customer status updated successfully!');
            } else {
                alert(data.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCustomer = async (customerId) => {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            const response = await fetch(`/admin/api/customers/${customerId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();

            if (data.success) {
                fetchCustomers();
                fetchStats();
                alert('Customer deleted successfully');
            } else {
                alert(data.message || 'Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer');
        }
    };

    const handleRestoreCustomer = async (customerId) => {
        if (!confirm('Restore this customer account?')) return;

        try {
            const response = await fetch(`/admin/api/customers/${customerId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });

            const data = await response.json();

            if (data.success) {
                fetchCustomers();
                fetchStats();
                alert('Customer restored successfully');
            } else {
                alert(data.message || 'Failed to restore customer');
            }
        } catch (error) {
            console.error('Error restoring customer:', error);
            alert('Failed to restore customer');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-green-100 text-green-800 border-green-200',
            restricted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            deactivated: 'bg-red-100 text-red-800 border-red-200',
            deleted: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        const parts = [
            address.street,
            address.city,
            address.province,
            address.postal_code
        ].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Customers Management" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Customers Management</h1>
                    <p className="text-gray-600">View and manage customer accounts</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Restricted</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.restricted}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Deactivated</p>
                                <p className="text-3xl font-bold text-red-600 mt-1">{stats.deactivated}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Deleted</p>
                                <p className="text-3xl font-bold text-gray-600 mt-1">{stats.deleted}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="space-y-4">
                        {/* Status Filters */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Filter by Status</label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleStatusFilter('')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                        filters.status === ''
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    All Customers
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('active')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                        filters.status === 'active'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('restricted')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                        filters.status === 'restricted'
                                            ? 'bg-yellow-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Restricted
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('deactivated')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                        filters.status === 'deactivated'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Deactivated
                                </button>
                                <button
                                    onClick={() => handleStatusFilter('deleted')}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                        filters.status === 'deleted'
                                            ? 'bg-gray-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Deleted
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Search</label>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search by name, email, or phone..."
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    Search
                                </button>
                                {filters.search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchInput('');
                                            setFilters(prev => ({ ...prev, search: '' }));
                                        }}
                                        className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                {/* Customers List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-20">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No customers found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {customers.map((customer) => (
                                        <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                                                        {customer.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900">{customer.email}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900">{customer.phone || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(customer.status)}`}>
                                                    {customer.status?.toUpperCase()}
                                                </span>
                                                {customer.auto_restore_at && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Auto-restore: {formatDate(customer.auto_restore_at)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">{formatDate(customer.created_at)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(customer)}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                    >
                                                        Details
                                                    </button>
                                                    {customer.status === 'deleted' ? (
                                                        <button
                                                            onClick={() => handleRestoreCustomer(customer._id)}
                                                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                                                        >
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeleteCustomer(customer._id)}
                                                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && customers.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                                {pagination.total} customers
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
            {showDetailsModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Customer Details</h2>
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
                            {/* Profile */}
                            <div className="flex items-center space-x-4">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
                                    {selectedCustomer.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                                    <p className="text-gray-600">{selectedCustomer.email}</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border mt-2 ${getStatusBadge(selectedCustomer.status)}`}>
                                        {selectedCustomer.status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Phone</label>
                                    <p className="text-gray-900">{selectedCustomer.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Birthdate</label>
                                    <p className="text-gray-900">{selectedCustomer.birthdate ? formatDate(selectedCustomer.birthdate) : 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Sex</label>
                                    <p className="text-gray-900">{selectedCustomer.sex || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600">Joined</label>
                                    <p className="text-gray-900">{formatDate(selectedCustomer.created_at)}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-semibold text-gray-600">Address</label>
                                    <p className="text-gray-900">{formatAddress(selectedCustomer.address)}</p>
                                </div>
                                {selectedCustomer.status_changed_at && (
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Status Changed</label>
                                        <p className="text-gray-900">{formatDate(selectedCustomer.auto_restore_at)}</p>
                                    </div>
                                )}
                                {selectedCustomer.last_login && (
                                    <div>
                                        <label className="text-sm font-semibold text-gray-600">Last Login</label>
                                        <p className="text-gray-900">{formatDate(selectedCustomer.last_login)}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {selectedCustomer.status !== 'deleted' && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => handleInitiateStatusChange(selectedCustomer)}
                                        className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                                    >
                                        Change Status
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleDeleteCustomer(selectedCustomer._id);
                                        }}
                                        className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                                    >
                                        Delete Customer
                                    </button>
                                </div>
                            )}

                            {selectedCustomer.status === 'deleted' && (
                                <div className="pt-4 border-t">
                                    <button
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            handleRestoreCustomer(selectedCustomer._id);
                                        }}
                                        className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                                    >
                                        Restore Customer
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {showStatusModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Change Customer Status</h2>
                        <p className="text-sm text-gray-600 mb-6">{selectedCustomer.name}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    New Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="restricted">Restricted</option>
                                    <option value="deactivated">Deactivated</option>
                                </select>
                            </div>

                            {newStatus === 'restricted' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Duration (Days) - Optional
                                    </label>
                                    <input
                                        type="number"
                                        value={durationDays}
                                        onChange={(e) => setDurationDays(e.target.value)}
                                        min="1"
                                        placeholder="Leave empty for permanent"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        If set, the customer will be automatically restored to active status after this many days
                                    </p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    {newStatus === 'active' && 'Customer will have full access to the platform.'}
                                    {newStatus === 'restricted' && 'Customer will have limited access. Set duration for temporary restriction.'}
                                    {newStatus === 'deactivated' && 'Customer will not be able to log in or access their account.'}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        setShowStatusModal(false);
                                        setShowDetailsModal(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
