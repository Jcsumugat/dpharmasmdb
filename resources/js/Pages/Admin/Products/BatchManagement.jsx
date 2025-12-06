import { useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';

export default function BatchManagement({ product, batches, suppliers = [] }) {
    console.log('Component loaded with product:', product);
    console.log('Product unit_quantity:', product?.unit_quantity, 'Type:', typeof product?.unit_quantity);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [overrideUnit, setOverrideUnit] = useState(false);
    const [packageQuantity, setPackageQuantity] = useState('');
    const [calculatedQuantity, setCalculatedQuantity] = useState(0);

    const { data, setData, reset, clearErrors } = useForm({
        batch_number: '',
        expiration_date: '',
        quantity_received: '',
        unit_cost: '',
        sale_price: '',
        received_date: new Date().toISOString().split('T')[0],
        supplier_id: product?.supplier_id || '',
        unit: '',
        unit_quantity: '',
        notes: '',
    });

    const openAddModal = () => {
        setShowAddModal(true);
        setOverrideUnit(false);
        setPackageQuantity('');
        setCalculatedQuantity(0);
        reset();
        clearErrors();
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setOverrideUnit(false);
        setPackageQuantity('');
        setCalculatedQuantity(0);
        reset();
        clearErrors();
    };

    const openEditModal = (batch) => {
        setEditingBatch(batch);
        setData({
            expiration_date: batch.expiration_date?.split('T')[0] || '',
            unit_cost: batch.unit_cost || '',
            sale_price: batch.sale_price || '',
            notes: batch.notes || '',
        });
        setShowEditModal(true);
        clearErrors();
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingBatch(null);
        reset();
        clearErrors();
    };

    const handlePackageQuantityChange = (value) => {
        setPackageQuantity(value);

        if (!value || value === '') {
            setCalculatedQuantity(0);
            setData('quantity_received', '');
            return;
        }

        const pkgQty = parseFloat(value);
        console.log('Package quantity changed:', value, 'Parsed:', pkgQty);

        if (isNaN(pkgQty)) {
            setCalculatedQuantity(0);
            setData('quantity_received', '');
            return;
        }

        // Determine which unit quantity to use
        let unitQty = 0;
        if (overrideUnit && data.unit_quantity) {
            unitQty = parseFloat(data.unit_quantity);
        } else if (product?.unit_quantity) {
            unitQty = parseFloat(product.unit_quantity);
        }

        console.log('Unit quantity:', unitQty, 'Type:', typeof unitQty);

        if (unitQty && !isNaN(unitQty) && unitQty > 0) {
            const calculated = pkgQty * unitQty;
            console.log('Calculation:', pkgQty, '×', unitQty, '=', calculated);
            setCalculatedQuantity(calculated);
            setData('quantity_received', calculated.toString());
        } else {
            console.log('Invalid unit quantity');
            setCalculatedQuantity(0);
            setData('quantity_received', '');
        }
    };
    const handleUnitQuantityChange = (value) => {
        setData('unit_quantity', value);

        if (packageQuantity && value) {
            const pkgQty = parseFloat(packageQuantity);
            const unitQty = parseFloat(value);

            if (!isNaN(pkgQty) && !isNaN(unitQty)) {
                const calculated = pkgQty * unitQty;
                setCalculatedQuantity(calculated);
                setData('quantity_received', calculated.toString());
            }
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();

        // Debug logs
        console.log('Form data:', data);
        console.log('Package quantity:', packageQuantity);
        console.log('Calculated quantity:', calculatedQuantity);

        // Validate package quantity first
        if (!packageQuantity || packageQuantity === '' || isNaN(parseFloat(packageQuantity))) {
            alert('Please enter how many packages/units you received.');
            return;
        }

        // Validate quantity_received
        if (!data.quantity_received || isNaN(parseFloat(data.quantity_received)) || parseFloat(data.quantity_received) <= 0) {
            alert('Calculated quantity is invalid. Please check your package quantity input.');
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                batch_number: data.batch_number || null,
                expiration_date: data.expiration_date,
                quantity_received: parseFloat(data.quantity_received),
                unit_cost: parseFloat(data.unit_cost),
                sale_price: parseFloat(data.sale_price),
                received_date: data.received_date,
                supplier_id: data.supplier_id || null,
                notes: data.notes || null,
            };

            if (overrideUnit && data.unit && data.unit_quantity) {
                submitData.unit = data.unit;
                submitData.unit_quantity = parseFloat(data.unit_quantity);
            }

            console.log('Submitting batch data:', submitData);

            const response = await fetch(`/admin/api/products/${product.id}/add-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(submitData),
            });

            const result = await response.json();

            if (result.success) {
                closeAddModal();
                router.reload({ only: ['batches', 'product'] });
            } else {
                const errorMsg = result.errors
                    ? Object.values(result.errors).flat().join(', ')
                    : result.message || 'Failed to add batch';
                alert(errorMsg);
                console.error('Validation errors:', result.errors);
            }
        } catch (error) {
            console.error('Error adding batch:', error);
            alert('Failed to add batch. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBatch = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(
                `/admin/api/products/${product.id}/batches/${editingBatch._id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    },
                    body: JSON.stringify({
                        expiration_date: data.expiration_date,
                        unit_cost: data.unit_cost,
                        sale_price: data.sale_price,
                        notes: data.notes,
                    }),
                }
            );

            const result = await response.json();

            if (result.success) {
                closeEditModal();
                router.reload({ only: ['batches', 'product'] });
            } else {
                alert(result.message || 'Failed to update batch');
            }
        } catch (error) {
            console.error('Error updating batch:', error);
            alert('Failed to update batch. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getExpiryStatus = (expirationDate) => {
        if (!expirationDate) return 'unknown';
        const expiry = new Date(expirationDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 30) return 'expiring-soon';
        if (daysUntilExpiry <= 90) return 'warning';
        return 'good';
    };

    const getUnitDisplay = () => {
        if (overrideUnit && data.unit && data.unit_quantity) {
            return `${data.unit_quantity} ${data.unit}`;
        }
        return `${product?.unit_quantity || 'N/A'} ${product?.unit || ''}`;
    };

    const availableBatches = batches?.available_batches || [];
    const expiredBatches = batches?.expired_batches || [];

    return (
        <AuthenticatedLayout>
            <Head title={`Batch Management - ${product?.product_name}`} />

            <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div className="flex-1">
                        <button
                            onClick={() => router.visit('/admin/products')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition mb-4"
                        >
                            ← Back to Products
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{product?.product_name}</h1>
                        <p className="text-gray-600">
                            Product Code: {product?.product_code} | Stock: {product?.stock_quantity}{' '}
                            {product?.unit}
                        </p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path
                                d="M12 5v14M5 12h14"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                        Add Batch
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="w-14 h-14 flex items-center justify-center text-2xl bg-blue-50 rounded-xl">
                            📦
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {batches?.summary?.total_available || 0}
                            </div>
                            <div className="text-sm text-gray-600">Available Stock</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="w-14 h-14 flex items-center justify-center text-2xl bg-green-50 rounded-xl">
                            🏷️
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {batches?.summary?.batch_count || 0}
                            </div>
                            <div className="text-sm text-gray-600">Active Batches</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="w-14 h-14 flex items-center justify-center text-2xl bg-red-50 rounded-xl">
                            ⚠️
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {batches?.summary?.total_expired || 0}
                            </div>
                            <div className="text-sm text-gray-600">Expired Units</div>
                        </div>
                    </div>
                </div>

                {/* Available Batches */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Available Batches</h2>
                    {availableBatches.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <div className="text-5xl opacity-30 mb-4">📦</div>
                            <div className="text-lg font-semibold text-gray-700 mb-2">No available batches</div>
                            <div className="text-sm text-gray-500">Add your first batch to start managing stock</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableBatches.map((batch) => (
                                <div
                                    key={batch._id}
                                    className={`bg-white rounded-xl p-6 border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${getExpiryStatus(batch.expiration_date) === 'good'
                                        ? 'border-green-500'
                                        : getExpiryStatus(batch.expiration_date) === 'warning'
                                            ? 'border-amber-500'
                                            : getExpiryStatus(batch.expiration_date) === 'expiring-soon'
                                                ? 'border-red-500'
                                                : 'border-gray-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-gray-100">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Batch #</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {batch.batch_number}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openEditModal(batch)}
                                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            ✏️
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Quantity:</span>
                                            <span className="font-bold text-indigo-600">
                                                {batch.quantity_remaining} / {batch.quantity_received}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Expiry Date:</span>
                                            <span className="font-medium text-gray-900">
                                                {formatDate(batch.expiration_date)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Cost:</span>
                                            <span className="font-medium text-gray-900">₱{batch.unit_cost}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Sale Price:</span>
                                            <span className="font-medium text-gray-900">₱{batch.sale_price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Received:</span>
                                            <span className="font-medium text-gray-900">
                                                {formatDate(batch.received_date)}
                                            </span>
                                        </div>
                                    </div>

                                    {batch.notes && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                            <strong>Notes:</strong> {batch.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expired Batches */}
                {expiredBatches.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-red-600 mb-6">Expired Batches</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {expiredBatches.map((batch) => (
                                <div
                                    key={batch._id}
                                    className="bg-red-50 rounded-xl p-6 border-2 border-red-900 opacity-70"
                                >
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-red-100">
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Batch #</div>
                                            <div className="text-lg font-bold text-gray-900">
                                                {batch.batch_number}
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold">
                                            Expired
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700">Remaining:</span>
                                            <span className="font-medium text-gray-900">
                                                {batch.quantity_remaining}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700">Expired On:</span>
                                            <span className="font-medium text-gray-900">
                                                {formatDate(batch.expiration_date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Batch Modal */}
            <Modal show={showAddModal} onClose={closeAddModal} maxWidth="3xl">
                <div className="bg-white">
                    <div className="px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">Add New Batch</h2>
                        <button
                            onClick={closeAddModal}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-xl text-gray-600 transition"
                        >
                            &times;
                        </button>
                    </div>

                    <form onSubmit={handleAddBatch} className="p-8 space-y-6">
                        {/* Batch Number */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Batch Number (Optional - Auto-generated)
                            </label>
                            <input
                                type="text"
                                value={data.batch_number}
                                onChange={(e) => setData('batch_number', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                placeholder="Leave empty for auto-generation (e.g., BTH-202412-P1234-001)"
                            />
                            <small className="block mt-1 text-xs text-gray-500">
                                Format: BTH-YYYYMM-ProductCode-Sequence
                            </small>
                        </div>

                        {/* Package Quantity & Expiration Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    How many {product?.unit || 'units'}? <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={packageQuantity}
                                    onChange={(e) => handlePackageQuantityChange(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                    required
                                />
                                {calculatedQuantity > 0 && (
                                    <div className="mt-2 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                                        <div className="text-sm font-semibold text-green-800">
                                            = {calculatedQuantity} {product?.dosage_unit || 'units'} total
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Expiration Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.expiration_date}
                                    onChange={(e) => setData('expiration_date', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                        </div>

                        {/* Unit Cost & Sale Price */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Unit Cost (₱) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.unit_cost}
                                    onChange={(e) => setData('unit_cost', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sale Price (₱) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.sale_price}
                                    onChange={(e) => setData('sale_price', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                    required
                                />
                            </div>
                        </div>

                        {/* Received Date & Supplier */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Received Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.received_date}
                                    onChange={(e) => setData('received_date', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Supplier
                                </label>
                                <select
                                    value={data.supplier_id}
                                    onChange={(e) => setData('supplier_id', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                >
                                    <option value="">Use Product Default</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Packaging Override Section */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="checkbox"
                                    id="override_unit"
                                    checked={overrideUnit}
                                    onChange={(e) => {
                                        setOverrideUnit(e.target.checked);
                                        if (!e.target.checked && packageQuantity && product?.unit_quantity) {
                                            // Recalculate with product default when unchecking
                                            const calculated = parseFloat(packageQuantity) * parseFloat(product.unit_quantity);
                                            setCalculatedQuantity(calculated);
                                            setData('quantity_received', calculated.toString());
                                        }
                                    }}
                                    className="w-5 h-5 rounded cursor-pointer"
                                />
                                <label
                                    htmlFor="override_unit"
                                    className="font-semibold text-blue-900 cursor-pointer"
                                >
                                    📦 This batch has different packaging than usual
                                </label>
                            </div>
                            <div className="mt-2 p-3 bg-white rounded-lg border-l-4 border-blue-500">
                                <small className="block text-gray-600 mb-1">Default packaging:</small>
                                <strong className="text-gray-900">{getUnitDisplay()}</strong>
                            </div>
                            <small className="block mt-2 text-gray-600">
                                💡 Check the box above if this shipment came in different packaging
                            </small>
                        </div>

                        {/* Unit Override Fields */}
                        {overrideUnit && (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
                                <h4 className="font-semibold text-amber-900 mb-4">
                                    ⚠️ Custom Packaging for This Batch
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Unit Type
                                        </label>
                                        <select
                                            value={data.unit}
                                            onChange={(e) => setData('unit', e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                        >
                                            <option value="">Use Product Default</option>
                                            <optgroup label="Bottled/Container Products">
                                                <option value="bottle">Bottle (syrup, suspension, liquid)</option>
                                                <option value="dropper_bottle">Dropper Bottle</option>
                                                <option value="jar">Jar (ointment, cream)</option>
                                                <option value="tube">Tube (cream, ointment, gel)</option>
                                            </optgroup>
                                            <optgroup label="Solid Dose Packaging">
                                                <option value="blister_pack">Blister Pack</option>
                                                <option value="strip">Strip</option>
                                                <option value="box">Box</option>
                                                <option value="sachet">Sachet</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Quantity per Unit
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={data.unit_quantity}
                                            onChange={(e) => handleUnitQuantityChange(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                        />
                                        <small className="block mt-1 text-xs text-gray-500">
                                            For tablets: 1. For 60mL bottle: 60
                                        </small>
                                    </div>
                                </div>

                                {data.unit && data.unit_quantity && (
                                    <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-green-800 mb-1">
                                            ✓ This Batch Will Display As:
                                        </label>
                                        <div className="text-lg font-semibold text-green-900">
                                            {data.unit_quantity} {data.unit}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Notes (optional)
                            </label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition resize-none"
                                rows="3"
                                maxLength="1000"
                                placeholder="Additional notes about this batch"
                            />
                            <small className="block mt-1 text-xs text-gray-500">Maximum 1000 characters</small>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={closeAddModal}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Adding...
                                    </>
                                ) : (
                                    'Add Batch'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Edit Batch Modal */}
            <Modal show={showEditModal} onClose={closeEditModal} maxWidth="2xl">
                <div className="bg-white">
                    <div className="px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">Edit Batch</h2>
                        <button
                            onClick={closeEditModal}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-xl text-gray-600 transition"
                        >
                            &times;
                        </button>
                    </div>

                    <form onSubmit={handleUpdateBatch} className="p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Expiration Date
                            </label>
                            <input
                                type="date"
                                value={data.expiration_date}
                                onChange={(e) => setData('expiration_date', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Unit Cost (₱)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.unit_cost}
                                    onChange={(e) => setData('unit_cost', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sale Price (₱)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.sale_price}
                                    onChange={(e) => setData('sale_price', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition resize-none"
                                rows="3"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Updating...
                                    </>
                                ) : (
                                    'Update Batch'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
