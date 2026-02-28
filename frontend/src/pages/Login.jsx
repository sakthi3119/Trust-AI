import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import TrustAILogo from "../components/TrustAILogo.jsx";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) { toast.error("Fill in all fields."); return; }
        setLoading(true);
        try {
            const data = await login(form);
            toast.success(`Welcome back, ${data.name}!`);
            navigate(data.is_onboarded ? "/" : "/onboarding");
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Login failed.");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#F0F0F0] flex flex-col md:flex-row">
            {/* ── Left panel — Bauhaus blue composition ── */}
            <div className="hidden md:flex w-1/2 bg-[#1040C0] border-r-4 border-black items-center justify-center relative overflow-hidden">
                {/* dot-grid texture overlay */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(#fff 2px, transparent 2px)", backgroundSize: "24px 24px" }} />

                {/* Geometric composition */}
                <div className="relative w-72 h-72">
                    {/* Large background circle */}
                    <div className="absolute top-0 left-0 w-56 h-56 rounded-full border-4 border-white/40" />
                    {/* Red filled square */}
                    <div className="absolute bottom-8 left-8 w-32 h-32 bg-[#D02020] border-4 border-white"
                        style={{ boxShadow: "8px 8px 0 0 rgba(255,255,255,0.3)" }} />
                    {/* Yellow rotated square */}
                    <div className="absolute top-16 right-4 w-20 h-20 bg-[#F0C020] border-4 border-white"
                        style={{ transform: "rotate(45deg)", boxShadow: "6px 6px 0 0 rgba(0,0,0,0.3)" }} />
                    {/* White circle accent */}
                    <div className="absolute top-4 right-20 w-10 h-10 rounded-full bg-white border-4 border-black" />
                </div>

                {/* Brand text */}
                <div className="absolute bottom-12 left-10 right-10">
                    <TrustAILogo iconSize={56} showText={false} className="mb-5" />
                    <p className="font-black text-white text-5xl uppercase tracking-tighter leading-none">TRUST</p>
                    <p className="font-black text-[#F0C020] text-5xl uppercase tracking-tighter leading-none">AI</p>
                    <p className="text-white/70 font-bold text-sm uppercase tracking-widest mt-3">
                        Your Smart Campus Assistant
                    </p>
                </div>
            </div>

            {/* ── Right panel — Form ── */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile header */}
                    <div className="flex items-center mb-8 md:hidden">
                        <TrustAILogo iconSize={28} textClass="text-2xl text-black" />
                    </div>

                    <div className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#D02020] mb-2">Welcome back</p>
                        <h1 className="font-black text-4xl uppercase tracking-tighter text-black leading-none">
                            Sign In
                        </h1>
                    </div>

                    {/* Form card */}
                    <div className="bg-white border-4 border-black p-7" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">Username</label>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                                    placeholder="your_username"
                                    className="input w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPwd ? "text" : "password"}
                                        value={form.password}
                                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className="input w-full pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-black transition-colors"
                                    >
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                {loading ? "Signing in…" : "Sign In"}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-sm font-bold uppercase tracking-wider text-black mt-6">
                        New to TRUSTAI?{" "}
                        <Link to="/register" className="text-[#D02020] underline underline-offset-4 hover:text-[#B01818]">
                            Create account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}



