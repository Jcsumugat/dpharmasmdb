import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    MessageSquare,
    Search,
    Plus,
    Clock,
    CheckCheck,
    Loader2,
    AlertCircle,
    FileText,
    Package,
    HelpCircle,
    ShoppingBag
} from 'lucide-react';

export default function ConversationsIndex() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [newConversationType, setNewConversationType] = useState('general_support');
    const [newConversationTitle, setNewConversationTitle] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadConversations();

        // Poll for new messages every 10 seconds
        const interval = setInterval(loadConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadConversations = async () => {
        try {
            const response = await fetch(route('customer.api.conversations.index'));
            const data = await response.json();

            if (data.success) {
                setConversations(Array.isArray(data.conversations) ? data.conversations : []);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateConversation = async (e) => {
        e.preventDefault();
        setCreating(true);

        try {
            const response = await fetch(route('customer.api.conversations.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    type: newConversationType,
                    title: newConversationTitle || getDefaultTitle(newConversationType),
                })
            });

            const data = await response.json();

            if (data.success) {
                router.visit(route('customer.conversations.detail', data.conversation.id || data.conversation._id));
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
            alert('Failed to start conversation. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const getDefaultTitle = (type) => {
        const titles = {
            prescription_inquiry: 'Prescription Inquiry',
            order_concern: 'Order Concern',
            general_support: 'General Support',
            complaint: 'Complaint',
            product_inquiry: 'Product Inquiry'
        };
        return titles[type] || 'New Conversation';
    };

    const getTypeIcon = (type) => {
        const icons = {
            prescription_inquiry: FileText,
            order_concern: Package,
            general_support: HelpCircle,
            complaint: AlertCircle,
            product_inquiry: ShoppingBag
        };
        return icons[type] || MessageSquare;
    };

    const getTypeBadge = (type) => {
        const badges = {
            prescription_inquiry: { color: 'bg-blue-100 text-blue-800', label: 'Prescription' },
            order_concern: { color: 'bg-purple-100 text-purple-800', label: 'Order' },
            general_support: { color: 'bg-green-100 text-green-800', label: 'Support' },
            complaint: { color: 'bg-red-100 text-red-800', label: 'Complaint' },
            product_inquiry: { color: 'bg-yellow-100 text-yellow-800', label: 'Product' }
        };
        return badges[type] || badges.general_support;
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { color: 'bg-green-100 text-green-800', label: 'Active' },
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
            resolved: { color: 'bg-gray-100 text-gray-800', label: 'Resolved' },
            closed: { color: 'bg-gray-100 text-gray-600', label: 'Closed' }
        };
        return badges[status] || badges.pending;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getLastMessage = (conversation) => {
        const messages = conversation.messages || [];
        if (messages.length === 0) return null;
        return messages[messages.length - 1];
    };

    const getUnreadCount = (conversation) => {
        const messages = conversation.messages || [];
        return messages.filter(m => !m.is_read && m.sender_type === 'admin').length;
    };

    const filteredConversations = conversations.filter(conv => {
        const searchLower = searchQuery.toLowerCase();
        return (
            conv.title?.toLowerCase().includes(searchLower) ||
            conv.type?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                                <p className="text-gray-500 mt-2">Chat with our support team</p>
                            </div>
                            <button
                                onClick={() => setShowNewConversation(!showNewConversation)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                New Message
                            </button>
                        </div>
                    </div>

                    {/* New Conversation Form */}
                    {showNewConversation && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Conversation</h2>
                            <form onSubmit={handleCreateConversation} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Topic
                                    </label>
                                    <select
                                        value={newConversationType}
                                        onChange={(e) => setNewConversationType(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="general_support">General Support</option>
                                        <option value="prescription_inquiry">Prescription Inquiry</option>
                                        <option value="order_concern">Order Concern</option>
                                        <option value="product_inquiry">Product Inquiry</option>
                                        <option value="complaint">Complaint</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subject (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newConversationTitle}
                                        onChange={(e) => setNewConversationTitle(e.target.value)}
                                        placeholder={getDefaultTitle(newConversationType)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {creating ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating...
                                            </span>
                                        ) : (
                                            'Start Conversation'
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewConversation(false)}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Search */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Conversations List */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                    <p className="text-gray-600">Loading conversations...</p>
                                </div>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <MessageSquare className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No conversations yet
                                    </h3>
                                    <p className="text-gray-500 text-center mb-6">
                                        Start a conversation with our support team
                                    </p>
                                    <button
                                        onClick={() => setShowNewConversation(true)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Start Conversation
                                    </button>
                                </div>
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const TypeIcon = getTypeIcon(conversation.type);
                                const typeBadge = getTypeBadge(conversation.type);
                                const statusBadge = getStatusBadge(conversation.status);
                                const lastMessage = getLastMessage(conversation);
                                const unreadCount = getUnreadCount(conversation);

                                return (
                                    <div
                                        key={conversation.id || conversation._id}
                                        onClick={() => router.visit(route('customer.conversations.detail', conversation.id || conversation._id))}
                                        className={`bg-white rounded-xl border transition-all cursor-pointer ${
                                            unreadCount > 0
                                                ? 'border-blue-200 bg-blue-50/50 hover:shadow-md'
                                                : 'border-gray-200 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="p-6">
                                            <div className="flex gap-4">
                                                {/* Icon */}
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${typeBadge.color}`}>
                                                    <TypeIcon className="w-6 h-6" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex-1">
                                                            <h3 className={`font-semibold ${unreadCount > 0 ? 'text-blue-900' : 'text-gray-900'}`}>
                                                                {conversation.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge.color}`}>
                                                                    {typeBadge.label}
                                                                </span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.color}`}>
                                                                    {statusBadge.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className="text-xs text-gray-500">
                                                                {formatDate(conversation.last_message_at)}
                                                            </span>
                                                            {unreadCount > 0 && (
                                                                <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                                                                    {unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {lastMessage && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            {lastMessage.sender_type === 'admin' && (
                                                                <span className="font-medium">Support:</span>
                                                            )}
                                                            <p className="truncate">
                                                                {lastMessage.message || 'Attachment sent'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
