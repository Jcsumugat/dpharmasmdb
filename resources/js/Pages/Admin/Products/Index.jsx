import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

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
            return <span className="badge badge-danger">Out of Stock</span>;
        } else if (product.stock_quantity <= product.reorder_level) {
            return <span className="badge badge-warning">Low Stock</span>;
        } else {
            return <span className="badge badge-success">In Stock</span>;
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

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(`/admin/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();

            if (data.success) {
                fetchProducts();
            } else {
                alert(data.message || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('Failed to delete product');
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

            <div className="products-container">
                <div className="page-header">
                    <div className="header-left">
                        <h1 className="page-title">Products Management</h1>
                        <p className="page-subtitle">Manage your pharmacy inventory and stock levels</p>
                    </div>
                    <button className="btn-primary" onClick={() => router.visit('/admin/products/create')}>
                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add New Product
                    </button>
                </div>

                <div className="filters-section">
                    <div className="search-box">
                        <svg viewBox="0 0 24 24" fill="none" className="search-icon">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by product name, code, or brand..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-tabs">
                        {[
                            { value: 'all', label: 'All Products', icon: '📦' },
                            { value: 'in_stock', label: 'In Stock', icon: '✅' },
                            { value: 'low_stock', label: 'Low Stock', icon: '⚠️' },
                            { value: 'out_of_stock', label: 'Out of Stock', icon: '❌' }
                        ].map(filter => (
                            <button
                                key={filter.value}
                                className={`filter-tab ${filterStatus === filter.value ? 'active' : ''}`}
                                onClick={() => setFilterStatus(filter.value)}
                            >
                                <span>{filter.icon}</span>
                                <span>{filter.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading products...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>No Products Found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {products.map(product => (
                            <div key={product._id || `product-${Math.random()}`} className="product-card">
                                <div className="product-header">
                                    <div className="product-type-badge">
                                        {product.product_type === 'Prescription' ? '📋 Rx' : '💊 OTC'}
                                    </div>
                                    {getStockStatusBadge(product)}
                                </div>

                                <div className="product-body">
                                    <h3 className="product-name">{product.product_name}</h3>
                                    <p className="product-generic">{product.generic_name || 'No generic name'}</p>
                                    <p className="product-brand">{product.brand_name || product.manufacturer}</p>

                                    <div className="product-info">
                                        {getProductInfoItems(product).map(item => (
                                            <div key={`${product._id}-${item.key}`} className="info-item">
                                                <span className="info-label">{item.label}:</span>
                                                <span className="info-value">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="stock-info">
                                        <div className="stock-bar-container">
                                            <div className="stock-bar-labels">
                                                <span>Stock Level</span>
                                                <span className="stock-value">{product.stock_quantity} {product.unit}</span>
                                            </div>
                                            <div className="stock-bar">
                                                <div
                                                    className="stock-bar-fill"
                                                    style={{
                                                        width: `${Math.min((product.stock_quantity / (product.reorder_level * 3)) * 100, 100)}%`,
                                                        background: getStockStatusColor(product)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="stock-bar-labels">
                                                <span className="reorder-level">Reorder at: {product.reorder_level}</span>
                                                {product.batch_count > 0 && (
                                                    <span className="batch-count">{product.batch_count} batches</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="product-footer">
                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={() => handleViewDetails(product)}
                                    >
                                        View Details
                                    </button>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-icon"
                                            title="Edit"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        <button
                                            className="btn-icon btn-danger"
                                            title="Delete"
                                            onClick={() => handleDeleteProduct(product._id)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showDetailsModal && selectedProduct && (
                <ProductDetailsModal
                    product={selectedProduct}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedProduct(null);
                    }}
                />
            )}

            <style>{`
                .products-container {
                    padding: 2.5rem;
                    max-width: 1600px;
                    margin: 0 auto;
                    min-height: 100vh;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2.5rem;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                }

                .header-left {
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

                .btn-primary {
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

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                .filters-section {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 16px;
                    margin-bottom: 2rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    border: 1px solid #E5E7EB;
                }

                .search-box {
                    position: relative;
                    margin-bottom: 1.5rem;
                }

                .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 20px;
                    height: 20px;
                    color: #9CA3AF;
                }

                .search-input {
                    width: 100%;
                    padding: 0.875rem 1rem 0.875rem 3rem;
                    border: 2px solid #E5E7EB;
                    border-radius: 12px;
                    font-size: 0.9375rem;
                    transition: all 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .filter-tabs {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .filter-tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    background: #F9FAFB;
                    border: 2px solid #E5E7EB;
                    border-radius: 10px;
                    color: #6B7280;
                    font-weight: 500;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .filter-tab:hover {
                    background: #F3F4F6;
                    border-color: #D1D5DB;
                }

                .filter-tab.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-color: transparent;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                }

                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 1.5rem;
                }

                .product-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                }

                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                    border-color: #D1D5DB;
                }

                .product-header {
                    padding: 1.25rem;
                    background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
                    border-bottom: 1px solid #E5E7EB;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .product-type-badge {
                    padding: 0.375rem 0.875rem;
                    background: white;
                    border-radius: 8px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #374151;
                    border: 1px solid #E5E7EB;
                }

                .badge {
                    padding: 0.375rem 0.875rem;
                    border-radius: 8px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                }

                .badge-success {
                    background: #D1FAE5;
                    color: #065F46;
                    border: 1px solid #A7F3D0;
                }

                .badge-warning {
                    background: #FEF3C7;
                    color: #92400E;
                    border: 1px solid #FDE68A;
                }

                .badge-danger {
                    background: #FEE2E2;
                    color: #991B1B;
                    border: 1px solid #FECACA;
                }

                .product-body {
                    padding: 1.5rem;
                    flex: 1;
                }

                .product-name {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.025em;
                }

                .product-generic {
                    font-size: 0.875rem;
                    color: #6B7280;
                    margin: 0 0 0.25rem 0;
                }

                .product-brand {
                    font-size: 0.8125rem;
                    color: #9CA3AF;
                    margin: 0 0 1rem 0;
                }

                .product-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #F9FAFB;
                    border-radius: 10px;
                    margin-bottom: 1rem;
                }

                .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.875rem;
                }

                .info-label {
                    color: #6B7280;
                    font-weight: 500;
                }

                .info-value {
                    color: #111827;
                    font-weight: 600;
                }

                .stock-info {
                    margin-top: 1rem;
                }

                .stock-bar-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .stock-bar-labels {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.8125rem;
                }

                .stock-value {
                    font-weight: 700;
                    color: #111827;
                }

                .reorder-level {
                    color: #6B7280;
                }

                .batch-count {
                    color: #667eea;
                    font-weight: 600;
                }

                .stock-bar {
                    height: 8px;
                    background: #E5E7EB;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .stock-bar-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: all 0.3s ease;
                }

                .product-footer {
                    padding: 1.25rem;
                    background: #F9FAFB;
                    border-top: 1px solid #E5E7EB;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }

                .btn-secondary {
                    padding: 0.625rem 1.25rem;
                    background: white;
                    border: 2px solid #E5E7EB;
                    border-radius: 8px;
                    color: #374151;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-secondary:hover {
                    background: #F9FAFB;
                    border-color: #667eea;
                    color: #667eea;
                }

                .btn-sm {
                    padding: 0.5rem 1rem;
                    font-size: 0.8125rem;
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn-icon {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    border: 2px solid #E5E7EB;
                    border-radius: 8px;
                    color: #6B7280;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-icon:hover {
                    background: #F9FAFB;
                    border-color: #667eea;
                    color: #667eea;
                }

                .btn-icon.btn-danger:hover {
                    border-color: #EF4444;
                    color: #EF4444;
                }

                .loading-state, .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid #E5E7EB;
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.5rem 0;
                }

                .empty-state p {
                    color: #6B7280;
                    margin: 0;
                }

                @media (max-width: 768px) {
                    .products-container {
                        padding: 1.5rem;
                    }

                    .page-header {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .btn-primary {
                        width: 100%;
                        justify-content: center;
                    }

                    .products-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );

}

function ProductDetailsModal({ product, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Product Details</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <p>Product details for: <strong>{product.product_name}</strong></p>
                    <p className="text-muted">Full product management coming soon...</p>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    padding: 1rem;
                }

                .modal-content {
                    background: white;
                    border-radius: 16px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow: auto;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #E5E7EB;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #111827;
                }

                .close-btn {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #F3F4F6;
                    border: none;
                    border-radius: 8px;
                    color: #6B7280;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background: #E5E7EB;
                    color: #111827;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .text-muted {
                    color: #6B7280;
                }
            `}</style>
        </div>
    );
    console.log('Products:', products.map(p => p._id));
}
