import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo;
    }
}

window.Pusher = Pusher;

export const initEcho = () => {
    if (window.Echo) {
        return window.Echo;
    }

    const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const port = import.meta.env.VITE_REVERB_PORT || '8080';
    const key = import.meta.env.VITE_REVERB_APP_KEY || 'securechatkey';
    const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: key,
        wsHost: host,
        wsPort: parseInt(port),
        wssPort: parseInt(port),
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        // For Inertia.js web, requests are cookie-authenticated, so we don't need token headers
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
            }
        }
    });

    return window.Echo;
};
