<?php

use App\Http\Controllers\Auth\AdminAuthController;
use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\SupplierController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root redirect
Route::get('/', function () {
    if (auth()->check()) {
        $user = auth()->user();
        if (in_array($user->role, ['admin', 'staff'])) {
            return redirect()->route('admin.dashboard');
        }
        return redirect()->route('customer.home');
    }
    return redirect()->route('customer.login');
})->name('home');

// ============================================================================
// ADMIN ROUTES
// ============================================================================

Route::prefix('admin')->name('admin.')->group(function () {

    // Guest routes
    Route::middleware('guest')->group(function () {
        Route::get('/login', [AdminAuthController::class, 'showLogin'])->name('login');
        Route::post('/login', [AdminAuthController::class, 'login'])->name('login.post');
    });

    // Authenticated routes
    Route::middleware(['auth'])->group(function () {

        // Page routes
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('/products/create', function () {
            return Inertia::render('Admin/Products/Create');
        })->name('products.create');

        Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers');

        Route::get('/products', function () {
            return Inertia::render('Admin/Products/Index');
        })->name('products');

        Route::get('/products/{id}/edit', function ($id) {
            $product = \App\Models\Product::findOrFail($id);
            $categories = \App\Models\Category::all();
            $suppliers = \App\Models\Supplier::all();

            return Inertia::render('Admin/Products/Edit', [
                'product' => $product,
                'categories' => $categories,
                'suppliers' => $suppliers,
            ]);
        })->name('products.edit');

        Route::get('/products/{id}/batches', function ($id) {
            $product = \App\Models\Product::findOrFail($id);

            $batches = [
                'available_batches' => $product->getAvailableBatches(),
                'expired_batches' => $product->getExpiredBatches(),
                'summary' => [
                    'total_available' => $product->getAvailableBatches()->sum('quantity_remaining'),
                    'total_expired' => $product->getExpiredBatches()->sum('quantity_remaining'),
                    'batch_count' => $product->getAvailableBatches()->count()
                ]
            ];

            return Inertia::render('Admin/Products/BatchManagement', [
                'product' => [
                    'id' => (string) $product->_id,
                    'product_name' => $product->product_name,
                    'product_code' => $product->product_code,
                    'stock_quantity' => $product->stock_quantity,
                    'unit' => $product->unit,
                    'unit_quantity' => $product->unit_quantity,
                    'dosage_unit' => $product->dosage_unit,
                    'supplier_id' => $product->supplier_id ? (string) $product->supplier_id : null,
                ],
                'batches' => $batches
            ]);
        })->name('products.batches');

        // Prescriptions page (now handles orders too)
        Route::get('/prescriptions', function () {
            return Inertia::render('Admin/Prescriptions/Index');
        })->name('prescriptions');

        Route::get('/prescriptions/{id}', function ($id) {
            return Inertia::render('Admin/Prescriptions/Detail');
        })->name('prescriptions.detail');

        // Notifications page
        Route::get('/notifications', function () {
            return Inertia::render('Admin/Notifications/Index');
        })->name('notifications');

        Route::get('/customers', function () {
            return Inertia::render('Admin/Customers/Index');
        })->name('customers');

        Route::get('/conversations', function () {
            return Inertia::render('Admin/Conversations/Index');
        })->name('conversations');

        Route::get('/reports', function () {
            return Inertia::render('Admin/Reports/Index');
        })->name('reports');

        Route::post('/logout', [AdminAuthController::class, 'logout'])->name('logout');

        // API routes
        Route::prefix('api')->name('api.')->group(function () {

            // Dashboard
            Route::get('/dashboard/stats', [DashboardController::class, 'getStats'])->name('dashboard.stats');
            Route::get('/dashboard/recent-activity', [DashboardController::class, 'getRecentActivity'])->name('dashboard.activity');

            // Categories
            Route::get('/categories', function () {
                return response()->json([
                    'success' => true,
                    'categories' => []
                ]);
            })->name('categories.index');

            // Suppliers API routes
            Route::get('/suppliers', [SupplierController::class, 'apiIndex'])->name('suppliers.index');
            Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
            Route::put('/suppliers/{id}', [SupplierController::class, 'update'])->name('suppliers.update');
            Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');

            // Products
            Route::apiResource('products', ProductController::class);
            Route::post('/products/{id}/add-batch', [ProductController::class, 'addBatch'])->name('products.add-batch');
            Route::put('/products/{productId}/batches/{batchId}', [ProductController::class, 'updateBatch'])->name('products.batches.update');
            Route::post('/products/{id}/add-stock', [ProductController::class, 'addStock'])->name('products.add-stock');
            Route::post('/products/{id}/adjust-stock', [ProductController::class, 'adjustStock'])->name('products.adjust-stock');
            Route::get('/products/{id}/batches', [ProductController::class, 'getBatches'])->name('products.batches.api');
            Route::get('/products/{id}/stock-movements', [ProductController::class, 'getStockMovements'])->name('products.stock-movements');

            // Prescriptions (now includes order management)
            Route::get('/prescriptions', [PrescriptionController::class, 'index'])->name('prescriptions.index');
            Route::get('/prescriptions/{id}', [PrescriptionController::class, 'show'])->name('prescriptions.show');
            Route::post('/prescriptions/{id}/verify', [PrescriptionController::class, 'verify'])->name('prescriptions.verify');
            Route::post('/prescriptions/{id}/reject', [PrescriptionController::class, 'reject'])->name('prescriptions.reject');
            Route::get('/prescriptions/{id}/download', [PrescriptionController::class, 'download'])->name('prescriptions.download');

            // Admin order management
            Route::post('/orders/{id}/mark-ready', [OrderController::class, 'markReadyForPickup'])->name('orders.mark-ready');
            Route::post('/orders/{id}/complete-pickup', [OrderController::class, 'completePickup'])->name('orders.complete-pickup');
            Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');

            // Order management through prescriptions
            Route::post('/prescriptions/{id}/complete-order', [PrescriptionController::class, 'completeOrder'])->name('prescriptions.complete-order');
            Route::post('/prescriptions/{id}/cancel-order', [PrescriptionController::class, 'cancelOrder'])->name('prescriptions.cancel-order');
            Route::post('/prescriptions/{id}/update-order-status', [PrescriptionController::class, 'updateOrderStatus'])->name('prescriptions.update-order-status');
            Route::post('/prescriptions/{id}/update-payment-status', [PrescriptionController::class, 'updatePaymentStatus'])->name('prescriptions.update-payment-status');
            Route::get('/prescriptions/{id}/timeline', [PrescriptionController::class, 'getOrderTimeline'])->name('prescriptions.timeline');

            // Customers
            Route::apiResource('customers', CustomerController::class);
            Route::post('/customers/{id}/toggle-status', [CustomerController::class, 'toggleStatus'])->name('customers.toggle-status');
            Route::get('/customers/{id}/orders', [CustomerController::class, 'getOrders'])->name('customers.orders');
            Route::get('/customers/{id}/prescriptions', [CustomerController::class, 'getPrescriptions'])->name('customers.prescriptions');

            // Conversations
            Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
            Route::get('/conversations/{id}', [ConversationController::class, 'show'])->name('conversations.show');
            Route::post('/conversations/{id}/messages', [ConversationController::class, 'sendMessage'])->name('conversations.send-message');
            Route::post('/conversations/{id}/mark-read', [ConversationController::class, 'markAsRead'])->name('conversations.mark-read');
            Route::post('/conversations/{id}/status', [ConversationController::class, 'updateStatus'])->name('conversations.update-status');
            Route::post('/conversations/{id}/close', [ConversationController::class, 'close'])->name('conversations.close');

            // Notifications
            Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
            Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount'])->name('notifications.unread-count');
            Route::get('/notifications/recent', [NotificationController::class, 'getRecent'])->name('notifications.recent');
            Route::get('/notifications/stats', [NotificationController::class, 'getStats'])->name('notifications.stats');
            Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
            Route::post('/notifications/{id}/mark-unread', [NotificationController::class, 'markAsUnread'])->name('notifications.mark-unread');
            Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
            Route::post('/notifications/mark-multiple-read', [NotificationController::class, 'markMultipleAsRead'])->name('notifications.mark-multiple-read');
            Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
            Route::post('/notifications/delete-multiple', [NotificationController::class, 'destroyMultiple'])->name('notifications.delete-multiple');
            Route::delete('/notifications/delete-all-read', [NotificationController::class, 'deleteAllRead'])->name('notifications.delete-all-read');
        });
    });
});

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

