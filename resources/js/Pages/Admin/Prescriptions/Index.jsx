import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Prescriptions() {
    return (
        <AuthenticatedLayout>
            <Head title="Prescriptions" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Prescriptions Management
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Prescriptions page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
