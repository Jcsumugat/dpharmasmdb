import { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ConversationsIndex() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        type: ''
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0
    });
    const [messageInput, setMessageInput] = useState('');
    const [isInternalNote, setIsInternalNote] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchConversations();
    }, [filters.status, filters.type, pagination.current_page]);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.id || selectedConversation._id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.current_page,
                ...(filters.status && { status: filters.status }),
                ...(filters.type && { type: filters.type })
            });

            const response = await fetch(`/admin/api/conversations?${params}`);
            const data = await response.json();

            if (data.success) {
                setConversations(data.conversations.data || []);
                setPagination({
                    current_page: data.conversations.current_page,
                    last_page: data.conversations.last_page,
                    per_page: data.conversations.per_page,
                    total: data.conversations.total
                });
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId) => {
        setMessagesLoading(true);
        try {
            const response = await fetch(`/admin/api/conversations/${conversationId}`);
            const data = await response.json();

            if (data.success) {
                setMessages(data.conversation.messages || []);
                await markAsRead(conversationId);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const markAsRead = async (conversationId) => {
        try {
            await fetch(`/admin/api/conversations/${conversationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                }
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setMessages([]);
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && attachments.length === 0) return;
        if (!selectedConversation) return;

        setSendingMessage(true);
        try {
            const formData = new FormData();
            formData.append('message', messageInput);
            formData.append('is_internal_note', isInternalNote ? 'true' : 'false');

            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const conversationId = selectedConversation.id || selectedConversation._id;
            console.log('Sending message to:', `/admin/api/conversations/${conversationId}/messages`);

            const response = await fetch(`/admin/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: formData
            });

            console.log('Response status:', response.status);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 500));
                alert('Server error. Check console for details.');
                return;
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                setMessageInput('');
                setAttachments([]);
                setIsInternalNote(false);
                fetchMessages(conversationId);
                fetchConversations();
            } else {
                alert(data.message || data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateStatus = async () => {
        if (!selectedConversation || !newStatus) return;

        try {
            const conversationId = selectedConversation.id || selectedConversation._id;
            const response = await fetch(`/admin/api/conversations/${conversationId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                setShowStatusModal(false);
                fetchMessages(conversationId);
                fetchConversations();
                alert('Status updated successfully');
            } else {
                alert(data.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-green-100 text-green-800 border-green-200',
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            resolved: 'bg-blue-100 text-blue-800 border-blue-200',
            closed: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getTypeBadge = (type) => {
        const badges = {
            prescription_inquiry: 'bg-purple-100 text-purple-800',
            order_concern: 'bg-orange-100 text-orange-800',
            general_support: 'bg-blue-100 text-blue-800',
            complaint: 'bg-red-100 text-red-800',
            product_inquiry: 'bg-indigo-100 text-indigo-800'
        };
        return badges[type] || 'bg-gray-100 text-gray-800';
    };

    const getTypeLabel = (type) => {
        const labels = {
            prescription_inquiry: 'Prescription',
            order_concern: 'Order',
            general_support: 'Support',
            complaint: 'Complaint',
            product_inquiry: 'Product'
        };
        return labels[type] || type;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatMessageTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Conversations" />

            <div className="h-[calc(100vh-4rem)] flex">
                {/* Conversations List */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
                        <p className="text-sm text-gray-600">{pagination.total} total</p>
                    </div>

                    <div className="p-4 border-b border-gray-200 space-y-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Types</option>
                            <option value="prescription_inquiry">Prescription</option>
                            <option value="order_concern">Order</option>
                            <option value="general_support">Support</option>
                            <option value="complaint">Complaint</option>
                            <option value="product_inquiry">Product</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center py-20 px-4">
                                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-gray-500 text-sm">No conversations</p>
                            </div>
                        ) : (
                            conversations.map((conversation) => (
                                <div
                                    key={conversation.id || conversation._id}
                                    onClick={() => handleSelectConversation(conversation)}
                                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${(selectedConversation?.id || selectedConversation?._id) === (conversation.id || conversation._id) ? 'bg-indigo-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0">
                                            {conversation.customer?.first_name?.charAt(0).toUpperCase() || conversation.customer?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {conversation.customer?.first_name && conversation.customer?.last_name
                                                        ? `${conversation.customer.first_name} ${conversation.customer.last_name}`
                                                        : conversation.customer?.name || 'Unknown'}
                                                </p>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(conversation.last_message_at)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate mb-2">
                                                {conversation.title}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeBadge(conversation.type)}`}>
                                                    {getTypeLabel(conversation.type)}
                                                </span>
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadge(conversation.status)}`}>
                                                    {conversation.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {!loading && conversations.length > 0 && pagination.last_page > 1 && (
                        <div className="p-4 border-t border-gray-200 flex justify-between">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                                disabled={pagination.current_page === 1}
                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                                disabled={pagination.current_page === pagination.last_page}
                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {selectedConversation ? (
                        <>
                            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                                        {selectedConversation.customer?.first_name?.charAt(0).toUpperCase() || selectedConversation.customer?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">
                                            {selectedConversation.customer?.first_name && selectedConversation.customer?.last_name
                                                ? `${selectedConversation.customer.first_name} ${selectedConversation.customer.last_name}`
                                                : selectedConversation.customer?.name || 'Unknown'}
                                        </h3>
                                        <p className="text-xs text-gray-600">{selectedConversation.customer?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewStatus(selectedConversation.status);
                                        setShowStatusModal(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                                >
                                    Update Status
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-gray-500">No messages yet</p>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((message, index) => {
                                            const isAdmin = message.sender_type === 'admin';
                                            const isSystem = message.sender_type === 'system';
                                            const isInternal = message.is_internal_note;

                                            // Generate a unique key - handle both string and ObjectId
                                            let messageKey;
                                            if (message._id) {
                                                if (typeof message._id === 'string') {
                                                    messageKey = message._id;
                                                } else if (message._id.$oid) {
                                                    messageKey = message._id.$oid;
                                                } else if (message._id.toString && message._id.toString() !== '[object Object]') {
                                                    messageKey = message._id.toString();
                                                } else {
                                                    messageKey = `msg-${index}-${message.timestamp || Date.now()}`;
                                                }
                                            } else if (message.id) {
                                                messageKey = String(message.id);
                                            } else {
                                                messageKey = `msg-${index}-${message.timestamp || Date.now()}`;
                                            }

                                            return (
                                                <div
                                                    key={messageKey}
                                                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[70%]`}>
                                                        {isInternal && (
                                                            <div className="text-xs text-yellow-600 mb-1 font-medium">
                                                                Internal Note
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`rounded-2xl px-4 py-2 ${isInternal
                                                                ? 'bg-yellow-100 border-2 border-yellow-300'
                                                                : isAdmin
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'bg-white border border-gray-200'
                                                                }`}
                                                        >
                                                            <p className={`text-sm ${isAdmin && !isInternal ? 'text-white' : 'text-gray-900'}`}>
                                                                {message.message}
                                                            </p>
                                                            {message.attachments && message.attachments.length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {message.attachments.map((attachment, i) => (
                                                                        <a
                                                                            key={i}
                                                                            href={`/storage/${attachment.file_path}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={`block text-xs underline ${isAdmin && !isInternal ? 'text-white' : 'text-indigo-600'
                                                                                }`}
                                                                        >
                                                                            📎 {attachment.file_name}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`text-xs text-gray-500 mt-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
                                                            {formatMessageTime(message.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            <div className="bg-white border-t border-gray-200 p-4">
                                <div className="space-y-3">
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((file, index) => (
                                                <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                    <span className="text-sm text-gray-700">{file.name}</span>
                                                    <button
                                                        onClick={() => removeAttachment(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            multiple
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                        >
                                            📎
                                        </button>
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type your message..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={sendingMessage || (!messageInput.trim() && attachments.length === 0)}
                                            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {sendingMessage ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={isInternalNote}
                                            onChange={(e) => setIsInternalNote(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-gray-700">Send as internal note (not visible to customer)</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showStatusModal && selectedConversation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Update Conversation Status</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
