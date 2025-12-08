import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function POSIndex() {
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [formFilter, setFormFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);
    const [processing, setProcessing] = useState(false);
    const searchTimeoutRef = useRef(null);

    const categories = [
        'Antibiotics', 'Analgesics', 'Antipyretics', 'Anti-inflammatory',
        'Antacids', 'Antihistamines', 'Cardiovascular', 'Respiratory',
        'Gastrointestinal', 'Dermatological', 'Vitamins & Supplements'
    ];

    const forms = [
        'tablet', 'capsule', 'syrup', 'injection', 'cream',
        'ointment', 'drops', 'spray', 'powder', 'solution'
    ];

    useEffect(() => {
        loadCartFromStorage();
        searchProducts();

        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('productSearch')?.focus();
            }
            if (e.key === 'F9' && cart.length > 0) {
                e.preventDefault();
                processTransaction();
            }
            if (e.key === 'Escape') {
                setSearchTerm('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchProducts();
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm, categoryFilter, formFilter]);

    useEffect(() => {
        saveCartToStorage();
    }, [cart]);

    const loadCartFromStorage = () => {
        try {
            const savedCart = sessionStorage.getItem('pos_cart');
            const timestamp = sessionStorage.getItem('pos_cart_timestamp');

            if (savedCart && timestamp) {
                const cartAge = Date.now() - parseInt(timestamp);
                const maxAge = 24 * 60 * 60 * 1000;

                if (cartAge < maxAge) {
                    setCart(JSON.parse(savedCart));
                }
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
        }
    };

    const saveCartToStorage = () => {
        try {
            sessionStorage.setItem('pos_cart', JSON.stringify(cart));
            sessionStorage.setItem('pos_cart_timestamp', Date.now().toString());
        } catch (error) {
            console.error('Failed to save cart:', error);
        }
    };

    const searchProducts = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (categoryFilter) params.append('category', categoryFilter);
            if (formFilter) params.append('form', formFilter);

            const response = await fetch(`/admin/api/pos/products/search?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Search error:', error);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addToCart = async (productId) => {
        try {
            const response = await fetch(`/admin/api/pos/products/${productId}`);
            const data = await response.json();

            if (data.success) {
                const product = data.product;
                const existingItem = cart.find(item => item.id === productId);

                if (existingItem) {
                    if (existingItem.quantity < (product.total_stock || product.stock_quantity)) {
                        setCart(cart.map(item =>
                            item.id === productId
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ));
                    } else {
                        alert('Insufficient stock');
                    }
                } else {
                    setCart([...cart, {
                        id: productId,
                        name: product.product_name,
                        brand: product.brand_name,
                        price: parseFloat(product.unit_price),
                        quantity: 1,
                        maxStock: product.total_stock || product.stock_quantity
                    }]);
                }
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    };

    const updateQuantity = (productId, newQuantity) => {
        const item = cart.find(item => item.id === productId);

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (item && newQuantity <= item.maxStock) {
            setCart(cart.map(item =>
                item.id === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            ));
        } else {
            alert(`Maximum available quantity is ${item?.maxStock}`);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const clearCart = (skipConfirmation = false) => {
        if (!skipConfirmation && cart.length > 0 && !confirm('Clear all items from cart?')) {
            return;
        }
        setCart([]);
        setCustomerName('');
        setDiscountAmount(0);
        setAmountPaid('');
        setNotes('');
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() - discountAmount;
    };

    const calculateChange = () => {
        return parseFloat(amountPaid || 0) - calculateTotal();
    };

    const processTransaction = async () => {
        if (cart.length === 0) {
            alert('Cart is empty');
            return;
        }

        const total = calculateTotal();
        const paid = parseFloat(amountPaid || 0);

        if (paid < total) {
            alert('Insufficient payment amount');
            return;
        }

        setProcessing(true);

        try {
            const response = await fetch('/admin/api/pos/process-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    customer_type: 'walk_in',
                    customer_name: customerName || null,
                    items: cart.map(item => ({
                        product_id: item.id,
                        quantity: item.quantity
                    })),
                    payment_method: paymentMethod,
                    amount_paid: paid,
                    discount_amount: discountAmount,
                    notes: notes || null
                })
            });

            const data = await response.json();

            if (data.success) {
                setLastTransaction(data.transaction);
                setShowReceipt(true);
                clearCart(true); // Skip confirmation when transaction succeeds
                sessionStorage.removeItem('pos_cart');
                sessionStorage.removeItem('pos_cart_timestamp');
            } else {
                alert(data.message || 'Transaction failed');
            }
        } catch (error) {
            console.error('Transaction error:', error);
            alert('Network error occurred');
        } finally {
            setProcessing(false);
        }
    };

    const printReceipt = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout>
            <Head title="Point of Sale" />

            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Walk Ins</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Products Panel */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Products</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <input
                                id="productSearch"
                                type="text"
                                placeholder="Search products... (F2)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <select
                                value={formFilter}
                                onChange={(e) => setFormFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Forms</option>
                                {forms.map(form => (
                                    <option key={form} value={form}>
                                        {form.charAt(0).toUpperCase() + form.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">Loading...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Price</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Stock</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {products.map(product => (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{product.product_name}</div>
                                                    <div className="text-sm text-gray-500">{product.brand_name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-900">
                                                    ₱{parseFloat(product.unit_price || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">
                                                    {product.stock_quantity || product.total_stock || 0}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => addToCart(product.id)}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Cart Panel */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Cart</h2>

                        {cart.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No items in cart</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                                    {cart.map(item => (
                                        <div key={item.id} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                                                    <p className="text-sm text-gray-500">{item.brand}</p>
                                                    <p className="text-sm text-gray-600">₱{item.price.toFixed(2)} each</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-16 px-2 py-1 border rounded text-center"
                                                    min="1"
                                                    max={item.maxStock}
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                                >
                                                    +
                                                </button>
                                                <span className="ml-auto font-semibold">
                                                    ₱{(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>₱{calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Discount:</span>
                                        <input
                                            type="number"
                                            value={discountAmount}
                                            onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                            className="w-32 px-3 py-1 border rounded text-right"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                                        <span>Total:</span>
                                        <span>₱{calculateTotal().toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Customer Name (Optional)"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />

                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="gcash">GCash</option>
                                        <option value="paymaya">PayMaya</option>
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Amount Paid"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        min="0"
                                        step="0.01"
                                    />

                                    {amountPaid && (
                                        <div className={`text-center py-2 rounded ${
                                            calculateChange() >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                            Change: ₱{calculateChange().toFixed(2)}
                                        </div>
                                    )}

                                    <textarea
                                        placeholder="Notes (Optional)"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        rows="2"
                                    />
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={clearCart}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Clear Cart
                                    </button>
                                    <button
                                        onClick={processTransaction}
                                        disabled={processing || calculateChange() < 0}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {processing ? 'Processing...' : 'Complete (F9)'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && lastTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">Transaction Complete</h2>
                                <button
                                    onClick={() => setShowReceipt(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="border-t border-b py-4 my-4 text-center">
                                <h3 className="text-xl font-bold">MJ's Pharmacy</h3>
                                <p className="text-sm text-gray-600">Your Trusted Healthcare Partner</p>
                            </div>

                            <div className="space-y-2 text-sm mb-4">
                                <p><strong>Transaction ID:</strong> {lastTransaction.transaction_id}</p>
                                <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
                                {lastTransaction.customer_name && (
                                    <p><strong>Customer:</strong> {lastTransaction.customer_name}</p>
                                )}
                                <p><strong>Payment:</strong> {lastTransaction.payment_method.toUpperCase()}</p>
                            </div>

                            <table className="w-full text-sm mb-4">
                                <thead className="border-b">
                                    <tr>
                                        <th className="text-left py-2">Item</th>
                                        <th className="text-right py-2">Qty</th>
                                        <th className="text-right py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastTransaction.items.map((item, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="py-2">
                                                <div>{item.product_name}</div>
                                                <div className="text-xs text-gray-500">{item.brand_name}</div>
                                            </td>
                                            <td className="text-right">{item.quantity}</td>
                                            <td className="text-right">₱{parseFloat(item.total_price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="space-y-2 text-sm border-t pt-4">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>₱{parseFloat(lastTransaction.subtotal).toFixed(2)}</span>
                                </div>
                                {parseFloat(lastTransaction.discount_amount) > 0 && (
                                    <div className="flex justify-between">
                                        <span>Discount:</span>
                                        <span>-₱{parseFloat(lastTransaction.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t pt-2">
                                    <span>Total:</span>
                                    <span>₱{parseFloat(lastTransaction.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount Paid:</span>
                                    <span>₱{parseFloat(lastTransaction.amount_paid).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change:</span>
                                    <span>₱{parseFloat(lastTransaction.change_amount).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="text-center mt-6 pt-4 border-t text-sm text-gray-600">
                                <p>Thank you for choosing MJ's Pharmacy!</p>
                                <p>Please keep this receipt for your records</p>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    onClick={printReceipt}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Print Receipt
                                </button>
                                <button
                                    onClick={() => setShowReceipt(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
