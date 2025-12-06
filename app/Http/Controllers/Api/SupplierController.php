<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Supplier;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use MongoDB\BSON\ObjectId;

class SupplierController extends Controller
{
    /**
     * Display the supplier management page with all suppliers
     */
    public function index()
    {
        try {
            Log::info('========== FETCHING SUPPLIERS ==========');

            // Get suppliers and transform to plain array
            $suppliers = Supplier::orderBy('name')
                ->get()
                ->map(function ($supplier) {
                    return [
                        'id' => (string) $supplier->_id,
                        '_id' => (string) $supplier->_id,
                        'name' => $supplier->name ?? '',
                        'contact_person' => $supplier->contact_person ?? '',
                        'phone' => $supplier->phone ?? '',
                        'email' => $supplier->email ?? '',
                        'address' => $supplier->address ?? '',
                        'total_orders' => $supplier->total_orders ?? 0,
                        'on_time_delivery_rate' => (float) ($supplier->on_time_delivery_rate ?? 0),
                        'created_at' => $supplier->created_at ? $supplier->created_at->format('Y-m-d H:i:s') : null,
                        'updated_at' => $supplier->updated_at ? $supplier->updated_at->format('Y-m-d H:i:s') : null,
                    ];
                })
                ->values()
                ->all();

            Log::info('Suppliers count: ' . count($suppliers));
            Log::info('Suppliers data: ' . json_encode($suppliers));
            Log::info('========================================');

            return Inertia::render('Admin/Suppliers/Index', [
                'suppliers' => $suppliers,
            ]);

        } catch (\Exception $e) {
            Log::error('========== SUPPLIER INDEX ERROR ==========');
            Log::error('Error message: ' . $e->getMessage());
            Log::error('Error file: ' . $e->getFile() . ':' . $e->getLine());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            Log::error('==========================================');

            return Inertia::render('Admin/Suppliers/Index', [
                'suppliers' => [],
            ]);
        }
    }

    /**
     * API endpoint to get all suppliers (for AJAX requests)
     */
    public function apiIndex()
    {
        try {
            $suppliers = Supplier::orderBy('name')->get()->map(function ($supplier) {
                return [
                    'id' => (string) $supplier->_id,
                    '_id' => (string) $supplier->_id,
                    'name' => $supplier->name,
                    'contact_person' => $supplier->contact_person,
                    'phone' => $supplier->phone,
                    'email' => $supplier->email,
                    'address' => $supplier->address,
                    'total_orders' => $supplier->total_orders ?? 0,
                    'on_time_delivery_rate' => (float) ($supplier->on_time_delivery_rate ?? 0),
                ];
            })->values();

            return response()->json([
                'success' => true,
                'suppliers' => $suppliers
            ]);
        } catch (\Exception $e) {
            Log::error('Error in apiIndex: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch suppliers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created supplier
     */
    public function store(Request $request)
    {
        try {
            Log::info('Creating new supplier', ['data' => $request->all()]);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'contact_person' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'email' => 'nullable|email|max:255',
                'address' => 'nullable|string',
            ]);

            // Check for duplicate name
            $existingSupplier = Supplier::where('name', $validated['name'])->first();
            if ($existingSupplier) {
                Log::warning('Duplicate supplier name attempted', ['name' => $validated['name']]);

                return back()->withErrors([
                    'name' => 'A supplier with this name already exists'
                ])->withInput();
            }

            // Create supplier
            $supplier = new Supplier();
            $supplier->name = $validated['name'];
            $supplier->contact_person = $validated['contact_person'] ?? null;
            $supplier->phone = $validated['phone'] ?? null;
            $supplier->email = $validated['email'] ?? null;
            $supplier->address = $validated['address'] ?? null;
            $supplier->total_orders = 0;
            $supplier->on_time_delivery_rate = 0;
            $supplier->save();

            Log::info('Supplier created successfully', ['id' => (string) $supplier->_id]);

            return back()->with('success', 'Supplier created successfully');

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors())->withInput();

        } catch (\Exception $e) {
            Log::error('Error creating supplier: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return back()->withErrors([
                'general' => 'Failed to create supplier. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Update the specified supplier
     */
    public function update(Request $request, $id)
    {
        try {
            Log::info('Updating supplier', ['id' => $id, 'data' => $request->all()]);

            $supplier = Supplier::find($id);

            if (!$supplier) {
                Log::warning('Supplier not found', ['id' => $id]);
                return back()->withErrors([
                    'general' => 'Supplier not found'
                ]);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'contact_person' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'email' => 'nullable|email|max:255',
                'address' => 'nullable|string',
            ]);

            // Check for duplicate name (excluding current supplier)
            $existingSupplier = Supplier::where('name', $validated['name'])
                ->where('_id', '!=', new ObjectId($id))
                ->first();

            if ($existingSupplier) {
                Log::warning('Duplicate supplier name attempted', ['name' => $validated['name']]);

                return back()->withErrors([
                    'name' => 'A supplier with this name already exists'
                ])->withInput();
            }

            $supplier->name = $validated['name'];
            $supplier->contact_person = $validated['contact_person'] ?? null;
            $supplier->phone = $validated['phone'] ?? null;
            $supplier->email = $validated['email'] ?? null;
            $supplier->address = $validated['address'] ?? null;
            $supplier->save();

            Log::info('Supplier updated successfully', ['id' => $id]);

            return back()->with('success', 'Supplier updated successfully');

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Validation failed', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors())->withInput();

        } catch (\Exception $e) {
            Log::error('Error updating supplier: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return back()->withErrors([
                'general' => 'Failed to update supplier. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Remove the specified supplier
     */
    public function destroy($id)
    {
        try {
            Log::info('Deleting supplier', ['id' => $id]);

            $supplier = Supplier::find($id);

            if (!$supplier) {
                Log::warning('Supplier not found', ['id' => $id]);
                return back()->withErrors([
                    'general' => 'Supplier not found'
                ]);
            }

            // Check if supplier is being used by any products
            $productCount = \App\Models\Product::where('supplier_id', new ObjectId($id))->count();

            if ($productCount > 0) {
                Log::warning('Cannot delete supplier - has products', ['id' => $id, 'product_count' => $productCount]);

                return back()->withErrors([
                    'general' => "Cannot delete supplier. It is currently assigned to {$productCount} product(s). Please reassign those products first."
                ]);
            }

            $supplierName = $supplier->name;
            $supplier->delete();

            Log::info('Supplier deleted successfully', ['id' => $id, 'name' => $supplierName]);

            return back()->with('success', 'Supplier deleted successfully');

        } catch (\Exception $e) {
            Log::error('Error deleting supplier: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return back()->withErrors([
                'general' => 'Failed to delete supplier. Please try again.'
            ]);
        }
    }
}
