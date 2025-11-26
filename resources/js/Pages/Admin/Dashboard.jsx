import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Dashboard({ stats }) {
    const [period, setPeriod] = useState('today');
    const [isLoading, setIsLoading] = useState(false);

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        setIsLoading(true);
        router.get(route('admin.dashboard'), { period: newPeriod }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsLoading(false)
        });
    };

    const formatCurrency = (amount) => {
        return '₱' + Number(amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatPercentage = (value) => {
        const num = Number(value || 0);
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
    };

    const getChangeColor = (value) => {
        const num = Number(value || 0);
        if (num > 0) return '#10b981';
        if (num < 0) return '#ef4444';
        return '#64748b';
    };

    const getChangeIcon = (value) => {
        const num = Number(value || 0);
        if (num > 0) return '↑';
        if (num < 0) return '↓';
        return '→';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="dashboard-container">
                {/* Header */}
                <div className="page-header">
                    <div className="header-content">
                        <h1 className="page-title">Dashboard</h1>
                        <div className="period-selector">
                            {['today', 'week', 'month', 'year'].map((p) => (
                                <button
                                    key={p}
                                    className={`period-btn ${period === p ? 'active' : ''}`}
                                    onClick={() => handlePeriodChange(p)}
                                    disabled={isLoading}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="stats-section">
                    <h2 className="section-title">Overview</h2>
                    <div className="stats-grid">
                        <StatCard
                            icon="💰"
                            label="Total Revenue"
                            value={formatCurrency(stats.overview.total_revenue.value)}
                            change={stats.overview.total_revenue.change}
                            changeLabel="vs previous period"
                        />
                        <StatCard
                            icon="🛒"
                            label="Total Orders"
                            value={stats.overview.total_orders.value}
                            change={stats.overview.total_orders.change}
                            changeLabel="vs previous period"
                        />
                        <StatCard
                            icon="👥"
                            label="Total Customers"
                            value={stats.overview.total_customers}
                        />
                        <StatCard
                            icon="📝"
                            label="Pending Prescriptions"
                            value={stats.overview.pending_prescriptions}
                            highlight={stats.overview.pending_prescriptions > 0}
                        />
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="stats-section">
                    <h2 className="section-title">Revenue Breakdown</h2>
                    <div className="stats-grid-3">
                        <StatCard
                            icon="🌐"
                            label="Online Revenue"
                            value={formatCurrency(stats.revenue.online)}
                            color="#3b82f6"
                        />
                        <StatCard
                            icon="🏪"
                            label="POS Revenue"
                            value={formatCurrency(stats.revenue.pos)}
                            color="#8b5cf6"
                        />
                        <StatCard
                            icon="💵"
                            label="Total Revenue"
                            value={formatCurrency(stats.revenue.total)}
                            color="#10b981"
                        />
                    </div>
                </div>

                {/* Orders & Products */}
                <div className="two-col-grid">
                    {/* Order Stats */}
                    <div className="card">
                        <h2 className="card-title">Orders Status</h2>
                        <div className="list-stats">
                            <ListStat label="Pending" value={stats.orders.pending} color="#f59e0b" />
                            <ListStat label="Processing" value={stats.orders.processing} color="#3b82f6" />
                            <ListStat label="Shipped" value={stats.orders.shipped} color="#8b5cf6" />
                            <ListStat label="Delivered" value={stats.orders.delivered} color="#10b981" />
                            <ListStat label="Cancelled" value={stats.orders.cancelled} color="#ef4444" />
                            <div className="list-stat-total">
                                <span>Total Orders</span>
                                <strong>{stats.orders.total}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Product Stats */}
                    <div className="card">
                        <h2 className="card-title">Product Inventory</h2>
                        <div className="list-stats">
                            <ListStat label="Total Products" value={stats.products.total} color="#3b82f6" />
                            <ListStat label="Low Stock" value={stats.products.low_stock} color="#f59e0b" />
                            <ListStat label="Out of Stock" value={stats.products.out_of_stock} color="#ef4444" />
                            <ListStat label="Expiring Soon" value={stats.products.expiring_soon} color="#f59e0b" />
                        </div>
                    </div>
                </div>

                {/* Customers & Prescriptions */}
                <div className="two-col-grid">
                    {/* Customer Stats */}
                    <div className="card">
                        <h2 className="card-title">Customers</h2>
                        <div className="list-stats">
                            <ListStat label="Total Customers" value={stats.customers.total} color="#3b82f6" />
                            <ListStat label="New Customers" value={stats.customers.new} color="#10b981" />
                            <ListStat label="Active Customers" value={stats.customers.active} color="#8b5cf6" />
                        </div>
                    </div>

                    {/* Prescription Stats */}
                    <div className="card">
                        <h2 className="card-title">Prescriptions</h2>
                        <div className="list-stats">
                            <ListStat label="Pending" value={stats.prescriptions.pending} color="#f59e0b" />
                            <ListStat label="Verified" value={stats.prescriptions.verified} color="#10b981" />
                            <ListStat label="Rejected" value={stats.prescriptions.rejected} color="#ef4444" />
                            <div className="list-stat-total">
                                <span>Total Prescriptions</span>
                                <strong>{stats.prescriptions.total}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-container {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 2rem;
                }

                .header-content {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 2rem;
                    border-radius: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
                }

                .page-title {
                    font-size: 2rem;
                    font-weight: 800;
                    color: white;
                    margin: 0;
                }

                .period-selector {
                    display: flex;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.5rem;
                    border-radius: 12px;
                }

                .period-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .period-btn:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                }

                .period-btn.active {
                    background: white;
                    color: #667eea;
                }

                .period-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .stats-section {
                    margin-bottom: 2rem;
                }

                .section-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                }

                .stats-grid-3 {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .two-col-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                }

                .card-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 1rem 0;
                }

                .list-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .list-stat-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-top: 2px solid #e2e8f0;
                    margin-top: 0.5rem;
                    font-weight: 600;
                    color: #1e293b;
                }

                @media (max-width: 768px) {
                    .dashboard-container {
                        padding: 1rem;
                    }

                    .header-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .period-selector {
                        width: 100%;
                        overflow-x: auto;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}

function StatCard({ icon, label, value, change, changeLabel, highlight, color }) {
    const formatPercentage = (val) => {
        const num = Number(val || 0);
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
    };

    const getChangeColor = (val) => {
        const num = Number(val || 0);
        if (num > 0) return '#10b981';
        if (num < 0) return '#ef4444';
        return '#64748b';
    };

    const getChangeIcon = (val) => {
        const num = Number(val || 0);
        if (num > 0) return '↑';
        if (num < 0) return '↓';
        return '→';
    };

    return (
        <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
            <div className="stat-icon" style={{ color: color || '#667eea' }}>
                {icon}
            </div>
            <div className="stat-content">
                <p className="stat-label">{label}</p>
                <h3 className="stat-value">{value}</h3>
                {change !== undefined && (
                    <div className="stat-change" style={{ color: getChangeColor(change) }}>
                        <span className="change-icon">{getChangeIcon(change)}</span>
                        <span className="change-value">{formatPercentage(change)}</span>
                        {changeLabel && <span className="change-label">{changeLabel}</span>}
                    </div>
                )}
            </div>

            <style jsx>{`
                .stat-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                    display: flex;
                    gap: 1rem;
                    transition: all 0.2s;
                }

                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .stat-card.highlight {
                    border-color: #f59e0b;
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                }

                .stat-icon {
                    font-size: 2.5rem;
                    display: flex;
                    align-items: center;
                }

                .stat-content {
                    flex: 1;
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0 0 0.25rem 0;
                    font-weight: 500;
                }

                .stat-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 0.5rem 0;
                }

                .stat-change {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                }

                .change-icon {
                    font-size: 1rem;
                }

                .change-label {
                    color: #64748b;
                    font-weight: 400;
                    margin-left: 0.25rem;
                }
            `}</style>
        </div>
    );
}

function ListStat({ label, value, color }) {
    return (
        <div className="list-stat">
            <div className="list-stat-indicator" style={{ backgroundColor: color }} />
            <span className="list-stat-label">{label}</span>
            <span className="list-stat-value">{value}</span>

            <style jsx>{`
                .list-stat {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                }

                .list-stat-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .list-stat-label {
                    flex: 1;
                    color: #64748b;
                    font-size: 0.875rem;
                }

                .list-stat-value {
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 1rem;
                }
            `}</style>
        </div>
    );
}
