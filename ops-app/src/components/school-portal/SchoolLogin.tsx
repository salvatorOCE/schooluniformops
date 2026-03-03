import { useState } from 'react';
import { School, ArrowRight } from 'lucide-react';

interface SchoolLoginProps {
    onLogin: (schoolCode: string) => void;
}

/** Shown to admins only: pick a school to preview that school’s portal. */
export function SchoolLogin({ onLogin }: SchoolLoginProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const c = code.trim().toUpperCase() || 'WARRADALE';
        setLoading(true);
        onLogin(c);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-indigo-600 p-8 text-center text-white">
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <School className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">School Portal</h1>
                    <p className="text-indigo-100 mt-2 text-sm">Admin: view as school</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">School code</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="e.g. WARRADALE"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code.trim()}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${loading || !code.trim()
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                }`}
                        >
                            {loading ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                <>
                                    View portal <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <div className="text-center text-xs text-slate-400 mt-4">
                            School staff log in on the main login page with their school password.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
