import { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function AdminLogin({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.login'));
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <>
            <Head title="Admin Login" />

            <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600">
                {/* Animated Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
                        <defs>
                            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <circle cx="200" cy="200" r="100" fill="url(#glow)">
                            <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="0,0;50,30;0,0"
                                dur="20s"
                                repeatCount="indefinite"
                            />
                        </circle>
                        <circle cx="800" cy="300" r="150" fill="url(#glow)">
                            <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="0,0;-30,50;0,0"
                                dur="25s"
                                repeatCount="indefinite"
                            />
                        </circle>
                        <circle cx="300" cy="800" r="80" fill="url(#glow)">
                            <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="0,0;40,-20;0,0"
                                dur="18s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    </svg>
                </div>

                {/* Login Container */}
                <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex min-h-[600px] relative animate-slideUp">
                    {/* Left Panel - Login Form */}
                    <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold text-gray-800 mb-2">
                                Welcome Back
                            </h1>
                            <p className="text-gray-600 text-lg">
                                Sign in to your admin account
                            </p>
                        </div>

                        {/* Status Message */}
                        {status && (
                            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg animate-shake">
                                {status}
                            </div>
                        )}

                        {/* Error Messages */}
                        {(errors.email || errors.password) && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg animate-shake">
                                {errors.email || errors.password}
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={submit} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:-translate-y-0.5"
                                    autoComplete="username"
                                    placeholder="Enter your email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Field */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:-translate-y-0.5"
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePassword}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all duration-200"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Forgot Password Link */}
                                {canResetPassword && (
                                    <div className="text-right mt-2">
                                        <a
                                            href={route('password.request')}
                                            className="text-sm font-medium text-indigo-600 hover:text-purple-600 hover:underline transition-colors"
                                        >
                                            Forgot your password?
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Remember Me Checkbox */}
                            <div className="flex items-center">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                                    Remember me
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
                                <span className="relative flex items-center justify-center">
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Right Panel - Branding */}
                    <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 items-center justify-center relative overflow-hidden">
                        {/* Grid Pattern Background */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
                                animation: 'gridMove 20s linear infinite',
                            }}></div>
                        </div>

                        {/* Floating Pills */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute w-16 h-16 bg-white/10 rounded-full animate-float" style={{ left: '10%', animationDelay: '0s', animationDuration: '20s' }}></div>
                            <div className="absolute w-16 h-16 bg-white/10 rounded-full animate-float" style={{ left: '50%', animationDelay: '5s', animationDuration: '18s' }}></div>
                            <div className="absolute w-16 h-16 bg-white/10 rounded-full animate-float" style={{ left: '80%', animationDelay: '10s', animationDuration: '22s' }}></div>
                        </div>

                        {/* Brand Content */}
                        <div className="relative z-10 text-center text-white">
                            {/* Brand Icon */}
                            <div className="w-20 h-20 mx-auto mb-8 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/30 animate-bounce-slow">
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                            </div>

                            {/* Brand Title */}
                            <h1 className="text-5xl font-bold mb-4 leading-tight drop-shadow-lg">
                                Digital<br />
                                Pharma<br />
                                Solution
                            </h1>

                            {/* Brand Subtitle */}
                            <p className="text-xl font-light tracking-widest text-white/90">
                                ADMIN PORTAL
                            </p>
                        </div>
                    </div>
                </div>

                {/* Custom Animations */}
                <style jsx>{`
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(40px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-5px); }
                        75% { transform: translateX(5px); }
                    }

                    @keyframes gridMove {
                        0% { transform: translate(0, 0); }
                        100% { transform: translate(10px, 10px); }
                    }

                    .animate-slideUp {
                        animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .animate-shake {
                        animation: shake 0.5s ease-in-out;
                    }
                `}</style>
            </div>
        </>
    );
}
