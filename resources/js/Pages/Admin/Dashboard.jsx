import { useState } from 'react';
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

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="min-h-screen bg-slate-50 p-6 md:p-10">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex flex-wrap justify-between items-start gap-6">
                            <div className="flex-1">
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                                    Dashboard Overview
                                </h1>
                                <p className="text-gray-600 text-sm md:text-base">
                                    Monitor your pharmacy's performance and key metrics
                                </p>
                            </div>
                            <div className="inline-flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
                                {['today', 'week', 'month', 'year'].map((p) => (
                                    <button
                                        key={p}
                                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex-1 md:flex-none ${
                                            period === p
                                                ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    <div className="mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                icon="💰"
                                iconBg="bg-blue-100"
                                iconColor="text-sky-500"
                                label="Total Revenue"
                                value={formatCurrency(stats.overview.total_revenue.value)}
                                change={stats.overview.total_revenue.change}
                                changeLabel="vs previous period"
                            />
                            <MetricCard
                                icon="🛒"
                                iconBg="bg-indigo-100"
                                iconColor="text-indigo-500"
                                label="Total Orders"
                                value={stats.overview.total_orders.value}
                                change={stats.overview.total_orders.change}
                                changeLabel="vs previous period"
                            />
                            <MetricCard
                                icon="👥"
                                iconBg="bg-emerald-100"
                                iconColor="text-emerald-500"
                                label="Total Customers"
                                value={stats.overview.total_customers}
                            />
                            <MetricCard
                                icon="📝"
                                iconBg="bg-amber-100"
                                iconColor="text-amber-500"
                                label="Pending Prescriptions"
                                value={stats.overview.pending_prescriptions}
                                highlight={stats.overview.pending_prescriptions > 0}
                            />
                        </div>
                    </div>

                    {/* Revenue Breakdown */}
                    <div className="mb-10">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
                                Revenue Breakdown
                            </h2>
                            <p className="text-sm text-gray-600">
                                Sales performance across channels
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <RevenueCard
                                label="Online Sales"
                                value={formatCurrency(stats.revenue.online)}
                                icon="🌐"
                                gradientFrom="from-sky-500"
                                gradientTo="to-sky-600"
                            />
                            <RevenueCard
                                label="POS Sales"
                                value={formatCurrency(stats.revenue.pos)}
                                icon="🏪"
                                gradientFrom="from-violet-500"
                                gradientTo="to-violet-600"
                            />
                            <RevenueCard
                                label="Total Revenue"
                                value={formatCurrency(stats.revenue.total)}
                                icon="💵"
                                gradientFrom="from-emerald-500"
                                gradientTo="to-emerald-600"
                                featured={true}
                            />
                        </div>
                    </div>

                    {/* Orders & Products */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                        {/* Order Stats */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div className="px-7 py-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                    Order Status
                                </h3>
                                <span className="bg-white text-gray-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200">
                                    {stats.orders.total} Total
                                </span>
                            </div>
                            <div className="px-7 py-6 flex flex-col gap-4">
                                <StatusItem label="Pending" value={stats.orders.pending} color="bg-amber-500" textColor="text-amber-500" />
                                <StatusItem label="Processing" value={stats.orders.processing} color="bg-sky-500" textColor="text-sky-500" />
                                <StatusItem label="Shipped" value={stats.orders.shipped} color="bg-violet-500" textColor="text-violet-500" />
                                <StatusItem label="Delivered" value={stats.orders.delivered} color="bg-emerald-500" textColor="text-emerald-500" />
                                <StatusItem label="Cancelled" value={stats.orders.cancelled} color="bg-red-500" textColor="text-red-500" />
                            </div>
                        </div>

                        {/* Product Stats */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div className="px-7 py-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                    Inventory Status
                                </h3>
                                <span className="bg-white text-gray-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200">
                                    {stats.products.total} Products
                                </span>
                            </div>
                            <div className="px-7 py-6 flex flex-col gap-4">
                                <StatusItem label="Total Products" value={stats.products.total} color="bg-sky-500" textColor="text-sky-500" />
                                <StatusItem label="Low Stock" value={stats.products.low_stock} color="bg-amber-500" textColor="text-amber-500" alert={stats.products.low_of_stock > 0} />
                                <StatusItem label="Out of Stock" value={stats.products.out_of_stock} color="bg-red-500" textColor="text-red-500" alert={stats.products.out_of_stock > 0} />
                                <StatusItem label="Expiring Soon" value={stats.products.expiring_soon} color="bg-amber-500" textColor="text-amber-500" alert={stats.products.expiring_soon > 0} />
                            </div>
                        </div>
                    </div>

                    {/* Customers & Prescriptions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Customer Stats */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div className="px-7 py-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                    Customer Analytics
                                </h3>
                                <span className="bg-white text-gray-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200">
                                    {stats.customers.total} Total
                                </span>
                            </div>
                            <div className="px-7 py-6 flex flex-col gap-4">
                                <StatusItem label="Total Customers" value={stats.customers.total} color="bg-sky-500" textColor="text-sky-500" />
                                <StatusItem label="New Customers" value={stats.customers.new} color="bg-emerald-500" textColor="text-emerald-500" />
                                <StatusItem label="Active Customers" value={stats.customers.active} color="bg-violet-500" textColor="text-violet-500" />
                            </div>
                        </div>

                        {/* Prescription Stats */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div className="px-7 py-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                    Prescription Management
                                </h3>
                                <span className="bg-white text-gray-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200">
                                    {stats.prescriptions.total} Total
                                </span>
                            </div>
                            <div className="px-7 py-6 flex flex-col gap-4">
                                <StatusItem label="Pending Review" value={stats.prescriptions.pending} color="bg-amber-500" textColor="text-amber-500" alert={stats.prescriptions.pending > 0} />
                                <StatusItem label="Verified" value={stats.prescriptions.verified} color="bg-emerald-500" textColor="text-emerald-500" />
                                <StatusItem label="Rejected" value={stats.prescriptions.rejected} color="bg-red-500" textColor="text-red-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function MetricCard({ icon, iconBg, iconColor, label, value, change, changeLabel, highlight }) {
    const formatPercentage = (val) => {
        const num = Number(val || 0);
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(1)}%`;
    };

    const getChangeColorClasses = (val) => {
        const num = Number(val || 0);
        if (num > 0) return { bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
        if (num < 0) return { bg: 'bg-red-500/10', text: 'text-red-500' };
        return { bg: 'bg-gray-500/10', text: 'text-gray-500' };
    };

    const changeColors = change !== undefined ? getChangeColorClasses(change) : null;

    return (
        <div className={`bg-white p-7 rounded-2xl border ${highlight ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100' : 'border-gray-200'} flex gap-5 transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-1`}>
            <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-2 font-semibold uppercase tracking-wider">
                    {label}
                </p>
                <h3 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                    {value}
                </h3>
                {change !== undefined && changeColors && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`${changeColors.bg} ${changeColors.text} px-2.5 py-1 rounded-md text-xs font-bold`}>
                            {formatPercentage(change)}
                        </span>
                        {changeLabel && (
                            <span className="text-gray-400 text-xs font-medium">
                                {changeLabel}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function RevenueCard({ label, value, icon, gradientFrom, gradientTo, featured }) {
    return (
        <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} p-8 rounded-2xl text-white relative overflow-hidden transition-all duration-300 ${featured ? 'shadow-2xl shadow-emerald-500/40' : 'shadow-xl shadow-black/20'} hover:-translate-y-1 hover:shadow-2xl`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10"></div>
            <div className="text-4xl mb-4 opacity-90 relative z-10">
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-sm mb-3 opacity-90 font-semibold uppercase tracking-wider">
                    {label}
                </p>
                <h3 className="text-4xl font-bold tracking-tight">
                    {value}
                </h3>
            </div>
        </div>
    );
}

function StatusItem({ label, value, color, textColor, alert }) {
    return (
        <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl ${alert ? 'bg-red-50 border border-red-200' : 'bg-gray-50'} transition-all duration-200 hover:bg-gray-100 hover:translate-x-1`}>
            <div className={`w-2.5 h-2.5 ${color} rounded-full flex-shrink-0 shadow-sm`}></div>
            <span className="flex-1 text-gray-700 text-sm font-medium">
                {label}
            </span>
            <span className={`${textColor} font-bold text-lg tracking-tight`}>
                {value}
            </span>
        </div>
    );
}
