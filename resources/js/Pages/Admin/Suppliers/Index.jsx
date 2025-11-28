import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';

export default function Suppliers({ suppliers = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [dropdownOpen, setDropdownOpen] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
    });

    const openModal = () => {
        setShowModal(true);
        setEditingSupplier(null);
        setFormData({
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
        });
        setErrors({});
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSupplier(null);
        setFormData({
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
        });
        setErrors({});
    };

    const editSupplier = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
        });
        setShowModal(true);
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Supplier name is required';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const url = editingSupplier
                ? `/admin/api/suppliers/${editingSupplier.id}`
                : '/admin/api/suppliers';

            const method = editingSupplier ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                closeModal();
                router.reload({ only: ['suppliers'] });
            } else {
                setErrors(data.errors || { general: data.message });
            }
        } catch (error) {
            console.error('Failed to save supplier:', error);
            setErrors({ general: 'Failed to save supplier. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (supplierId) => {
        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/api/suppliers/${supplierId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
            });

            const data = await response.json();

            if (data.success) {
                router.reload({ only: ['suppliers'] });
            } else {
                alert(data.message || 'Failed to delete supplier');
            }
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            alert('Failed to delete supplier. Please try again.');
        }
    };

    const toggleDropdown = (supplierId) => {
        setDropdownOpen(dropdownOpen === supplierId ? null : supplierId);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Supplier Management" />

            <div className="suppliers-container">
                <div className="page-header">
                    <div className="header-content">
                        <h1 className="page-title">Supplier Management</h1>
                        <p className="page-subtitle">Manage your pharmacy suppliers</p>
                    </div>
                    <button className="btn-create" onClick={openModal}>
                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add Supplier
                    </button>
                </div>

                <div className="table-wrapper">
                    {suppliers.length === 0 ? (
                        <div className="no-suppliers">
                            <div className="empty-icon">📦</div>
                            <div className="empty-title">No suppliers available</div>
                            <div className="empty-subtitle">Add your first supplier to get started</div>
                        </div>
                    ) : (
                        <table className="suppliers-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Contact Person</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Address</th>
                                    <th style={{ width: '80px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((supplier) => (
                                    <tr key={supplier.id}>
                                        <td className="supplier-name">{supplier.name}</td>
                                        <td>{supplier.contact_person || '-'}</td>
                                        <td>{supplier.phone || '-'}</td>
                                        <td>{supplier.email || '-'}</td>
                                        <td className="address-cell" title={supplier.address}>
                                            {supplier.address || '-'}
                                        </td>
                                        <td>
                                            <div className="dropdown-container">
                                                <button
                                                    className="dropdown-toggle"
                                                    onClick={() => toggleDropdown(supplier.id)}
                                                >
                                                    &#8943;
                                                </button>
                                                {dropdownOpen === supplier.id && (
                                                    <div className="dropdown-menu">
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                editSupplier(supplier);
                                                                setDropdownOpen(null);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="dropdown-item delete-btn"
                                                            onClick={() => {
                                                                handleDelete(supplier.id);
                                                                setDropdownOpen(null);
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal using Headless UI */}
            <Modal show={showModal} onClose={closeModal} maxWidth="2xl">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
                        <button className="modal-close" onClick={closeModal}>
                            &times;
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="supplier-form">
                        {errors.general && (
                            <div className="error-banner">
                                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {errors.general}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">
                                Supplier Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter supplier name"
                            />
                            {errors.name && (
                                <span className="error-message">{errors.name}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="contact_person" className="form-label">
                                Contact Person
                            </label>
                            <input
                                type="text"
                                id="contact_person"
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter contact person name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="Enter email address"
                            />
                            {errors.email && (
                                <span className="error-message">{errors.email}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="address" className="form-label">
                                Complete Address
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="form-textarea"
                                rows="4"
                                placeholder="Enter complete address"
                            />
                        </div>

                        <div className="modal-buttons">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={closeModal}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        {editingSupplier ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                                            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <style>{`
                .suppliers-container {
                    padding: 2.5rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    min-height: 100vh;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2.5rem;
                    gap: 2rem;
                }

                .header-content {
                    flex: 1;
                }

                .page-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.025em;
                }

                .page-subtitle {
                    font-size: 0.9375rem;
                    color: #6B7280;
                    margin: 0;
                }

                .btn-create {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .btn-create:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                .table-wrapper {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .no-suppliers {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .empty-icon {
                    font-size: 3rem;
                    opacity: 0.3;
                    margin-bottom: 1rem;
                }

                .empty-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 0.5rem;
                }

                .empty-subtitle {
                    font-size: 0.875rem;
                    color: #9CA3AF;
                }

                .suppliers-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .suppliers-table thead {
                    background: #F9FAFB;
                    border-bottom: 2px solid #E5E7EB;
                }

                .suppliers-table th {
                    padding: 1rem 1.5rem;
                    text-align: left;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #374151;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .suppliers-table tbody tr {
                    border-bottom: 1px solid #F3F4F6;
                    transition: all 0.2s ease;
                }

                .suppliers-table tbody tr:hover {
                    background: #F9FAFB;
                }

                .suppliers-table td {
                    padding: 1.25rem 1.5rem;
                    font-size: 0.9375rem;
                    color: #374151;
                }

                .supplier-name {
                    font-weight: 600;
                    color: #111827;
                }

                .address-cell {
                    max-width: 250px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .dropdown-container {
                    position: relative;
                }

                .dropdown-toggle {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    font-size: 1.25rem;
                    color: #6B7280;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .dropdown-toggle:hover {
                    background: #F3F4F6;
                    color: #374151;
                }

                .dropdown-menu {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    margin-top: 0.25rem;
                    background: white;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    min-width: 120px;
                    z-index: 1000;
                    overflow: hidden;
                }

                .dropdown-item {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: white;
                    border: none;
                    text-align: left;
                    font-size: 0.875rem;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: block;
                }

                .dropdown-item:hover {
                    background: #F9FAFB;
                }

                .dropdown-item.delete-btn {
                    color: #EF4444;
                }

                .dropdown-item.delete-btn:hover {
                    background: #FEE2E2;
                }

                /* Modal Styles */
                .modal-content {
                    background: white;
                }

                .modal-header {
                    padding: 2rem 2rem 1.5rem;
                    border-bottom: 2px solid #F3F4F6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0;
                }

                .modal-close {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #F3F4F6;
                    border: none;
                    border-radius: 50%;
                    font-size: 1.5rem;
                    color: #6B7280;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .modal-close:hover {
                    background: #E5E7EB;
                    color: #374151;
                }

                .supplier-form {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .error-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: #FEE2E2;
                    border: 2px solid #FEE2E2;
                    border-radius: 8px;
                    color: #991B1B;
                    font-weight: 500;
                    font-size: 0.875rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #374151;
                }

                .required {
                    color: #EF4444;
                }

                .form-input,
                .form-textarea {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid #E5E7EB;
                    border-radius: 8px;
                    font-size: 0.9375rem;
                    color: #111827;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }

                .form-input:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-input.error,
                .form-textarea.error {
                    border-color: #EF4444;
                }

                .form-input.error:focus,
                .form-textarea.error:focus {
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .form-textarea {
                    resize: vertical;
                    min-height: 100px;
                }

                .error-message {
                    font-size: 0.8125rem;
                    color: #EF4444;
                    font-weight: 500;
                }

                .modal-buttons {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .btn-primary,
                .btn-secondary {
                    flex: 1;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.875rem 1.5rem;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: white;
                    border: 2px solid #E5E7EB;
                    color: #374151;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #F9FAFB;
                    border-color: #D1D5DB;
                }

                .btn-secondary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 768px) {
                    .suppliers-container {
                        padding: 1.5rem;
                    }

                    .page-header {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .btn-create {
                        width: 100%;
                        justify-content: center;
                    }

                    .modal-buttons {
                        flex-direction: column-reverse;
                    }

                    .suppliers-table {
                        font-size: 0.875rem;
                    }

                    .suppliers-table th,
                    .suppliers-table td {
                        padding: 0.875rem 1rem;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
