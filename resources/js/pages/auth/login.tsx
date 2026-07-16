import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, QrCode, RefreshCw, Smartphone, KeyRound, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    // Standard form handler
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // QR Login state
    const [qrSessionId, setQrSessionId] = useState<string | null>(null);
    const [qrStatus, setQrStatus] = useState<'loading' | 'active' | 'expired' | 'success'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch new QR session ID
    const fetchQrSession = async () => {
        setQrStatus('loading');
        setErrorMessage(null);
        try {
            const response = await fetch('/qr-login/session');
            if (!response.ok) {
                throw new Error('Failed to create login session.');
            }
            const resData = await response.json();
            setQrSessionId(resData.session_id);
            setQrStatus('active');
        } catch (err: any) {
            setErrorMessage(err.message || 'Error generating QR code.');
            setQrStatus('expired');
        }
    };

    // Initialize QR login on load
    useEffect(() => {
        fetchQrSession();
    }, []);

    // Poll QR status
    useEffect(() => {
        if (qrStatus !== 'active' || !qrSessionId) return;

        let isMounted = true;
        let pollTimer: any = null;
        let expireTimer: any = null;

        // Auto expire after 5 minutes
        expireTimer = setTimeout(() => {
            if (isMounted) {
                setQrStatus('expired');
            }
        }, 5 * 60 * 1000);

        const poll = async () => {
            try {
                const response = await fetch(`/qr-login/status/${qrSessionId}`);
                if (response.status === 410) {
                    if (isMounted) setQrStatus('expired');
                    return;
                }
                if (!response.ok) return;

                const resData = await response.json();
                if (resData.status === 'success') {
                    if (isMounted) {
                        setQrStatus('success');
                        // Redirect to dashboard on successful scan
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 1000);
                    }
                    return;
                }
            } catch (err) {
                console.error('Error polling QR status', err);
            }

            if (isMounted && qrStatus === 'active') {
                pollTimer = setTimeout(poll, 2000);
            }
        };

        pollTimer = setTimeout(poll, 2000);

        return () => {
            isMounted = false;
            clearTimeout(pollTimer);
            clearTimeout(expireTimer);
        };
    }, [qrStatus, qrSessionId]);

    // QR Code data payload
    const qrDataPayload = qrSessionId
        ? JSON.stringify({ action: 'login', session_id: qrSessionId })
        : '';

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#070707] p-4 text-[#FFFFFF] antialiased overflow-hidden selection:bg-[#C88B37]/30 selection:text-white">
            <Head title="Log in" />

            {/* Glowing liquid backdrop blur orbs */}
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#C88B37]/5 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-[#C88B37]/3 blur-[140px] pointer-events-none"></div>

            {/* Main glassmorphic interface layout card */}
            <div className="relative w-full max-w-4xl rounded-3xl border border-white/5 bg-[#121212]/50 p-8 md:p-14 backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.8),_0_0_50px_rgba(200,139,55,0.02)]">
                
                {/* Glowing subtle top gold line */}
                <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#C88B37]/45 to-transparent"></div>

                <div className="grid gap-12 md:grid-cols-2 items-center">
                    
                    {/* Left Column: Modern Credentials Form */}
                    <div className="flex flex-col">
                        
                        {/* Title Block */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C88B37]/35 bg-[#C88B37]/10 shadow-[0_0_12px_rgba(200,139,55,0.1)]">
                                    <KeyRound className="h-4.5 w-4.5 text-[#C88B37]" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-white">
                                    JK <span className="text-[#C88B37]">Chat</span>
                                </h1>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
                            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                                Enter your workspace credentials or use the secure mobile scanner to authenticate.
                            </p>
                        </div>

                        <form className="flex flex-col gap-6" onSubmit={submit}>
                            
                            {/* Email Input Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-neutral-400 text-xs font-semibold uppercase tracking-wider pl-1">Email Address</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="name@company.com"
                                        className="h-12 border-white/5 bg-[#181818]/60 text-white placeholder:text-neutral-500 focus:border-[#C88B37]/80 focus:bg-[#1e1e1e]/90 focus:ring-1 focus:ring-[#C88B37]/40 rounded-xl transition-all pl-4 pr-4"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Input Field */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between pl-1">
                                    <Label htmlFor="password" className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Password</Label>
                                    {canResetPassword && (
                                        <TextLink href={route('password.request')} className="text-xs text-[#C88B37] hover:text-[#f3e5ab] font-medium transition-colors" tabIndex={5}>
                                            Forgot?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="h-12 border-white/5 bg-[#181818]/60 text-white placeholder:text-neutral-500 focus:border-[#C88B37]/80 focus:bg-[#1e1e1e]/90 focus:ring-1 focus:ring-[#C88B37]/40 rounded-xl transition-all pl-4 pr-4"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Keep me logged in checkbox */}
                            <div className="flex items-center space-x-3 my-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', checked === true)}
                                    className="border-white/10 data-[state=checked]:bg-[#C88B37] data-[state=checked]:border-[#C88B37] rounded-md"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember" className="text-sm text-neutral-400 font-medium cursor-pointer selection:none">Remember this session</Label>
                            </div>

                            {/* Gold Gradient Login Button */}
                            <Button 
                                type="submit" 
                                className="h-12 w-full bg-gradient-to-r from-[#C88B37] to-[#aa7122] hover:from-[#d59a48] hover:to-[#be812d] text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(200,139,55,0.15)] hover:shadow-[0_6px_24px_rgba(200,139,55,0.25)] transition-all cursor-pointer" 
                                tabIndex={4} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-1">
                                        Access Dashboard <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>

                            <div className="text-neutral-400 text-center text-xs mt-2">
                                New user?{' '}
                                <TextLink href={route('register')} className="text-[#C88B37] hover:underline font-semibold" tabIndex={5}>
                                    Register account
                                </TextLink>
                            </div>
                        </form>
                        
                        {status && <div className="mt-4 text-center text-sm font-semibold text-green-500">{status}</div>}
                    </div>

                    {/* Right Column: Premium Scan to Log In panel */}
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 bg-[#181818]/30 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative">
                        
                        {/* Glowing ring under scanner */}
                        <div className="absolute h-56 w-56 rounded-full bg-[#C88B37]/5 filter blur-[40px] -z-10 pointer-events-none"></div>

                        {/* Scan Instruction block */}
                        <div className="w-full text-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                                <QrCode className="h-5 w-5 text-[#C88B37]" />
                                Scan QR Login
                            </h2>
                            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed max-w-[240px] mx-auto">
                                Skip the forms. Connect instantly using your JK Chat app scanner.
                            </p>
                        </div>

                        {/* Elegant Rounded Glass QR container */}
                        <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-3 border border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.6),_0_0_20px_rgba(200,139,55,0.08)] overflow-hidden">
                            
                            {qrStatus === 'loading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] text-center p-4">
                                    <LoaderCircle className="h-7 w-7 animate-spin text-[#C88B37] mb-2" />
                                    <span className="text-[11px] text-neutral-400 font-semibold">Generating session...</span>
                                </div>
                            )}

                            {qrStatus === 'expired' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] text-center p-4">
                                    <Smartphone className="h-8 w-8 text-[#C88B37] mb-2 opacity-65" />
                                    <span className="text-xs text-neutral-300 font-bold mb-1">Session Expired</span>
                                    <p className="text-[10px] text-neutral-500 mb-3 px-2">For your security, scan codes expire.</p>
                                    <Button 
                                        type="button" 
                                        onClick={fetchQrSession}
                                        className="h-8 bg-[#C88B37] hover:bg-[#ae7428] text-white font-bold text-xs rounded-lg flex items-center gap-1 px-3.5 transition-all"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Refresh
                                    </Button>
                                    {errorMessage && <span className="text-[9px] text-red-500 mt-2">{errorMessage}</span>}
                                </div>
                            )}

                            {qrStatus === 'success' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] text-center p-4">
                                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-2 animate-bounce" />
                                    <span className="text-xs text-green-400 font-bold">Authorized!</span>
                                    <p className="text-[10px] text-neutral-400 mt-1">Accessing workspace...</p>
                                </div>
                            )}

                            {qrStatus === 'active' && qrSessionId && (
                                <QRCodeSVG
                                    value={qrDataPayload}
                                    size={188}
                                    bgColor={"#FFFFFF"}
                                    fgColor={"#070707"}
                                    level={"M"}
                                    includeMargin={false}
                                />
                            )}
                        </div>

                        {/* Scanner Status and instructions */}
                        <div className="mt-5 text-center">
                            {qrStatus === 'active' ? (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-semibold">
                                        <LoaderCircle className="h-3 w-3 animate-spin text-[#C88B37]" />
                                        Waiting for scan...
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-medium">
                                        Settings → Link Web Device
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-neutral-500 font-medium">
                                    Link up to 4 devices simultaneously.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
