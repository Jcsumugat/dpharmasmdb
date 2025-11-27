import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Conversations() {
    return (
        <AuthenticatedLayout>
            <Head title="Conversations" />

            <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Conversations
                </h1>
                <p style={{ color: '#6B7280' }}>
                    Conversations page coming soon...
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
