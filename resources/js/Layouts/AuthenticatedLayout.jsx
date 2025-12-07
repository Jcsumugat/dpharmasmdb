import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';

export default function AuthenticatedLayout({ children }) {
    const { auth } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        router.post(route('admin.logout'));
    };

    const navigation = [
        { name: 'Dashboard', href: 'admin.dashboard', icon: '📊' },
        { name: 'Suppliers', href: 'admin.suppliers', icon: '📦' },
        { name: 'Products', href: 'admin.products', icon: '💊' },
         { name: 'Orders', href: 'admin.orders', icon: '🛒' },
        { name: 'Prescriptions', href: 'admin.prescriptions', icon: '📋' },
        { name: 'Customers', href: 'admin.customers', icon: '👥' },
        { name: 'Notifications', href: 'admin.notifications', icon: '🔔' },
        { name: 'Conversations', href: 'admin.conversations', icon: '💬' },
        { name: 'Reports', href: 'admin.reports', icon: '📈' },
    ];

    const isActive = (routeName) => {
        try {
            return route().current(routeName) || route().current(`${routeName}.*`);
        } catch (e) {
            return false;
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-indigo-600 to-purple-700 shadow-xl transition-all duration-300 z-50 flex flex-col ${isSidebarOpen ? 'w-70' : 'w-20'}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/15 bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg border border-white/20">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v8.55c0 4.55-3.08 8.8-8 9.93-4.92-1.13-8-5.38-8-9.93V7.78l8-3.6zM11 11v6h2v-6h-2zm0-4v2h2V7h-2z" />
                            </svg>
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xl font-bold text-white tracking-tight">MJ's Pharmacy</span>
                                <span className="text-xs text-white/85 font-medium tracking-wider">Healthcare Management</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="flex flex-col gap-1">
                        {isSidebarOpen && <span className="text-xs font-bold text-white/60 tracking-widest px-3 mb-2">MAIN MENU</span>}
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={route(item.href)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white/85 transition-all duration-200 font-medium relative group ${isActive(item.href)
                                    ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm'
                                    : 'hover:bg-white/15 hover:text-white hover:translate-x-1'
                                    }`}
                            >
                                {isActive(item.href) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-white rounded-r" />}
                                <span className="text-xl min-w-[28px] flex items-center justify-center">{item.icon}</span>
                                {isSidebarOpen && <span className="whitespace-nowrap flex-1">{item.name}</span>}
                            </Link>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/15 bg-black/5">
                    <div className="flex items-center gap-3 p-3 mb-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15">
                        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg text-white flex-shrink-0 shadow-lg border-2 border-white/30">
                            {auth.user.name.charAt(0).toUpperCase()}
                        </div>
                        {isSidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{auth.user.name}</p>
                                <p className="text-xs text-white/75 capitalize">{auth.user.role}</p>
                            </div>
                        )}
                    </div>
                    <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/15 border-2 border-red-500/30 text-red-100 rounded-xl transition-all duration-200 font-semibold hover:bg-red-500/25 hover:border-red-500/50 hover:-translate-y-0.5 hover:text-white"
                        onClick={() => setShowLogoutModal(true)}
                        title={!isSidebarOpen ? "Sign Out" : ""}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {isSidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>

                {/* Toggle Button */}
                <button
                    className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-2 border-indigo-600 text-indigo-600 flex items-center justify-center transition-all duration-200 hover:bg-indigo-600 hover:text-white hover:scale-110 shadow-md"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                        {isSidebarOpen ? (
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                    </svg>
                </button>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 min-h-screen ${isSidebarOpen ? 'ml-70' : 'ml-20'}`}>
                <div className="min-h-screen">
                    {children}
                </div>
            </main>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowLogoutModal(false)}>
                    <div className="bg-white p-10 rounded-3xl max-w-md w-11/12 shadow-2xl animate-slide-up text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="w-22 h-22 mx-auto mb-6 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center border-4 border-red-200">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                                <path d="M16 17l5-5-5-5M21 12H9" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Confirm Sign Out</h2>
                        <p className="text-gray-600 text-base mb-8 leading-relaxed">Are you sure you want to sign out of your account?</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                className="px-8 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 min-w-[120px]"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-br from-red-600 to-red-700 text-white hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200 min-w-[120px]"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
