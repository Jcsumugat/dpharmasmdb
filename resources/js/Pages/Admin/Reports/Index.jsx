import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ReportsIndex() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [salesReport, setSalesReport] = useState(null);
    const [inventoryReport, setInventoryReport] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [expiringProducts, setExpiringProducts] = useState([]);
    const [prescriptionStats, setPrescriptionStats] = useState(null);

    const [filters, setFilters] = useState({
        period: 'today',
        start_date: '',
        end_date: '',
        inventory_type: 'all',
        expiring_days: 30
    });

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchDashboardStats();
        } else if (activeTab === 'sales') {
            if (filters.start_date && filters.end_date) {
                fetchSalesReport();
            }
        } else if (activeTab === 'inventory') {
            fetchInventoryReport();
        } else if (activeTab === 'top-products') {
            if (filters.start_date && filters.end_date) {
                fetchTopProducts();
            }
        } else if (activeTab === 'expiring') {
            fetchExpiringProducts();
        } else if (activeTab === 'prescriptions') {
            fetchPrescriptionStats();
        }
    }, [activeTab, filters.period, filters.inventory_type, filters.expiring_days]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/api/reports/dashboard?period=${filters.period}`);
            const data = await response.json();
            if (data.success) {
                setDashboardStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSalesReport = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/api/reports/sales?start_date=${filters.start_date}&end_date=${filters.end_date}&group_by=day`);
            const data = await response.json();
            if (data.success) {
                setSalesReport(data.report);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryReport = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/api/reports/inventory?type=${filters.inventory_type}`);
            const data = await response.json();
            if (data.success) {
                setInventoryReport(data.report);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/api/reports/top-products?start_date=${filters.start_date}&end_date=${filters.end_date}&limit=10`);
            const data = await response.json();
            if (data.success) {
                setTopProducts(data.report);
            }
        } catch (error) {
            console.error('Error fetching top products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiringProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/admin/api/reports/expiring-products?days=${filters.expiring_days}`);
            const data = await response.json();
            if (data.success) {
                setExpiringProducts(data.report.products);
            }
        } catch (error) {
            console.error('Error fetching expiring products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrescriptionStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const response = await fetch(`/admin/api/reports/prescriptions?${params}`);
            const data = await response.json();
            if (data.success) {
                setPrescriptionStats(data.report);
            }
        } catch (error) {
            console.error('Error fetching prescription stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Reports & Analytics" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
                    <p className="text-gray-600">Comprehensive business insights and statistics</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl border border-gray-200 mb-6 shadow-sm overflow-x-auto">
                    <div className="flex border-b border-gray-200">
                        {['dashboard', 'sales', 'inventory', 'top-products', 'expiring', 'prescriptions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                                    activeTab === tab
                                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Period</label>
                            <div className="flex gap-3 flex-wrap">
                                {['today', 'week', 'month', 'year'].map(period => (
                                    <button
                                        key={period}
                                        onClick={() => setFilters(prev => ({ ...prev, period }))}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                            filters.period === period
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {period.charAt(0).toUpperCase() + period.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : dashboardStats && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
                                        <p className="text-3xl font-bold text-indigo-600">{formatCurrency(dashboardStats.revenue?.total)}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">POS Revenue</p>
                                        <p className="text-3xl font-bold text-green-600">{formatCurrency(dashboardStats.revenue?.pos)}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Orders Revenue</p>
                                        <p className="text-3xl font-bold text-blue-600">{formatCurrency(dashboardStats.revenue?.orders)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Orders</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Orders</span>
                                                <span className="font-semibold">{dashboardStats.orders?.total || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Pending</span>
                                                <span className="font-semibold text-yellow-600">{dashboardStats.orders?.pending || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Completed</span>
                                                <span className="font-semibold text-green-600">{dashboardStats.orders?.completed || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Cancelled</span>
                                                <span className="font-semibold text-red-600">{dashboardStats.orders?.cancelled || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Products</span>
                                                <span className="font-semibold">{dashboardStats.inventory?.total_products || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Low Stock</span>
                                                <span className="font-semibold text-yellow-600">{dashboardStats.inventory?.low_stock || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Out of Stock</span>
                                                <span className="font-semibold text-red-600">{dashboardStats.inventory?.out_of_stock || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Value</span>
                                                <span className="font-semibold text-indigo-600">{formatCurrency(dashboardStats.inventory?.total_value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Customers</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Total Customers</p>
                                            <p className="text-2xl font-bold text-gray-900">{dashboardStats.customers?.total || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Active</p>
                                            <p className="text-2xl font-bold text-green-600">{dashboardStats.customers?.active || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">New This Period</p>
                                            <p className="text-2xl font-bold text-indigo-600">{dashboardStats.customers?.new || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Sales Report Tab */}
                {activeTab === 'sales' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Date Range</label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={fetchSalesReport}
                                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : salesReport && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Revenue</span>
                                            <span className="font-bold text-indigo-600">{formatCurrency(salesReport.total_revenue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Transactions</span>
                                            <span className="font-semibold">{salesReport.total_transactions}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Average Transaction</span>
                                            <span className="font-semibold">{formatCurrency(salesReport.average_transaction)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">By Source</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">POS Revenue</span>
                                            <span className="font-semibold text-green-600">{formatCurrency(salesReport.pos_revenue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Orders Revenue</span>
                                            <span className="font-semibold text-blue-600">{formatCurrency(salesReport.orders_revenue)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Filter</label>
                            <div className="flex gap-3 flex-wrap">
                                {['all', 'low_stock', 'out_of_stock', 'expiring'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilters(prev => ({ ...prev, inventory_type: type }))}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all ${
                                            filters.inventory_type === type
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : inventoryReport && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Total Products</p>
                                        <p className="text-3xl font-bold text-gray-900">{inventoryReport.summary?.total_products}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Low Stock</p>
                                        <p className="text-3xl font-bold text-yellow-600">{inventoryReport.summary?.low_stock_count}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Out of Stock</p>
                                        <p className="text-3xl font-bold text-red-600">{inventoryReport.summary?.out_of_stock_count}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Inventory Value</p>
                                        <p className="text-3xl font-bold text-indigo-600">{formatCurrency(inventoryReport.summary?.total_inventory_value)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Reorder Level</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {inventoryReport.products?.map(product => (
                                                    <tr key={product._id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <p className="font-medium text-gray-900">{product.product_name}</p>
                                                            <p className="text-sm text-gray-600">{product.product_code}</p>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold">{product.stock_quantity}</td>
                                                        <td className="px-6 py-4">{product.reorder_level}</td>
                                                        <td className="px-6 py-4">
                                                            {product.stock_quantity <= 0 ? (
                                                                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Out of Stock</span>
                                                            ) : product.stock_quantity <= product.reorder_level ? (
                                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Low Stock</span>
                                                            ) : (
                                                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">In Stock</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Top Products Tab */}
                {activeTab === 'top-products' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Date Range</label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={fetchTopProducts}
                                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Units Sold</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Transactions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {topProducts.map((item, index) => (
                                                <tr key={item.product?._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <span className="text-2xl font-bold text-indigo-600">#{index + 1}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-gray-900">{item.product?.product_name}</p>
                                                        <p className="text-sm text-gray-600">{item.product?.product_code}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-lg">{item.total_quantity}</td>
                                                    <td className="px-6 py-4">{item.transaction_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Expiring Products Tab */}
                {activeTab === 'expiring' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Days Threshold</label>
                            <div className="flex gap-3">
                                <select
                                    value={filters.expiring_days}
                                    onChange={(e) => setFilters(prev => ({ ...prev, expiring_days: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="7">7 Days</option>
                                    <option value="14">14 Days</option>
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-900">Products expiring within {filters.expiring_days} days</h3>
                                    <p className="text-sm text-gray-600 mt-1">Total: {expiringProducts.length} products</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Batch Number</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Expiration Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Days Left</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {expiringProducts.map(product => (
                                                product.expiring_batches?.map((batch, batchIndex) => (
                                                    <tr key={`${product._id}-${batchIndex}`} className="hover:bg-gray-50">
                                                        {batchIndex === 0 && (
                                                            <td rowSpan={product.expiring_batches.length} className="px-6 py-4 border-r border-gray-200">
                                                                <p className="font-medium text-gray-900">{product.product_name}</p>
                                                                <p className="text-sm text-gray-600">{product.product_code}</p>
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4">{batch.batch_number}</td>
                                                        <td className="px-6 py-4 font-semibold">{batch.quantity_remaining}</td>
                                                        <td className="px-6 py-4">{formatDate(batch.expiration_date)}</td>
                                                        <td className="px-6 py-4">
                                                            {(() => {
                                                                const daysLeft = Math.ceil((new Date(batch.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                                                                return (
                                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                        daysLeft <= 7 ? 'bg-red-100 text-red-800' :
                                                                        daysLeft <= 14 ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                        {daysLeft} days
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                    </tr>
                                                ))
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Prescriptions Tab */}
                {activeTab === 'prescriptions' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Date Range (Optional)</label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={fetchPrescriptionStats}
                                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : prescriptionStats && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Total</p>
                                        <p className="text-3xl font-bold text-gray-900">{prescriptionStats.total}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Pending</p>
                                        <p className="text-3xl font-bold text-yellow-600">{prescriptionStats.pending}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Approved</p>
                                        <p className="text-3xl font-bold text-blue-600">{prescriptionStats.approved}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Completed</p>
                                        <p className="text-3xl font-bold text-green-600">{prescriptionStats.completed}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Declined</p>
                                        <p className="text-3xl font-bold text-red-600">{prescriptionStats.declined}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">By Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                            <span className="text-gray-700 font-medium">Prescription Orders</span>
                                            <span className="text-2xl font-bold text-indigo-600">{prescriptionStats.by_type?.prescription || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                            <span className="text-gray-700 font-medium">Online Orders</span>
                                            <span className="text-2xl font-bold text-blue-600">{prescriptionStats.by_type?.online_order || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
