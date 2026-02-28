import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import TrustAILogo from "../components/TrustAILogo.jsx";

function Field({ label, type = "text", placeholder, value, onChange, rightEl }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black mb-2">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="input w-full pr-10"
                />
                {rightEl}
            </div>
        </div>
    );
}

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", username: "", email: "", password: "", confirm: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.username || !form.email || !form.password) { toast.error("Fill in all fields."); return; }
        if (form.password !== form.confirm) { toast.error("Passwords don't match."); return; }
        if (form.password.length < 6) { toast.error("Password must be 6+ characters."); return; }
        setLoading(true);
        try {
            await register({ name: form.name, username: form.username, email: form.email, password: form.password });
            toast.success("Account created! Let's build your profile.");
            navigate("/onboarding");
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Registration failed.");
        } finally { setLoading(false); }
    };

    const pwdBtn = (
        <button type="button" onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-black transition-colors">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-[#F0F0F0] flex flex-col md:flex-row">
            {/* ── Left panel — yellow Bauhaus composition ── */}
            <div className="hidden md:flex w-1/2 bg-[#F0C020] border-r-4 border-black items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(#000 2px, transparent 2px)", backgroundSize: "24px 24px" }} />

                {/* Geometric shapes */}
                <div className="relative w-72 h-72">
                    {/* Blue large square */}
                    <div className="absolute top-4 left-4 w-40 h-40 bg-[#1040C0] border-4 border-black"
                        style={{ boxShadow: "8px 8px 0 0 rgba(0,0,0,0.3)" }} />
                    {/* Red rotated square */}
                    <div className="absolute bottom-4 right-4 w-28 h-28 bg-[#D02020] border-4 border-black"
                        style={{ transform: "rotate(45deg)", boxShadow: "6px 6px 0 0 rgba(0,0,0,0.2)" }} />
                    {/* Small white circle */}
                    <div className="absolute top-8 right-12 w-14 h-14 rounded-full bg-white border-4 border-black" />
                    {/* Tiny black square accent */}
                    <div className="absolute bottom-16 left-12 w-8 h-8 bg-black" />
                </div>

                <div className="absolute bottom-12 left-10 right-10">
                    <TrustAILogo iconSize={56} showText={false} className="mb-5" />
                    <p className="font-black text-black text-5xl uppercase tracking-tighter leading-none">JOIN</p>
                    <p className="font-black text-[#D02020] text-5xl uppercase tracking-tighter leading-none">CAMPUS</p>
                    <p className="text-black/60 font-bold text-sm uppercase tracking-widest mt-3">
                        Personalized AI for every student
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
                        <p className="text-xs font-bold uppercase tracking-widest text-[#1040C0] mb-2">New account</p>
                        <h1 className="font-black text-4xl uppercase tracking-tighter text-black leading-none">
                            Create Profile
                        </h1>
                    </div>

                    {/* Form card */}
                    <div className="bg-white border-4 border-black p-7" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Full Name" placeholder="Alex Student" value={form.name} onChange={set("name")} />
                            <Field label="Username" placeholder="alex_student" value={form.username} onChange={set("username")} />
                            <Field label="Email" type="email" placeholder="alex@campus.edu" value={form.email} onChange={set("email")} />
                            <Field
                                label="Password"
                                type={showPwd ? "text" : "password"}
                                placeholder="Min 6 characters"
                                value={form.password}
                                onChange={set("password")}
                                rightEl={pwdBtn}
                            />
                            <Field
                                label="Confirm Password"
                                type={showPwd ? "text" : "password"}
                                placeholder="Repeat password"
                                value={form.confirm}
                                onChange={set("confirm")}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                {loading ? "Creating account…" : "Create Account"}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-sm font-bold uppercase tracking-wider text-black mt-6">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#D02020] underline underline-offset-4 hover:text-[#B01818]">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

