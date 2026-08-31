import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CENTRE } from '@/lib/centre';
import { apiErrorMessage } from '@/lib/format';
import { useLoginMutation } from '@/services/authApi';

const LoginPage = () => {
    const [formState, setFormState] = useState({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [login, { isLoading }] = useLoginMutation();

    const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        '/';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        try {
            await login(formState).unwrap();
            navigate(redirectPath, { replace: true });
        } catch (err) {
            setError(
                apiErrorMessage(err, 'Unable to sign in. Check your credentials.')
            );
        }
    };

    const inputClass =
        'w-full rounded-sm border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Brand panel */}
            <div className="relative hidden overflow-hidden bg-linear-to-br from-brand via-brand-dark to-slate-900 lg:flex lg:w-2/5">
                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                            Diagnostic Centre
                        </p>
                        <h1 className="mt-3 text-3xl font-bold leading-tight">
                            {CENTRE.name}
                        </h1>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold leading-snug">
                            Billing &amp; Management System
                        </h2>
                        <p className="text-sm leading-relaxed text-white/70">
                            Patient registration, test billing, cash collection, referral
                            commission and diagnostic reports — in one place.
                        </p>
                    </div>

                    <p className="text-xs text-white/50">
                        © {new Date().getFullYear()} {CENTRE.name}. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Sign-in form */}
            <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Use the account provided by your administrator.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    className={inputClass}
                                    placeholder="you@example.com"
                                    value={formState.email}
                                    onChange={(event) =>
                                        setFormState((prev) => ({
                                            ...prev,
                                            email: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    className={`${inputClass} pr-12`}
                                    placeholder="••••••••"
                                    value={formState.password}
                                    onChange={(event) =>
                                        setFormState((prev) => ({
                                            ...prev,
                                            password: event.target.value,
                                        }))
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-sm bg-rose-50 px-4 py-3 text-sm text-rose-600"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-sm bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
