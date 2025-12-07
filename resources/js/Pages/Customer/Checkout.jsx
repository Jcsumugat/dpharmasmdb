import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import CustomerLayout from '@/Layouts/CustomerLayout';
import {
    ShoppingCart,
    Package,
    Upload,
    FileText,
    MapPin,
    CreditCard,
    AlertCircle,
    CheckCircle,
    Loader2,
    ArrowLeft,
    X,
    ChevronRight
} from 'lucide-react';

export default function Checkout() {
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Review, 2: Prescription, 3: Contact & Payment
    const [errors, setErrors] = useState({});

    // Form state
    const [hasPrescription, setHasPrescription] = useState(null); // null = not chosen, true/false
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [prescriptionPreview, setPrescriptionPreview] = useState(null);
    const [mobileNumber, setMobileNumber] = useState('');
    const [pickupNotes, setPickupNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(''); // 'cash', 'gcash', 'paymaya'

    // Load cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('pharma_cart');
        if (savedCart) {
            const cartData = JSON.parse(savedCart);
            if (cartData.length === 0) {
                router.visit(route('customer.products'));
            }
            setCart(cartData);
        } else {
            router.visit(route('customer.products'));
        }
    }, []);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;

    // Handle prescription file upload
    const handlePrescriptionChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescriptionFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPrescriptionPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Validate step
    const validateStep = (currentStep) => {
        const newErrors = {};

        if (currentStep === 2 && hasPrescription === null) {
            newErrors.prescription = 'Please choose whether you have a prescription';
            setErrors(newErrors);
            return false;
        }

        if (currentStep === 2 && hasPrescription === true && !prescriptionFile) {
            newErrors.prescription = 'Please upload your prescription';
            setErrors(newErrors);
            return false;
        }

        if (currentStep === 3) {
            if (!mobileNumber) newErrors.mobile_number = 'Mobile number is required';

            if (mobileNumber && !/^(09|\+639)\d{9}$/.test(mobileNumber)) {
                newErrors.mobile_number = 'Invalid Philippine mobile number';
            }

            if (!paymentMethod) newErrors.payment = 'Please select a payment method';

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return false;
            }
        }

        setErrors({});
        return true;
    };

    // Handle next step
    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Handle previous step
    const handleBack = () => {
        setStep(step - 1);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Submit order
    const handleSubmitOrder = async () => {
        if (!validateStep(step)) return;

        setLoading(true);

        try {
            const formData = new FormData();

            // Cart items
            formData.append('items', JSON.stringify(cart));

            // Prescription
            formData.append('has_prescription', hasPrescription ? '1' : '0');
            if (hasPrescription && prescriptionFile) {
                formData.append('prescription_file', prescriptionFile);
            }

            // Contact details
            formData.append('mobile_number', mobileNumber);
            formData.append('notes', pickupNotes);

            // Payment method (only store the method name)
            formData.append('payment_method', paymentMethod);

            const response = await fetch(route('customer.api.orders.create'), {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                }
            });

            const data = await response.json();

            if (data.success) {
                // Clear cart
                localStorage.removeItem('pharma_cart');

                // Redirect based on order type
                if (hasPrescription) {
                    // If has prescription, go to prescriptions page
                    router.visit(route('customer.prescriptions'), {
                        onSuccess: () => {
                            // Show success message
                        }
                    });
                } else {
                    // If no prescription (checkout order), go to orders page
                    router.visit(route('customer.orders'), {
                        onSuccess: () => {
                            // Show success message
                        }
                    });
                }
            } else {
                setErrors({ submit: data.message || 'Failed to create order' });
            }
        } catch (error) {
            console.error('Order submission error:', error);
            setErrors({ submit: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <CustomerLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.visit(route('customer.products'))}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Products</span>
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
                        <p className="text-gray-500 mt-2">Complete your order</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            {[
                                { num: 1, label: 'Review Cart' },
                                { num: 2, label: 'Prescription' },
                                { num: 3, label: 'Pick Up Information' },
                                { num: 4, label: 'Payment' }
                            ].map((s, idx) => (
                                <div key={s.num} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s.num
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {step > s.num ? (
                                                <CheckCircle className="w-6 h-6" />
                                            ) : (
                                                s.num
                                            )}
                                        </div>
                                        <span className={`text-sm mt-2 ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'
                                            }`}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {idx < 2 && (
                                        <div className={`h-1 flex-1 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Step 1: Review Cart */}
                            {step === 1 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Review Your Order</h2>
                                    <div className="space-y-4">
                                        {cart.map((item) => (
                                            <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Package className="w-8 h-8 text-blue-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                                                    {item.brand_name && (
                                                        <p className="text-sm text-gray-500">{item.brand_name}</p>
                                                    )}
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Quantity: {item.quantity} × ₱{Number(item.selling_price).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">
                                                        ₱{(item.selling_price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                                    >
                                        Continue to Prescription
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Prescription */}
                            {step === 2 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Prescription Information</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-gray-700 mb-4">Do you have a prescription for this order?</p>
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="has_prescription"
                                                        checked={hasPrescription === true}
                                                        onChange={() => setHasPrescription(true)}
                                                        className="w-5 h-5 text-blue-600"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">Yes, I have a prescription</p>
                                                        <p className="text-sm text-gray-500">Upload your prescription document</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="has_prescription"
                                                        checked={hasPrescription === false}
                                                        onChange={() => setHasPrescription(false)}
                                                        className="w-5 h-5 text-blue-600"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">No prescription</p>
                                                        <p className="text-sm text-gray-500">Proceed with OTC products only</p>
                                                    </div>
                                                </label>
                                            </div>
                                            {errors.prescription && (
                                                <p className="text-red-600 text-sm mt-2">{errors.prescription}</p>
                                            )}
                                        </div>

                                        {hasPrescription && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Upload Prescription
                                                </label>
                                                {!prescriptionFile ? (
                                                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                                        <p className="text-sm text-gray-600 mb-1">Click to upload prescription</p>
                                                        <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handlePrescriptionChange}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                ) : (
                                                    <div className="relative border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                                                        <button
                                                            onClick={() => {
                                                                setPrescriptionFile(null);
                                                                setPrescriptionPreview(null);
                                                            }}
                                                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        {prescriptionFile.type.startsWith('image/') ? (
                                                            <img
                                                                src={prescriptionPreview}
                                                                alt="Prescription preview"
                                                                className="w-full h-48 object-contain rounded"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="w-12 h-12 text-blue-600" />
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{prescriptionFile.name}</p>
                                                                    <p className="text-sm text-gray-500">
                                                                        {(prescriptionFile.size / 1024 / 1024).toFixed(2)} MB
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={handleBack}
                                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                                        >
                                            Continue to Contact & Payment
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Contact & Payment */}
                            {step === 3 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Contact & Payment Information</h2>

                                    {/* Contact Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <MapPin className="w-5 h-5" />
                                            Contact Details for Pickup
                                        </h3>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-blue-800">
                                                📍 <strong>Pick-up Location:</strong> Digital Pharma, Main Branch<br />
                                                🕒 <strong>Operating Hours:</strong> Mon-Sat, 8:00 AM - 6:00 PM<br />
                                                📞 <strong>Contact:</strong> (032) 123-4567
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Mobile Number * (for pickup notifications)
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={mobileNumber}
                                                    onChange={(e) => setMobileNumber(e.target.value)}
                                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.mobile_number ? 'border-red-500' : 'border-gray-300'
                                                        }`}
                                                    placeholder="09XX XXX XXXX"
                                                />
                                                {errors.mobile_number && <p className="text-red-600 text-sm mt-1">{errors.mobile_number}</p>}
                                                <p className="text-xs text-gray-500 mt-1">We'll send you SMS when your order is ready</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Pickup Notes (Optional)
                                                </label>
                                                <textarea
                                                    value={pickupNotes}
                                                    onChange={(e) => setPickupNotes(e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    rows="3"
                                                    placeholder="Any special instructions or preferred pickup time..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <CreditCard className="w-5 h-5" />
                                            Payment Method (to be paid on pickup)
                                        </h3>

                                        <div className="space-y-3 mb-6">
                                            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    value="cash"
                                                    checked={paymentMethod === 'cash'}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-5 h-5 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">Cash</p>
                                                    <p className="text-sm text-gray-500">Pay with cash when you pick up</p>
                                                </div>
                                            </label>

                                            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'gcash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    value="gcash"
                                                    checked={paymentMethod === 'gcash'}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-5 h-5 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">GCash</p>
                                                    <p className="text-sm text-gray-500">Pay via GCash when picking up</p>
                                                </div>
                                            </label>

                                            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'paymaya' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    value="paymaya"
                                                    checked={paymentMethod === 'paymaya'}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-5 h-5 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">PayMaya</p>
                                                    <p className="text-sm text-gray-500">Pay via PayMaya when picking up</p>
                                                </div>
                                            </label>
                                        </div>

                                        {errors.payment && (
                                            <p className="text-red-600 text-sm mb-4">{errors.payment}</p>
                                        )}

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                            <div className="flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-yellow-800">
                                                    <p className="font-medium mb-1">Payment on Pickup</p>
                                                    <p>Your order will be prepared and reserved. Payment will be collected when you pick up your order at our pharmacy.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {errors.submit && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                            <div className="flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                                <p className="text-sm text-red-800">{errors.submit}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleBack}
                                            disabled={loading}
                                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleSubmitOrder}
                                            disabled={loading}
                                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    Place Order for Pickup
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Items ({cart.length})</span>
                                        <span className="font-medium text-gray-900">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Tax (12%)</span>
                                        <span className="font-medium text-gray-900">₱{tax.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-bold text-blue-600">₱{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Progress indicator */}
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            {step > 1 ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                            )}
                                            <span className={step >= 1 ? 'text-gray-900' : 'text-gray-500'}>Cart Review</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {step > 2 ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                            )}
                                            <span className={step >= 2 ? 'text-gray-900' : 'text-gray-500'}>Prescription</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {step > 3 ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                            )}
                                            <span className={step >= 3 ? 'text-gray-900' : 'text-gray-500'}>Contact & Payment</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
