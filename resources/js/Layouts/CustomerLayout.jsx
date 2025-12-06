import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { 
    Home, 
    FileText, 
    ShoppingBag, 
    Package, 
    User, 
    Bell,
    MessageSquare,
    Menu,
    X,
    LogOut,
    ChevronRight
} from 'lucide-react';

export default function CustomerLayout({ children }) {
    const { auth, unreadNotifications = 0, unreadMessages = 0 } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Home', href: 'customer.home', icon: Home },
        { name: 'Prescriptions', href: 'customer.prescriptions', icon: FileText },
        { name: 'Products', href: 'customer.products', icon: ShoppingBag },
        { name: 'My Orders', href: 'customer.orders', icon: Package },
        { name: 'Notifications', href: 'customer.notifications', icon: Bell, badge: unreadNotifications },
        { name: 'Messages', href: 'customer.conversations', icon: MessageSquare, badge: unreadMessages },
        { name: 'Profile', href: 'customer.profile', icon: User },
    ];

    const isActive = (routeName) => {
        return route().current(routeName) || route().current(`${routeName}.*`);
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            router.post(route('customer.logout'));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                        <Link href={route('customer.home')} className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">Digital Pharma</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                    {auth.user.first_name?.[0]}{auth.user.last_name?.[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {auth.user.first_name} {auth.user.last_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {auth.user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 overflow-y-auto">
                        <ul className="space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={route(item.href)}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                                                ${active 
                                                    ? 'bg-blue-50 text-blue-600' 
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                }
                                            `}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="flex-1">{item.name}</span>
                                            {item.badge > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                                    {item.badge > 99 ? '99+' : item.badge}
                                                </span>
                                            )}
                                            {active && (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between h-16 px-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">Digital Pharma</h1>
                        <div className="w-6" /> {/* Spacer for centering */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}