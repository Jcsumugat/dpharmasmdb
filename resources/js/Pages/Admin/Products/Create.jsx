import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CreateProduct() {
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        product_name: '',
        product_code: '',
        generic_name: '',
        brand_name: '',
        manufacturer: '',
        product_type: 'OTC',
        form_type: 'Tablet',
        dosage_unit: '',
        classification: '1',
        category_id: '',
        supplier_id: '',
        reorder_level: '10',
        unit: 'piece',
        unit_quantity: '1',
        storage_requirements: '',
    });

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/admin/api/categories');
            const data = await response.json();
            if (data.success) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/admin/api/suppliers');
            const data = await response.json();
            if (data.success) {
                setSuppliers(data.suppliers || []);
            }
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.product_name.trim()) {
            newErrors.product_name = 'Product name is required';
        }

        if (!formData.dosage_unit.trim()) {
            newErrors.dosage_unit = 'Dosage unit is required';
        }

        if (parseFloat(formData.unit_quantity) <= 0) {
            newErrors.unit_quantity = 'Unit quantity must be greater than 0';
        }

        if (parseInt(formData.reorder_level) < 0) {
            newErrors.reorder_level = 'Reorder level cannot be negative';
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
            const response = await fetch('/admin/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                // Redirect back to products list
                router.visit('/admin/products', {
                    onSuccess: () => {
                        // Show success message (you can implement a toast notification)
                        alert('Product created successfully!');
                    }
                });
            } else {
                setErrors(data.errors || { general: data.message });
            }
        } catch (error) {
            console.error('Failed to create product:', error);
            setErrors({ general: 'Failed to create product. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.visit('/admin/products');
    };

    const formTypeOptions = [
        'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops',
        'Cream', 'Ointment', 'Gel', 'Powder', 'Solution', 'Spray'
    ];

    const classificationOptions = [
        { value: '1', label: 'Class 1 - Antimicrobial' },
        { value: '2', label: 'Class 2 - Antineoplastic' },
        { value: '3', label: 'Class 3 - Cardiovascular' },
        { value: '4', label: 'Class 4 - CNS Agents' },
        { value: '5', label: 'Class 5 - Dermatological' },
        { value: '6', label: 'Class 6 - Gastrointestinal' },
        { value: '7', label: 'Class 7 - Hormones' },
        { value: '8', label: 'Class 8 - Immunological' },
        { value: '9', label: 'Class 9 - Ophthalmic' },
        { value: '10', label: 'Class 10 - Respiratory' },
        { value: '11', label: 'Class 11 - Vitamins/Minerals' },
        { value: '12', label: 'Class 12 - Other' },
        { value: '13', label: 'Class 13 - Medical Devices' }
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Create New Product" />

            <div className="create-product-container">
                {/* Header */}
                <div className="page-header">
                    <button className="back-button" onClick={handleCancel}>
                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Back to Products
                    </button>
                    <div className="header-content">
                        <h1 className="page-title">Create New Product</h1>
                        <p className="page-subtitle">Add a new product to your pharmacy inventory</p>
                    </div>
                </div>

                {/* Form */}
                <div className="product-form">
                    {errors.general && (
                        <div className="error-banner">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {errors.general}
                        </div>
                    )}

                    {/* Basic Information */}
                    <div className="form-section">
                        <div className="section-header">
                            <h2 className="section-title">📋 Basic Information</h2>
                            <p className="section-subtitle">Essential product details</p>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="product_name" className="form-label">
                                    Product Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="product_name"
                                    name="product_name"
                                    value={formData.product_name}
                                    onChange={handleChange}
                                    className={`form-input ${errors.product_name ? 'error' : ''}`}
                                    placeholder="e.g., Biogesic 500mg"
                                />
                                {errors.product_name && (
                                    <span className="error-message">{errors.product_name}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="product_code" className="form-label">
                                    Product Code
                                    <span className="optional">(Auto-generated if empty)</span>
                                </label>
                                <input
                                    type="text"
                                    id="product_code"
                                    name="product_code"
                                    value={formData.product_code}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g., P1234"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="generic_name" className="form-label">
                                    Generic Name
                                </label>
                                <input
                                    type="text"
                                    id="generic_name"
                                    name="generic_name"
                                    value={formData.generic_name}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g., Paracetamol"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="brand_name" className="form-label">
                                    Brand Name
                                </label>
                                <input
                                    type="text"
                                    id="brand_name"
                                    name="brand_name"
                                    value={formData.brand_name}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g., Biogesic"
                                />
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="manufacturer" className="form-label">
                                    Manufacturer
                                </label>
                                <input
                                    type="text"
                                    id="manufacturer"
                                    name="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="e.g., Unilab"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="form-section">
                        <div className="section-header">
                            <h2 className="section-title">🏷️ Classification</h2>
                            <p className="section-subtitle">Product type and category</p>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="product_type" className="form-label">
                                    Product Type <span className="required">*</span>
                                </label>
                                <select
                                    id="product_type"
                                    name="product_type"
                                    value={formData.product_type}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="OTC">💊 Over-the-Counter (OTC)</option>
                                    <option value="Prescription">📋 Prescription (Rx)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="form_type" className="form-label">
                                    Form Type <span className="required">*</span>
                                </label>
                                <select
                                    id="form_type"
                                    name="form_type"
                                    value={formData.form_type}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    {formTypeOptions.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="dosage_unit" className="form-label">
                                    Dosage/Strength <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="dosage_unit"
                                    name="dosage_unit"
                                    value={formData.dosage_unit}
                                    onChange={handleChange}
                                    className={`form-input ${errors.dosage_unit ? 'error' : ''}`}
                                    placeholder="e.g., 500mg, 10ml, 250mg/5ml"
                                />
                                {errors.dosage_unit && (
                                    <span className="error-message">{errors.dosage_unit}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="classification" className="form-label">
                                    Drug Classification <span className="required">*</span>
                                </label>
                                <select
                                    id="classification"
                                    name="classification"
                                    value={formData.classification}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    {classificationOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="category_id" className="form-label">
                                    Category
                                </label>
                                <select
                                    id="category_id"
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="supplier_id" className="form-label">
                                    Default Supplier
                                </label>
                                <select
                                    id="supplier_id"
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">Select supplier...</option>
                                    {suppliers.map(sup => (
                                        <option key={sup._id} value={sup._id}>
                                            {sup.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Settings */}
                    <div className="form-section">
                        <div className="section-header">
                            <h2 className="section-title">📦 Inventory Settings</h2>
                            <p className="section-subtitle">Stock management parameters</p>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="unit" className="form-label">
                                    Unit <span className="required">*</span>
                                </label>
                                <select
                                    id="unit"
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="piece">Piece</option>
                                    <option value="box">Box</option>
                                    <option value="bottle">Bottle</option>
                                    <option value="pack">Pack</option>
                                    <option value="vial">Vial</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="unit_quantity" className="form-label">
                                    Items per Unit <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="unit_quantity"
                                    name="unit_quantity"
                                    value={formData.unit_quantity}
                                    onChange={handleChange}
                                    className={`form-input ${errors.unit_quantity ? 'error' : ''}`}
                                    min="0.01"
                                    step="0.01"
                                    placeholder="e.g., 1, 10, 100"
                                />
                                {errors.unit_quantity && (
                                    <span className="error-message">{errors.unit_quantity}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="reorder_level" className="form-label">
                                    Reorder Level <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="reorder_level"
                                    name="reorder_level"
                                    value={formData.reorder_level}
                                    onChange={handleChange}
                                    className={`form-input ${errors.reorder_level ? 'error' : ''}`}
                                    min="0"
                                    placeholder="Minimum stock before alert"
                                />
                                {errors.reorder_level && (
                                    <span className="error-message">{errors.reorder_level}</span>
                                )}
                                <span className="help-text">
                                    Alert when stock falls below this level
                                </span>
                            </div>

                            <div className="form-group span-2">
                                <label htmlFor="storage_requirements" className="form-label">
                                    Storage Requirements
                                </label>
                                <textarea
                                    id="storage_requirements"
                                    name="storage_requirements"
                                    value={formData.storage_requirements}
                                    onChange={handleChange}
                                    className="form-textarea"
                                    rows="3"
                                    placeholder="e.g., Store in a cool, dry place. Keep away from direct sunlight."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner-small"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Create Product
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .create-product-container {
                    padding: 2.5rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    min-height: 100vh;
                }

                /* Header */
                .page-header {
                    margin-bottom: 2.5rem;
                }

                .back-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    background: white;
                    border: 2px solid #E5E7EB;
                    border-radius: 10px;
                    color: #6B7280;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-bottom: 1.5rem;
                }

                .back-button:hover {
                    background: #F9FAFB;
                    border-color: #667eea;
                    color: #667eea;
                }

                .header-content {
                    margin-top: 1rem;
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

                /* Form */
                .product-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .error-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.25rem;
                    background: #FEE2E2;
                    border: 2px solid #FEE2E2;
                    border-radius: 12px;
                    color: #991B1B;
                    font-weight: 500;
                    font-size: 0.9375rem;
                }

                /* Form Sections */
                .form-section {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    padding: 2rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .section-header {
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #F3F4F6;
                }

                .section-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.25rem 0;
                    letter-spacing: -0.025em;
                }

                .section-subtitle {
                    font-size: 0.875rem;
                    color: #6B7280;
                    margin: 0;
                }

                /* Form Grid */
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group.span-2 {
                    grid-column: span 2;
                }

                .form-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .required {
                    color: #EF4444;
                }

                .optional {
                    font-weight: 400;
                    color: #9CA3AF;
                    font-size: 0.8125rem;
                }

                .form-input,
                .form-select,
                .form-textarea {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid #E5E7EB;
                    border-radius: 10px;
                    font-size: 0.9375rem;
                    color: #111827;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }

                .form-input:focus,
                .form-select:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-input.error {
                    border-color: #EF4444;
                }

                .form-input.error:focus {
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                .error-message {
                    font-size: 0.8125rem;
                    color: #EF4444;
                    font-weight: 500;
                }

                .help-text {
                    font-size: 0.8125rem;
                    color: #6B7280;
                    font-style: italic;
                }

                /* Form Actions */
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    padding: 2rem;
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    position: sticky;
                    bottom: 2rem;
                }

                .btn-primary,
                .btn-secondary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.875rem 1.75rem;
                    border-radius: 12px;
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
                    .create-product-container {
                        padding: 1.5rem;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-group.span-2 {
                        grid-column: span 1;
                    }

                    .form-section {
                        padding: 1.5rem;
                    }

                    .form-actions {
                        flex-direction: column-reverse;
                        position: static;
                    }

                    .btn-primary,
                    .btn-secondary {
                        width: 100%;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
