import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, QrCode, RefreshCw, Smartphone, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginForm {
    [key: string]: any;
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
        <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 text-slate-900 antialiased overflow-hidden selection:bg-[#C88B37]/30 selection:text-slate-900">
            <Head title="Log in" />

            {/* Glowing background liquid gradient orbs */}
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#C88B37]/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-[#C88B37]/8 blur-[140px] pointer-events-none"></div>

            {/* Main glassmorphic interface layout card */}
            <div className="relative w-full max-w-4xl rounded-3xl border border-[#C88B37]/20 bg-white/90 p-8 md:p-14 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06),_0_0_30px_rgba(200,139,55,0.05)]">
                
                {/* Subtle top gold accent line */}
                <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-[#C88B37]/60 to-transparent"></div>

                <div className="grid gap-12 md:grid-cols-2 items-center">
                    
                    {/* Left Column: Modern Credentials Form */}
                    <div className="flex flex-col">
                        
                        {/* Title Block */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C88B37]/35 bg-[#C88B37]/10 shadow-[0_0_12px_rgba(200,139,55,0.15)]">
                                    <KeyRound className="h-4.5 w-4.5 text-[#C88B37]" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    JK <span className="text-[#C88B37]">Chat</span>
                                </h1>
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">
                                Enter your workspace credentials or use the secure mobile scanner to authenticate.
                            </p>
                        </div>

                        <form className="flex flex-col gap-6" onSubmit={submit}>
                            
                            {/* Email Input Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[#C88B37] text-xs font-bold uppercase tracking-wider pl-1">Email Address</Label>
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
                                        className="h-12 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#C88B37] focus:bg-white focus:ring-2 focus:ring-[#C88B37]/20 rounded-xl transition-all pl-4 pr-4 font-medium"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Input Field */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between pl-1">
                                    <Label htmlFor="password" className="text-[#C88B37] text-xs font-bold uppercase tracking-wider">Password</Label>
                                    {canResetPassword && (
                                        <TextLink href={route('password.request')} className="text-xs text-[#C88B37] hover:text-[#aa7122] font-bold transition-colors" tabIndex={5}>
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
                                        className="h-12 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#C88B37] focus:bg-white focus:ring-2 focus:ring-[#C88B37]/20 rounded-xl transition-all pl-4 pr-4 font-medium"
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
                                    className="border-slate-300 data-[state=checked]:bg-[#C88B37] data-[state=checked]:border-[#C88B37] rounded-md"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember" className="text-sm text-slate-600 font-semibold cursor-pointer selection:none">Remember this session</Label>
                            </div>

                            {/* Gold Gradient Login Button */}
                            <Button 
                                type="submit" 
                                className="h-12 w-full bg-gradient-to-r from-[#C88B37] to-[#aa7122] hover:from-[#d59a48] hover:to-[#be812d] text-white font-extrabold rounded-xl shadow-[0_4px_20px_rgba(200,139,55,0.25)] hover:shadow-[0_6px_24px_rgba(200,139,55,0.35)] transition-all cursor-pointer" 
                                tabIndex={4} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Access Dashboard <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>

                            <div className="text-slate-500 text-center text-xs mt-2 font-medium">
                                New user?{' '}
                                <TextLink href={route('register')} className="text-[#C88B37] hover:underline font-bold" tabIndex={5}>
                                    Register account
                                </TextLink>
                            </div>
                        </form>
                        
                        {status && <div className="mt-4 text-center text-sm font-bold text-emerald-600">{status}</div>}
                    </div>

                    {/* Right Column: Premium Scan to Log In panel */}
                    <div className="flex flex-col items-center justify-center p-8 border border-slate-200/80 bg-slate-50/80 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] relative">
                        
                        {/* Glowing ring under scanner */}
                        <div className="absolute h-56 w-56 rounded-full bg-[#C88B37]/10 filter blur-[40px] -z-10 pointer-events-none"></div>

                        {/* Scan Instruction block */}
                        <div className="w-full text-center mb-6">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                                <QrCode className="h-5 w-5 text-[#C88B37]" />
                                Scan QR Login
                            </h2>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[240px] mx-auto font-medium">
                                Skip the forms. Connect instantly using your JK Chat app scanner.
                            </p>
                        </div>

                        {/* Elegant Rounded Glass QR container */}
                        <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-3 border border-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                            
                            {qrStatus === 'loading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-center p-4">
                                    <LoaderCircle className="h-7 w-7 animate-spin text-[#C88B37] mb-2" />
                                    <span className="text-[11px] text-slate-500 font-semibold">Generating session...</span>
                                </div>
                            )}

                            {qrStatus === 'expired' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-center p-4">
                                    <Smartphone className="h-8 w-8 text-[#C88B37] mb-2 opacity-75" />
                                    <span className="text-xs text-slate-800 font-bold mb-1">Session Expired</span>
                                    <p className="text-[10px] text-slate-500 mb-3 px-2 font-medium">For your security, scan codes expire.</p>
                                    <Button 
                                        type="button" 
                                        onClick={fetchQrSession}
                                        className="h-8 bg-[#C88B37] hover:bg-[#ae7428] text-white font-bold text-xs rounded-lg flex items-center gap-1 px-3.5 transition-all shadow-md"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Refresh
                                    </Button>
                                    {errorMessage && <span className="text-[9px] text-rose-500 mt-2">{errorMessage}</span>}
                                </div>
                            )}

                            {qrStatus === 'success' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-center p-4">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 animate-bounce" />
                                    <span className="text-xs text-emerald-600 font-bold">Authorized!</span>
                                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Accessing workspace...</p>
                                </div>
                            )}

                            {qrStatus === 'active' && qrSessionId && (
                                <QRCodeSVG
                                    value={qrDataPayload}
                                    size={188}
                                    bgColor={"#FFFFFF"}
                                    fgColor={"#0F172A"}
                                    level={"M"}
                                    includeMargin={false}
                                />
                            )}
                        </div>

                        {/* Scanner Status and instructions */}
                        <div className="mt-5 text-center">
                            {qrStatus === 'active' ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <span className="text-[11px] text-slate-600 flex items-center gap-1.5 font-bold">
                                        <LoaderCircle className="h-3 w-3 animate-spin text-[#C88B37]" />
                                        Waiting for scan...
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Settings → Link Web Device
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
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
