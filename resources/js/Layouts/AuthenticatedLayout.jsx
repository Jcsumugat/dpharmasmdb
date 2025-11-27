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
        { name: 'Products', href: 'admin.products', icon: '💊' },
        { name: 'Orders', href: 'admin.orders', icon: '📦' },
        { name: 'Prescriptions', href: 'admin.prescriptions', icon: '📋' },
        { name: 'Customers', href: 'admin.customers', icon: '👥' },
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
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-container">
                            <div className="logo-icon">+</div>
                            {isSidebarOpen && (
                                <div className="logo-text">
                                    <span className="brand-name">MJ's Pharmacy</span>
                                    <span className="brand-tagline">Healthcare Excellence</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {isSidebarOpen && <span className="nav-section-title">MAIN MENU</span>}
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={route(item.href)}
                                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {isSidebarOpen && <span className="nav-text">{item.name}</span>}
                            </Link>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            <span>{auth.user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        {isSidebarOpen && (
                            <div className="user-info">
                                <p className="user-name">{auth.user.name}</p>
                                <p className="user-role">{auth.user.role}</p>
                            </div>
                        )}
                    </div>
                    {isSidebarOpen && (
                        <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
                            <span>Sign Out</span>
                        </button>
                    )}
                </div>

                <button
                    className="sidebar-toggle"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <span>{isSidebarOpen ? '←' : '→'}</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <div className="content-wrapper">
                    {children}
                </div>
            </main>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M16 17l5-5-5-5M21 12H9" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2>Sign Out</h2>
                        <p>Are you sure you want to sign out of your account?</p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                * {
                    box-sizing: border-box;
                }

                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    background: #F8FAFC;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                }

                /* Sidebar Styles */
                .sidebar {
                    position: fixed;
                    left: 0;
                    top: 0;
                    height: 100vh;
                    background: #FFFFFF;
                    border-right: 1px solid #E5E7EB;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                }

                .sidebar.open {
                    width: 280px;
                }

                .sidebar.closed {
                    width: 80px;
                }

                .sidebar-header {
                    padding: 2rem 1.5rem;
                    border-bottom: 1px solid #F3F4F6;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .logo-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .brand-name {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #111827;
                    letter-spacing: -0.025em;
                }

                .brand-tagline {
                    font-size: 0.75rem;
                    color: #6B7280;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 1.5rem 1rem;
                    overflow-y: auto;
                }

                .sidebar-nav::-webkit-scrollbar {
                    width: 6px;
                }

                .sidebar-nav::-webkit-scrollbar-track {
                    background: transparent;
                }

                .sidebar-nav::-webkit-scrollbar-thumb {
                    background: #E5E7EB;
                    border-radius: 10px;
                }

                .sidebar-nav::-webkit-scrollbar-thumb:hover {
                    background: #D1D5DB;
                }

                .nav-section {
                    display: flex;
                    flex-direction: column;
                }

                .nav-section-title {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    color: #9CA3AF;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.75rem;
                    padding: 0 0.75rem;
                    text-transform: uppercase;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    padding: 0.875rem 1rem;
                    margin-bottom: 0.25rem;
                    border-radius: 10px;
                    color: #6B7280;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    font-size: 0.9375rem;
                    position: relative;
                }

                .nav-item:hover {
                    background: #F3F4F6;
                    color: #111827;
                }

                .nav-item.active {
                    background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
                }

                .nav-icon {
                    font-size: 1.25rem;
                    min-width: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .nav-text {
                    white-space: nowrap;
                }

                .sidebar-footer {
                    padding: 1.5rem 1rem;
                    border-top: 1px solid #F3F4F6;
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    padding: 0.875rem;
                    margin-bottom: 0.75rem;
                    background: #F9FAFB;
                    border-radius: 12px;
                    border: 1px solid #F3F4F6;
                }

                .user-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.125rem;
                    flex-shrink: 0;
                    color: white;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
                }

                .user-info {
                    flex: 1;
                    min-width: 0;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.9375rem;
                    margin: 0;
                    color: #111827;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .user-role {
                    font-size: 0.8125rem;
                    color: #6B7280;
                    margin: 0;
                    text-transform: capitalize;
                }

                .logout-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                    padding: 0.875rem 1rem;
                    background: white;
                    border: 1.5px solid #FEE2E2;
                    color: #DC2626;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 600;
                    font-size: 0.9375rem;
                }

                .logout-btn:hover {
                    background: #FEF2F2;
                    border-color: #FECACA;
                    transform: translateY(-1px);
                }

                .sidebar-toggle {
                    position: absolute;
                    right: -12px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid #E5E7EB;
                    color: #6B7280;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                }

                .sidebar-toggle:hover {
                    background: #F9FAFB;
                    border-color: #D1D5DB;
                    color: #111827;
                }

                /* Main Content Styles */
                .main-content {
                    flex: 1;
                    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    min-height: 100vh;
                }

                .main-content.sidebar-open {
                    margin-left: 280px;
                }

                .main-content.sidebar-closed {
                    margin-left: 80px;
                }

                .content-wrapper {
                    min-height: 100vh;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .modal {
                    background: white;
                    padding: 2rem;
                    border-radius: 16px;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s ease;
                    text-align: center;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .modal-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: #FEF2F2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.5rem;
                    color: #111827;
                    font-weight: 700;
                }

                .modal p {
                    margin: 0 0 2rem 0;
                    color: #6B7280;
                    font-size: 0.9375rem;
                    line-height: 1.6;
                }

                .modal-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                }

                .btn {
                    padding: 0.75rem 1.75rem;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    font-size: 0.9375rem;
                }

                .btn-secondary {
                    background: #F3F4F6;
                    color: #374151;
                }

                .btn-secondary:hover {
                    background: #E5E7EB;
                    transform: translateY(-1px);
                }

                .btn-danger {
                    background: #DC2626;
                    color: white;
                }

                .btn-danger:hover {
                    background: #B91C1C;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                }

                @media (max-width: 768px) {
                    .sidebar {
                        transform: translateX(-100%);
                    }

                    .sidebar.open {
                        transform: translateX(0);
                    }

                    .main-content {
                        margin-left: 0 !important;
                    }

                    .sidebar-toggle {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
