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
                    <div className="logo-container">
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v8.55c0 4.55-3.08 8.8-8 9.93-4.92-1.13-8-5.38-8-9.93V7.78l8-3.6zM11 11v6h2v-6h-2zm0-4v2h2V7h-2z"/>
                            </svg>
                        </div>
                        {isSidebarOpen && (
                            <div className="logo-text">
                                <span className="brand-name">MJ's Pharmacy</span>
                                <span className="brand-tagline">Healthcare Management</span>
                            </div>
                        )}
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
                                {isActive(item.href) && <div className="active-indicator"></div>}
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
                    <button
                        className="logout-btn"
                        onClick={() => setShowLogoutModal(true)}
                        title={!isSidebarOpen ? "Sign Out" : ""}
                    >
                        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {isSidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>

                <button
                    className="sidebar-toggle"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        {isSidebarOpen ? (
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        ) : (
                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        )}
                    </svg>
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
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M16 17l5-5-5-5M21 12H9" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2>Confirm Sign Out</h2>
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

            <style>{`
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #F0F4FF 0%, #E8F0FE 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Helvetica Neue', sans-serif;
                }

                /* Sidebar Styles */
                .sidebar {
                    position: fixed;
                    left: 0;
                    top: 0;
                    height: 100vh;
                    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
                    box-shadow: 4px 0 24px rgba(102, 126, 234, 0.15);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .sidebar.open {
                    width: 280px;
                }

                .sidebar.closed {
                    width: 80px;
                }

                .sidebar-header {
                    padding: 2rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(255, 255, 255, 0.05);
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .logo-icon {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .brand-name {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: white;
                    letter-spacing: -0.025em;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .brand-tagline {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.85);
                    font-weight: 500;
                    letter-spacing: 0.05em;
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 1.5rem 1rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .sidebar-nav::-webkit-scrollbar {
                    width: 6px;
                }

                .sidebar-nav::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }

                .sidebar-nav::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }

                .sidebar-nav::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .nav-section {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .nav-section-title {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.6);
                    letter-spacing: 0.1em;
                    margin-bottom: 0.5rem;
                    padding: 0 0.75rem;
                    text-transform: uppercase;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    padding: 0.875rem 1rem;
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.85);
                    text-decoration: none;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    font-size: 0.9375rem;
                    position: relative;
                    cursor: pointer;
                }

                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                    transform: translateX(4px);
                }

                .nav-item.active {
                    background: rgba(255, 255, 255, 0.25);
                    color: white;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(10px);
                }

                .nav-item.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 4px;
                    height: 60%;
                    background: white;
                    border-radius: 0 4px 4px 0;
                }

                .nav-icon {
                    font-size: 1.375rem;
                    min-width: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .nav-text {
                    white-space: nowrap;
                    flex: 1;
                }

                .sidebar-footer {
                    padding: 1.5rem 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(0, 0, 0, 0.05);
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    padding: 0.875rem;
                    margin-bottom: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }

                .user-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.125rem;
                    flex-shrink: 0;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .user-info {
                    flex: 1;
                    min-width: 0;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.9375rem;
                    color: white;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .user-role {
                    font-size: 0.8125rem;
                    color: rgba(255, 255, 255, 0.75);
                    text-transform: capitalize;
                }

                .logout-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                    padding: 0.875rem 1rem;
                    background: rgba(220, 38, 38, 0.15);
                    border: 1.5px solid rgba(220, 38, 38, 0.3);
                    color: #FEE2E2;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 600;
                    font-size: 0.9375rem;
                }

                .logout-btn:hover {
                    background: rgba(220, 38, 38, 0.25);
                    border-color: rgba(220, 38, 38, 0.5);
                    transform: translateY(-2px);
                    color: white;
                }

                .sidebar-toggle {
                    position: absolute;
                    right: -14px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid #667eea;
                    color: #667eea;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
                }

                .sidebar-toggle:hover {
                    background: #667eea;
                    color: white;
                    transform: translateY(-50%) scale(1.1);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(8px);
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
                    padding: 2.5rem;
                    border-radius: 20px;
                    max-width: 440px;
                    width: 90%;
                    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-align: center;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(30px) scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }

                .modal-icon {
                    width: 88px;
                    height: 88px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 4px solid #FECACA;
                }

                .modal h2 {
                    font-size: 1.625rem;
                    color: #111827;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                    letter-spacing: -0.025em;
                }

                .modal p {
                    color: #6B7280;
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .btn {
                    padding: 0.875rem 2rem;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    font-size: 1rem;
                    min-width: 120px;
                }

                .btn-secondary {
                    background: #F3F4F6;
                    color: #374151;
                }

                .btn-secondary:hover {
                    background: #E5E7EB;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .btn-danger {
                    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
                    color: white;
                }

                .btn-danger:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(220, 38, 38, 0.4);
                }

                @media (max-width: 768px) {
                    .sidebar {
                        transform: translateX(-100%);
                    }

                    .sidebar.open {
                        transform: translateX(0);
                        width: 280px;
                    }

                    .main-content {
                        margin-left: 0 !important;
                    }

                    .sidebar-toggle {
                        right: -40px;
                    }

                    .content-wrapper {
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}
