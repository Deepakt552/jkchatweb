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
        <div className="relative flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4 text-[#20324A] antialiased overflow-hidden selection:bg-[#2788E8]/20 selection:text-[#20324A]">
            <Head title="Log in - DiaChat" />

            {/* Glowing background liquid gradient orbs */}
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#2788E8]/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-[#32C2A3]/10 blur-[140px] pointer-events-none"></div>

            {/* Main glassmorphic interface layout card */}
            <div className="relative w-full max-w-4xl rounded-3xl border border-[#E3E8EF] bg-white/95 p-8 md:p-14 backdrop-blur-3xl shadow-[0_20px_50px_rgba(32,50,74,0.06),_0_0_30px_rgba(39,136,232,0.05)]">
                
                {/* Top action gradient line */}
                <div className="absolute top-0 left-10 right-10 h-[3px] bg-gradient-to-r from-transparent via-[#2788E8] to-transparent"></div>

                <div className="grid gap-12 md:grid-cols-2 items-center">
                    
                    {/* Left Column: Credentials Form */}
                    <div className="flex flex-col">
                        
                        {/* Title Block */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2788E8]/30 bg-white shadow-[0_4px_16px_rgba(39,136,232,0.15)] p-1.5">
                                    <img src="/launcher.png" alt="DiaChat Logo" className="h-full w-full object-contain" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-[#20324A]">
                                    Dia<span className="text-[#2788E8]">Chat</span>
                                </h1>
                            </div>
                            <h2 className="text-2xl font-extrabold text-[#20324A] tracking-tight">Welcome back</h2>
                            <p className="text-sm text-[#64748B] mt-2 leading-relaxed font-medium">
                                Enter your workspace credentials or use the secure DiaChat mobile scanner to authenticate.
                            </p>
                        </div>

                        <form className="flex flex-col gap-6" onSubmit={submit}>
                            
                            {/* Email Input Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-[#2788E8] text-xs font-bold uppercase tracking-wider pl-1">Email Address</Label>
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
                                        className="h-12 border-[#E3E8EF] bg-[#F5F7FA] text-[#20324A] placeholder:text-[#94A3B8] focus:border-[#2788E8] focus:bg-white focus:ring-2 focus:ring-[#2788E8]/20 rounded-xl transition-all pl-4 pr-4 font-medium"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Input Field */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between pl-1">
                                    <Label htmlFor="password" className="text-[#2788E8] text-xs font-bold uppercase tracking-wider">Password</Label>
                                    {canResetPassword && (
                                        <TextLink href={route('password.request')} className="text-xs text-[#2788E8] hover:text-[#1F73C9] font-bold transition-colors" tabIndex={5}>
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
                                        className="h-12 border-[#E3E8EF] bg-[#F5F7FA] text-[#20324A] placeholder:text-[#94A3B8] focus:border-[#2788E8] focus:bg-white focus:ring-2 focus:ring-[#2788E8]/20 rounded-xl transition-all pl-4 pr-4 font-medium"
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
                                    className="border-[#E3E8EF] data-[state=checked]:bg-[#2788E8] data-[state=checked]:border-[#2788E8] rounded-md"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember" className="text-sm text-[#64748B] font-semibold cursor-pointer selection:none">Remember this session</Label>
                            </div>

                            {/* DiaChat Gradient Button */}
                            <Button 
                                type="submit" 
                                className="h-12 w-full bg-gradient-to-r from-[#2788E8] to-[#32C2A3] hover:from-[#1F73C9] hover:to-[#28a88d] text-white font-extrabold rounded-xl shadow-[0_4px_20px_rgba(39,136,232,0.25)] hover:shadow-[0_6px_24px_rgba(39,136,232,0.35)] transition-all cursor-pointer" 
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

                            <div className="text-[#64748B] text-center text-xs mt-2 font-medium">
                                New user?{' '}
                                <TextLink href={route('register')} className="text-[#2788E8] hover:underline font-bold" tabIndex={5}>
                                    Register account
                                </TextLink>
                            </div>
                        </form>
                        
                        {status && <div className="mt-4 text-center text-sm font-bold text-[#32C2A3]">{status}</div>}
                    </div>

                    {/* Right Column: Scan to Log In panel */}
                    <div className="flex flex-col items-center justify-center p-8 border border-[#E3E8EF] bg-[#F5F7FA]/80 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] relative">
                        
                        {/* Glowing ring under scanner */}
                        <div className="absolute h-56 w-56 rounded-full bg-[#2788E8]/10 filter blur-[40px] -z-10 pointer-events-none"></div>

                        {/* Scan Instruction block */}
                        <div className="w-full text-center mb-6">
                            <h2 className="text-lg font-bold text-[#20324A] flex items-center justify-center gap-2">
                                <QrCode className="h-5 w-5 text-[#2788E8]" />
                                Scan QR Login
                            </h2>
                            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed max-w-[240px] mx-auto font-medium">
                                Skip the forms. Connect instantly using your DiaChat mobile scanner.
                            </p>
                        </div>

                        {/* QR container */}
                        <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-3 border border-[#E3E8EF] shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                            
                            {qrStatus === 'loading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F7FA] text-center p-4">
                                    <LoaderCircle className="h-7 w-7 animate-spin text-[#2788E8] mb-2" />
                                    <span className="text-[11px] text-[#64748B] font-semibold">Generating session...</span>
                                </div>
                            )}

                            {qrStatus === 'expired' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F7FA] text-center p-4">
                                    <Smartphone className="h-8 w-8 text-[#2788E8] mb-2 opacity-75" />
                                    <span className="text-xs text-[#20324A] font-bold mb-1">Session Expired</span>
                                    <p className="text-[10px] text-[#64748B] mb-3 px-2 font-medium">For your security, scan codes expire.</p>
                                    <Button 
                                        type="button" 
                                        onClick={fetchQrSession}
                                        className="h-8 bg-[#2788E8] hover:bg-[#1F73C9] text-white font-bold text-xs rounded-lg flex items-center gap-1 px-3.5 transition-all shadow-md"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Refresh
                                    </Button>
                                    {errorMessage && <span className="text-[9px] text-rose-500 mt-2">{errorMessage}</span>}
                                </div>
                            )}

                            {qrStatus === 'success' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F7FA] text-center p-4">
                                    <CheckCircle2 className="h-10 w-10 text-[#32C2A3] mb-2 animate-bounce" />
                                    <span className="text-xs text-[#32C2A3] font-bold">Authorized!</span>
                                    <p className="text-[10px] text-[#64748B] mt-1 font-medium">Accessing workspace...</p>
                                </div>
                            )}

                            {qrStatus === 'active' && qrSessionId && (
                                <QRCodeSVG
                                    value={qrDataPayload}
                                    size={188}
                                    bgColor={"#FFFFFF"}
                                    fgColor={"#20324A"}
                                    level={"M"}
                                    includeMargin={false}
                                />
                            )}
                        </div>

                        {/* Scanner Status and instructions */}
                        <div className="mt-5 text-center">
                            {qrStatus === 'active' ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <span className="text-[11px] text-[#64748B] flex items-center gap-1.5 font-bold">
                                        <LoaderCircle className="h-3 w-3 animate-spin text-[#2788E8]" />
                                        Waiting for scan...
                                    </span>
                                    <span className="text-[10px] text-[#94A3B8] font-medium">
                                        Settings → Link Web Device
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-[#94A3B8] font-medium">
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
