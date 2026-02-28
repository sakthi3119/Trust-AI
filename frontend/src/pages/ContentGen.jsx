import { useState } from "react";
import {
    Megaphone, Loader2, Copy, CheckCheck, Sparkles,
    CalendarRange, Palette, Zap, ChevronDown, ChevronUp,
    Save, RotateCcw, Instagram, MessageSquare, Layout,
    BarChart2, BookOpen, HelpCircle, Timer,
} from "lucide-react";
import {
    generateContent, planCampaign, getCaptionVariants, getEngagementKit,
} from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const DEFAULT_BRAND = { club_name: "", tagline: "", tone: "energetic", signature_hashtags: "", emoji_style: "fun" };
const TONES = ["fun", "professional", "energetic", "inspirational", "casual", "formal"];
const EMOJI_STYLES = ["fun", "minimal", "professional", "enthusiastic"];

// Brand kit is scoped per-user via userId in the localStorage key
function useBrand(userId) {
    const BRAND_KEY = `trustai_brand_kit_${userId || "default"}`;
    const [brand, setBrand] = useState(() => {
        try { return JSON.parse(localStorage.getItem(BRAND_KEY)) || DEFAULT_BRAND; }
        catch { return DEFAULT_BRAND; }
    });
    const save = (b) => { setBrand(b); localStorage.setItem(BRAND_KEY, JSON.stringify(b)); };
    const clear = () => { setBrand(DEFAULT_BRAND); localStorage.removeItem(BRAND_KEY); };
    return { brand, save, clear };
}

function CopyBtn({ text, small }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} title="Copy"
            className={`${small ? "p-1" : "p-1.5"} border-2 border-black hover:bg-[#F0C020] transition-all shrink-0`}>
            {copied ? <CheckCheck size={small ? 13 : 15} className="text-[#D02020]" /> : <Copy size={small ? 13 : 15} className="text-black" />}
        </button>
    );
}

function ContentCard({ icon, label, color, content }) {
    return (
        <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
            <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-2 py-1 border-2 border-black"
                    style={{ backgroundColor: color }}>
                    {icon} {label}
                </span>
                <CopyBtn text={content} />
            </div>
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap font-medium">{content}</p>
        </div>
    );
}

// ─── Brand Kit Panel ──────────────────────────────────────────────────────────

