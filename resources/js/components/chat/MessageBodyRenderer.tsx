import React from 'react';
import { MapPin, ExternalLink, Navigation, Phone, User, FileText, Download, Mic, ImageIcon } from 'lucide-react';

interface MessageBodyRendererProps {
    body?: string | null;
    type?: string | null;
    isMe?: boolean;
    isDark?: boolean;
    createdAt?: string;
    isEdited?: boolean;
}

export type SpecialMessageParsed =
    | {
          kind: 'location';
          url: string;
          latitude?: number;
          longitude?: number;
          title: string;
          address?: string;
      }
    | {
          kind: 'contact';
          name: string;
          phone: string;
          email: string;
      }
    | {
          kind: 'image';
          fileName: string;
          fileSize: number;
          url?: string;
      }
    | {
          kind: 'audio';
          fileName?: string;
          url?: string;
          duration?: number;
      }
    | {
          kind: 'document';
          fileName: string;
          fileSize: number;
          url?: string;
      }
    | {
          kind: 'text';
          text: string;
      };

export function parseSpecialMessage(body?: string | null, type?: string | null): SpecialMessageParsed {
    const trimmed = (body || '').toString().trim();
    const msgType = (type || '').toString().trim();

    // 1. Check for JSON-encoded payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);

            // Location
            if (
                parsed.type === 'location' ||
                parsed.latitude !== undefined ||
                parsed.location_url ||
                (parsed.url && typeof parsed.url === 'string' && parsed.url.includes('maps.google.com'))
            ) {
                return {
                    kind: 'location',
                    url:
                        parsed.url ||
                        parsed.location_url ||
                        (parsed.latitude !== undefined && parsed.longitude !== undefined
                            ? `https://maps.google.com/?q=${parsed.latitude},${parsed.longitude}`
                            : 'https://maps.google.com'),
                    latitude: parsed.latitude !== undefined ? Number(parsed.latitude) : undefined,
                    longitude: parsed.longitude !== undefined ? Number(parsed.longitude) : undefined,
                    title: parsed.title || 'Shared Location',
                    address: parsed.address || '',
                };
            }

            // Contact
            if (parsed.type === 'contact' || parsed.phone || parsed.phone_number) {
                return {
                    kind: 'contact',
                    name: parsed.name || 'Contact',
                    phone: (parsed.phone || parsed.phone_number || '').toString(),
                    email: (parsed.email || '').toString(),
                };
            }

            // Image attachment payload
            const isImg =
                parsed.type === 'image' ||
                parsed.file_type === 'image' ||
                (parsed.file_type && typeof parsed.file_type === 'string' && parsed.file_type.startsWith('image/')) ||
                (parsed.file_name && /\.(jpg|jpeg|png|webp|gif|bmp|svg|heic)$/i.test(parsed.file_name));

            if (isImg) {
                return {
                    kind: 'image',
                    fileName: (parsed.file_name || 'Photo').toString(),
                    fileSize: Number(parsed.file_size || 0),
                    url: parsed.url ? parsed.url.toString() : undefined,
                };
            }

            // Audio / Voice Note attachment payload
            const isAud =
                parsed.type === 'audio' ||
                parsed.file_type === 'audio' ||
                (parsed.file_type && typeof parsed.file_type === 'string' && parsed.file_type.startsWith('audio/')) ||
                (parsed.file_name && /\.(m4a|aac|mp3|ogg|wav|opus)$/i.test(parsed.file_name)) ||
                (parsed.file_name && typeof parsed.file_name === 'string' && parsed.file_name.startsWith('voice_')) ||
                parsed.voice;

            if (isAud) {
                return {
                    kind: 'audio',
                    fileName: (parsed.file_name || 'Voice note').toString(),
                    url: parsed.url ? parsed.url.toString() : undefined,
                    duration: Number(parsed.duration || 0),
                };
            }

            // Document / Generic attachment payload
            if (parsed.type === 'document' || parsed.file_name || parsed.file_path || parsed.file_size || parsed.message_id) {
                return {
                    kind: 'document',
                    fileName: (parsed.file_name || parsed.fileName || 'Document').toString(),
                    fileSize: Number(parsed.file_size || parsed.fileSize || 0),
                    url: parsed.url ? parsed.url.toString() : undefined,
                };
            }
        } catch (_) {
            // Not valid JSON, continue with pattern matching
        }
    }

    // 2. Check if message type is explicitly 'location' or contains Google Maps link
    if (
        msgType === 'location' ||
        trimmed.includes('maps.google.com') ||
        trimmed.includes('maps.apple.com') ||
        trimmed.includes('google.com/maps')
    ) {
        const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : (trimmed.startsWith('http') ? trimmed : 'https://maps.google.com');
        const coordMatch = url.match(/q=([-\d.]+),([-\d.]+)/) || url.match(/query=([-\d.]+),([-\d.]+)/);
        return {
            kind: 'location',
            url: url,
            latitude: coordMatch ? parseFloat(coordMatch[1]) : undefined,
            longitude: coordMatch ? parseFloat(coordMatch[2]) : undefined,
            title: 'Shared Location',
            address: '',
        };
    }

    // 3. Check for Contact formatted string
    if (msgType === 'contact' || trimmed.startsWith('👤 Contact:')) {
        const lines = trimmed.split('\n');
        let name = 'Contact';
        let phone = '';
        let email = '';
        for (const line of lines) {
            if (line.includes('Contact:')) name = line.replace(/.*Contact:\s*/, '').trim();
            if (line.includes('Phone:')) phone = line.replace(/.*Phone:\s*/, '').trim();
            if (line.includes('Email:')) email = line.replace(/.*Email:\s*/, '').trim();
        }
        return {
            kind: 'contact',
            name: name || 'Contact',
            phone,
            email,
        };
    }

    // 4. Check for Photo string or type
    if (
        msgType === 'image' ||
        /\.(jpg|jpeg|png|webp|gif|bmp|svg|heic)$/i.test(trimmed) ||
        trimmed.toLowerCase() === 'photo'
    ) {
        return {
            kind: 'image',
            fileName: trimmed,
            fileSize: 0,
        };
    }

    // 5. Check for Voice / Audio body
    if (
        msgType === 'audio' ||
        trimmed.endsWith('.m4a') ||
        trimmed.endsWith('.mp3') ||
        trimmed.endsWith('.aac') ||
        trimmed.startsWith('voice_')
    ) {
        return {
            kind: 'audio',
            fileName: trimmed,
            url: trimmed.startsWith('http') ? trimmed : undefined,
            duration: 0,
        };
    }

    return {
        kind: 'text',
        text: trimmed,
    };
}

