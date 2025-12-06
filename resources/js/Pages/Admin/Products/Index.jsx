import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Trash2, ClipboardList, Edit } from 'lucide-react';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, [searchTerm, filterStatus]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterStatus !== 'all') params.append('stock_status', filterStatus);

            const response = await fetch(`/admin/api/products?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setProducts(data.products.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStockStatusBadge = (product) => {
        if (product.stock_quantity === 0) {
            return <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Out of Stock</span>;
        } else if (product.stock_quantity <= product.reorder_level) {
            return <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">Low Stock</span>;
        } else {
            return <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 border border-green-200">In Stock</span>;
        }
    };

    const getStockStatusColor = (product) => {
        if (product.stock_quantity === 0) return '#EF4444';
        if (product.stock_quantity <= product.reorder_level) return '#F59E0B';
        return '#10B981';
    };

    const handleViewDetails = (product) => {
        setSelectedProduct(product);
        setShowDetailsModal(true);
    };

    const handleManageBatches = (product) => {
        const productId = product._id || product.id;
        router.visit(`/admin/products/${productId}/batches`);
    };

    const handleEditProduct = (product) => {
        const productId = product._id || product.id;
        router.visit(`/admin/products/${productId}/edit`);
    };

    const handleDeleteProduct = async (product) => {
        // Check if product has stock
        if (product.stock_quantity > 0) {
            if (!confirm(
                `Warning: "${product.product_name}" has ${product.stock_quantity} units in stock.\n\n` +
                `You must reduce stock to 0 before deleting this product.\n\n` +
                `Would you like to manage batches instead?`
            )) return;

            // Redirect to batch management
            handleManageBatches(product);
            return;
        }

        if (!confirm(`Are you sure you want to delete "${product.product_name}"?`)) return;

        try {
            let productId = null;

            if (product._id) {
                if (typeof product._id === 'object' && product._id.$oid) {
                    productId = product._id.$oid;
                } else {
                    productId = String(product._id);
                }
            } else if (product.id) {
                productId = String(product.id);
            }

            if (!productId) {
                throw new Error('Product ID not found');
            }

            const response = await fetch(`/admin/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            if (data.success) {
                fetchProducts();
                alert('Product deleted successfully');
            } else {
                alert(data.message || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('Failed to delete product: ' + error.message);
        }
    };

    const getProductInfoItems = (product) => [
        { label: 'Code', value: product.product_code, key: 'code' },
        { label: 'Form', value: product.form_type, key: 'form' },
        { label: 'Dosage', value: product.dosage_unit, key: 'dosage' }
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Products Management" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
                {/* Page Header */}
                <div className="flex justify-between items-start mb-10 flex-wrap gap-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Products Management</h1>
                        <p className="text-gray-600">Manage your pharmacy inventory and stock levels</p>
                    </div>
                    <button
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200"
                        onClick={() => router.visit('/admin/products/create')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add New Product
                    </button>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-6 rounded-2xl mb-8 shadow-sm border border-gray-200">
                    {/* Search Box */}
                    <div className="relative mb-6">
                        <svg viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by product name, code, or brand..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { value: 'all', label: 'All Products', icon: '📦' },
                            { value: 'in_stock', label: 'In Stock', icon: '✅' },
                            { value: 'low_stock', label: 'Low Stock', icon: '⚠️' },
                            { value: 'out_of_stock', label: 'Out of Stock', icon: '❌' }
                        ].map(filter => (
                            <button
                                key={filter.value}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${filterStatus === filter.value
                                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/30'
                                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                    }`}
                                onClick={() => setFilterStatus(filter.value)}
                            >
                                <span>{filter.icon}</span>
                                <span>{filter.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading products...</p>
                    </div>
                ) : products.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-6xl mb-4 opacity-50">📦</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Products Found</h3>
                        <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    /* Products Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(product => (
                            <div
                                key={product._id || `product-${Math.random()}`}
                                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 transition-all duration-200 flex flex-col"
                            >
                                {/* Card Header */}
                                <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 flex justify-between items-center">
                                    <div className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                        {product.product_type === 'Prescription' ? '📋 Rx' : '💊 OTC'}
                                    </div>
                                    {getStockStatusBadge(product)}
                                </div>

                                {/* Card Body */}
                                <div className="p-6 flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">{product.product_name}</h3>
                                    <p className="text-sm text-gray-600 mb-1">{product.generic_name || 'No generic name'}</p>
                                    <p className="text-xs text-gray-400 mb-4">{product.brand_name || product.manufacturer}</p>

                                    {/* Product Info */}
                                    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl mb-4">
                                        {getProductInfoItems(product).map(item => (
                                            <div key={`${product._id}-${item.key}`} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600 font-medium">{item.label}:</span>
                                                <span className="text-gray-900 font-semibold">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Stock Info */}
                                    <div className="mt-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">Stock Level</span>
                                                <span className="text-gray-900 font-bold">
                                                    {product.unit_quantity > 1
                                                        ? `${Math.floor(product.stock_quantity / product.unit_quantity)} ${product.unit}`
                                                        : `${product.stock_quantity} ${product.unit}`}
                                                </span>
                                            </div>
                                            {product.unit_quantity > 1 && (
                                                <div className="text-xs text-gray-500">
                                                    ({product.stock_quantity} total units, {product.unit_quantity} per {product.unit})
                                                </div>
                                            )}
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min((product.stock_quantity / (product.reorder_level * 3)) * 100, 100)}%`,
                                                        background: getStockStatusColor(product)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">Reorder at: {product.reorder_level}</span>
                                                {product.batch_count > 0 && (
                                                    <span className="text-indigo-600 font-semibold">
                                                        {product.batch_count} {product.batch_count === 1 ? 'batch' : 'batches'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center gap-4">
                                    <button
                                        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                        onClick={() => handleViewDetails(product)}
                                    >
                                        View Details
                                    </button>
                                    <div className="flex gap-2">
                                        <div className="flex gap-2">
                                            <button
                                                className="w-9 h-9 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                                title="Manage Batches"
                                                onClick={() => handleManageBatches(product)}
                                            >
                                                <ClipboardList className="w-4.5 h-4.5" />
                                            </button>
                                            <button
                                                className="w-9 h-9 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                                                title="Edit"
                                                onClick={() => handleEditProduct(product)}
                                            >
                                                <Edit className="w-4.5 h-4.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product)}
                                                disabled={product.stock_quantity > 0}
                                                className={`w-9 h-9 flex items-center justify-center border-2 rounded-lg transition-all ${product.stock_quantity > 0
                                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-500'
                                                    }`}
                                                title={product.stock_quantity > 0 ? 'Cannot delete product with stock' : 'Delete'}
                                            >
                                                <Trash2 className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Details Modal */}
            {showDetailsModal && selectedProduct && (
                <ProductDetailsModal
                    product={selectedProduct}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedProduct(null);
                    }}
                    onManageBatches={handleManageBatches}
                />
            )}
        </AuthenticatedLayout>
    );
}

function ProductDetailsModal({ product, onClose, onManageBatches }) {
    // Helper function to get classification name
    const getClassificationName = (classification) => {
        const classificationMap = {
            '1': 'Antimicrobial',
            '2': 'Analgesic (Pain relief)',
            '3': 'Antipyretic (Fever reduction)',
            '4': 'Anti-inflammatory',
            '5': 'Antacid',
            '6': 'Antihistamine',
            '7': 'Antihypertensive',
            '8': 'Antidiabetic',
            '9': 'Cardiovascular',
            '10': 'Respiratory',
            '11': 'Gastrointestinal',
            '12': 'Dermatological',
            '13': 'Neurological',
            '14': 'Psychiatric',
            '15': 'Hormonal',
            '16': 'Vitamin',
            '17': 'Mineral',
            '18': 'Immunosuppressant',
            '19': 'Anticoagulant',
            '20': 'Antifungal',
            '21': 'Antiviral',
            '22': 'Other'
        };
        return classificationMap[String(classification)] || 'Unknown';
    };

    // Helper function to get stock status badge
    const getStockStatusBadge = () => {
        const availableStock = product.available_stock || product.stock_quantity || 0;
        const reorderLevel = product.reorder_level || 0;

        if (availableStock === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold border border-red-200">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Out of Stock
                </span>
            );
        } else if (availableStock <= reorderLevel) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-semibold border border-yellow-200">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Low Stock
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold border border-green-200">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    In Stock
                </span>
            );
        }
    };

    // Helper function to format unit display
    const getUnitDisplay = (unit) => {
        const unitMap = {
            'bottle': 'Bottle',
            'vial': 'Vial',
            'ampoule': 'Ampoule',
            'dropper_bottle': 'Dropper Bottle',
            'nebule': 'Nebule',
            'blister_pack': 'Blister Pack',
            'box': 'Box',
            'strip': 'Strip',
            'sachet': 'Sachet',
            'syringe': 'Pre-filled Syringe',
            'tube': 'Tube',
            'jar': 'Jar',
            'topical_bottle': 'Bottle',
            'inhaler': 'Inhaler',
            'patch': 'Patch',
            'suppository': 'Suppository',
            'piece': 'Piece',
            'pack': 'Pack'
        };
        return unitMap[unit] || unit;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                                <path d="M20 7h-4m0 0v12m0-12V3m-8 4h.01M8 7a4 4 0 108 0 4 4 0 00-8 0zm0 6v6m8-6v6m-4-3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
                            <p className="text-sm text-gray-600">Complete product information</p>
                        </div>
                    </div>
                    <button
                        className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-all"
                        onClick={onClose}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    {/* Product Header */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.product_name}</h3>
                                <p className="text-gray-600 text-base mb-1">{product.generic_name || 'No generic name'}</p>
                                <p className="text-sm text-gray-500">{product.brand_name || 'No brand name'}</p>
                            </div>
                            {getStockStatusBadge()}
                        </div>
                        <div className="flex gap-2 flex-wrap mt-3">
                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200">
                                {product.product_type || 'N/A'}
                            </span>
                            <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
                                {product.form_type || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm">📋</span>
                            </div>
                            Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Product Code</span>
                                <span className="text-base text-gray-900 font-semibold">{product.product_code || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Manufacturer</span>
                                <span className="text-base text-gray-900 font-semibold">{product.manufacturer || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Classification</span>
                                <span className="text-base text-gray-900 font-semibold">{getClassificationName(product.classification)}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Dosage</span>
                                <span className="text-base text-gray-900 font-semibold">{product.dosage_unit || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stock Information */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm">📦</span>
                            </div>
                            Stock Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                <span className="text-xs text-blue-700 font-medium uppercase tracking-wide block mb-1">Current Stock</span>
                                <div>
                                    <span className="text-2xl text-blue-900 font-bold">{product.stock_quantity || 0}</span>
                                    <span className="text-sm text-blue-700 font-medium ml-2">pieces</span>
                                </div>
                                {product.unit_quantity > 1 && (
                                    <div className="text-xs text-blue-700 mt-1">
                                        ({Math.floor((product.stock_quantity || 0) / product.unit_quantity)} {getUnitDisplay(product.unit)})
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                                <span className="text-xs text-yellow-700 font-medium uppercase tracking-wide block mb-1">Reorder Level</span>
                                <div>
                                    <span className="text-2xl text-yellow-900 font-bold">{product.reorder_level || 0}</span>
                                    <span className="text-sm text-yellow-700 font-medium ml-2">pieces</span>
                                </div>
                                {product.unit_quantity > 1 && (
                                    <div className="text-xs text-yellow-700 mt-1">
                                        ({Math.floor((product.reorder_level || 0) / product.unit_quantity)} {getUnitDisplay(product.unit)})
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                                <span className="text-xs text-purple-700 font-medium uppercase tracking-wide block mb-1">Active Batches</span>
                                <span className="text-2xl text-purple-900 font-bold">{product.batch_count || 0}</span>
                                <span className="text-sm text-purple-700 font-medium ml-2">batches</span>
                            </div>
                        </div>
                    </div>

                    {/* Packaging Information */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm">📦</span>
                            </div>
                            Packaging & Units
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Packaging Unit</span>
                                <span className="text-base text-gray-900 font-semibold">{getUnitDisplay(product.unit) || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Unit Quantity</span>
                                <span className="text-base text-gray-900 font-semibold">
                                    {product.unit_quantity ? `${product.unit_quantity} per ${getUnitDisplay(product.unit).toLowerCase()}` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Storage & Additional Info */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 bg-cyan-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm">🌡️</span>
                            </div>
                            Storage & Additional Information
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Storage Requirements</span>
                                <span className="text-base text-gray-900 font-semibold">{product.storage_requirements || 'No special requirements'}</span>
                            </div>
                            {product.category && (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Category</span>
                                    <span className="text-base text-gray-900 font-semibold">{product.category.name || 'Uncategorized'}</span>
                                </div>
                            )}
                            {product.supplier && (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="text-xs text-gray-600 font-medium uppercase tracking-wide block mb-1">Default Supplier</span>
                                    <span className="text-base text-gray-900 font-semibold">{product.supplier.name || 'No supplier'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pricing Information (if available) */}
                    {product.current_price && (
                        <div className="mb-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">💰</span>
                                </div>
                                Pricing
                            </h4>
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                                <span className="text-xs text-emerald-700 font-medium uppercase tracking-wide block mb-1">Current Sale Price</span>
                                <span className="text-2xl text-emerald-900 font-bold">₱{Number(product.current_price).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Expiry Warning (if available) */}
                    {product.earliest_expiry && (
                        <div className="mb-6">
                            <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200 flex items-start gap-3">
                                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5">
                                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <div>
                                    <h5 className="font-semibold text-amber-900 mb-1">Earliest Expiry Date</h5>
                                    <p className="text-sm text-amber-800">
                                        {new Date(product.earliest_expiry).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            className="flex-1 px-6 py-3 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                            onClick={() => {
                                onManageBatches(product);
                                onClose();
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Manage Batches
                        </button>
                        <button
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
