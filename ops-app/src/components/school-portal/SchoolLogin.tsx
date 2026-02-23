import { useState } from 'react';
import { School, ArrowRight, Lock } from 'lucide-react';

interface SchoolLoginProps {
    onLogin: (schoolCode: string) => void;
}

export function SchoolLogin({ onLogin }: SchoolLoginProps) {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Mock Auth Delay
        setTimeout(() => {
            onLogin(code || 'STMARYS'); // Default mock
            setLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-indigo-600 p-8 text-center text-white">
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <School className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">School Portal</h1>
                    <p className="text-indigo-100 mt-2 text-sm">Staff Login</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">School Code</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="e.g. STMARYS"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${loading || !password
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                }`}
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <>
                                    Login to Portal <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <div className="text-center text-xs text-slate-400 mt-4">
                            Protected System • School Uniform Solutions
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
