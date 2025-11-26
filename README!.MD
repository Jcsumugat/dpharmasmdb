# Digital Pharma System - Complete Directory Structure

```
digital-pharma-system/
│
├── app/
│   ├── Console/
│   │   ├── Commands/
│   │   │   ├── MigrateFromMySQL.php
│   │   │   └── TestMongo.php
│   │   └── Kernel.php
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── ConversationController.php
│   │   │   │   ├── CustomerController.php
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── NotificationController.php
│   │   │   │   ├── OrderController.php
│   │   │   │   ├── PrescriptionController.php
│   │   │   │   ├── ProductController.php
│   │   │   │   └── ReportController.php
│   │   │   │
│   │   │   ├── Auth/
│   │   │   │   ├── AdminAuthController.php
│   │   │   │   ├── AuthenticatedSessionController.php
│   │   │   │   ├── ConfirmablePasswordController.php
│   │   │   │   ├── CustomerAuthController.php
│   │   │   │   ├── EmailVerificationNotificationController.php
│   │   │   │   ├── EmailVerificationPromptController.php
│   │   │   │   ├── NewPasswordController.php
│   │   │   │   ├── PasswordController.php
│   │   │   │   ├── PasswordResetLinkController.php
│   │   │   │   ├── RegisteredUserController.php
│   │   │   │   └── VerifyEmailController.php
│   │   │   │
│   │   │   ├── Controller.php
│   │   │   └── ProfileController.php
│   │   │
│   │   ├── Middleware/
│   │   │   ├── AdminMiddleware.php
│   │   │   ├── HandleInertiaRequests.php
│   │   │   └── ... (default Laravel middleware)
│   │   │
│   │   └── Requests/
│   │       ├── Auth/
│   │       │   └── LoginRequest.php
│   │       └── ProfileUpdateRequest.php
│   │
│   ├── Models/
│   │   ├── Category.php
│   │   ├── Conversation.php
│   │   ├── Notification.php
│   │   ├── Order.php
│   │   ├── POSTransaction.php
│   │   ├── Prescription.php
│   │   ├── Product.php
│   │   ├── StockMovement.php
│   │   ├── Supplier.php
│   │   └── User.php
│   │
│   └── Providers/
│       └── AppServiceProvider.php
│
├── bootstrap/
│   ├── app.php
│   ├── cache/
│   └── providers.php
│
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── cache.php
│   ├── database.php
│   ├── filesystems.php
│   ├── logging.php
│   ├── mail.php
│   ├── queue.php
│   ├── services.php
│   └── session.php
│
├── database/
│   ├── factories/
│   │   └── UserFactory.php
│   ├── migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php
│   │   ├── 0001_01_01_000001_create_cache_table.php
│   │   └── 0001_01_01_000002_create_jobs_table.php
│   └── seeders/
│       └── DatabaseSeeder.php
│
├── public/
│   ├── .htaccess
│   ├── favicon.ico
│   ├── index.php
│   └── robots.txt
│
├── resources/
│   ├── css/
│   │   └── app.css
│   │
│   ├── js/
│   │   ├── Components/
│   │   │   ├── ApplicationLogo.jsx
│   │   │   ├── Checkbox.jsx
│   │   │   ├── DangerButton.jsx
│   │   │   ├── Dropdown.jsx
│   │   │   ├── InputError.jsx
│   │   │   ├── InputLabel.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── NavLink.jsx
│   │   │   ├── PrimaryButton.jsx
│   │   │   ├── ResponsiveNavLink.jsx
│   │   │   ├── SecondaryButton.jsx
│   │   │   └── TextInput.jsx
│   │   │
│   │   ├── Layouts/
│   │   │   ├── AuthenticatedLayout.jsx
│   │   │   └── GuestLayout.jsx
│   │   │
│   │   ├── Pages/
│   │   │   ├── Admin/
│   │   │   │   └── Dashboard.jsx
│   │   │   │
│   │   │   ├── Auth/
│   │   │   │   ├── AdminLogin.jsx
│   │   │   │   ├── ConfirmPassword.jsx
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── ResetPassword.jsx
│   │   │   │   └── VerifyEmail.jsx
│   │   │   │
│   │   │   ├── Profile/
│   │   │   │   ├── Edit.jsx
│   │   │   │   └── Partials/
│   │   │   │       ├── DeleteUserForm.jsx
│   │   │   │       ├── UpdatePasswordForm.jsx
│   │   │   │       └── UpdateProfileInformationForm.jsx
│   │   │   │
│   │   │   ├── Dashboard.jsx
│   │   │   └── Welcome.jsx
│   │   │
│   │   ├── app.jsx
│   │   └── bootstrap.js
│   │
│   └── views/
│       ├── app.blade.php
│       └── client/
│           ├── home.blade.php
│           ├── login.blade.php
│           ├── signup1.blade.php
│           └── signup2.blade.php
│
├── routes/
│   ├── auth.php
│   ├── console.php
│   └── web.php
│
├── storage/
│   ├── app/
│   │   ├── private/
│   │   └── public/
│   ├── framework/
│   │   ├── cache/
│   │   ├── sessions/
│   │   ├── testing/
│   │   └── views/
│   └── logs/
│
├── tests/
│   ├── Feature/
│   │   ├── Auth/
│   │   │   ├── AuthenticationTest.php
│   │   │   ├── EmailVerificationTest.php
│   │   │   ├── PasswordConfirmationTest.php
│   │   │   ├── PasswordResetTest.php
│   │   │   ├── PasswordUpdateTest.php
│   │   │   └── RegistrationTest.php
│   │   ├── ExampleTest.php
│   │   └── ProfileTest.php
│   │
│   ├── Unit/
│   │   └── ExampleTest.php
│   │
│   └── TestCase.php
│
├── .env
├── .env.example
├── .gitignore
├── artisan
├── composer.json
├── composer.lock
├── package.json
├── package-lock.json
├── phpunit.xml
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Key Directory Explanations

### `/app` - Application Core
- **Console/Commands**: Artisan commands for MongoDB migration and testing
- **Http/Controllers**: Organized into API, Auth, and general controllers
- **Models**: MongoDB Eloquent models for all entities
- **Providers**: Service providers for bootstrapping

### `/resources` - Frontend Assets
- **js/Components**: Reusable React components
- **js/Layouts**: Layout templates for authenticated and guest users
- **js/Pages**: Page components organized by feature
- **views**: Blade templates for customer-facing pages

### `/routes` - Route Definitions
- **web.php**: Main routes for both admin and customer portals
- **auth.php**: Authentication routes
- **console.php**: Artisan command routes

### `/config` - Configuration Files
- **database.php**: MongoDB and MySQL connection settings
- **auth.php**: Authentication guards and providers
- **filesystems.php**: Storage disk configurations

### `/storage` - File Storage
- **app/private**: Prescription files (encrypted)
- **app/public**: Public assets (QR codes, product images)
- **logs**: Application logs

### `/tests` - Test Suite
- **Feature**: Integration tests
- **Unit**: Unit tests
