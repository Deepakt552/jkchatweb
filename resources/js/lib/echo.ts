import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

window.Pusher = Pusher;

export const initEcho = () => {
    if (window.Echo) {
        return window.Echo;
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const key = import.meta.env.VITE_REVERB_APP_KEY || 'securechatkey';
    const scheme = import.meta.env.VITE_REVERB_SCHEME || (isHttps ? 'https' : 'http');
    
    // In production HTTPS behind reverse proxy, default WSS port is 443 (standard HTTPS/WSS port)
    const defaultWssPort = isHttps ? 443 : 8080;
    const port = import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : defaultWssPort;

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https' || isHttps,
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
