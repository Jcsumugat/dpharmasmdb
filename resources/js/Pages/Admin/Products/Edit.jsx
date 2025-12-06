import { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function EditProduct() {
    const { product, categories: initialCategories, suppliers: initialSuppliers } = usePage().props;
    const [categories, setCategories] = useState(initialCategories || []);
    const [suppliers, setSuppliers] = useState(initialSuppliers || []);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Parse dosage_unit to extract strength and unit
    const parseDosageUnit = (dosageUnit) => {
        if (!dosageUnit) return { strength: '', unit: 'mg' };

        const match = dosageUnit.match(/^(\d+\.?\d*)(.+)$/);
        if (match) {
            return { strength: match[1], unit: match[2] };
        }
        return { strength: '', unit: dosageUnit };
    };

    const parsedDosage = parseDosageUnit(product.dosage_unit);

    const [formData, setFormData] = useState({
        product_name: product.product_name || '',
        product_code: product.product_code || '',
        generic_name: product.generic_name || '',
        brand_name: product.brand_name || '',
        manufacturer: product.manufacturer || '',
        product_type: product.product_type || 'OTC',
        form_type: product.form_type || 'Tablet',
        dosage_strength: parsedDosage.strength,
        dosage_unit: parsedDosage.unit,
        classification: String(product.classification || '1'),
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        reorder_level: String(product.reorder_level || '10'),
        unit: product.unit || 'piece',
        unit_quantity: String(product.unit_quantity || '1'),
        storage_requirements: product.storage_requirements || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.product_name.trim()) {
            newErrors.product_name = 'Product name is required';
        }

        if (!formData.dosage_strength.trim() && !formData.dosage_unit) {
            newErrors.dosage_unit = 'Dosage strength or unit is required';
        }

        if (parseFloat(formData.unit_quantity) <= 0) {
            newErrors.unit_quantity = 'Unit quantity must be greater than 0';
        }

        if (parseInt(formData.reorder_level) < 0) {
            newErrors.reorder_level = 'Reorder level cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                ...formData,
                unit_quantity: parseFloat(formData.unit_quantity),
                reorder_level: parseInt(formData.reorder_level),
                classification: parseInt(formData.classification),
                dosage_unit: formData.dosage_strength && formData.dosage_unit
                    ? `${formData.dosage_strength}${formData.dosage_unit}`
                    : (formData.dosage_unit || formData.dosage_strength)
            };

            const productId = product._id || product.id;
            const response = await fetch(`/admin/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify(submitData)
            });

            const data = await response.json();

            if (data.success) {
                router.visit('/admin/products', {
                    onSuccess: () => {
                        alert('Product updated successfully!');
                    }
                });
            } else {
                setErrors(data.errors || { general: data.message });
            }
        } catch (error) {
            console.error('Failed to update product:', error);
            setErrors({ general: 'Failed to update product. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.visit('/admin/products');
    };

    const getUnitQuantityLabel = () => {
        const unitDisplayMap = {
            'bottle': 'bottle',
            'vial': 'vial',
            'ampoule': 'ampoule',
            'dropper_bottle': 'dropper bottle',
            'nebule': 'nebule',
            'blister_pack': 'blister pack',
            'box': 'box',
            'strip': 'strip',
            'sachet': 'sachet',
            'syringe': 'pre-filled syringe',
            'tube': 'tube',
            'jar': 'jar',
            'topical_bottle': 'bottle',
            'inhaler': 'inhaler',
            'patch': 'patch',
            'suppository': 'suppository',
            'piece': 'piece',
            'pack': 'pack'
        };

        const containerUnits = ['bottle', 'vial', 'ampoule', 'dropper_bottle', 'nebule', 'tube', 'jar', 'topical_bottle', 'syringe'];
        const multiItemUnits = ['blister_pack', 'strip', 'box', 'pack', 'sachet'];

        const selectedUnit = formData.unit;
        const unitDisplay = unitDisplayMap[selectedUnit] || selectedUnit;

        if (!selectedUnit) {
            return 'Contents per Package';
        }

        if (containerUnits.includes(selectedUnit)) {
            return `Volume/Size per ${unitDisplay}`;
        } else if (selectedUnit === 'box') {
            return 'Total pieces per box';
        } else if (multiItemUnits.includes(selectedUnit)) {
            return `Items per ${unitDisplay}`;
        } else {
            return 'Quantity per Unit';
        }
    };

    const getUnitQuantityHelp = () => {
        const containerUnits = ['bottle', 'vial', 'ampoule', 'dropper_bottle', 'nebule', 'tube', 'jar', 'topical_bottle', 'syringe'];
        const selectedUnit = formData.unit;

        if (!selectedUnit) {
            return 'Select packaging unit first';
        }

        if (containerUnits.includes(selectedUnit)) {
            return 'Enter the volume in mL (e.g., 60 for a 60mL bottle)';
        } else if (selectedUnit === 'box') {
            return 'Enter TOTAL pieces in the box. Example: Box with 10 blister packs × 12 tablets = enter 120';
        } else if (['blister_pack', 'strip', 'pack', 'sachet'].includes(selectedUnit)) {
            return `How many pieces per ${selectedUnit}? (e.g., 10 tablets per blister)`;
        } else {
            return 'Usually 1 for individual items';
        }
    };

    const getUnitPreview = () => {
        const unitDisplayMap = {
            'bottle': 'bottle',
            'vial': 'vial',
            'ampoule': 'ampoule',
            'dropper_bottle': 'dropper bottle',
            'nebule': 'nebule',
            'blister_pack': 'blister pack',
            'box': 'box',
            'strip': 'strip',
            'sachet': 'sachet',
            'syringe': 'pre-filled syringe',
            'tube': 'tube',
            'jar': 'jar',
            'topical_bottle': 'bottle',
            'inhaler': 'inhaler',
            'patch': 'patch',
            'suppository': 'suppository',
            'piece': 'piece',
            'pack': 'pack'
        };

        const containerUnits = ['bottle', 'vial', 'ampoule', 'dropper_bottle', 'nebule', 'tube', 'jar', 'topical_bottle', 'syringe'];
        const multiItemUnits = ['blister_pack', 'strip', 'box', 'pack', 'sachet'];

        const selectedUnit = formData.unit;
        const quantity = parseFloat(formData.unit_quantity) || 0;
        const formType = formData.form_type;
        const unitDisplay = unitDisplayMap[selectedUnit] || selectedUnit;

        if (!selectedUnit) {
            return { text: 'Select packaging unit above', color: 'text-gray-500' };
        }

        if (quantity <= 0) {
            return { text: `Enter quantity for ${unitDisplay}`, color: 'text-gray-500' };
        }

        let preview = '';

        if (containerUnits.includes(selectedUnit)) {
            preview = `Stock counted in: ${unitDisplay}s of ${quantity}mL each`;
            if (formType) {
                preview += ` (contains ${formType.toLowerCase()})`;
            }
        } else if (multiItemUnits.includes(selectedUnit)) {
            if (selectedUnit === 'box') {
                preview = `Stock counted in: boxes of ${quantity} items each`;
                if (formType) {
                    preview += ` (${formType.toLowerCase()}s)`;
                }
                preview += `\n💡 Tip: If box contains blister packs, enter total pieces per box`;
            } else {
                preview = `Stock counted in: ${unitDisplay}s of ${quantity} pieces each`;
                if (formType) {
                    preview += ` (${formType.toLowerCase()}s)`;
                }
            }
        } else if (quantity === 1) {
            preview = `Stock counted per individual ${unitDisplay}`;
        } else {
            preview = `Stock counted in: ${unitDisplay}s containing ${quantity} units each`;
        }

        return { text: preview, color: 'text-green-600' };
    };

    const getDosagePreview = () => {
        const strength = formData.dosage_strength.trim();
        const unit = formData.dosage_unit;

        if (strength && unit) {
            return { text: strength + unit, color: 'text-green-600 font-bold' };
        } else if (unit) {
            return { text: unit, color: 'text-blue-600' };
        } else if (strength) {
            return { text: strength + ' (select unit)', color: 'text-yellow-600' };
        } else {
            return { text: 'Enter strength and unit above', color: 'text-gray-400' };
        }
    };

    const formTypeOptions = [
        { group: 'Solid Dosage Forms', options: ['Tablet', 'Capsule', 'Caplet', 'Powder', 'Granules', 'Chewable Tablet', 'Extended Release', 'Enteric Coated'] },
        { group: 'Liquid Dosage Forms', options: ['Syrup', 'Suspension', 'Solution', 'Elixir', 'Drops', 'Injection', 'IV Solution'] },
        { group: 'Topical Forms', options: ['Cream', 'Ointment', 'Gel', 'Lotion', 'Patch', 'Foam'] },
        { group: 'Other Forms', options: ['Inhaler', 'Nasal Spray', 'Eye Drops', 'Suppository'] }
    ];

    const classificationOptions = [
        { value: '1', label: 'Class 1 - Antimicrobial' },
        { value: '2', label: 'Class 2 - Analgesic (Pain relief)' },
        { value: '3', label: 'Class 3 - Antipyretic (Fever reduction)' },
        { value: '4', label: 'Class 4 - Anti-inflammatory' },
        { value: '5', label: 'Class 5 - Antacid' },
        { value: '6', label: 'Class 6 - Antihistamine' },
        { value: '7', label: 'Class 7 - Antihypertensive' },
        { value: '8', label: 'Class 8 - Antidiabetic' },
        { value: '9', label: 'Class 9 - Cardiovascular' },
        { value: '10', label: 'Class 10 - Respiratory' },
        { value: '11', label: 'Class 11 - Gastrointestinal' },
        { value: '12', label: 'Class 12 - Dermatological' },
        { value: '13', label: 'Class 13 - Neurological' },
        { value: '14', label: 'Class 14 - Psychiatric' },
        { value: '15', label: 'Class 15 - Hormonal' },
        { value: '16', label: 'Class 16 - Vitamin' },
        { value: '17', label: 'Class 17 - Mineral' },
        { value: '18', label: 'Class 18 - Immunosuppressant' },
        { value: '19', label: 'Class 19 - Anticoagulant' },
        { value: '20', label: 'Class 20 - Antifungal' },
        { value: '21', label: 'Class 21 - Antiviral' },
        { value: '22', label: 'Class 22 - Other' }
    ];

    const manufacturerOptions = [
        'Pfizer Inc.', 'Johnson & Johnson', 'GlaxoSmithKline', 'Novartis AG', 'Merck & Co.',
        'AbbVie Inc.', 'Bristol-Myers Squibb', 'AstraZeneca', 'Sanofi S.A.', 'Roche Holding AG',
        'United Laboratories (Unilab)', 'Zuellig Pharma', 'Mercury Drug', 'Pascual Laboratories',
        'Hizon Laboratories', 'Other'
    ];

    const productTypeOptions = [
        'Prescription', 'OTC', 'Herbal', 'Food Supplement', 'Vitamins & Minerals',
        'Medical Device', 'Cosmeceutical', 'Veterinary'
    ];

    const storageOptions = [
        { value: 'Room Temperature', label: 'Room Temperature (15-30°C)' },
        { value: 'Cool Place', label: 'Cool Place (8-15°C)' },
        { value: 'Refrigerated', label: 'Refrigerated (2-8°C)' },
        { value: 'Frozen', label: 'Frozen (-20°C or below)' },
        { value: 'Protect from Light', label: 'Protect from Light' },
        { value: 'Dry Place', label: 'Store in Dry Place' },
        { value: 'Controlled Temperature', label: 'Controlled Room Temperature (20-25°C)' },
        { value: 'Do Not Freeze', label: 'Do Not Freeze' },
        { value: 'Store Upright', label: 'Store Upright' },
        { value: 'Special Handling', label: 'Special Handling Required' }
    ];

    const unitOptions = [
        {
            group: 'Bottled/Container Products', options: [
                { value: 'bottle', label: 'Bottle (syrup, suspension, liquid)' },
                { value: 'dropper_bottle', label: 'Dropper Bottle (eye/ear drops)' },
                { value: 'topical_bottle', label: 'Bottle (lotion, solution)' },
                { value: 'jar', label: 'Jar (ointment, cream)' },
                { value: 'tube', label: 'Tube (cream, ointment, gel)' }
            ]
        },
        {
            group: 'Injectable Products', options: [
                { value: 'vial', label: 'Vial' },
                { value: 'ampoule', label: 'Ampoule' },
                { value: 'syringe', label: 'Pre-filled Syringe' }
            ]
        },
        {
            group: 'Solid Dose Packaging', options: [
                { value: 'blister_pack', label: 'Blister Pack' },
                { value: 'strip', label: 'Strip' },
                { value: 'box', label: 'Box' },
                { value: 'sachet', label: 'Sachet' }
            ]
        },
        {
            group: 'Respiratory', options: [
                { value: 'nebule', label: 'Nebule' },
                { value: 'inhaler', label: 'Inhaler' }
            ]
        },
        {
            group: 'Other', options: [
                { value: 'patch', label: 'Patch' },
                { value: 'suppository', label: 'Suppository' },
                { value: 'piece', label: 'Piece (individual items)' },
                { value: 'pack', label: 'Pack (multi-item)' }
            ]
        }
    ];

    const dosageUnitOptions = [
        { value: 'mg', label: 'mg (milligram)' },
        { value: 'g', label: 'g (gram)' },
        { value: 'mcg', label: 'mcg (microgram)' },
        { value: 'IU', label: 'IU (International Unit)' },
        { value: 'mL', label: 'mL (milliliter)' },
        { value: 'L', label: 'L (liter)' },
        { value: '%', label: '% (percentage)' },
        { value: 'mg/ml', label: 'mg/ml' },
        { value: 'mg/5ml', label: 'mg/5ml' },
        { value: 'drops', label: 'drops' },
        { value: 'ratio', label: 'ratio' }
    ];

    const genericNamesList = [
        'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Cetirizine',
        'Loratadine', 'Metformin', 'Omeprazole', 'Simvastatin', 'Amlodipine',
        'Losartan', 'Atorvastatin', 'Salbutamol', 'Prednisolone', 'Diclofenac',
        'Dextromethorphan', 'Chlorpheniramine', 'Phenylephrine', 'Ascorbic Acid', 'Calcium Carbonate'
    ];

    const unitPreview = getUnitPreview();
    const dosagePreview = getDosagePreview();

    return (
        <AuthenticatedLayout>
            <Head title={`Edit ${product.product_name}`} />

            <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
                {/* Page Header */}
                <div className="mb-10">
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-600 transition-all mb-6"
                        onClick={handleCancel}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back to Products
                    </button>
                    <div className="mt-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Edit Product</h1>
                        <p className="text-gray-600">Update product information for {product.product_name}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Error Banner */}
                    {errors.general && (
                        <div className="flex items-center gap-3 px-5 py-4 bg-red-100 border-2 border-red-100 rounded-xl text-red-800 font-medium">
                            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {errors.general}
                        </div>
                    )}

                    {/* Basic Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">📋 Basic Information</h2>
                            <p className="text-sm text-gray-600">Essential product details</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="product_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="product_name"
                                    name="product_name"
                                    value={formData.product_name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.product_name
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                                            : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                        }`}
                                    placeholder="e.g., Biogesic 500mg"
                                />
                                {errors.product_name && (
                                    <span className="text-xs text-red-500 font-medium">{errors.product_name}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="product_code" className="text-sm font-semibold text-gray-700">
                                    Product Code
                                </label>
                                <input
                                    type="text"
                                    id="product_code"
                                    name="product_code"
                                    value={formData.product_code}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-gray-50"
                                    placeholder="e.g., P1234"
                                    disabled
                                />
                                <span className="text-xs text-gray-600 italic">Product code cannot be changed</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="generic_name" className="text-sm font-semibold text-gray-700">
                                    Generic Name
                                </label>
                                <input
                                    type="text"
                                    id="generic_name"
                                    name="generic_name"
                                    value={formData.generic_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="e.g., Paracetamol"
                                    list="generic_names_list"
                                />
                                <datalist id="generic_names_list">
                                    {genericNamesList.map(name => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="brand_name" className="text-sm font-semibold text-gray-700">
                                    Brand Name
                                </label>
                                <input
                                    type="text"
                                    id="brand_name"
                                    name="brand_name"
                                    value={formData.brand_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="e.g., Biogesic"
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label htmlFor="manufacturer" className="text-sm font-semibold text-gray-700">
                                    Manufacturer
                                </label>
                                <select
                                    id="manufacturer"
                                    name="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select Manufacturer</option>
                                    {manufacturerOptions.map(mfr => (
                                        <option key={mfr} value={mfr}>{mfr}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">🏷️ Classification</h2>
                            <p className="text-sm text-gray-600">Product type and category</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="product_type" className="text-sm font-semibold text-gray-700">
                                    Product Type
                                </label>
                                <select
                                    id="product_type"
                                    name="product_type"
                                    value={formData.product_type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    {productTypeOptions.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="form_type" className="text-sm font-semibold text-gray-700">
                                    Form Type
                                </label>
                                <select
                                    id="form_type"
                                    name="form_type"
                                    value={formData.form_type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    {formTypeOptions.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="classification" className="text-sm font-semibold text-gray-700">
                                    Drug Classification
                                </label>
                                <select
                                    id="classification"
                                    name="classification"
                                    value={formData.classification}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    {classificationOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="category_id" className="text-sm font-semibold text-gray-700">
                                    Category
                                </label>
                                <select
                                    id="category_id"
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label htmlFor="supplier_id" className="text-sm font-semibold text-gray-700">
                                    Default Supplier
                                </label>
                                <select
                                    id="supplier_id"
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select supplier...</option>
                                    {suppliers.map(sup => (
                                        <option key={sup._id} value={sup._id}>
                                            {sup.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Dosage and Formulation */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">💊 Dosage and Formulation</h2>
                            <p className="text-sm text-gray-600">Strength and dosage information</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="dosage_strength" className="text-sm font-semibold text-gray-700">
                                    Dosage Strength
                                </label>
                                <input
                                    type="text"
                                    id="dosage_strength"
                                    name="dosage_strength"
                                    value={formData.dosage_strength}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="e.g., 500, 250, 10"
                                />
                                <span className="text-xs text-gray-600 italic">Enter numeric value only</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="dosage_unit" className="text-sm font-semibold text-gray-700">
                                    Dosage Unit
                                </label>
                                <select
                                    id="dosage_unit"
                                    name="dosage_unit"
                                    value={formData.dosage_unit}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.dosage_unit
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                                            : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                        }`}
                                >
                                    <option value="">Select Unit</option>
                                    {dosageUnitOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.dosage_unit && (
                                    <span className="text-xs text-red-500 font-medium">{errors.dosage_unit}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4">
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">Dosage Preview:</label>
                                    <div className={`text-lg font-semibold p-2 rounded-lg bg-white text-center ${dosagePreview.color}`}>
                                        {dosagePreview.text}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-600 italic">e.g., 500mg, 250mg/5mL, 1%, 1:1000</span>
                            </div>
                        </div>
                    </div>

                    {/* Packaging & Units */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">📦 Packaging & Units</h2>
                            <p className="text-sm text-gray-600">Stock management parameters</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="unit" className="text-sm font-semibold text-gray-700">
                                    Packaging Unit
                                </label>
                                <select
                                    id="unit"
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select Packaging Unit</option>
                                    {unitOptions.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.options.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <span className="text-xs text-gray-600 italic">How is this product packaged?</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="unit_quantity" className="text-sm font-semibold text-gray-700">
                                    {getUnitQuantityLabel()}
                                </label>
                                <input
                                    type="number"
                                    id="unit_quantity"
                                    name="unit_quantity"
                                    value={formData.unit_quantity}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.unit_quantity
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                                            : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                        }`}
                                    min="0.01"
                                    step="0.01"
                                    placeholder="e.g., 1, 10, 60, 100"
                                />
                                {errors.unit_quantity && (
                                    <span className="text-xs text-red-500 font-medium">{errors.unit_quantity}</span>
                                )}
                                <span className="text-xs text-gray-600 italic">{getUnitQuantityHelp()}</span>
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4">
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">Packaging Preview:</label>
                                    <div className={`text-base font-medium p-3 rounded-lg bg-white whitespace-pre-line ${unitPreview.color}`}>
                                        {unitPreview.text}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Storage and Handling */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">🌡️ Storage and Handling</h2>
                            <p className="text-sm text-gray-600">Storage requirements and conditions</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="storage_requirements" className="text-sm font-semibold text-gray-700">
                                    Storage Requirements
                                </label>
                                <select
                                    id="storage_requirements"
                                    name="storage_requirements"
                                    value={formData.storage_requirements}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                >
                                    <option value="">Select Storage Requirements</option>
                                    {storageOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Management */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <div className="mb-6 pb-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">📊 Inventory Management</h2>
                            <p className="text-sm text-gray-600">Stock tracking and alerts</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="reorder_level" className="text-sm font-semibold text-gray-700">
                                    Reorder Level
                                </label>
                                <input
                                    type="number"
                                    id="reorder_level"
                                    name="reorder_level"
                                    value={formData.reorder_level}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.reorder_level
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                                            : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                        }`}
                                    min="0"
                                    placeholder="Minimum stock before alert"
                                />
                                {errors.reorder_level && (
                                    <span className="text-xs text-red-500 font-medium">{errors.reorder_level}</span>
                                )}
                                <span className="text-xs text-gray-600 italic">Alert when stock falls below this level</span>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky bottom-8 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Update Product
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
