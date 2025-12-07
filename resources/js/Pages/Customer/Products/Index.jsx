import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    Search,
    Filter,
    ShoppingCart,
    Package,
    AlertCircle,
    Loader2,
    Grid3x3,
    List,
    ChevronDown,
    X,
    Plus,
    Minus,
    Trash2
} from 'lucide-react';

// Cart Storage Hook
function useCart() {
    const [cart, setCart] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Load cart from localStorage on mount
        const savedCart = localStorage.getItem('pharma_cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    useEffect(() => {
        // Save cart to localStorage whenever it changes
        localStorage.setItem('pharma_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, quantity = 1) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);

            if (existingItem) {
                // Update quantity if item exists
                return prevCart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: Math.min(item.quantity + quantity, product.available_stock) }
                        : item
                );
            } else {
                // Add new item
                return [...prevCart, {
                    id: product.id,
                    product_name: product.product_name,
                    brand_name: product.brand_name,
                    product_code: product.product_code,
                    selling_price: product.selling_price,
                    available_stock: product.available_stock,
                    unit_display_text: product.unit_display_text,
                    quantity: Math.min(quantity, product.available_stock)
                }];
            }
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.id === productId
                    ? { ...item, quantity: Math.min(quantity, item.available_stock) }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
    };

    const getCartCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    return {
        cart,
        isOpen,
        setIsOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount
    };
}

