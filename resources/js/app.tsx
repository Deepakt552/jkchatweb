import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

// Global fetch wrapper to handle CSRF tokens, session cookies, and authorization timeouts
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
    const cleanInit = init || {};
    
    // Pass same-origin credentials (session cookies) automatically
    cleanInit.credentials = 'same-origin';
    
    // Inject CSRF token automatically for state-changing requests
    const method = (cleanInit.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        cleanInit.headers = {
            ...cleanInit.headers,
            'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
        };
    }
    
    const response = await originalFetch(input, cleanInit);
    
    // Automatically redirect on session mismatch or authentication timeout
    if (response.status === 419 || response.status === 401) {
        window.location.href = '/';
    }
    
    return response;
};

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