export function formatMessagePreview(msg: { body?: string | null; type?: string | null; is_deleted?: boolean } | null | undefined): {
    icon: 'text' | 'image' | 'audio' | 'document' | 'location' | 'contact';
    label: string;
} {
    if (!msg) return { icon: 'text', label: 'No messages yet' };
    if (msg.is_deleted) return { icon: 'text', label: '🚫 This message was deleted' };

    const type = (msg.type || '').toString();
    const body = (msg.body || '').toString();

    if (type === 'image' || body.includes('Photo') || body.includes('📷')) {
        return { icon: 'image', label: 'Photo' };
    }

    const special = parseSpecialMessage(body, type);

    if (special.kind === 'location') {
        return { icon: 'location', label: special.title || 'Location' };
    }
    if (special.kind === 'contact') {
        return { icon: 'contact', label: `Contact: ${special.name}` };
    }
    if (special.kind === 'image') {
        return { icon: 'image', label: 'Photo' };
    }
    if (special.kind === 'audio' || type === 'audio') {
        return { icon: 'audio', label: 'Voice note' };
    }
    if (special.kind === 'document' || type === 'document') {
        return { icon: 'document', label: special.fileName || 'Document' };
    }

    // Suppress raw JSON string preview
    if (special.text && special.text.startsWith('{') && special.text.includes('"file_')) {
        return { icon: 'document', label: 'Attachment' };
    }

    return { icon: 'text', label: special.text || body || '' };
}

