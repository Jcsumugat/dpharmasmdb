import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';

export default function AuthenticatedLayout({ children }) {
    const { auth } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        router.post(route('admin.logout'));
    };

    // Only show Dashboard for now - other routes will be added as pages are created
    const navigation = [
        { name: 'Dashboard', href: 'admin.dashboard', icon: '📊' },
    ];

    const isActive = (routeName) => {
        try {
            return route().current(routeName);
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
                        <span className="logo-icon">💊</span>
                        {isSidebarOpen && <span className="logo-text">MJ's Pharmacy</span>}
                    </div>
                    <button
                        className="toggle-btn"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? '‹' : '›'}
                    </button>
                </div>

                <nav className="sidebar-nav">
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
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            {auth.user.name.charAt(0).toUpperCase()}
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
                    >
                        <span className="logout-icon">🚪</span>
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
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
                        <h2>Logout Confirmation</h2>
                        <p>Are you sure you want to logout?</p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-cancel"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    background: #f8fafc;
                }

                /* Sidebar Styles */
                .sidebar {
                    position: fixed;
                    left: 0;
                    top: 0;
                    height: 100vh;
                    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    color: white;
                    transition: width 0.3s ease;
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
                }

                .sidebar.open {
                    width: 260px;
                }

                .sidebar.closed {
                    width: 80px;
                }

                .sidebar-header {
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .logo-icon {
                    font-size: 2rem;
                }

                .logo-text {
                    font-size: 1.25rem;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .toggle-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    transition: all 0.2s;
                }

                .toggle-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .sidebar-nav {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.875rem 1rem;
                    margin-bottom: 0.5rem;
                    border-radius: 8px;
                    color: rgba(255, 255, 255, 0.7);
                    text-decoration: none;
                    transition: all 0.2s;
                    font-weight: 500;
                }

                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                .nav-item.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .nav-icon {
                    font-size: 1.5rem;
                    min-width: 24px;
                }

                .nav-text {
                    white-space: nowrap;
                }

                .sidebar-footer {
                    padding: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.125rem;
                    flex-shrink: 0;
                }

                .user-info {
                    flex: 1;
                    min-width: 0;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.875rem;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .user-role {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin: 0;
                    text-transform: capitalize;
                }

                .logout-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.3);
                    border-color: rgba(239, 68, 68, 0.5);
                }

                .logout-icon {
                    font-size: 1.25rem;
                }

                /* Main Content Styles */
                .main-content {
                    flex: 1;
                    transition: margin-left 0.3s ease;
                }

                .main-content.sidebar-open {
                    margin-left: 260px;
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
                    backdrop-filter: blur(4px);
                }

                .modal {
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .modal h2 {
                    margin: 0 0 1rem 0;
                    font-size: 1.5rem;
                    color: #1e293b;
                }

                .modal p {
                    margin: 0 0 1.5rem 0;
                    color: #64748b;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }

                .btn {
                    padding: 0.625rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .btn-cancel {
                    background: #e2e8f0;
                    color: #475569;
                }

                .btn-cancel:hover {
                    background: #cbd5e1;
                }

                .btn-danger {
                    background: #ef4444;
                    color: white;
                }

                .btn-danger:hover {
                    background: #dc2626;
                }

                @media (max-width: 768px) {
                    .sidebar {
                        position: fixed;
                        transform: translateX(-100%);
                    }

                    .sidebar.open {
                        transform: translateX(0);
                    }

                    .main-content {
                        margin-left: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
