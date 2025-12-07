import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    ArrowLeft,
    Send,
    Paperclip,
    Image as ImageIcon,
    File,
    X,
    Loader2,
    CheckCheck,
    Check,
    Download
} from 'lucide-react';

export default function ConversationDetail() {
    const { conversation: initialConversation } = usePage().props;
    const [conversation, setConversation] = useState(initialConversation);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(!initialConversation);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadConversation();

        // Poll for new messages every 3 seconds
        const interval = setInterval(loadConversation, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadConversation = async () => {
        try {
            const pathParts = window.location.pathname.split('/');
            const conversationId = pathParts[pathParts.length - 1];

            const response = await fetch(route('customer.api.conversations.show', conversationId));
            const data = await response.json();

            if (data.success) {
                setConversation(data.conversation);
                setMessages(data.conversation.messages || []);

                // Mark as read
                markAsRead(conversationId);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (conversationId) => {
        try {
            await fetch(route('customer.api.conversations.mark-read', conversationId), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() && attachments.length === 0) return;

        setSending(true);

        try {
            const formData = new FormData();
            formData.append('message', newMessage);

            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const pathParts = window.location.pathname.split('/');
            const conversationId = pathParts[pathParts.length - 1];

            const response = await fetch(route('customer.api.conversations.send-message', conversationId), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setNewMessage('');
                setAttachments([]);
                loadConversation();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setAttachments([...attachments, ...files]);
    };

    const removeAttachment = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};

        messages.forEach(message => {
            const date = formatDate(message.timestamp);
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
        });

        return groups;
    };

    if (loading || !conversation) {
        return (
            <CustomerLayout>
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-12">
                            <div className="flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                                <p className="text-gray-600">Loading conversation...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.visit(route('customer.conversations'))}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <h1 className="text-lg font-semibold text-gray-900">
                                    {conversation.title}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {conversation.status === 'active' ? 'Active conversation' : `Status: ${conversation.status}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="h-[calc(100vh-16rem)] overflow-y-auto p-4 space-y-6">
                        {Object.entries(messageGroups).map(([date, msgs]) => (
                            <div key={date}>
                                {/* Date Separator */}
                                <div className="flex items-center justify-center my-4">
                                    <div className="px-3 py-1 bg-gray-100 rounded-full">
                                        <span className="text-xs font-medium text-gray-600">{date}</span>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="space-y-4">
                                    {msgs.map((message, idx) => {
                                        const isCustomer = message.sender_type === 'customer';

                                        return (
                                            <div
                                                key={message._id || idx}
                                                className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[70%] ${isCustomer ? 'order-2' : 'order-1'}`}>
                                                    {/* Message bubble */}
                                                    <div className={`rounded-2xl px-4 py-2 ${
                                                        isCustomer
                                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                                                    }`}>
                                                        {/* Sender name for admin messages */}
                                                        {!isCustomer && (
                                                            <p className="text-xs font-medium text-gray-500 mb-1">
                                                                Support Team
                                                            </p>
                                                        )}

                                                        {/* Message text */}
                                                        {message.message && (
                                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                                {message.message}
                                                            </p>
                                                        )}

                                                        {/* Attachments */}
                                                        {message.attachments && message.attachments.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                {message.attachments.map((attachment, attIdx) => (
                                                                    <a
                                                                        key={attIdx}
                                                                        href={`/storage/${attachment.file_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 p-2 rounded-lg ${
                                                                            isCustomer
                                                                                ? 'bg-blue-700 hover:bg-blue-800'
                                                                                : 'bg-gray-50 hover:bg-gray-100'
                                                                        }`}
                                                                    >
                                                                        <File className="w-4 h-4 flex-shrink-0" />
                                                                        <span className="text-xs truncate flex-1">
                                                                            {attachment.file_name}
                                                                        </span>
                                                                        <Download className="w-4 h-4 flex-shrink-0" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Time and read status */}
                                                        <div className={`flex items-center gap-1 mt-1 ${
                                                            isCustomer ? 'justify-end' : 'justify-start'
                                                        }`}>
                                                            <span className={`text-xs ${
                                                                isCustomer ? 'text-blue-100' : 'text-gray-500'
                                                            }`}>
                                                                {formatTime(message.timestamp)}
                                                            </span>
                                                            {isCustomer && (
                                                                message.is_read ? (
                                                                    <CheckCheck className="w-3 h-3 text-blue-100" />
                                                                ) : (
                                                                    <Check className="w-3 h-3 text-blue-100" />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="bg-white border-t border-gray-200 p-4">
                        {/* Attachments Preview */}
                        {attachments.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {attachments.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                                    >
                                        <File className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-700 max-w-xs truncate">
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={() => removeAttachment(index)}
                                            className="p-1 hover:bg-gray-200 rounded"
                                        >
                                            <X className="w-3 h-3 text-gray-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input Form */}
                        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>

                            <div className="flex-1">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Type your message..."
                                    rows={1}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    style={{ minHeight: '48px', maxHeight: '120px' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={(!newMessage.trim() && attachments.length === 0) || sending}
                                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {sending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </form>

                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Press Enter to send, Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
