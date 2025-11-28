<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Supplier;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index()
    {
        // Transform _id to id for frontend compatibility
        $suppliers = Supplier::orderBy('name')->get()->map(function ($supplier) {
            return [
                'id' => (string) $supplier->_id,
                '_id' => (string) $supplier->_id,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'created_at' => $supplier->created_at,
                'updated_at' => $supplier->updated_at,
            ];
        });

        return Inertia::render('Admin/Suppliers/Index', [
            'suppliers' => $suppliers
        ]);
    }

    public function apiIndex()
    {
        // Transform _id to id for API responses
        $suppliers = Supplier::orderBy('name')->get()->map(function ($supplier) {
            return [
                'id' => (string) $supplier->_id,
                '_id' => (string) $supplier->_id,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
            ];
        });

        return response()->json([
            'success' => true,
            'suppliers' => $suppliers
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:suppliers,name',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully',
            'supplier' => [
                'id' => (string) $supplier->_id,
                '_id' => (string) $supplier->_id,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:suppliers,name,' . $id . ',_id',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully',
            'supplier' => [
                'id' => (string) $supplier->_id,
                '_id' => (string) $supplier->_id,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
            ]
        ]);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);

        // Check if supplier is being used by any products
        $productCount = \App\Models\Product::where('supplier_id', $id)->count();

        if ($productCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete supplier. It is currently assigned to {$productCount} product(s). Please reassign those products first."
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully'
        ]);
    }
}
