<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class CustomerAuthController extends Controller
{
    /**
     * Show customer registration form (Step 1)
     */
    public function showRegistrationStep1()
    {
        return view('client.signup1');
    }

    /**
     * Handle registration step 1 - Personal information
     */
    public function handleRegistrationStep1(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => 'required|string|max:20|unique:users,phone',
            'email' => 'required|string|email|max:100|unique:users,email',
            'birthdate' => 'required|date|before:today',
            'sex' => 'required|string|in:male,female,other',
            'address' => 'required|array',
            'address.street' => 'required|string|max:255',
            'address.city' => 'required|string|max:100',
            'address.province' => 'required|string|max:100',
            'address.postal_code' => 'nullable|string|max:20',
        ]);

        // Store in session for step 2
        session()->put('registration', $validated);

        Log::info('Customer registration step 1 completed', [
            'email' => $validated['email']
        ]);

        return redirect()->route('customer.signup.step_two');
    }

    /**
     * Show customer registration form (Step 2)
     */
    public function showRegistrationStep2()
    {
        $registration = session('registration');

        if (!$registration) {
            return redirect()->route('customer.signup.step_one')
                ->withErrors(['error' => 'Session expired. Please start over.']);
        }

        return view('client.signup2', ['registration' => $registration]);
    }

    /**
     * Handle registration step 2 - Password and completion
     */
    public function handleRegistrationStep2(Request $request)
    {
        $validated = $request->validate([
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
            ],
            'terms' => 'required|accepted',
        ]);

        $registrationData = session('registration');

        if (!$registrationData) {
            Log::error('Registration data not found in session');
            return redirect()->route('customer.signup.step_one')
                ->withErrors(['error' => 'Session expired. Please start over.']);
        }

        try {
            // Create customer user
            $user = User::create([
                'name' => $registrationData['name'],
                'email' => $registrationData['email'],
                'phone' => $registrationData['phone'],
                'password' => Hash::make($validated['password']),
                'role' => User::ROLE_CUSTOMER,
                'birthdate' => $registrationData['birthdate'],
                'sex' => $registrationData['sex'],
                'address' => $registrationData['address'],
                'status' => 'active',
                'email_verified_at' => null,
                'last_login' => null,
            ]);

            Log::info('Customer registered successfully', [
                'user_id' => $user->_id,
                'email' => $user->email
            ]);

            // Clear registration session
            session()->forget('registration');

            return redirect()->route('customer.login')
                ->with('success', 'Registration successful! You can now log in.');
        } catch (\Exception $e) {
            Log::error('Customer registration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('customer.signup.step_two')
                ->withErrors(['error' => 'Registration failed: ' . $e->getMessage()]);
        }
    }

    public function showLoginForm()
    {
        // If logged in as customer, redirect to home
        if (Auth::check() && Auth::user()->role === 'customer') {
            return redirect()->route('customer.home');
        }

        // Allow access if not logged in OR logged in as admin
        return view('client.login');
    }

    /**
     * Handle customer login
     */
    public function login(Request $request)
    {
        // If already logged in as customer, redirect
        if (Auth::check() && Auth::user()->role === 'customer') {
            return redirect()->route('customer.home');
        }

        // If logged in as admin, logout first
        if (Auth::check() && in_array(Auth::user()->role, ['admin', 'staff'])) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $credentials = $request->validate([
            'mobile' => 'required|string',
            'password' => 'required|string',
        ]);

        // Find user by phone (mobile)
        $user = User::where('phone', $credentials['mobile'])
            ->where('role', User::ROLE_CUSTOMER)
            ->first();

        if (!$user) {
            return back()->withErrors([
                'mobile' => 'Invalid mobile number or password.'
            ])->withInput();
        }

        // Check account status
        if ($user->status === 'deleted') {
            return back()->withErrors([
                'mobile' => 'This account has been deleted. Please contact support.'
            ])->withInput();
        }

        if ($user->status === 'deactivated') {
            $message = 'Your account has been deactivated due to multiple violations.';

            if ($user->auto_restore_at) {
                $restoreTime = \Carbon\Carbon::parse($user->auto_restore_at);

                if ($restoreTime->isFuture()) {
                    $duration = $restoreTime->diffForHumans(null, [
                        'parts' => 2,
                        'short' => false,
                        'syntax' => \Carbon\CarbonInterface::DIFF_ABSOLUTE
                    ]);

                    $message = "Your account has been deactivated for {$duration}. ";
                    $message .= "It will be automatically restored on " . $restoreTime->format('F j, Y \a\t g:i A') . ".";
                }
            }

            return back()->withErrors(['mobile' => $message])->withInput();
        }

        if ($user->status === 'restricted') {
            $message = 'Your account is currently restricted.';

            if ($user->auto_restore_at && \Carbon\Carbon::parse($user->auto_restore_at)->isFuture()) {
                $message .= ' It will be restored on ' .
                    \Carbon\Carbon::parse($user->auto_restore_at)->format('F j, Y \a\t g:i A') . '.';
            }

            return back()->withErrors(['mobile' => $message])->withInput();
        }

        // Attempt authentication
        if (!Hash::check($credentials['password'], $user->password)) {
            return back()->withErrors([
                'mobile' => 'Invalid mobile number or password.'
            ])->withInput();
        }

        // Login successful
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        // Update last login
        $user->update(['last_login' => now()]);

        Log::info('Customer logged in', [
            'user_id' => $user->_id,
            'email' => $user->email
        ]);

        return redirect()->intended(route('customer.home'));
    }
    
    /**
     * Customer home/dashboard
     */
    public function home()
    {
        if (!Auth::check() || !Auth::user()->isCustomer()) {
            return redirect()->route('customer.login')
                ->with('error', 'Please log in to access this page.');
        }

        $user = Auth::user();

        // Get customer statistics
        $stats = [
            'prescriptions' => \App\Models\Prescription::where('customer_id', $user->_id)->count(),
            'orders' => \App\Models\Order::where('customer_id', $user->_id)->count(),
            'notifications' => \App\Models\Notification::where('user_id', $user->_id)
                ->unread()
                ->count(),
            'messages' => 0, // You can add conversation/message count here
            'recentActivity' => [] // You can add recent activity here
        ];

        // Get unread notifications count
        $unreadNotifications = \App\Models\Notification::where('user_id', $user->_id)
            ->unread()
            ->count();

        // Get unread messages count (if you have a conversation/message model)
        $unreadMessages = 0;

        return inertia('Customer/Home/Index', [
            'stats' => $stats,
            'unreadNotifications' => $unreadNotifications,
            'unreadMessages' => $unreadMessages
        ]);
    }

    /**
     * Customer profile
     */
    public function profile()
    {
        if (!Auth::check() || !Auth::user()->isCustomer()) {
            return redirect()->route('customer.login');
        }

        $user = Auth::user();
        return view('client.profile', compact('user'));
    }

    /**
     * Update customer profile
     */
    public function updateProfile(Request $request)
    {
        $user = Auth::user();

        if (!$user || !$user->isCustomer()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'phone' => 'sometimes|string|max:20|unique:users,phone,' . $user->_id . ',_id',
            'email' => 'sometimes|email|max:100|unique:users,email,' . $user->_id . ',_id',
            'address' => 'sometimes|array',
            'address.street' => 'sometimes|string|max:255',
            'address.city' => 'sometimes|string|max:100',
            'address.province' => 'sometimes|string|max:100',
            'address.postal_code' => 'nullable|string|max:20',
        ]);

        $user->update($validated);

        Log::info('Customer profile updated', [
            'user_id' => $user->_id
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()
        ]);
    }

    /**
     * Change customer password
     */
    public function changePassword(Request $request)
    {
        $user = Auth::user();

        if (!$user || !$user->isCustomer()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()
            ],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
        }

        $user->update([
            'password' => Hash::make($validated['password'])
        ]);

        Log::info('Customer password changed', [
            'user_id' => $user->_id
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }

    /**
     * Customer logout
     */
    public function logout(Request $request)
    {
        $user = Auth::user();

        if ($user) {
            Log::info('Customer logged out', [
                'user_id' => $user->_id,
                'email' => $user->email
            ]);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Force a full page reload to break out of Inertia context
        return Inertia::location(route('customer.login'));
    }
}