export const MessageBodyRenderer: React.FC<MessageBodyRendererProps> = ({
    body,
    type,
    isMe,
    isDark,
}) => {
    const safeBody = (body || '').toString();
    const safeType = (type || '').toString();
    const special = parseSpecialMessage(safeBody, safeType);

    // 1. LOCATION MESSAGE CARD
    if (special.kind === 'location') {
        const { url, latitude, longitude, title, address } = special;
        return (
            <div className="flex flex-col gap-2 min-w-[240px] max-w-sm rounded-xl overflow-hidden">
                {/* Map Graphic Preview Header */}
                <div
                    onClick={() => window.open(url || 'https://maps.google.com', '_blank', 'noopener,noreferrer')}
                    className="relative h-28 w-full rounded-lg overflow-hidden border dark:border-white/10 border-neutral-200 cursor-pointer group/map flex flex-col justify-between p-3 bg-gradient-to-br from-sky-900/60 via-slate-800/80 to-slate-900 text-white shadow-inner"
                    style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(39, 136, 232, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%)`,
                    }}
                >
                    {/* Grid Pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    />

                    {/* Top Tag */}
                    <div className="relative z-10 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2788E8]/30 border border-[#2788E8]/50 text-sky-200 backdrop-blur-md flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            Live GPS
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-white/70 group-hover/map:text-white group-hover/map:scale-110 transition-all" />
                    </div>

                    {/* Center Animated Pin */}
                    <div className="relative z-10 flex items-center justify-center my-auto">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-9 w-9 rounded-full bg-[#2788E8]/30 animate-ping" />
                            <div className="h-9 w-9 rounded-full bg-[#2788E8] border-2 border-white shadow-lg flex items-center justify-center">
                                <MapPin className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Coordinates pill */}
                    {latitude !== undefined && longitude !== undefined && (
                        <div className="relative z-10 text-[9px] font-mono text-white/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-fit">
                            {latitude.toFixed(5)}°, {longitude.toFixed(5)}°
                        </div>
                    )}
                </div>

                {/* Location Title & Action */}
                <div className="flex items-center justify-between gap-2 px-1">
                    <div className="min-w-0">
                        <h4 className="text-xs font-bold dark:text-white text-neutral-900 truncate">
                            {title || 'Current Location'}
                        </h4>
                        {address ? (
                            <p className="text-[10px] text-neutral-400 truncate">{address}</p>
                        ) : (
                            <p className="text-[10px] text-neutral-400">Click to view on Google Maps</p>
                        )}
                    </div>

                    <a
                        href={url || 'https://maps.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#2788E8] hover:bg-[#1f73c7] text-white text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-sm"
                    >
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>
        );
    }

    // 2. CONTACT CARD
    if (special.kind === 'contact') {
        const { name, phone, email } = special;
        return (
            <div className="flex flex-col gap-2.5 min-w-[220px] max-w-xs p-3 rounded-xl border dark:border-white/10 border-neutral-200 dark:bg-white/[0.02] bg-neutral-50/80">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full border border-[#2788E8]/40 bg-[#2788E8]/10 text-[#2788E8] font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {name ? name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase tracking-wider text-[#2788E8] font-bold block">Shared Contact</span>
                        <h4 className="text-xs font-bold dark:text-white text-neutral-900 truncate">{name}</h4>
                        {phone && <p className="text-[11px] text-neutral-400 font-mono truncate">{phone}</p>}
                    </div>
                </div>

                {email && (
                    <div className="text-[10px] text-neutral-400 truncate border-t dark:border-white/5 border-neutral-200 pt-1.5">
                        {email}
                    </div>
                )}

                {phone && (
                    <div className="flex items-center gap-2 pt-1 border-t dark:border-white/5 border-neutral-200">
                        <a
                            href={`tel:${phone}`}
                            className="flex-1 py-1 px-2 rounded-lg bg-[#2788E8]/10 hover:bg-[#2788E8]/20 text-[#2788E8] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Phone className="h-3 w-3" />
                            <span>Call</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(phone)}
                            className="py-1 px-2.5 rounded-lg border dark:border-white/10 border-neutral-200 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        >
                            Copy
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 3. SUPPRESS RAW JSON ATTACHMENT PAYLOADS FROM RENDERING AS PLAIN TEXT
    if (
        special.kind === 'image' ||
        special.kind === 'audio' ||
        (special.kind === 'text' && special.text.startsWith('{') && special.text.includes('"file_'))
    ) {
        return null;
    }

    // 4. TEXT MESSAGE WITH CLICKABLE LINKS
    const renderFormattedText = (rawText?: string | null) => {
        const textStr = (rawText || '').toString();
        if (!textStr) return null;

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = textStr.split(urlRegex);

        return parts.map((part, index) => {
            if (part && part.match(urlRegex)) {
                return (
                    <a
                        key={`link-${index}`}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline break-all inline-flex items-baseline gap-0.5 font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span>{part}</span>
                        <ExternalLink className="h-2.5 w-2.5 inline shrink-0 opacity-80" />
                    </a>
                );
            }
            return <span key={`text-${index}`}>{part}</span>;
        });
    };

    const displayText = special.kind === 'text' ? special.text : '';
    if (!displayText) return null;

    return (
        <span className="whitespace-pre-wrap break-words">
            {renderFormattedText(displayText)}
        </span>
    );
};
