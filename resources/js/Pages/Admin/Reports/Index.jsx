import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Reports() {
    return (
        <AuthenticatedLayout>
            <Head title="Reports" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Reports & Analytics
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Reports page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