Route::prefix('customer')->name('customer.')->group(function () {

    Route::get('/signup/step-1', [CustomerAuthController::class, 'showRegistrationStep1'])->name('signup.step_one');
    Route::post('/signup/step-1', [CustomerAuthController::class, 'handleRegistrationStep1'])->name('signup.step_one.post');
    Route::get('/signup/step-2', [CustomerAuthController::class, 'showRegistrationStep2'])->name('signup.step_two');
    Route::post('/signup/step-2', [CustomerAuthController::class, 'handleRegistrationStep2'])->name('signup.step_two.post');

    Route::get('/login', [CustomerAuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [CustomerAuthController::class, 'login'])->name('login.post');

    // Authenticated routes
    Route::middleware('auth')->group(function () {

        // Page routes
        Route::get('/home', [CustomerAuthController::class, 'home'])->name('home');
        Route::get('/profile', [CustomerAuthController::class, 'profile'])->name('profile');
        Route::put('/profile', [CustomerAuthController::class, 'updateProfile'])->name('profile.update');
        Route::post('/profile/change-password', [CustomerAuthController::class, 'changePassword'])->name('profile.change-password');

        // Products page
        Route::get('/products', function () {
            return Inertia::render('Customer/Products/Index');
        })->name('products');

        Route::get('/orders/{id}', function ($id) {
            try {
                $order = \App\Models\Order::where('_id', $id)
                    ->where('customer_id', auth()->id())
                    ->firstOrFail();

                return Inertia::render('Customer/Orders/Detail', [
                    'order' => $order
                ]);
            } catch (\Exception $e) {
                return redirect()->route('customer.orders')
                    ->with('error', 'Order not found');
            }
        })->name('orders.detail');

        // Checkout page
        Route::get('/checkout', function () {
            return Inertia::render('Customer/Checkout');
        })->name('checkout');

        // Orders page
        Route::get('/orders', function () {
            return Inertia::render('Customer/Orders/Index');
        })->name('orders');

        // Prescriptions/Orders page
        Route::get('/prescriptions', function () {
            return Inertia::render('Customer/Prescriptions/Index');
        })->name('prescriptions');

        Route::get('/prescriptions/{id}', function ($id) {
            try {
                $prescription = \App\Models\Prescription::with(['customer', 'order'])
                    ->where('_id', $id)
                    ->where('customer_id', auth()->id())
                    ->firstOrFail();

                return Inertia::render('Customer/Prescriptions/Detail', [
                    'prescription' => $prescription
                ]);
            } catch (\Exception $e) {
                return redirect()->route('customer.prescriptions')
                    ->with('error', 'Prescription not found');
            }
        })->name('prescriptions.detail');


        Route::get('/conversations', function () {
            return Inertia::render('Customer/Conversations/Index');
        })->name('conversations');

        Route::get('/conversations/{id}', function ($id) {
            return Inertia::render('Customer/Conversations/Detail');
        })->name('conversations.detail');


        // Notifications page
        Route::get('/notifications', function () {
            return Inertia::render('Customer/Notifications/Index');
        })->name('notifications');

        Route::post('/logout', [CustomerAuthController::class, 'logout'])->name('logout');

        // API routes
        Route::prefix('api')->name('api.')->group(function () {

            // Products
            Route::get('/products', [ProductController::class, 'index'])->name('products.index');
            Route::get('/products/{id}', [ProductController::class, 'show'])->name('products.show');
            Route::get('/products/search/{query}', [ProductController::class, 'search'])->name('products.search');

            Route::get('/orders', [OrderController::class, 'customerOrders'])->name('orders.index');
            Route::post('/orders/create', [OrderController::class, 'create'])->name('orders.create');

            // Prescriptions (now includes order management for customer)
            Route::get('/prescriptions', [PrescriptionController::class, 'customerPrescriptions'])->name('prescriptions.index');
            Route::post('/prescriptions', [PrescriptionController::class, 'store'])->name('prescriptions.store');
            Route::get('/prescriptions/{id}', [PrescriptionController::class, 'show'])->name('prescriptions.show');
            Route::post('/prescriptions/{id}/cancel-order', [PrescriptionController::class, 'cancelOrder'])->name('prescriptions.cancel-order');
            Route::get('/prescriptions/{id}/timeline', [PrescriptionController::class, 'getOrderTimeline'])->name('prescriptions.timeline');

            // Conversations
            Route::get('/conversations', [ConversationController::class, 'customerConversations'])->name('conversations.index');
            Route::post('/conversations', [ConversationController::class, 'store'])->name('conversations.store');
            Route::get('/conversations/{id}', [ConversationController::class, 'show'])->name('conversations.show');
            Route::post('/conversations/{id}/messages', [ConversationController::class, 'sendMessage'])->name('conversations.send-message');
            Route::post('/conversations/{id}/mark-read', [ConversationController::class, 'markAsRead'])->name('conversations.mark-read');

            // Notifications
            Route::get('/notifications', [NotificationController::class, 'customerNotifications'])->name('notifications.index');
            Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount'])->name('notifications.unread-count');
            Route::get('/notifications/recent', [NotificationController::class, 'getRecent'])->name('notifications.recent');
            Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
            Route::post('/notifications/{id}/mark-unread', [NotificationController::class, 'markAsUnread'])->name('notifications.mark-unread');
            Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
            Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
        });
    });
});

// Fallback route
Route::fallback(function () {
    if (auth()->check()) {
        $user = auth()->user();
        if (in_array($user->role, ['admin', 'staff'])) {
            return redirect()->route('admin.dashboard');
        }
        return redirect()->route('customer.home');
    }
    return redirect()->route('customer.login');
});
