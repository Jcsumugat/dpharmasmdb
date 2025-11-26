<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Models\User;

class AdminAuthController extends Controller
{
    /**
     * Show the admin login form
     */
    public function showLogin()
    {
        return Inertia::render('Admin/Login');
    }

    /**
     * Handle admin login
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Check if user exists and is admin/staff
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => 'No account found with this email address.',
            ]);
        }

        // Check if user has admin or staff role
        if (!in_array($user->role, [User::ROLE_ADMIN, User::ROLE_STAFF])) {
            throw ValidationException::withMessages([
                'email' => 'Access denied. Admin credentials required.',
            ]);
        }

        // Check account status
        if (!$user->isActive()) {
            $status = ucfirst($user->status);
            throw ValidationException::withMessages([
                'email' => "Your account is {$status}. Please contact support.",
            ]);
        }

        // Attempt authentication
        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        // Update last login timestamp
        $user->update(['last_login' => now()]);

        // Regenerate session
        $request->session()->regenerate();

        // Redirect to admin dashboard
        return redirect()->intended(route('admin.dashboard'));
    }

    /**
     * Handle admin logout
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
