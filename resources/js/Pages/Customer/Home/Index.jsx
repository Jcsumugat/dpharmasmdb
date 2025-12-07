import { Head, Link } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    FileText,
    ShoppingBag,
    Package,
    User,
    Upload,
    Bell,
    MessageSquare,
    Heart,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Calendar,
    Pill
} from 'lucide-react';

export default function Home({ auth, stats }) {
    const quickActions = [
        {
            name: 'Upload Prescription',
            description: 'Submit your prescription for quick verification',
            icon: Upload,
            href: 'customer.prescriptions',
            color: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            hoverBorder: 'hover:border-blue-200'
        },
        {
            name: 'Browse Products',
            description: 'Explore our wide range of medications',
            icon: ShoppingBag,
            href: 'customer.products',
            color: 'from-green-500 to-green-600',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            hoverBorder: 'hover:border-green-200'
        },
        {
            name: 'My Orders',
            description: 'Track and manage your order status',
            icon: Package,
            href: 'customer.orders',
            color: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            hoverBorder: 'hover:border-purple-200'
        },
        {
            name: 'My Profile',
            description: 'Update personal information',
            icon: User,
            href: 'customer.profile',
            color: 'from-orange-500 to-orange-600',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            hoverBorder: 'hover:border-orange-200'
        }
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <CustomerLayout>
            <Head title="Home" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Heart className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">{getGreeting()}</p>
                                    <h2 className="text-3xl md:text-4xl font-bold">
                                        Welcome back, {auth.user.name}!
                                    </h2>
                                </div>
                            </div>
                            <p className="text-blue-50 text-lg max-w-2xl">
                                Manage your prescriptions, orders, and health needs all in one convenient place.
                            </p>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats?.prescriptions || 0}</p>
                            <p className="text-sm text-gray-600">Prescriptions</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats?.orders || 0}</p>
                            <p className="text-sm text-gray-600">Orders</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats?.pending || 0}</p>
                            <p className="text-sm text-gray-600">Pending</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats?.messages || 0}</p>
                            <p className="text-sm text-gray-600">Messages</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={action.name}
                                        href={route(action.href)}
                                        className={`group bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-transparent ${action.hoverBorder}`}
                                    >
                                        <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-7 h-7 text-white" />
                                        </div>
                                        <h3 className="font-bold text-gray-800 mb-2 text-lg">
                                            {action.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {action.description}
                                        </p>
                                        <div className={`flex items-center ${action.iconColor} text-sm font-medium`}>
                                            <span>Get started</span>
                                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Activity & Health Reminders */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent Activity */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
                                <Link
                                    href={route('customer.prescriptions')}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    View All
                                </Link>
                            </div>
                            <div className="p-6">
                                {stats?.recentActivity?.length > 0 ? (
                                    <div className="space-y-4">
                                        {stats.recentActivity.map((activity, index) => (
                                            <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{activity.title}</p>
                                                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                                    <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Heart className="w-10 h-10 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 text-lg font-semibold">No recent activity</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            Your activities will appear here
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Health Reminders */}
                        <div className="bg-white rounded-xl shadow-sm">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">Health Reminders</h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-5 h-5 text-yellow-600" />
                                            <p className="font-semibold text-gray-800 text-sm">Medication Refill</p>
                                        </div>
                                        <p className="text-xs text-gray-600">Check your prescriptions</p>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Pill className="w-5 h-5 text-blue-600" />
                                            <p className="font-semibold text-gray-800 text-sm">Take Medication</p>
                                        </div>
                                        <p className="text-xs text-gray-600">Stay on track with your health</p>
                                    </div>

                                    <Link
                                        href={route('customer.prescriptions')}
                                        className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all text-center"
                                    >
                                        View Prescriptions
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Need Help?</h3>
                                <p className="text-indigo-100">Our support team is here to assist you 24/7</p>
                            </div>
                            <Link
                                href={route('customer.conversations')}
                                className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-lg whitespace-nowrap"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
