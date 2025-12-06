import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';

export default function Suppliers({ suppliers }) {
    // Safety check - ensure suppliers is always an array
    const safeSuppliers = suppliers || [];

    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
    });

    const openModal = () => {
        setShowModal(true);
        setEditingSupplier(null);
        reset();
        clearErrors();
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSupplier(null);
        reset();
        clearErrors();
    };

    const editSupplier = (supplier) => {
        setEditingSupplier(supplier);
        setData({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
        });
        setShowModal(true);
        clearErrors();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingSupplier) {
            put(`/admin/api/suppliers/${editingSupplier.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    closeModal();
                },
            });
        } else {
            post('/admin/api/suppliers', {
                preserveScroll: true,
                onSuccess: () => {
                    closeModal();
                },
            });
        }
    };

    const handleDelete = (supplierId) => {
        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }

        router.delete(`/admin/api/suppliers/${supplierId}`, {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Supplier Management" />

            <div className="p-6 md:p-10 max-w-[1400px] mx-auto min-h-screen">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 md:gap-8">
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                            Supplier Management
                        </h1>
                        <p className="text-gray-600 text-sm md:text-base">
                            Manage your pharmacy suppliers
                        </p>
                    </div>
                    <button
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm md:text-base shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200"
                        onClick={openModal}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add Supplier
                    </button>
                </div>

                {/* Table Wrapper */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {safeSuppliers.length === 0 ? (
                        <div className="text-center py-16 px-8">
                            <div className="text-5xl opacity-30 mb-4">📦</div>
                            <div className="text-lg font-semibold text-gray-700 mb-2">
                                No suppliers available
                            </div>
                            <div className="text-sm text-gray-500">
                                Add your first supplier to get started
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Contact Person
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeSuppliers.map((supplier) => (
                                        <tr
                                            key={supplier.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                                        >
                                            <td className="px-6 py-5 text-sm font-semibold text-gray-900">
                                                {supplier.name}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {supplier.contact_person || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {supplier.phone || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {supplier.email || '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700 max-w-xs truncate" title={supplier.address}>
                                                {supplier.address || '-'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    {/* Edit Button */}
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-all duration-150"
                                                        onClick={() => editSupplier(supplier)}
                                                        title="Edit supplier"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                    {/* Delete Button */}
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-all duration-150"
                                                        onClick={() => handleDelete(supplier.id)}
                                                        title="Delete supplier"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal show={showModal} onClose={closeModal} maxWidth="2xl">
                <div className="bg-white">
                    {/* Modal Header */}
                    <div className="px-8 pt-8 pb-6 border-b-2 border-gray-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                        </h2>
                        <button
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-2xl text-gray-600 hover:text-gray-900 transition-all duration-150"
                            onClick={closeModal}
                        >
                            &times;
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-8 flex flex-col gap-6">
                        {errors.general && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-2 border-red-100 rounded-lg text-red-900 font-medium text-sm">
                                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {errors.general}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                                Supplier Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={`w-full px-4 py-3.5 border-2 rounded-lg text-sm text-gray-900 transition-all duration-150 ${
                                    errors.name
                                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                                } focus:outline-none`}
                                placeholder="Enter supplier name"
                            />
                            {errors.name && (
                                <span className="text-xs text-red-500 font-medium">{errors.name}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="contact_person" className="text-sm font-semibold text-gray-700">
                                Contact Person
                            </label>
                            <input
                                type="text"
                                id="contact_person"
                                name="contact_person"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-150"
                                placeholder="Enter contact person name"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-150"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={`w-full px-4 py-3.5 border-2 rounded-lg text-sm text-gray-900 transition-all duration-150 ${
                                    errors.email
                                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                                } focus:outline-none`}
                                placeholder="Enter email address"
                            />
                            {errors.email && (
                                <span className="text-xs text-red-500 font-medium">{errors.email}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="address" className="text-sm font-semibold text-gray-700">
                                Complete Address
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-150 resize-y min-h-[100px]"
                                rows="4"
                                placeholder="Enter complete address"
                            />
                        </div>

                        {/* Modal Buttons */}
                        <div className="flex flex-col-reverse md:flex-row gap-4 mt-4">
                            <button
                                type="button"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={closeModal}
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                onClick={handleSubmit}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {editingSupplier ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                                            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
