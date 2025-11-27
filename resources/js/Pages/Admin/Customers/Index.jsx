import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Customers() {
    return (
        <AuthenticatedLayout>
            <Head title="Customers" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Customers Management
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Customers page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
