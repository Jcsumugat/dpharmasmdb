<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PrescriptionController extends Controller
{
    /**
     * Get prescriptions with filters
     */
    public function index(Request $request)
    {
        $query = Prescription::query();

        // Filter by customer (for customer portal)
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by order type
        if ($request->has('order_type')) {
            $query->where('order_type', $request->order_type);
        }

        $prescriptions = $query->with(['customer', 'order'])
                              ->orderBy('created_at', 'desc')
                              ->paginate(20);

        return response()->json([
            'success' => true,
            'prescriptions' => $prescriptions
        ]);
    }

    /**
     * Upload prescription
     */
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'mobile_number' => 'required|string',
            'prescription_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string',
            'order_type' => 'required|in:prescription,online_order',
        ]);

        $customer = Auth::guard('customer')->user();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        try {
            $file = $request->file('prescription_file');

            // Store file
            $path = $file->store('prescriptions/' . date('Y/m'), 'private');

            // Generate unique token
            $token = Str::random(32);

            // Generate prescription number
            $prescriptionNumber = $this->generatePrescriptionNumber($validated['order_type']);

            // Create prescription
            $prescription = Prescription::create([
                'prescription_number' => $prescriptionNumber,
                'customer_id' => $customer->_id,
                'file_path' => $path,
                'original_filename' => $file->getClientOriginalName(),
                'file_mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'is_encrypted' => false,
                'mobile_number' => $validated['mobile_number'],
                'notes' => $validated['notes'] ?? null,
                'order_type' => $validated['order_type'],
                'status' => 'pending',
                'token' => $token,
                'items' => [], // Will be populated when admin approves
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Prescription uploaded successfully',
                'prescription' => $prescription,
                'token' => $token
            ], 201);
        } catch (\Exception $e) {
            Log::error('Prescription upload failed', [
                'customer_id' => $customer->_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload prescription'
            ], 500);
        }
    }

    /**
     * Approve prescription with items
     */
    public function approve(Request $request, $id)
    {
        $prescription = Prescription::findOrFail($id);

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.status' => 'required|string|in:available,out_of_stock',
            'admin_message' => 'nullable|string',
        ]);

        try {
            // Validate product availability
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if (!$product->canFulfillQuantity($item['quantity'])) {
                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for {$product->product_name}"
                    ], 400);
                }
            }

            // Update prescription with items
            $prescription->update([
                'items' => $validated['items'],
                'status' => 'approved',
                'admin_message' => $validated['admin_message'] ?? null,
            ]);

            // Create order
            $order = Order::create([
                'order_id' => $prescription->prescription_number,
                'prescription_id' => $prescription->_id,
                'customer_id' => $prescription->customer_id,
                'items' => $validated['items'],
                'status' => 'pending',
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Prescription approved successfully',
                'prescription' => $prescription,
                'order' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve prescription: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Decline prescription
     */
    public function decline(Request $request, $id)
    {
        $prescription = Prescription::findOrFail($id);

        $validated = $request->validate([
            'admin_message' => 'required|string',
        ]);

        $prescription->decline($validated['admin_message']);

        return response()->json([
            'success' => true,
            'message' => 'Prescription declined',
            'prescription' => $prescription
        ]);
    }

    /**
     * Complete prescription (mark as fulfilled)
     */
    public function complete($id)
    {
        $prescription = Prescription::findOrFail($id);
        $prescription->complete();

        return response()->json([
            'success' => true,
            'message' => 'Prescription completed',
            'prescription' => $prescription
        ]);
    }

    /**
     * Generate prescription number
     */
    private function generatePrescriptionNumber($orderType)
    {
        $prefix = $orderType === 'prescription' ? 'RX' : 'OD';
        $count = Prescription::where('order_type', $orderType)->count() + 1;
        return $prefix . str_pad($count, 5, '0', STR_PAD_LEFT);
    }

    /**
     * View prescription file
     */
    public function viewFile($id)
    {
        $prescription = Prescription::findOrFail($id);

        // Check authorization
        $user = Auth::guard('customer')->user() ?? Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Customer can only view their own prescriptions
        if ($user instanceof \App\Models\Customer && $user->_id != $prescription->customer_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        if (!Storage::disk('private')->exists($prescription->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('private')->response($prescription->file_path);
    }
}
