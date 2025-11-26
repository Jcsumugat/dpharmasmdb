<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Register - Step 2 - Digital Pharma System</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
                <h1 class="text-3xl font-bold text-white mb-2">Almost Done!</h1>
                <p class="text-blue-100">Step 2 of 2: Set Your Password</p>
            </div>

            <!-- Progress Bar -->
            <div class="px-8 pt-6">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex-1">
                        <div class="h-2 bg-blue-600 rounded-full"></div>
                        <p class="text-xs text-blue-600 font-semibold mt-2">Personal Info</p>
                    </div>
                    <div class="w-16 h-2 bg-blue-600 rounded-full mx-2"></div>
                    <div class="flex-1">
                        <div class="h-2 bg-blue-600 rounded-full"></div>
                        <p class="text-xs text-blue-600 font-semibold mt-2">Password</p>
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

                <!-- Registration Summary -->
                <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 class="text-sm font-semibold text-blue-900 mb-2">Registration Summary</h3>
                    <div class="text-sm text-blue-800 space-y-1">
                        <p><strong>Name:</strong> {{ $registration['name'] ?? 'N/A' }}</p>
                        <p><strong>Email:</strong> {{ $registration['email'] ?? 'N/A' }}</p>
                        <p><strong>Phone:</strong> {{ $registration['phone'] ?? 'N/A' }}</p>
                    </div>
                </div>

                <form method="POST" action="{{ route('customer.signup.step_two.post') }}" class="space-y-6">
                    @csrf

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Minimum 8 characters"
                        >
                        <p class="mt-2 text-xs text-gray-500">
                            Password must be at least 8 characters with uppercase, lowercase, and numbers
                        </p>
                    </div>

                    <!-- Confirm Password -->
                    <div>
                        <label for="password_confirmation" class="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            name="password_confirmation"
                            required
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Re-enter your password"
                        >
                    </div>

                    <!-- Terms and Conditions -->
                    <div class="flex items-start">
                        <input
                            type="checkbox"
                            id="terms"
                            name="terms"
                            required
                            class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        >
                        <label for="terms" class="ml-2 text-sm text-gray-700">
                            I agree to the <a href="#" class="text-blue-600 hover:text-blue-700 font-semibold">Terms and Conditions</a> and <a href="#" class="text-blue-600 hover:text-blue-700 font-semibold">Privacy Policy</a>
                        </label>
                    </div>

                    <!-- Buttons -->
                    <div class="space-y-3">
                        <button
                            type="submit"
                            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition duration-200 shadow-lg hover:shadow-xl"
                        >
                            Complete Registration
                        </button>

                        <a
                            href="{{ route('customer.signup.step_one') }}"
                            class="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
                        >
                            ← Back to Step 1
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
