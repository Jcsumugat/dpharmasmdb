import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Orders() {
    return (
        <AuthenticatedLayout>
            <Head title="Orders" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Orders Management
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Orders page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
