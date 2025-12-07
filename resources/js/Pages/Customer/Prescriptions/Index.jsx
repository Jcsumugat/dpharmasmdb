import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    FileText, Upload, Eye, Clock, CheckCircle, XCircle, Package,
    Calendar, Plus, AlertCircle, X, Loader2, QrCode as QrCodeIcon,
    ShoppingCart, Minus, Trash2, Search, DollarSign, Phone, MapPin,
    CreditCard, TrendingUp, Filter
} from 'lucide-react';
import CryptoJS from 'crypto-js';

export default function Index({ auth }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        order_type: 'all',
        page: 1
    });

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        order_type: 'prescription',
        mobile_number: '',
        notes: '',
        prescription_file: null
    });
    const [uploadLoading, setUploadLoading] = useState(false);
    const [fileHash, setFileHash] = useState(null);
    const [duplicateCheck, setDuplicateCheck] = useState({
        checking: false,
        isDuplicate: false,
        confirmed: false,
        message: '',
        details: null
    });

    // Cart state for pre-selecting medicines
    const [cart, setCart] = useState([]);
    const [showCartSection, setShowCartSection] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        fetchPrescriptions();
    }, [filters]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: filters.status,
                order_type: filters.order_type,
                page: filters.page,
                per_page: 10
            });

            const response = await fetch(`/customer/api/prescriptions?${params}`);
            const data = await response.json();

            if (data.success) {
                setPrescriptions(data.prescriptions);
            }
        } catch (error) {
            console.error('Failed to fetch prescriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Search products
    const searchProducts = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(`/customer/api/products?search=${encodeURIComponent(query)}&per_page=10`);
            const data = await response.json();

            if (data.success && data.products) {
                setSearchResults(data.products.data || []);
            }
        } catch (error) {
            console.error('Product search failed:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (productSearch) {
                searchProducts(productSearch);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearch]);

    // Add to cart
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.product_id === product._id || item.product_id === product.id);

        if (existingItem) {
            setCart(cart.map(item =>
                (item.product_id === product._id || item.product_id === product.id)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                product_id: product._id || product.id,
                product_name: product.product_name,
                brand_name: product.brand_name,
                generic_name: product.generic_name || '',
                quantity: 1,
                unit_price: product.selling_price || 0,
                unit: product.display_unit || product.unit || 'piece',
                unit_quantity: product.display_unit_quantity || product.unit_quantity || 1,
                form_type: product.form_type || 'piece'
            }]);
        }
        setProductSearch('');
        setSearchResults([]);
    };

    // Update cart item quantity
    const updateCartQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    // Remove from cart
    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    // Calculate file MD5 hash
    const calculateFileHash = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                    const hash = CryptoJS.MD5(wordArray).toString();
                    resolve(hash);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    // Check for duplicates
    const checkDuplicate = async (hash) => {
        try {
            const response = await fetch('/customer/api/prescriptions/quick-duplicate-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ file_hash: hash })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Duplicate check failed:', error);
            return { is_duplicate: false };
        }
    };

    // Handle file selection
    const handleFileChange = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            resetFileState();
            return;
        }

        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('File size must be less than 5MB');
            e.target.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload only JPG, PNG, or PDF files');
            e.target.value = '';
            return;
        }

        setUploadForm(prev => ({ ...prev, prescription_file: file }));
        setDuplicateCheck(prev => ({ ...prev, checking: true }));

        try {
            const hash = await calculateFileHash(file);
            setFileHash(hash);

            const duplicateResult = await checkDuplicate(hash);

            if (duplicateResult.is_duplicate) {
                setDuplicateCheck({
                    checking: false,
                    isDuplicate: true,
                    confirmed: false,
                    message: duplicateResult.message,
                    details: duplicateResult.details
                });
            } else {
                setDuplicateCheck({
                    checking: false,
                    isDuplicate: false,
                    confirmed: false,
                    message: '',
                    details: null
                });
            }
        } catch (error) {
            console.error('File processing failed:', error);
            setDuplicateCheck({
                checking: false,
                isDuplicate: false,
                confirmed: false,
                message: '',
                details: null
            });
        }
    };

    const resetFileState = () => {
        setUploadForm(prev => ({ ...prev, prescription_file: null }));
        setFileHash(null);
        setDuplicateCheck({
            checking: false,
            isDuplicate: false,
            confirmed: false,
            message: '',
            details: null
        });
    };

    // Handle upload submission
    const handleUploadSubmit = async (e) => {
        e.preventDefault();

        if (!uploadForm.prescription_file) {
            alert('Please select a file to upload');
            return;
        }

        if (duplicateCheck.isDuplicate && !duplicateCheck.confirmed) {
            alert('Please confirm the duplicate upload by clicking "Upload Anyway"');
            return;
        }

        setUploadLoading(true);

        try {
            const formData = new FormData();
            formData.append('order_type', uploadForm.order_type);
            formData.append('mobile_number', uploadForm.mobile_number);
            formData.append('notes', uploadForm.notes);
            formData.append('prescription_file', uploadForm.prescription_file);

            if (fileHash) {
                formData.append('file_hash', fileHash);
            }

            // Add cart items if any
            if (cart.length > 0) {
                formData.append('requested_items', JSON.stringify(cart));
            }

            const response = await fetch('/customer/api/prescriptions', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setShowUploadModal(false);
                setSuccessData(data);
                setShowSuccessModal(true);

                // Reset form
                setUploadForm({
                    order_type: 'prescription',
                    mobile_number: '',
                    notes: '',
                    prescription_file: null
                });
                resetFileState();
                setCart([]);
                setShowCartSection(false);

                // Refresh and auto-close after 8 seconds
                setTimeout(() => {
                    fetchPrescriptions();
                    setShowSuccessModal(false);
                }, 8000);
            } else {
                alert(data.message || 'Upload failed. Please try again.');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setUploadLoading(false);
        }
    };

    // View document
    const viewDocument = (prescriptionId) => {
        window.open(`/customer/api/prescriptions/${prescriptionId}/download`, '_blank');
    };

    // Calculate total for items
    const calculateTotal = (items) => {
        if (!items || items.length === 0) return 0;
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending Review' },
            approved: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, label: 'Approved' },
            completed: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' },
            declined: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Declined' },
            cancelled: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: XCircle, label: 'Cancelled' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {badge.label}
            </span>
        );
    };

    const getOrderStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending' },
            confirmed: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
            processing: { color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Processing' },
            ready_for_pickup: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Ready for Pickup' },
            completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed' },
            cancelled: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' }
        };

        const badge = badges[status] || badges.pending;

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
            paid: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, label: 'Paid' },
            failed: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Failed' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    const getOrderTypeBadge = (type) => {
        return type === 'prescription' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <FileText className="w-3.5 h-3.5" />
                Prescription
            </span>
        ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Package className="w-3.5 h-3.5" />
                Online Order
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <CustomerLayout>
            <Head title="My Prescriptions" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="max-w-7xl mx-auto p-6 lg:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                    My Prescriptions & Orders
                                </h1>
                                <p className="text-gray-600 text-sm lg:text-base">
                                    Track and manage your prescription orders in one place
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 font-semibold text-sm whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                                Upload New
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter className="w-4 h-4 text-gray-600" />
                            <h3 className="text-sm font-semibold text-gray-900">Filter Orders</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-gray-400"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="completed">Completed</option>
                                    <option value="declined">Declined</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Order Type
                                </label>
                                <select
                                    value={filters.order_type}
                                    onChange={(e) => setFilters(prev => ({ ...prev, order_type: e.target.value, page: 1 }))}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-gray-400"
                                >
                                    <option value="all">All Types</option>
                                    <option value="prescription">Prescription</option>
                                    <option value="online_order">Online Order</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Prescriptions List */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
                                <p className="text-gray-600 font-medium">Loading prescriptions...</p>
                            </div>
                        ) : prescriptions.data && prescriptions.data.length > 0 ? (
                            <>
                                {prescriptions.data.map((prescription) => {
                                    const prescriptionId = prescription._id || prescription.id;

                                    if (!prescriptionId) {
                                        console.error('Prescription missing id:', prescription);
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={prescriptionId}
                                            className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                                        >
                                            <div className="p-6">
                                                {/* Header Section */}
                                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                                            <h3 className="text-lg lg:text-xl font-bold text-gray-900">
                                                                {prescription.prescription_number}
                                                            </h3>
                                                            {getOrderTypeBadge(prescription.order_type)}
                                                            {getStatusBadge(prescription.status)}
                                                        </div>

                                                        {/* Meta Information */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                                    <Calendar className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-gray-500 font-medium">Submitted</p>
                                                                    <p className="font-semibold text-gray-900 truncate">
                                                                        {formatDate(prescription.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <div className="flex-shrink-0 w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                                                    <Phone className="w-4 h-4 text-green-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-gray-500 font-medium">Contact</p>
                                                                    <p className="font-semibold text-gray-900">
                                                                        {prescription.mobile_number}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <div className="flex-shrink-0 w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                                                    <FileText className="w-4 h-4 text-purple-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-gray-500 font-medium">Document</p>
                                                                    <p className="font-semibold text-gray-900 truncate text-xs">
                                                                        {prescription.original_filename}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex lg:flex-col gap-2 lg:w-40">
                                                        <Link
                                                            href={`/customer/prescriptions/${prescriptionId}`}
                                                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span className="hidden sm:inline">View Details</span>
                                                            <span className="sm:hidden">Details</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => viewDocument(prescriptionId)}
                                                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 text-sm font-semibold transition-all duration-200"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Document</span>
                                                            <span className="sm:hidden">File</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Order Information Section */}
                                                {prescription.order && (
                                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl p-4 mb-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="font-bold text-blue-900 flex items-center gap-2 text-sm">
                                                                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                                                    <Package className="w-3.5 h-3.5 text-white" />
                                                                </div>
                                                                Order Information
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                {getOrderStatusBadge(prescription.order.status)}
                                                                {getPaymentStatusBadge(prescription.order.payment_status)}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                            <div className="bg-white/70 backdrop-blur rounded-lg p-3">
                                                                <p className="text-xs text-blue-700 font-semibold mb-1 uppercase tracking-wide">Items</p>
                                                                <p className="text-lg font-bold text-blue-900">
                                                                    {prescription.items?.length || 0}
                                                                </p>
                                                            </div>
                                                            {prescription.items && prescription.items.length > 0 && (
                                                                <div className="bg-white/70 backdrop-blur rounded-lg p-3">
                                                                    <p className="text-xs text-blue-700 font-semibold mb-1 uppercase tracking-wide">Total Amount</p>
                                                                    <p className="text-lg font-bold text-blue-900 flex items-center gap-1">
                                                                        {formatCurrency(calculateTotal(prescription.items))}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {prescription.order.payment_method && (
                                                                <div className="bg-white/70 backdrop-blur rounded-lg p-3">
                                                                    <p className="text-xs text-blue-700 font-semibold mb-1 uppercase tracking-wide">Payment</p>
                                                                    <p className="text-sm font-bold text-blue-900 capitalize flex items-center gap-1">
                                                                        <CreditCard className="w-3.5 h-3.5" />
                                                                        {prescription.order.payment_method}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {prescription.order.completed_at && (
                                                                <div className="bg-white/70 backdrop-blur rounded-lg p-3">
                                                                    <p className="text-xs text-blue-700 font-semibold mb-1 uppercase tracking-wide">Completed</p>
                                                                    <p className="text-xs font-bold text-blue-900">
                                                                        {formatDate(prescription.order.completed_at)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pre-Selected Items Info */}
                                                {prescription.requested_items && prescription.requested_items.length > 0 && !prescription.items && (
                                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                                                <ShoppingCart className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-purple-900 mb-1">
                                                                    Pre-Selected Items ({prescription.requested_items.length})
                                                                </p>
                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                    <p className="text-xs text-purple-700 font-semibold">
                                                                        Estimated: {formatCurrency(calculateTotal(prescription.requested_items))}
                                                                    </p>
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                                                                        <Clock className="w-3 h-3" />
                                                                        Pending Verification
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Notes and Messages */}
                                                <div className="space-y-3">
                                                    {prescription.notes && (
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Your Note</p>
                                                            <p className="text-sm text-gray-800 leading-relaxed">
                                                                {prescription.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {prescription.admin_message && (
                                                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                                                    <AlertCircle className="w-4 h-4 text-white" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1">
                                                                        Pharmacy Message
                                                                    </p>
                                                                    <p className="text-sm text-amber-800 leading-relaxed">
                                                                        {prescription.admin_message}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Pagination */}
                                {prescriptions.last_page > 1 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <p className="text-sm text-gray-600 font-medium">
                                                Showing <span className="font-bold text-gray-900">{prescriptions.from}</span> to{' '}
                                                <span className="font-bold text-gray-900">{prescriptions.to}</span> of{' '}
                                                <span className="font-bold text-gray-900">{prescriptions.total}</span> orders
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                                    disabled={prescriptions.current_page === 1}
                                                    className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                                    disabled={prescriptions.current_page === prescriptions.last_page}
                                                    className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 text-center py-20">
                                <div className="max-w-md mx-auto px-6">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="w-10 h-10 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No prescriptions yet</h3>
                                    <p className="text-gray-600 mb-8 leading-relaxed">
                                        Upload your first prescription to get started with your order
                                    </p>
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-200"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Upload Prescription
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal - keeping existing */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-gray-900">Upload Prescription</h2>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setCart([]);
                                    setShowCartSection(false);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-6">
                            {/* Order Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Order Type
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${uploadForm.order_type === 'prescription'
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}>
                                        <input
                                            type="radio"
                                            value="prescription"
                                            checked={uploadForm.order_type === 'prescription'}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, order_type: e.target.value }))}
                                            className="sr-only"
                                        />
                                        <FileText className="w-8 h-8 text-purple-600 mb-2" />
                                        <span className="font-semibold">Prescription</span>
                                        <span className="text-sm text-gray-600">Doctor's prescription</span>
                                    </label>

                                    <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${uploadForm.order_type === 'online_order'
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}>
                                        <input
                                            type="radio"
                                            value="online_order"
                                            checked={uploadForm.order_type === 'online_order'}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, order_type: e.target.value }))}
                                            className="sr-only"
                                        />
                                        <Package className="w-8 h-8 text-indigo-600 mb-2" />
                                        <span className="font-semibold">Online Order</span>
                                        <span className="text-sm text-gray-600">Medicine list</span>
                                    </label>
                                </div>
                            </div>

                            {/* Mobile Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mobile Number *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="09123456789"
                                    value={uploadForm.mobile_number}
                                    onChange={(e) => setUploadForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Any additional information..."
                                    value={uploadForm.notes}
                                    onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Document (JPG, PNG, PDF) *
                                </label>
                                <input
                                    type="file"
                                    required
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                                <p className="mt-2 text-sm text-gray-600">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    Document will be securely encrypted
                                </p>

                                {/* File status displays */}
                                {duplicateCheck.checking && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                            <div>
                                                <p className="font-medium text-blue-900">Checking for duplicates...</p>
                                                <p className="text-sm text-blue-700">Please wait</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!duplicateCheck.checking && duplicateCheck.isDuplicate && !duplicateCheck.confirmed && (
                                    <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-yellow-900">Duplicate Detected</p>
                                                <p className="text-sm text-yellow-800 mt-1">{duplicateCheck.message}</p>
                                                {duplicateCheck.details && (
                                                    <div className="mt-2 text-sm text-yellow-700">
                                                        <p>Previous: {duplicateCheck.details.uploaded_at_human}</p>
                                                        <p>Order: {duplicateCheck.details.order_id}</p>
                                                    </div>
                                                )}
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDuplicateCheck(prev => ({ ...prev, confirmed: true }))}
                                                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                                                    >
                                                        Upload Anyway
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={resetFileState}
                                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {duplicateCheck.confirmed && (
                                    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-yellow-600" />
                                            <div>
                                                <p className="font-medium text-yellow-900">Duplicate Confirmed</p>
                                                <p className="text-sm text-yellow-800">Pharmacy will review</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!duplicateCheck.checking && !duplicateCheck.isDuplicate && uploadForm.prescription_file && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-green-900">File Verified</p>
                                                <p className="text-sm text-green-700">
                                                    {uploadForm.prescription_file.name} - {(uploadForm.prescription_file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Medicine Cart Section (Optional) - keep existing code */}
                            <div className="border-t pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCartSection(!showCartSection)}
                                    className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900">Pre-Select Medicines (Optional)</p>
                                            <p className="text-sm text-gray-600">Help us process your order faster by listing the medicines</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cart.length > 0 && (
                                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                                {cart.length}
                                            </span>
                                        )}
                                        <span className="text-gray-400">
                                            {showCartSection ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </button>

                                {showCartSection && (
                                    <div className="mt-4 space-y-4">
                                        {/* Product Search */}
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search for medicines (e.g., Biogesic, Amoxicillin)..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                                {searchLoading && (
                                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
                                                )}
                                            </div>

                                            {/* Search Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {searchResults.map((product) => (
                                                        <button
                                                            key={product._id || product.id}
                                                            type="button"
                                                            onClick={() => addToCart(product)}
                                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{product.product_name}</p>
                                                                    <p className="text-sm text-gray-600">{product.brand_name}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold text-blue-600">
                                                                        ₱{product.selling_price?.toFixed(2) || '0.00'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Stock: {product.stock_quantity || 0}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Cart Items */}
                                        {cart.length > 0 ? (
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-900">Selected Medicines ({cart.length})</h4>
                                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                                    {cart.map((item) => (
                                                        <div key={item.product_id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                                                <p className="text-sm text-gray-600">{item.brand_name}</p>
                                                                <p className="text-xs text-gray-500 mt-1">₱{item.unit_price.toFixed(2)} each</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateCartQuantity(item.product_id, -1)}
                                                                        className="p-2 hover:bg-gray-200 rounded-l-lg transition-colors"
                                                                    >
                                                                        <Minus className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                    <span className="px-3 font-semibold text-gray-900">{item.quantity}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateCartQuantity(item.product_id, 1)}
                                                                        className="p-2 hover:bg-gray-200 rounded-r-lg transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFromCart(item.product_id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <p className="text-sm text-blue-800">
                                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                                        <strong>Note:</strong> These are suggestions only. Our pharmacist will verify against your prescription and adjust as needed.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-600">No medicines selected yet</p>
                                                <p className="text-sm text-gray-500 mt-1">Search and add medicines above</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setCart([]);
                                        setShowCartSection(false);
                                    }}
                                    className="flex-1 px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadLoading || duplicateCheck.checking || (duplicateCheck.isDuplicate && !duplicateCheck.confirmed)}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {uploadLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Submit Order {cart.length > 0 && `(${cart.length} items)`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal - keep existing code */}
            {showSuccessModal && successData && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl max-w-md w-full p-8 text-white text-center shadow-2xl">
                        <div className="mb-6">
                            <CheckCircle className="w-20 h-20 mx-auto mb-4 animate-bounce" />
                            <h2 className="text-3xl font-bold mb-2">{successData.message}</h2>
                        </div>

                        {successData.prescription && (
                            <div className="space-y-4 text-left bg-white/20 backdrop-blur rounded-lg p-6">
                                <div className="flex items-center justify-between pb-3 border-b border-white/30">
                                    <span className="text-sm font-medium opacity-90">Order Number</span>
                                    <span className="text-lg font-bold">{successData.prescription.prescription_number}</span>
                                </div>

                                <div className="flex items-center justify-between pb-3 border-b border-white/30">
                                    <span className="text-sm font-medium opacity-90">Order Type</span>
                                    <span className="font-semibold capitalize">
                                        {successData.prescription.order_type === 'prescription' ? 'Prescription' : 'Online Order'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pb-3 border-b border-white/30">
                                    <span className="text-sm font-medium opacity-90">Status</span>
                                    <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-bold">
                                        Pending Review
                                    </span>
                                </div>

                                {cart.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium opacity-90">Pre-selected Items</span>
                                        <span className="px-2 py-1 bg-white/30 rounded text-sm font-bold">
                                            {cart.length} medicines
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium opacity-90">Tracking Token</span>
                                    <span className="text-xs font-mono bg-white/30 px-2 py-1 rounded">
                                        {successData.token ? successData.token.substring(0, 8) + '...' : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <div className="flex items-start gap-3 text-left bg-white/10 rounded-lg p-4">
                                <QrCodeIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold mb-1">What's Next?</p>
                                    <p className="opacity-90 text-xs leading-relaxed">
                                        Our pharmacy team will review your prescription shortly.
                                        {cart.length > 0 && ' We received your medicine list and will verify it against your prescription.'}
                                        {' '}You'll receive a notification once it's approved and ready for processing.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm opacity-90">
                                <Clock className="w-4 h-4" />
                                <span>This window will close in 8 seconds</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                fetchPrescriptions();
                            }}
                            className="mt-6 w-full px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                        >
                            View My Prescriptions
                        </button>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}
