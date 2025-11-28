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

        Route::get('/suppliers', function () {
            return Inertia::render('Admin/Suppliers/Index');
        })->name('suppliers');

        Route::get('/products', function () {
            return Inertia::render('Admin/Products/Index');
        })->name('products');

        Route::get('/products', function () {
            return Inertia::render('Admin/Products/Index');
        })->name('products');

        Route::get('/orders', function () {
            return Inertia::render('Admin/Orders/Index');
        })->name('orders');

        Route::get('/prescriptions', function () {
            return Inertia::render('Admin/Prescriptions/Index');
        })->name('prescriptions');

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

            // Suppliers
            Route::get('/suppliers', function () {
                return response()->json([
                    'success' => true,
                    'suppliers' => []
                ]);
            })->name('suppliers.index');

            // Suppliers
            Route::get('/suppliers', [SupplierController::class, 'apiIndex'])->name('suppliers.index');
            Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
            Route::put('/suppliers/{id}', [SupplierController::class, 'update'])->name('suppliers.update');
            Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');


            // Products
            Route::apiResource('products', ProductController::class);
            Route::post('/products/{id}/add-stock', [ProductController::class, 'addStock'])->name('products.add-stock');
            Route::post('/products/{id}/adjust-stock', [ProductController::class, 'adjustStock'])->name('products.adjust-stock');
            Route::get('/products/{id}/batches', [ProductController::class, 'getBatches'])->name('products.batches');
            Route::get('/products/{id}/stock-movements', [ProductController::class, 'getStockMovements'])->name('products.stock-movements');

            // Orders
            Route::apiResource('orders', OrderController::class)->only(['index', 'show', 'update']);
            Route::post('/orders/{id}/update-status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
            Route::post('/orders/{id}/process-payment', [OrderController::class, 'processPayment'])->name('orders.process-payment');
            Route::get('/orders/{id}/timeline', [OrderController::class, 'getTimeline'])->name('orders.timeline');

            // Prescriptions
            Route::apiResource('prescriptions', PrescriptionController::class)->only(['index', 'show', 'update']);
            Route::post('/prescriptions/{id}/verify', [PrescriptionController::class, 'verify'])->name('prescriptions.verify');
            Route::post('/prescriptions/{id}/reject', [PrescriptionController::class, 'reject'])->name('prescriptions.reject');
            Route::get('/prescriptions/{id}/download', [PrescriptionController::class, 'download'])->name('prescriptions.download');

            // Customers
            Route::apiResource('customers', CustomerController::class);
            Route::post('/customers/{id}/toggle-status', [CustomerController::class, 'toggleStatus'])->name('customers.toggle-status');
            Route::get('/customers/{id}/orders', [CustomerController::class, 'getOrders'])->name('customers.orders');
            Route::get('/customers/{id}/prescriptions', [CustomerController::class, 'getPrescriptions'])->name('customers.prescriptions');

            // Conversations
            Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
            Route::get('/conversations/{id}', [ConversationController::class, 'show'])->name('conversations.show');
            Route::post('/conversations/{id}/messages', [ConversationController::class, 'sendMessage'])->name('conversations.send-message');
            Route::post('/conversations/{id}/close', [ConversationController::class, 'close'])->name('conversations.close');

            // Notifications
            Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
            Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
            Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
            Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
        });
    });
});

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

Route::prefix('customer')->name('customer.')->group(function () {

    // Guest routes
    Route::middleware('guest')->group(function () {
        Route::get('/signup/step-1', [CustomerAuthController::class, 'showRegistrationStep1'])->name('signup.step_one');
        Route::post('/signup/step-1', [CustomerAuthController::class, 'handleRegistrationStep1'])->name('signup.step_one.post');
        Route::get('/signup/step-2', [CustomerAuthController::class, 'showRegistrationStep2'])->name('signup.step_two');
        Route::post('/signup/step-2', [CustomerAuthController::class, 'handleRegistrationStep2'])->name('signup.step_two.post');

        Route::get('/login', [CustomerAuthController::class, 'showLoginForm'])->name('login');
        Route::post('/login', [CustomerAuthController::class, 'login'])->name('login.post');
    });

    // Authenticated routes
    Route::middleware('auth')->group(function () {

        // Page routes
        Route::get('/home', [CustomerAuthController::class, 'home'])->name('home');
        Route::get('/profile', [CustomerAuthController::class, 'profile'])->name('profile');
        Route::put('/profile', [CustomerAuthController::class, 'updateProfile'])->name('profile.update');
        Route::post('/profile/change-password', [CustomerAuthController::class, 'changePassword'])->name('profile.change-password');
        Route::post('/logout', [CustomerAuthController::class, 'logout'])->name('logout');

        // API routes
        Route::prefix('api')->name('api.')->group(function () {


            // Products
            Route::get('/products', [ProductController::class, 'index'])->name('products.index');
            Route::get('/products/{id}', [ProductController::class, 'show'])->name('products.show');
            Route::get('/products/search/{query}', [ProductController::class, 'search'])->name('products.search');

            // Orders
            Route::get('/orders', [OrderController::class, 'customerOrders'])->name('orders.index');
            Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
            Route::get('/orders/{id}', [OrderController::class, 'show'])->name('orders.show');
            Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');

            // Prescriptions
            Route::get('/prescriptions', [PrescriptionController::class, 'customerPrescriptions'])->name('prescriptions.index');
            Route::post('/prescriptions', [PrescriptionController::class, 'store'])->name('prescriptions.store');
            Route::get('/prescriptions/{id}', [PrescriptionController::class, 'show'])->name('prescriptions.show');

            // Conversations
            Route::get('/conversations', [ConversationController::class, 'customerConversations'])->name('conversations.index');
            Route::post('/conversations', [ConversationController::class, 'store'])->name('conversations.store');
            Route::get('/conversations/{id}', [ConversationController::class, 'show'])->name('conversations.show');
            Route::post('/conversations/{id}/messages', [ConversationController::class, 'sendMessage'])->name('conversations.send-message');

            // Notifications
            Route::get('/notifications', [NotificationController::class, 'customerNotifications'])->name('notifications.index');
            Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
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
