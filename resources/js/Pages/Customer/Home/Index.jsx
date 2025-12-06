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
    Heart
} from 'lucide-react';

export default function Home({ auth, stats }) {
    const quickActions = [
        {
            name: 'My Prescriptions',
            description: 'View and manage your prescriptions',
            icon: FileText,
            href: 'customer.prescriptions',
            color: 'blue'
        },
        {
            name: 'Notifications',
            description: 'View your notifications',
            icon: Bell,
            href: 'customer.notifications',
            color: 'green'
        },
        {
            name: 'Messages',
            description: 'Chat with pharmacy staff',
            icon: MessageSquare,
            href: 'customer.conversations',
            color: 'purple'
        },
        {
            name: 'My Profile',
            description: 'Update your information',
            icon: User,
            href: 'customer.profile',
            color: 'orange'
        }
    ];

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    return (
        <CustomerLayout>
            <Head title="Home" />

            <div className="p-6 md:p-10 max-w-7xl mx-auto">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8 shadow-lg">
                    <h2 className="text-3xl font-bold mb-2">
                        Welcome back, {auth.user.first_name}!
                    </h2>
                    <p className="text-blue-100 text-lg">
                        Manage your prescriptions, orders, and health needs all in one place.
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Prescriptions</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats?.prescriptions || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Orders</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats?.orders || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Notifications</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats?.notifications || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Messages</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats?.messages || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link
                                    key={action.name}
                                    href={route(action.href)}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[action.color]} group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-semibold text-gray-800 mb-1">
                                        {action.name}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        {action.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
                    </div>
                    <div className="p-6">
                        {stats?.recentActivity?.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recentActivity.map((activity, index) => (
                                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Package className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                {activity.title}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {activity.description}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 text-lg">No recent activity</p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Your activities will appear here
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}