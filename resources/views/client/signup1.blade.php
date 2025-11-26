<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Register - Step 1 - Digital Pharma System</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
                <h1 class="text-3xl font-bold text-white mb-2">Create Account</h1>
                <p class="text-blue-100">Step 1 of 2: Personal Information</p>
            </div>

            <!-- Progress Bar -->
            <div class="px-8 pt-6">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex-1">
                        <div class="h-2 bg-blue-600 rounded-full"></div>
                        <p class="text-xs text-blue-600 font-semibold mt-2">Personal Info</p>
                    </div>
                    <div class="w-16 h-2 bg-gray-200 rounded-full mx-2"></div>
                    <div class="flex-1">
                        <div class="h-2 bg-gray-200 rounded-full"></div>
                        <p class="text-xs text-gray-400 mt-2">Password</p>
                    </div>
                </div>
            </div>

            <!-- Form -->
            <div class="p-8 pt-0">
                @if($errors->any())
                    <div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                        <ul class="list-disc list-inside">
                            @foreach($errors->all() as $error)
                                <li>{{ $error }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif

                <form method="POST" action="{{ route('customer.signup.step_one.post') }}" class="space-y-6">
                    @csrf

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Name -->
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value="{{ old('name') }}"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Juan Dela Cruz"
                            >
                        </div>

                        <!-- Phone -->
                        <div>
                            <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
                                Mobile Number *
                            </label>
                            <input
                                type="text"
                                id="phone"
                                name="phone"
                                value="{{ old('phone') }}"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="09XX XXX XXXX"
                            >
                        </div>

                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value="{{ old('email') }}"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="juan@example.com"
                            >
                        </div>

                        <!-- Birthdate -->
                        <div>
                            <label for="birthdate" class="block text-sm font-medium text-gray-700 mb-2">
                                Birthdate *
                            </label>
                            <input
                                type="date"
                                id="birthdate"
                                name="birthdate"
                                value="{{ old('birthdate') }}"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                        </div>

                        <!-- Sex -->
                        <div>
                            <label for="sex" class="block text-sm font-medium text-gray-700 mb-2">
                                Sex *
                            </label>
                            <select
                                id="sex"
                                name="sex"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select...</option>
                                <option value="male" {{ old('sex') == 'male' ? 'selected' : '' }}>Male</option>
                                <option value="female" {{ old('sex') == 'female' ? 'selected' : '' }}>Female</option>
                                <option value="other" {{ old('sex') == 'other' ? 'selected' : '' }}>Other</option>
                            </select>
                        </div>
                    </div>

                    <!-- Address -->
                    <div class="space-y-4 pt-4">
                        <h3 class="text-lg font-semibold text-gray-800">Address</h3>

                        <div>
                            <label for="address_street" class="block text-sm font-medium text-gray-700 mb-2">
                                Street Address *
                            </label>
                            <input
                                type="text"
                                id="address_street"
                                name="address[street]"
                                value="{{ old('address.street') }}"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="123 Main Street, Barangay"
                            >
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label for="address_city" class="block text-sm font-medium text-gray-700 mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    id="address_city"
                                    name="address[city]"
                                    value="{{ old('address.city') }}"
                                    required
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Cebu City"
                                >
                            </div>

                            <div>
                                <label for="address_province" class="block text-sm font-medium text-gray-700 mb-2">
                                    Province *
                                </label>
                                <input
                                    type="text"
                                    id="address_province"
                                    name="address[province]"
                                    value="{{ old('address.province') }}"
                                    required
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Cebu"
                                >
                            </div>

                            <div>
                                <label for="address_postal_code" class="block text-sm font-medium text-gray-700 mb-2">
                                    Postal Code
                                </label>
                                <input
                                    type="text"
                                    id="address_postal_code"
                                    name="address[postal_code]"
                                    value="{{ old('address.postal_code') }}"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="6000"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition duration-200 shadow-lg hover:shadow-xl"
                    >
                        Continue to Step 2
                    </button>
                </form>

                <!-- Login Link -->
                <div class="mt-6 text-center">
                    <p class="text-gray-600">
                        Already have an account?
                        <a href="{{ route('customer.login') }}" class="text-blue-600 hover:text-blue-700 font-semibold">
                            Login here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