function BrandKitPanel({ brand, onSave }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(brand);
    const s = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
    const hasKit = !!brand.club_name;

    return (
        <div className={`border-4 border-black transition-all ${hasKit ? "bg-[#F0F0F0] border-[#1040C0]" : "bg-white"}`}
            style={{ boxShadow: "6px 6px 0 0 #121212" }}>
            <button onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                    <Palette size={16} className={hasKit ? "text-[#1040C0]" : "text-[#888]"} />
                    <span className="text-sm font-black uppercase tracking-widest">Brand Kit</span>
                    {hasKit
                        ? <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 border-2 border-black bg-[#1040C0] text-white">{brand.club_name}</span>
                        : <span className="text-xs text-[#888] font-medium">Not set — content will be generic</span>
                    }
                </div>
                {open ? <ChevronUp size={14} className="text-black" /> : <ChevronDown size={14} className="text-black" />}
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-3 border-t-2 border-black pt-4">
                    <p className="text-xs text-[#555] font-medium">Set once. Applied automatically — ensures consistent, on-brand content across all tools.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Club / Team Name</label>
                            <input className="input w-full" placeholder="e.g. CodeCraft Club" value={draft.club_name} onChange={(e) => s("club_name", e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Tagline</label>
                            <input className="input w-full" placeholder="e.g. Build. Break. Repeat." value={draft.tagline} onChange={(e) => s("tagline", e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Default Tone</label>
                            <select className="input w-full" value={draft.tone} onChange={(e) => s("tone", e.target.value)}>
                                {TONES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Emoji Style</label>
                            <select className="input w-full" value={draft.emoji_style} onChange={(e) => s("emoji_style", e.target.value)}>
                                {EMOJI_STYLES.map((e) => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Signature Hashtags</label>
                            <input className="input w-full" placeholder="e.g. #CodeCraft #VITVellore #BuildWithUs" value={draft.signature_hashtags} onChange={(e) => s("signature_hashtags", e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => { onSave(draft); setOpen(false); toast.success("Brand Kit saved!"); }}
                            className="btn-blue flex items-center gap-1.5 text-sm">
                            <Save size={13} /> Save Brand Kit
                        </button>
                        <button onClick={() => { onSave(DEFAULT_BRAND); toast("Brand Kit cleared"); }}
                            className="btn-outline flex items-center gap-1.5 text-sm">
                            <RotateCcw size={12} /> Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab 1: Content Generator ─────────────────────────────────────────────────

function ContentGeneratorTab({ brand }) {
    const [form, setForm] = useState({ event_type: "", tone: brand.tone || "energetic", date: "", venue: "", extra_details: "" });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async (e) => {
        e.preventDefault();
        if (!form.event_type.trim()) return toast.error("Enter event type");
        setLoading(true);
        try {
            const { data } = await generateContent({ ...form, brand: brand.club_name ? brand : null });
            setResult(data);
        } catch { toast.error("Generation failed. Is Ollama running?"); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <form onSubmit={generate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Type *</label>
                            <input className="input w-full" placeholder="e.g. Tech Fest, Cultural Night" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Tone</label>
                            <select className="input w-full" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                                {TONES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Date</label>
                            <input className="input w-full" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Venue</label>
                            <input className="input w-full" placeholder="e.g. Main Auditorium" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Extra Details</label>
                        <textarea className="input w-full h-20 resize-none" placeholder="Prizes, activities, registration info…" value={form.extra_details} onChange={(e) => setForm({ ...form, extra_details: e.target.value })} />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
                        {loading ? "Generating…" : "Generate Content Pack"}
                    </button>
                </form>
            </div>

            {result && (
                <div className="space-y-3">
                    <ContentCard icon={<Instagram size={13} />} label="Instagram Caption" color="#F0C020" content={result.instagram_caption} />
                    <ContentCard icon={<MessageSquare size={13} />} label="WhatsApp Announcement" color="#D0FFD0" content={result.whatsapp_announcement} />
                    <ContentCard icon={<Layout size={13} />} label="Poster Text" color="#E0E0FF" content={result.poster_text} />
                </div>
            )}
        </div>
    );
}

// ─── Tab 2: Campaign Planner ──────────────────────────────────────────────────

const PHASE_COLORS = {
    "Teaser": { bg: "#E0E0E0", text: "#121212" },
    "Hype Drop": { bg: "#1040C0", text: "#ffffff" },
    "Countdown": { bg: "#F0C020", text: "#121212" },
    "Day-Of": { bg: "#D02020", text: "#ffffff" },
    "Post-Event": { bg: "#F0F0F0", text: "#121212" },
};

function PhaseCard({ phase, idx }) {
    const [open, setOpen] = useState(idx === 0);
    const colors = PHASE_COLORS[phase.phase] || PHASE_COLORS["Hype Drop"];
    const allText = `INSTAGRAM:\n${phase.instagram}\n\nWHATSAPP:\n${phase.whatsapp}\n\nPOSTER LINE:\n${phase.poster_line}`;

    return (
        <div className="border-4 border-black overflow-hidden" style={{ boxShadow: "4px 4px 0 0 #121212" }}>
            <button onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{ backgroundColor: colors.bg, color: colors.text }}>
                <div className="flex items-center gap-1 shrink-0">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-2 h-2 border border-black"
                            style={{ backgroundColor: i <= idx ? "#121212" : "#E0E0E0" }} />
                    ))}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-black uppercase tracking-wide">{phase.phase}</span>
                    <span className="text-xs opacity-60 ml-2 font-medium">{phase.post_timing}</span>
                </div>
                <div className="flex items-center gap-1">
                    <CopyBtn text={allText} small />
                    {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
            </button>
            {open && (
                <div className="p-4 space-y-3 bg-white border-t-2 border-black">
                    {[
                        { icon: <Instagram size={11} />, label: "Instagram", content: phase.instagram, color: "#F0C020" },
                        { icon: <MessageSquare size={11} />, label: "WhatsApp", content: phase.whatsapp, color: "#D0FFD0" },
                        { icon: <Layout size={11} />, label: "Poster Line", content: phase.poster_line, color: "#E0E0FF" },
                    ].map(({ icon, label, content, color }) => (
                        <div key={label} className="flex items-start gap-2.5">
                            <span className="border-2 border-black p-0.5 shrink-0" style={{ backgroundColor: color }}>{icon}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                <p className="text-sm text-black mt-0.5 leading-relaxed font-medium">{content}</p>
                            </div>
                            <CopyBtn text={content} small />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CampaignPlannerTab({ brand }) {
    const [form, setForm] = useState({ event_type: "", event_date: "", venue: "", extra_details: "" });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async (e) => {
        e.preventDefault();
        if (!form.event_type.trim() || !form.event_date.trim()) return toast.error("Fill in event name and date");
        setLoading(true);
        try {
            const { data } = await planCampaign({ ...form, brand: brand.club_name ? brand : null });
            setResult(data);
        } catch { toast.error("Campaign generation failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#1040C0] border-2 border-black p-4 text-sm text-white font-medium"
                style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                <strong className="font-black">How it works:</strong> Enter your event once → get a complete 5-phase promotion timeline with ready-to-post copy for every platform at every stage.
            </div>
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <form onSubmit={generate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Name *</label>
                            <input className="input w-full" placeholder="e.g. Annual Hackathon 2026" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Date *</label>
                            <input className="input w-full" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Venue</label>
                            <input className="input w-full" placeholder="e.g. System Lab, Block C" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Highlights / Details</label>
                            <input className="input w-full" placeholder="Prizes, themes, guest speakers…" value={form.extra_details} onChange={(e) => setForm({ ...form, extra_details: e.target.value })} />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <CalendarRange size={15} />}
                        {loading ? "Planning campaign…" : "Generate Full Campaign"}
                    </button>
                </form>
            </div>

            {result?.phases && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarRange size={14} className="text-[#D02020]" />
                        <span className="text-sm font-black uppercase tracking-wide">5-Phase Campaign</span>
                        <span className="text-xs text-[#888] font-medium">— click each phase to expand</span>
                    </div>
                    {result.phases.map((ph, i) => <PhaseCard key={i} phase={ph} idx={i} />)}
                </div>
            )}
        </div>
    );
}

// ─── Tab 3: Caption Variants ──────────────────────────────────────────────────

const VARIANT_COLORS = {
    hype: { label: "🔥 Hype Mode", bg: "#D02020", text: "#ffffff" },
    minimal: { label: "🤍 Minimal Aesthetic", bg: "#E0E0E0", text: "#121212" },
    storytelling: { label: "📚 Storytelling Arc", bg: "#1040C0", text: "#ffffff" },
    witty: { label: "😏 Witty & Meme", bg: "#F0C020", text: "#121212" },
    professional: { label: "💼 Professional", bg: "#F0F0F0", text: "#121212" },
};

function CaptionVariantsTab({ brand }) {
    const [form, setForm] = useState({ event_type: "", date: "", venue: "", extra_details: "" });
    const [variants, setVariants] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async (e) => {
        e.preventDefault();
        if (!form.event_type.trim()) return toast.error("Enter event name");
        setLoading(true);
        try {
            const { data } = await getCaptionVariants({ ...form, brand: brand.club_name ? brand : null });
            setVariants(data.variants);
        } catch { toast.error("Generation failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#F0C020] border-2 border-black p-4 text-sm text-black font-medium"
                style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                <strong className="font-black">Pick your vibe:</strong> Same event, 5 completely different writing styles. Stop rewriting the same caption — just pick the one that fits.
            </div>
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <form onSubmit={generate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Name *</label>
                            <input className="input w-full" placeholder="e.g. Code Sprint 2026" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Date</label>
                            <input className="input w-full" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Venue</label>
                            <input className="input w-full" placeholder="e.g. CS Lab Block A" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Key Highlights</label>
                            <input className="input w-full" placeholder="What should the caption highlight?" value={form.extra_details} onChange={(e) => setForm({ ...form, extra_details: e.target.value })} />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {loading ? "Writing 5 styles…" : "Generate Caption Variants"}
                    </button>
                </form>
            </div>

            {variants && (
                <div className="grid grid-cols-1 gap-3">
                    {variants.map((v) => {
                        const c = VARIANT_COLORS[v.style] || VARIANT_COLORS.hype;
                        return (
                            <div key={v.style} className="border-4 border-black p-4" style={{ boxShadow: "4px 4px 0 0 #121212", backgroundColor: c.bg, color: c.text }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black uppercase tracking-widest">{v.label || c.label}</span>
                                    <CopyBtn text={v.caption} />
                                </div>
                                <p className="text-sm leading-relaxed font-medium">{v.caption}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Tab 4: Engagement Kit ────────────────────────────────────────────────────

function EngagementKitTab({ brand }) {
    const [form, setForm] = useState({ event_type: "", date: "", extra_details: "" });
    const [kit, setKit] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async (e) => {
        e.preventDefault();
        if (!form.event_type.trim()) return toast.error("Enter event name");
        setLoading(true);
        try {
            const { data } = await getEngagementKit({ ...form, brand: brand.club_name ? brand : null });
            setKit(data);
        } catch { toast.error("Generation failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#D02020] border-2 border-black p-4 text-sm text-white font-medium"
                style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                <strong className="font-black">Boost interaction:</strong> Ready-to-post polls, story Q&A prompts, a quiz post, and a countdown hook — the content between announcements.
            </div>
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <form onSubmit={generate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Name *</label>
                            <input className="input w-full" placeholder="e.g. Robotics Workshop" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Date</label>
                            <input className="input w-full" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Details</label>
                            <input className="input w-full" placeholder="Theme, activities, target audience…" value={form.extra_details} onChange={(e) => setForm({ ...form, extra_details: e.target.value })} />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                        {loading ? "Building engagement kit…" : "Generate Engagement Kit"}
                    </button>
                </form>
            </div>

            {kit && (
                <div className="space-y-4">
                    {/* Countdown Hook */}
                    <div className="bg-[#F0C020] border-4 border-black p-5" style={{ boxShadow: "6px 6px 0 0 #121212" }}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Timer size={14} className="text-black" />
                                <span className="text-xs font-black uppercase tracking-widest text-black">Countdown Hook</span>
                            </div>
                            <CopyBtn text={kit.countdown_hook} />
                        </div>
                        <p className="text-sm text-black font-bold">{kit.countdown_hook}</p>
                        <p className="text-xs text-black/60 mt-1 font-medium">Use as story or post 2–3 days before the event</p>
                    </div>

                    {/* Polls */}
                    <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart2 size={15} className="text-[#1040C0]" />
                            <span className="text-sm font-black uppercase tracking-wide">Instagram Story Polls</span>
                            <span className="text-xs text-[#888] font-medium">{kit.polls?.length} polls</span>
                        </div>
                        <div className="space-y-3">
                            {kit.polls?.map((poll, i) => (
                                <div key={i} className="bg-[#F0F0F0] border-2 border-black p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm text-black font-bold">{poll.question}</p>
                                        <CopyBtn text={`${poll.question}\n${poll.options.join(" | ")}`} small />
                                    </div>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {poll.options?.map((opt, j) => (
                                            <span key={j} className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 border-2 border-black bg-[#1040C0] text-white">{opt}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Story Q&A */}
                    <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={15} className="text-[#D02020]" />
                            <span className="text-sm font-black uppercase tracking-wide">Story Q&A Prompts</span>
                        </div>
                        <div className="space-y-2">
                            {kit.story_prompts?.map((prompt, i) => (
                                <div key={i} className="flex items-center gap-2 bg-[#F0F0F0] border-2 border-black px-3 py-2.5">
                                    <span className="text-[#D02020] text-xs font-black w-5 shrink-0">Q{i + 1}</span>
                                    <span className="text-sm text-black font-medium flex-1">{prompt}</span>
                                    <CopyBtn text={prompt} small />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Post */}
                    {kit.quiz && (
                        <div className="bg-[#F0F0F0] border-4 border-black p-5" style={{ boxShadow: "6px 6px 0 0 #121212" }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <HelpCircle size={15} className="text-black" />
                                    <span className="text-sm font-black uppercase tracking-wide">Quiz Post</span>
                                </div>
                                <CopyBtn text={`${kit.quiz.question}\n${kit.quiz.options.join("\n")}\nAnswer: ${kit.quiz.answer}\n\nFun fact: ${kit.quiz.fun_fact}`} />
                            </div>
                            <p className="text-sm font-black text-black mb-2">{kit.quiz.question}</p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {kit.quiz.options?.map((opt, i) => (
                                    <div key={i} className={`text-xs font-bold px-3 py-2 border-2 border-black
                                        ${opt === kit.quiz.answer ? "bg-[#D02020] text-white" : "bg-white text-black"}`}>
                                        {opt}{opt === kit.quiz.answer && <span className="ml-1.5">✓</span>}
                                    </div>
                                ))}
                            </div>
                            {kit.quiz.fun_fact && (
                                <div className="text-xs text-black font-medium bg-white border-2 border-black px-3 py-2">
                                    💡 {kit.quiz.fun_fact}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
    { id: "generator", label: "Content Pack", Icon: Megaphone },
    { id: "campaign", label: "Campaign Planner", Icon: CalendarRange },
    { id: "variants", label: "Caption Variants", Icon: Sparkles },
    { id: "engagement", label: "Engagement Kit", Icon: Zap },
];

export default function ContentGen() {
    const { user } = useAuth();
    const { brand, save } = useBrand(user?.id);
    const [tab, setTab] = useState("generator");

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-5">
                <h1 className="font-black text-2xl uppercase tracking-tighter text-black flex items-center gap-2">
                    <Megaphone className="text-[#D02020]" />
                    Creator Studio
                </h1>
                <p className="text-[#555] text-sm mt-1 font-medium">
                    Consistent, on-brand media tools for campus clubs and teams.
                </p>
            </div>

            {/* Brand Kit */}
            <div className="mb-5">
                <BrandKitPanel brand={brand} onSave={save} />
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 flex-wrap mb-5">
                {TABS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-wide border-2 border-black transition-all
                            ${tab === id
                                ? "bg-[#D02020] text-white"
                                : "bg-white text-black hover:bg-[#F0C020]"
                            }`}
                        style={tab === id ? { boxShadow: "3px 3px 0 0 #121212" } : {}}>
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "generator" && <ContentGeneratorTab brand={brand} />}
            {tab === "campaign" && <CampaignPlannerTab brand={brand} />}
            {tab === "variants" && <CaptionVariantsTab brand={brand} />}
            {tab === "engagement" && <EngagementKitTab brand={brand} />}
        </div>
    );
}
