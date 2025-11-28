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
        return `${sign}${num.toFixed(1)}%`;
    };

    const getChangeColor = (value) => {
        const num = Number(value || 0);
        if (num > 0) return '#10B981';
        if (num < 0) return '#EF4444';
        return '#6B7280';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="dashboard-container">
                {/* Header */}
                <div className="dashboard-header">
                    <div className="header-content">
                        <div className="header-left">
                            <h1 className="page-title">Dashboard Overview</h1>
                            <p className="page-subtitle">Monitor your pharmacy's performance and key metrics</p>
                        </div>
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
                    <div className="stats-grid-4">
                        <MetricCard
                            icon="💰"
                            iconBg="#DBEAFE"
                            iconColor="#0EA5E9"
                            label="Total Revenue"
                            value={formatCurrency(stats.overview.total_revenue.value)}
                            change={stats.overview.total_revenue.change}
                            changeLabel="vs previous period"
                        />
                        <MetricCard
                            icon="🛒"
                            iconBg="#E0E7FF"
                            iconColor="#6366F1"
                            label="Total Orders"
                            value={stats.overview.total_orders.value}
                            change={stats.overview.total_orders.change}
                            changeLabel="vs previous period"
                        />
                        <MetricCard
                            icon="👥"
                            iconBg="#D1FAE5"
                            iconColor="#10B981"
                            label="Total Customers"
                            value={stats.overview.total_customers}
                        />
                        <MetricCard
                            icon="📝"
                            iconBg="#FEF3C7"
                            iconColor="#F59E0B"
                            label="Pending Prescriptions"
                            value={stats.overview.pending_prescriptions}
                            highlight={stats.overview.pending_prescriptions > 0}
                        />
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="stats-section">
                    <div className="section-header">
                        <h2 className="section-title">Revenue Breakdown</h2>
                        <p className="section-subtitle">Sales performance across channels</p>
                    </div>
                    <div className="revenue-cards">
                        <RevenueCard
                            label="Online Sales"
                            value={formatCurrency(stats.revenue.online)}
                            icon="🌐"
                            gradient="linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)"
                        />
                        <RevenueCard
                            label="POS Sales"
                            value={formatCurrency(stats.revenue.pos)}
                            icon="🏪"
                            gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                        />
                        <RevenueCard
                            label="Total Revenue"
                            value={formatCurrency(stats.revenue.total)}
                            icon="💵"
                            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                            featured={true}
                        />
                    </div>
                </div>

                {/* Orders & Products */}
                <div className="two-col-grid">
                    {/* Order Stats */}
                    <div className="data-card">
                        <div className="card-header">
                            <h3 className="card-title">Order Status</h3>
                            <span className="card-badge">{stats.orders.total} Total</span>
                        </div>
                        <div className="card-content">
                            <StatusItem label="Pending" value={stats.orders.pending} color="#F59E0B" />
                            <StatusItem label="Processing" value={stats.orders.processing} color="#0EA5E9" />
                            <StatusItem label="Shipped" value={stats.orders.shipped} color="#8B5CF6" />
                            <StatusItem label="Delivered" value={stats.orders.delivered} color="#10B981" />
                            <StatusItem label="Cancelled" value={stats.orders.cancelled} color="#EF4444" />
                        </div>
                    </div>

                    {/* Product Stats */}
                    <div className="data-card">
                        <div className="card-header">
                            <h3 className="card-title">Inventory Status</h3>
                            <span className="card-badge">{stats.products.total} Products</span>
                        </div>
                        <div className="card-content">
                            <StatusItem label="Total Products" value={stats.products.total} color="#0EA5E9" />
                            <StatusItem label="Low Stock" value={stats.products.low_stock} color="#F59E0B" alert={stats.products.low_stock > 0} />
                            <StatusItem label="Out of Stock" value={stats.products.out_of_stock} color="#EF4444" alert={stats.products.out_of_stock > 0} />
                            <StatusItem label="Expiring Soon" value={stats.products.expiring_soon} color="#F59E0B" alert={stats.products.expiring_soon > 0} />
                        </div>
                    </div>
                </div>

                {/* Customers & Prescriptions */}
                <div className="two-col-grid">
                    {/* Customer Stats */}
                    <div className="data-card">
                        <div className="card-header">
                            <h3 className="card-title">Customer Analytics</h3>
                            <span className="card-badge">{stats.customers.total} Total</span>
                        </div>
                        <div className="card-content">
                            <StatusItem label="Total Customers" value={stats.customers.total} color="#0EA5E9" />
                            <StatusItem label="New Customers" value={stats.customers.new} color="#10B981" />
                            <StatusItem label="Active Customers" value={stats.customers.active} color="#8B5CF6" />
                        </div>
                    </div>

                    {/* Prescription Stats */}
                    <div className="data-card">
                        <div className="card-header">
                            <h3 className="card-title">Prescription Management</h3>
                            <span className="card-badge">{stats.prescriptions.total} Total</span>
                        </div>
                        <div className="card-content">
                            <StatusItem label="Pending Review" value={stats.prescriptions.pending} color="#F59E0B" alert={stats.prescriptions.pending > 0} />
                            <StatusItem label="Verified" value={stats.prescriptions.verified} color="#10B981" />
                            <StatusItem label="Rejected" value={stats.prescriptions.rejected} color="#EF4444" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .dashboard-container {
                    padding: 2.5rem;
                    max-width: 1600px;
                    margin: 0 auto;
                    background: #F8FAFC;
                    min-height: 100vh;
                }

                /* Header */
                .dashboard-header {
                    margin-bottom: 2.5rem;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
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

                .period-selector {
                    display: inline-flex;
                    gap: 0.5rem;
                    background: white;
                    padding: 0.375rem;
                    border-radius: 12px;
                    border: 1px solid #E5E7EB;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .period-btn {
                    padding: 0.625rem 1.25rem;
                    border: none;
                    background: transparent;
                    color: #6B7280;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .period-btn:hover:not(:disabled) {
                    background: #F9FAFB;
                    color: #111827;
                }

                .period-btn.active {
                    background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
                    color: white;
                    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
                }

                .period-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Sections */
                .stats-section {
                    margin-bottom: 2.5rem;
                }

                .section-header {
                    margin-bottom: 1.5rem;
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

                /* Grids */
                .stats-grid-4 {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                }

                .revenue-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .two-col-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }

                /* Data Card */
                .data-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s ease;
                }

                .data-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    transform: translateY(-2px);
                }

                .card-header {
                    padding: 1.5rem 1.75rem;
                    background: #F9FAFB;
                    border-bottom: 1px solid #E5E7EB;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .card-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0;
                    letter-spacing: -0.025em;
                }

                .card-badge {
                    background: white;
                    color: #6B7280;
                    padding: 0.375rem 0.875rem;
                    border-radius: 8px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    border: 1px solid #E5E7EB;
                }

                .card-content {
                    padding: 1.5rem 1.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                @media (max-width: 768px) {
                    .dashboard-container {
                        padding: 1.5rem;
                    }

                    .header-content {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .period-selector {
                        width: 100%;
                        justify-content: stretch;
                    }

                    .period-btn {
                        flex: 1;
                    }

                    .two-col-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}

function MetricCard({ icon, iconBg, iconColor, label, value, change, changeLabel, highlight }) {
    const formatPercentage = (val) => {
        const num = Number(val || 0);
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(1)}%`;
    };

    const getChangeColor = (val) => {
        const num = Number(val || 0);
        if (num > 0) return '#10B981';
        if (num < 0) return '#EF4444';
        return '#6B7280';
    };

    return (
        <div className={`metric-card ${highlight ? 'highlight' : ''}`}>
            <div className="metric-icon" style={{ background: iconBg, color: iconColor }}>
                {icon}
            </div>
            <div className="metric-content">
                <p className="metric-label">{label}</p>
                <h3 className="metric-value">{value}</h3>
                {change !== undefined && (
                    <div className="metric-change" style={{ color: getChangeColor(change) }}>
                        <span className="change-badge" style={{ background: `${getChangeColor(change)}15`, color: getChangeColor(change) }}>
                            {formatPercentage(change)}
                        </span>
                        {changeLabel && <span className="change-label">{changeLabel}</span>}
                    </div>
                )}
            </div>

            <style>{`
                .metric-card {
                    background: white;
                    padding: 1.75rem;
                    border-radius: 16px;
                    border: 1px solid #E5E7EB;
                    display: flex;
                    gap: 1.25rem;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .metric-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                    border-color: #D1D5DB;
                }

                .metric-card.highlight {
                    border-color: #FCD34D;
                    background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
                }

                .metric-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.75rem;
                    flex-shrink: 0;
                }

                .metric-content {
                    flex: 1;
                    min-width: 0;
                }

                .metric-label {
                    font-size: 0.875rem;
                    color: #6B7280;
                    margin: 0 0 0.5rem 0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .metric-value {
                    font-size: 1.875rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.75rem 0;
                    letter-spacing: -0.025em;
                }

                .metric-change {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .change-badge {
                    padding: 0.25rem 0.625rem;
                    border-radius: 6px;
                    font-size: 0.8125rem;
                    font-weight: 700;
                }

                .change-label {
                    color: #9CA3AF;
                    font-size: 0.8125rem;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}

function RevenueCard({ label, value, icon, gradient, featured }) {
    return (
        <div className={`revenue-card ${featured ? 'featured' : ''}`} style={{ background: gradient }}>
            <div className="revenue-icon">{icon}</div>
            <div className="revenue-content">
                <p className="revenue-label">{label}</p>
                <h3 className="revenue-value">{value}</h3>
            </div>

            <style>{`
                .revenue-card {
                    padding: 2rem;
                    border-radius: 16px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .revenue-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 120px;
                    height: 120px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    transform: translate(40%, -40%);
                }

                .revenue-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
                }

                .revenue-card.featured {
                    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
                }

                .revenue-icon {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                    opacity: 0.9;
                }

                .revenue-content {
                    position: relative;
                    z-index: 1;
                }

                .revenue-label {
                    font-size: 0.875rem;
                    margin: 0 0 0.75rem 0;
                    opacity: 0.9;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .revenue-value {
                    font-size: 2.25rem;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: -0.025em;
                }
            `}</style>
        </div>
    );
}

function StatusItem({ label, value, color, alert }) {
    return (
        <div className={`status-item ${alert ? 'alert' : ''}`}>
            <div className="status-indicator" style={{ background: color }}></div>
            <span className="status-label">{label}</span>
            <span className="status-value" style={{ color: color }}>{value}</span>

            <style>{`
                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.875rem 1rem;
                    border-radius: 10px;
                    background: #F9FAFB;
                    transition: all 0.2s ease;
                }

                .status-item:hover {
                    background: #F3F4F6;
                    transform: translateX(4px);
                }

                .status-item.alert {
                    background: #FEF2F2;
                    border: 1px solid #FEE2E2;
                }

                .status-indicator {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
                }

                .status-label {
                    flex: 1;
                    color: #374151;
                    font-size: 0.9375rem;
                    font-weight: 500;
                }

                .status-value {
                    font-weight: 700;
                    font-size: 1.125rem;
                    letter-spacing: -0.025em;
                }
            `}</style>
        </div>
    );
}
