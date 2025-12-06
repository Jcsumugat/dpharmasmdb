import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', 'sans-serif'],
            },
            spacing: {
                '70': '17.5rem', // 280px for sidebar width
                '22': '5.5rem',  // 88px for modal icon
            },
            animation: {
                'float': 'float 20s infinite linear',
                'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
                'fade-in': 'fadeIn 0.2s ease',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            keyframes: {
                float: {
                    '0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '0' },
                    '10%': { opacity: '1' },
                    '90%': { opacity: '1' },
                    '100%': { transform: 'translateY(-100px) rotate(360deg)', opacity: '0' },
                },
                'bounce-slow': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': {
                        transform: 'translateY(30px) scale(0.95)',
                        opacity: '0'
                    },
                    '100%': {
                        transform: 'translateY(0) scale(1)',
                        opacity: '1'
                    },
                },
            },
        },
    },
    plugins: [forms],
};
