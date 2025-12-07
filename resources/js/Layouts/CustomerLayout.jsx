import { useState, useEffect } from 'react';
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
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Fetch unread counts on mount and periodically
    useEffect(() => {
        fetchUnreadCounts();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchUnreadCounts, 30000);

        // Listen for real-time updates from the notifications page
        const handleNotificationUpdate = (event) => {
            setUnreadNotifications(event.detail.count);
        };

        window.addEventListener('notification-count-updated', handleNotificationUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notification-count-updated', handleNotificationUpdate);
        };
    }, []);

    const fetchUnreadCounts = async () => {
        try {
            // Fetch unread notifications count
            const notifResponse = await fetch(route('customer.api.notifications.unread-count'));
            const notifData = await notifResponse.json();
            if (notifData.success) {
                setUnreadNotifications(notifData.count || 0);
            }

            // You can add unread messages count here if you have an endpoint for it
            // const messagesResponse = await fetch(route('customer.api.conversations.unread-count'));
            // const messagesData = await messagesResponse.json();
            // if (messagesData.success) {
            //     setUnreadMessages(messagesData.count || 0);
            // }
        } catch (error) {
            console.error('Failed to fetch unread counts:', error);
        }
    };

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
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('customer.logout');

        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrfToken;

        form.appendChild(csrfInput);
        document.body.appendChild(form);
        form.submit();
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
                                const hasBadge = item.badge && item.badge > 0;

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
                                            {hasBadge && (
                                                <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] text-center">
                                                    {item.badge > 99 ? '99+' : item.badge}
                                                </span>
                                            )}
                                            {active && !hasBadge && (
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
                            onClick={() => setShowLogoutModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
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
                        <div className="flex items-center gap-2">
                            {unreadNotifications > 0 && (
                                <Link
                                    href={route('customer.notifications')}
                                    className="relative"
                                >
                                    <Bell className="w-6 h-6 text-gray-500" />
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Logout Modal */}
                {showLogoutModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Logout</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to logout? You'll need to login again to access your account.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <main className="min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
