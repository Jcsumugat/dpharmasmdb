<?php

namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!auth()->check()) {
            return redirect()->route('admin.login')
                ->with('error', 'Please log in to access the admin panel.');
        }

        // Check if user has admin or staff role
        if (!in_array(auth()->user()->role, ['admin', 'staff'])) {
            auth()->logout();
            return redirect()->route('admin.login')
                ->with('error', 'Access denied. Admin credentials required.');
        }

        return $next($request);
    }
}
