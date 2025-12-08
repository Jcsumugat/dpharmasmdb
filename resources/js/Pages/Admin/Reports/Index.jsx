import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ReportsIndex() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [salesReport, setSalesReport] = useState(null);
    const [inventoryReport, setInventoryReport] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [expiringProducts, setExpiringProducts] = useState([]);
    const [prescriptionStats, setPrescriptionStats] = useState(null);

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        period: 'today',
        start_date: today,
        end_date: today,
        inventory_type: 'all',
        expiring_days: 30
    });

    // Get date range based on period
    const getDateRange = (period) => {
        const now = new Date();
        let start, end;

        switch (period) {
            case 'today':
                start = end = now.toISOString().split('T')[0];
                break;
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                start = weekStart.toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
                break;
            case 'custom':
                return { start: filters.start_date, end: filters.end_date };
            default:
                start = end = now.toISOString().split('T')[0];
        }

        return { start, end };
    };

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchDashboardStats();
        } else if (activeTab === 'sales') {
            fetchSalesReport();
        } else if (activeTab === 'inventory') {
            fetchInventoryReport();
        } else if (activeTab === 'top-products') {
            fetchTopProducts();
        } else if (activeTab === 'expiring') {
            fetchExpiringProducts();
        } else if (activeTab === 'prescriptions') {
            fetchPrescriptionStats();
        }
    }, [activeTab]);

    // Auto-fetch when period changes (except for custom)
    useEffect(() => {
        if (filters.period !== 'custom') {
            if (activeTab === 'dashboard') {
                fetchDashboardStats();
            } else if (activeTab === 'sales') {
                fetchSalesReport();
            } else if (activeTab === 'top-products') {
                fetchTopProducts();
            } else if (activeTab === 'prescriptions') {
                fetchPrescriptionStats();
            }
        }
    }, [filters.period]);

    // Auto-fetch inventory when type changes
    useEffect(() => {
        if (activeTab === 'inventory') {
            fetchInventoryReport();
        }
    }, [filters.inventory_type]);

    // Auto-fetch expiring when days changes
    useEffect(() => {
        if (activeTab === 'expiring') {
            fetchExpiringProducts();
        }
    }, [filters.expiring_days]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/admin/api/reports/dashboard?period=${filters.period}`);
            const data = await response.json();
            if (data.success) {
                setDashboardStats(data.stats);
            } else {
                setError(data.message || 'Failed to fetch dashboard stats');
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setError('Network error: Unable to fetch dashboard stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchSalesReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const dateRange = getDateRange(filters.period);
            const response = await fetch(
                `/admin/api/reports/sales?start_date=${dateRange.start}&end_date=${dateRange.end}&group_by=day`
            );
            const data = await response.json();
            if (data.success) {
                setSalesReport(data.report);
            } else {
                setError(data.message || 'Failed to fetch sales report');
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
            setError('Network error: Unable to fetch sales report');
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/admin/api/reports/inventory?type=${filters.inventory_type}`);
            const data = await response.json();
            if (data.success) {
                setInventoryReport(data.report);
            } else {
                setError(data.message || 'Failed to fetch inventory report');
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setError('Network error: Unable to fetch inventory report');
        } finally {
            setLoading(false);
        }
    };

    const fetchTopProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const dateRange = getDateRange(filters.period);
            const response = await fetch(
                `/admin/api/reports/top-products?start_date=${dateRange.start}&end_date=${dateRange.end}&limit=10`
            );
            const data = await response.json();
            if (data.success) {
                setTopProducts(data.report);
            } else {
                setError(data.message || 'Failed to fetch top products');
            }
        } catch (error) {
            console.error('Error fetching top products:', error);
            setError('Network error: Unable to fetch top products');
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiringProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/admin/api/reports/expiring-products?days=${filters.expiring_days}`);
            const data = await response.json();
            if (data.success) {
                setExpiringProducts(data.report.products);
            } else {
                setError(data.message || 'Failed to fetch expiring products');
            }
        } catch (error) {
            console.error('Error fetching expiring products:', error);
            setError('Network error: Unable to fetch expiring products');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrescriptionStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const dateRange = getDateRange(filters.period);
            const params = new URLSearchParams();
            params.append('start_date', dateRange.start);
            params.append('end_date', dateRange.end);

            const response = await fetch(`/admin/api/reports/prescriptions?${params}`);
            const data = await response.json();
            if (data.success) {
                setPrescriptionStats(data.report);
            } else {
                setError(data.message || 'Failed to fetch prescription stats');
            }
        } catch (error) {
            console.error('Error fetching prescription stats:', error);
            setError('Network error: Unable to fetch prescription stats');
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

    const handlePeriodChange = (period) => {
        const dateRange = getDateRange(period);
        setFilters(prev => ({
            ...prev,
            period,
            start_date: dateRange.start,
            end_date: dateRange.end
        }));
    };

    const renderPeriodFilter = () => (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Period</label>
            <div className="flex gap-3 flex-wrap mb-4">
                {['today', 'week', 'month', 'year', 'custom'].map(period => (
                    <button
                        key={period}
                        onClick={() => handlePeriodChange(period)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.period === period
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {period === 'today' ? 'Today' :
                            period === 'week' ? 'This Week' :
                                period === 'month' ? 'This Month' :
                                    period === 'year' ? 'This Year' :
                                        'Custom Range'}
                    </button>
                ))}
            </div>

            {filters.period === 'custom' && (
                <div className="flex gap-3 flex-wrap">
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
                        onClick={() => {
                            if (activeTab === 'sales') fetchSalesReport();
                            else if (activeTab === 'top-products') fetchTopProducts();
                            else if (activeTab === 'prescriptions') fetchPrescriptionStats();
                        }}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Apply'}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <AuthenticatedLayout>
            <Head title="Reports & Analytics" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
                    <p className="text-gray-600">Comprehensive business insights and statistics</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-red-800 font-medium">{error}</p>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-2xl border border-gray-200 mb-6 shadow-sm overflow-x-auto">
                    <div className="flex border-b border-gray-200">
                        {['dashboard', 'sales', 'inventory', 'top-products', 'expiring', 'prescriptions'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setError(null);
                                }}
                                className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${activeTab === tab
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
                        {renderPeriodFilter()}

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
                        {renderPeriodFilter()}

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : salesReport ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
                                        <p className="text-3xl font-bold text-indigo-600">{formatCurrency(salesReport.total_revenue)}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Total Transactions</p>
                                        <p className="text-3xl font-bold text-gray-900">{salesReport.total_transactions}</p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <p className="text-sm font-medium text-gray-600 mb-2">Average Transaction</p>
                                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(salesReport.average_transaction)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Source</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">POS Revenue</span>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-600">{formatCurrency(salesReport.pos_revenue)}</p>
                                                    <p className="text-xs text-gray-500">{salesReport.pos_transactions} transactions</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Online Orders</span>
                                                <div className="text-right">
                                                    <p className="font-bold text-blue-600">{formatCurrency(salesReport.orders_revenue)}</p>
                                                    <p className="text-xs text-gray-500">{salesReport.online_orders} orders</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Sales by Date</h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {Object.entries(salesReport.sales_by_date || {}).map(([date, data]) => (
                                                <div key={date} className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-sm text-gray-600">{date}</span>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900">{formatCurrency(data.total)}</p>
                                                        <p className="text-xs text-gray-500">{data.count} transactions</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-500">Loading sales data...</p>
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
                                        className={`px-4 py-2 rounded-xl font-medium transition-all ${filters.inventory_type === type
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
                                                {inventoryReport.products?.length > 0 ? (
                                                    inventoryReport.products.map(product => (
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
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                            No products found
                                                        </td>
                                                    </tr>
                                                )}
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
                        {renderPeriodFilter()}

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : topProducts.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Units Sold</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Transactions</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Revenue</th>
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
                                                    <td className="px-6 py-4 font-semibold text-green-600">{formatCurrency(item.total_revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-500">Loading top products...</p>
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
                        ) : expiringProducts.length > 0 ? (
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
                                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${daysLeft <= 7 ? 'bg-red-100 text-red-800' :
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
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-500">No products expiring within {filters.expiring_days} days</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Prescriptions Tab */}
                {activeTab === 'prescriptions' && (
                    <div className="space-y-6">
                        {renderPeriodFilter()}

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
