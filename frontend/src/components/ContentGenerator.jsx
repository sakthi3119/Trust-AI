import { useState } from "react";
import { Megaphone, Loader2, Copy, CheckCheck } from "lucide-react";
import { generateContent } from "../api/client.js";
import toast from "react-hot-toast";

function CopyCard({ title, content, color }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="bg-white border-4 border-black p-4" style={{ boxShadow: "4px 4px 0 0 #121212" }}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest border-2 border-black px-2 py-0.5" style={{ backgroundColor: color }}>{title}</span>
                <button onClick={copy} className="p-1.5 border-2 border-black hover:bg-[#F0C020] transition-all">
                    {copied ? <CheckCheck size={15} className="text-[#1040C0]" /> : <Copy size={15} />}
                </button>
            </div>
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
    );
}

export default function ContentGenerator() {
    const [form, setForm] = useState({
        event_type: "",
        tone: "energetic",
        date: "",
        venue: "",
        extra_details: "",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async (e) => {
        e.preventDefault();
        if (!form.event_type) return toast.error("Enter event type");
        setLoading(true);
        try {
            const { data } = await generateContent(form);
            setResult(data);
        } catch {
            toast.error("Generation failed. Is Ollama running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Form */}
            <div className="card">
                <h3 className="font-black uppercase tracking-tighter text-black mb-4 flex items-center gap-2">
                    <Megaphone size={18} className="text-[#D02020]" />
                    Club Content Generator
                </h3>

                <form onSubmit={generate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Event Type *</label>
                            <input
                                className="input w-full"
                                placeholder="e.g. Tech Fest, Cultural Night"
                                value={form.event_type}
                                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Tone</label>
                            <select
                                className="input w-full"
                                value={form.tone}
                                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                            >
                                {["fun", "professional", "energetic", "inspirational", "casual"].map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Date (optional)</label>
                            <input
                                className="input w-full"
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Venue (optional)</label>
                            <input
                                className="input w-full"
                                placeholder="e.g. Main Auditorium"
                                value={form.venue}
                                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Extra Details (optional)</label>
                        <textarea
                            className="input w-full h-20 resize-none"
                            placeholder="Prizes, activities, registration info…"
                            value={form.extra_details}
                            onChange={(e) => setForm({ ...form, extra_details: e.target.value })}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                        Generate Content
                    </button>
                </form>
            </div>

            {/* Results */}
            {result && (
                <>
                    <CopyCard title="📸 Instagram Caption" content={result.instagram_caption} color="#F0C020" />
                    <CopyCard title="💬 WhatsApp Announcement" content={result.whatsapp_announcement} color="#D0FFD0" />
                    <CopyCard title="🖼️ Poster Text" content={result.poster_text} color="#1040C0" />
                </>
            )}
        </div>
    );
}
