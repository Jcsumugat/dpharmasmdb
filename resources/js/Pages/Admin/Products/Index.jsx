import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Products() {
    return (
        <AuthenticatedLayout>
            <Head title="Products" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Products Management
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Products page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
