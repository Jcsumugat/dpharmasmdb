<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CustomerController extends Controller
{
    /**
     * Get customers with filters
     */
    public function index(Request $request)
    {
        $query = User::where('role', 'customer');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('created_at', 'desc')
                          ->paginate(20);

        return response()->json([
            'success' => true,
            'customers' => $customers
        ]);
    }

    /**
     * Get customer details
     */
    public function show($id)
    {
        $customer = User::where('role', 'customer')
                       ->findOrFail($id);

        return response()->json([
            'success' => true,
            'customer' => $customer
        ]);
    }

    /**
     * Update customer status
     */
    public function updateStatus(Request $request, $id)
    {
        $customer = User::where('role', 'customer')
                       ->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:active,restricted,deactivated,deleted',
            'duration_days' => 'nullable|integer|min:1', // For temporary restrictions
        ]);

        $updates = [
            'status' => $validated['status'],
            'status_changed_at' => now(),
        ];

        // Set auto-restore time if temporary
        if (isset($validated['duration_days'])) {
            $updates['auto_restore_at'] = now()->addDays($validated['duration_days']);
        } else {
            $updates['auto_restore_at'] = null;
        }

        $customer->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Customer status updated',
            'customer' => $customer->fresh()
        ]);
    }

    /**
     * Delete customer
     */
    public function destroy($id)
    {
        $customer = User::where('role', 'customer')
                       ->findOrFail($id);

        $customer->update([
            'status' => 'deleted',
            'status_changed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer marked as deleted'
        ]);
    }

    /**
     * Restore deleted customer
     */
    public function restore($id)
    {
        $customer = User::where('role', 'customer')
                       ->where('status', 'deleted')
                       ->findOrFail($id);

        $customer->update([
            'status' => 'active',
            'status_changed_at' => now(),
            'auto_restore_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer restored',
            'customer' => $customer->fresh()
        ]);
    }

    /**
     * Get customer statistics
     */
    public function stats()
    {
        $stats = [
            'total' => User::where('role', 'customer')->count(),
            'active' => User::where('role', 'customer')->where('status', 'active')->count(),
            'restricted' => User::where('role', 'customer')->where('status', 'restricted')->count(),
            'deactivated' => User::where('role', 'customer')->where('status', 'deactivated')->count(),
            'deleted' => User::where('role', 'customer')->where('status', 'deleted')->count(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}