export default function Index() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Cart hook
    const cartManager = useCart();

    // Fetch products
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page,
                search: searchQuery,
                stock_status: stockFilter,
            });

            if (selectedCategory) {
                params.append('category_id', selectedCategory);
            }

            const response = await fetch(route('customer.api.products.index', { _query: Object.fromEntries(params) }));
            const data = await response.json();

            if (data.success) {
                setProducts(data.products.data);
                setPagination({
                    current_page: data.products.current_page,
                    last_page: data.products.last_page,
                    per_page: data.products.per_page,
                    total: data.products.total,
                });
                setCurrentPage(data.products.current_page);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, stockFilter]);

    const handlePageChange = (page) => {
        fetchProducts(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setStockFilter('all');
    };

    const hasActiveFilters = searchQuery || selectedCategory || stockFilter !== 'all';

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Floating Cart Button */}
                <button
                    onClick={() => cartManager.setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
                >
                    <ShoppingCart className="w-6 h-6" />
                    {cartManager.getCartCount() > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {cartManager.getCartCount()}
                        </span>
                    )}
                </button>

                {/* Cart Slide-out Panel */}
                <CartPanel cartManager={cartManager} />

                {/* Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Browse our pharmaceutical products
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <Grid3x3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search products by name, code, or brand..."
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Filter Toggle (Mobile) */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50"
                            >
                                <Filter className="w-5 h-5" />
                                <span>Filters</span>
                                {hasActiveFilters && (
                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                                        Active
                                    </span>
                                )}
                            </button>

                            {/* Filters (Desktop) */}
                            <div className="hidden lg:flex items-center gap-4">
                                <select
                                    value={stockFilter}
                                    onChange={(e) => setStockFilter(e.target.value)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Products</option>
                                    <option value="in_stock">In Stock</option>
                                    <option value="low_stock">Low Stock</option>
                                    <option value="out_of_stock">Out of Stock</option>
                                </select>

                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Filters Dropdown */}
                        {showFilters && (
                            <div className="lg:hidden mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Stock Status
                                    </label>
                                    <select
                                        value={stockFilter}
                                        onChange={(e) => setStockFilter(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Products</option>
                                        <option value="in_stock">In Stock</option>
                                        <option value="low_stock">Low Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>

                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-white"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No products found
                            </h3>
                            <p className="text-gray-500">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Products Grid/List */}
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAddToCart={cartManager.addToCart}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {products.map((product) => (
                                        <ProductListItem
                                            key={product.id}
                                            product={product}
                                            onAddToCart={cartManager.addToCart}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination && pagination.last_page > 1 && (
                                <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
                                    <div className="text-sm text-gray-700">
                                        Showing <span className="font-semibold">{((pagination.current_page - 1) * pagination.per_page) + 1}</span> to{' '}
                                        <span className="font-semibold">
                                            {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                                        </span>{' '}
                                        of <span className="font-semibold">{pagination.total}</span> products
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePageChange(pagination.current_page - 1)}
                                            disabled={pagination.current_page === 1}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {[...Array(pagination.last_page)].map((_, index) => {
                                                const page = index + 1;
                                                // Show first, last, current, and pages around current
                                                if (
                                                    page === 1 ||
                                                    page === pagination.last_page ||
                                                    (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                                                page === pagination.current_page
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                } else if (
                                                    page === pagination.current_page - 2 ||
                                                    page === pagination.current_page + 2
                                                ) {
                                                    return <span key={page} className="px-2 text-gray-400">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(pagination.current_page + 1)}
                                            disabled={pagination.current_page === pagination.last_page}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

function ProductCard({ product, onAddToCart }) {
    const [quantity, setQuantity] = useState(1);
    const [showQuantitySelector, setShowQuantitySelector] = useState(false);

    const handleAddToCart = () => {
        if (showQuantitySelector) {
            onAddToCart(product, quantity);
            setShowQuantitySelector(false);
            setQuantity(1);
        } else {
            setShowQuantitySelector(true);
        }
    };

    const getStockBadge = () => {
        if (product.available_stock === 0) {
            return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Out of Stock</span>;
        }
        if (product.available_stock <= product.reorder_level) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Low Stock</span>;
        }
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">In Stock</span>;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            {/* Product Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <Package className="w-16 h-16 text-blue-300" />
            </div>

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate" title={product.product_name}>
                            {product.product_name}
                        </h3>
                        {product.brand_name && (
                            <p className="text-sm text-gray-500 truncate">{product.brand_name}</p>
                        )}
                    </div>
                    {getStockBadge()}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Code:</span>
                        <span className="font-medium text-gray-900">{product.product_code}</span>
                    </div>

                    {product.generic_name && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Generic:</span>
                            <span className="font-medium text-gray-900 truncate ml-2" title={product.generic_name}>
                                {product.generic_name}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium text-gray-900">{product.product_type}</span>
                    </div>

                    {product.unit_display_text && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Unit:</span>
                            <span className="font-medium text-gray-900">{product.unit_display_text}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Available:</span>
                        <span className="font-medium text-gray-900">{product.available_stock} units</span>
                    </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                    <div className="text-2xl font-bold text-blue-600">
                        ₱{Number(product.selling_price || 0).toFixed(2)}
                    </div>
                    {product.earliest_expiry && (
                        <p className="text-xs text-gray-500 mt-1">
                            Expires: {new Date(product.earliest_expiry).toLocaleDateString()}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    {showQuantitySelector && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.min(product.available_stock, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                                min="1"
                                max={product.available_stock}
                            />
                            <button
                                onClick={() => setQuantity(Math.min(product.available_stock, quantity + 1))}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-500 ml-auto">
                                Max: {product.available_stock}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {showQuantitySelector && (
                            <button
                                onClick={() => {
                                    setShowQuantitySelector(false);
                                    setQuantity(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleAddToCart}
                            disabled={product.available_stock === 0}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {product.available_stock === 0
                                ? 'Out of Stock'
                                : showQuantitySelector
                                    ? 'Confirm'
                                    : 'Add to Cart'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Cart Panel Component
function CartPanel({ cartManager }) {
    const { cart, isOpen, setIsOpen, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartCount } = cartManager;

    const handleCheckout = () => {
        if (cart.length === 0) return;

        // Navigate to checkout page
        router.visit(route('customer.checkout'));
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        Shopping Cart ({getCartCount()})
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Your cart is empty
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Add some products to get started
                            </p>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <CartItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQuantity={updateQuantity}
                                    onRemove={removeFromCart}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-200 p-6 space-y-4">
                        {/* Summary */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">
                                    ₱{getCartTotal().toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Tax (12%)</span>
                                <span className="font-medium text-gray-900">
                                    ₱{(getCartTotal() * 0.12).toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-gray-900">Total</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        ₱{(getCartTotal() * 1.12).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <button
                                onClick={handleCheckout}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                Proceed to Checkout
                            </button>
                            <button
                                onClick={clearCart}
                                className="w-full px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// Cart Item Component
function CartItem({ item, onUpdateQuantity, onRemove }) {
    return (
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Product Image Placeholder */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-8 h-8 text-blue-300" />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {item.product_name}
                </h4>
                {item.brand_name && (
                    <p className="text-xs text-gray-500 truncate">{item.brand_name}</p>
                )}
                <p className="text-sm font-medium text-blue-600 mt-1">
                    ₱{Number(item.selling_price).toFixed(2)}
                </p>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded border border-gray-300"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium px-3">
                        {item.quantity}
                    </span>
                    <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.available_stock}
                        className="p-1 hover:bg-gray-200 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Stock Warning */}
                {item.quantity >= item.available_stock && (
                    <p className="text-xs text-yellow-600 mt-1">
                        Max stock: {item.available_stock}
                    </p>
                )}
            </div>

            {/* Subtotal */}
            <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                    ₱{(item.selling_price * item.quantity).toFixed(2)}
                </p>
            </div>
        </div>
    );
}

function ProductListItem({ product, onAddToCart }) {
    const [quantity, setQuantity] = useState(1);
    const [showQuantitySelector, setShowQuantitySelector] = useState(false);

    const handleAddToCart = () => {
        if (showQuantitySelector) {
            onAddToCart(product, quantity);
            setShowQuantitySelector(false);
            setQuantity(1);
        } else {
            setShowQuantitySelector(true);
        }
    };

    const getStockBadge = () => {
        if (product.available_stock === 0) {
            return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Out of Stock</span>;
        }
        if (product.available_stock <= product.reorder_level) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Low Stock</span>;
        }
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">In Stock</span>;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-6">
                {/* Product Image */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-10 h-10 text-blue-300" />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {product.product_name}
                            </h3>
                            {product.brand_name && (
                                <p className="text-sm text-gray-500">{product.brand_name}</p>
                            )}
                        </div>
                        {getStockBadge()}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                            <span className="text-gray-500">Code:</span>
                            <span className="ml-2 font-medium text-gray-900">{product.product_code}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2 font-medium text-gray-900">{product.product_type}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Available:</span>
                            <span className="ml-2 font-medium text-gray-900">{product.available_stock} units</span>
                        </div>
                        {product.unit_display_text && (
                            <div>
                                <span className="text-gray-500">Unit:</span>
                                <span className="ml-2 font-medium text-gray-900">{product.unit_display_text}</span>
                            </div>
                        )}
                    </div>

                    {product.generic_name && (
                        <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Generic:</span> {product.generic_name}
                        </p>
                    )}
                </div>

                {/* Price and Action */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                            ₱{Number(product.selling_price || 0).toFixed(2)}
                        </div>
                        {product.earliest_expiry && (
                            <p className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(product.earliest_expiry).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {showQuantitySelector && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-1.5 hover:bg-gray-100 rounded border border-gray-300"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.min(product.available_stock, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                                min="1"
                                max={product.available_stock}
                            />
                            <button
                                onClick={() => setQuantity(Math.min(product.available_stock, quantity + 1))}
                                className="p-1.5 hover:bg-gray-100 rounded border border-gray-300"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {showQuantitySelector && (
                            <button
                                onClick={() => {
                                    setShowQuantitySelector(false);
                                    setQuantity(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleAddToCart}
                            disabled={product.available_stock === 0}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {product.available_stock === 0
                                ? 'Out of Stock'
                                : showQuantitySelector
                                    ? 'Confirm'
                                    : 'Add to Cart'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
