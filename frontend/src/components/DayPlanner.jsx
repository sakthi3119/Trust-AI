import { useState } from "react";
import { CalendarDays, Clock, DollarSign, Loader2, Sparkles } from "lucide-react";
import { generatePlan } from "../api/client.js";
import toast from "react-hot-toast";

const PREF_OPTIONS = ["cafe", "music", "sports", "tech", "art", "social", "study", "yoga", "games"];

const CATEGORY_BG = {
    food: "#F0C020", event: "#1040C0", activity: "#D02020",
};
const CATEGORY_TEXT = {
    food: "#121212", event: "#ffffff", activity: "#ffffff",
};

export default function DayPlanner() {
    const [form, setForm] = useState({
        budget: 500,
        free_time_start: "14:00",
        free_time_end: "20:00",
        preferences: ["cafe", "music"],
        location: "Main Campus",
    });
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);

    const togglePref = (p) => {
        setForm((f) => ({
            ...f,
            preferences: f.preferences.includes(p)
                ? f.preferences.filter((x) => x !== p)
                : [...f.preferences, p],
        }));
    };

    const generate = async () => {
        setLoading(true);
        try {
            const { data } = await generatePlan(form);
            setPlan(data);
        } catch {
            toast.error("Failed to generate plan. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Form */}
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#1040C0]" />
                    Plan Your Day
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-1">Budget (₹)</label>
                        <input className="input w-full" type="number" value={form.budget}
                            onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-1">Location</label>
                        <select className="input w-full" value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}>
                            {["Main Campus", "Library Block", "Canteen", "Sports Complex", "Auditorium", "Hostel"].map((l) => (
                                <option key={l}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-1">Start Time</label>
                        <input className="input w-full" type="time" value={form.free_time_start}
                            onChange={(e) => setForm({ ...form, free_time_start: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest block mb-1">End Time</label>
                        <input className="input w-full" type="time" value={form.free_time_end}
                            onChange={(e) => setForm({ ...form, free_time_end: e.target.value })} />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Preferences</label>
                    <div className="flex flex-wrap gap-2">
                        {PREF_OPTIONS.map((p) => (
                            <button key={p} onClick={() => togglePref(p)}
                                className={`text-xs font-black uppercase tracking-wide px-3 py-1.5 border-2 border-black transition-all
                                    ${form.preferences.includes(p)
                                        ? "bg-[#D02020] text-white"
                                        : "bg-white text-black hover:bg-[#F0C020]"
                                    }`}>
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Generate My Plan
                </button>
            </div>

            {/* Plan output */}
            {plan && (
                <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-sm uppercase tracking-widest">Your Day Plan</h3>
                        <div className="flex gap-4 text-sm font-bold">
                            <span className="flex items-center gap-1 text-[#D02020]">
                                <DollarSign size={14} /> ₹{plan.total_cost.toFixed(0)}
                            </span>
                            <span className="flex items-center gap-1 text-[#1040C0]">
                                <Clock size={14} /> {plan.total_duration} min
                            </span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative mb-5">
                        {plan.timeline.map((event, i) => (
                            <div key={i} className="flex gap-4 mb-4 last:mb-0">
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-3 bg-[#D02020] border-2 border-black mt-1 shrink-0" />
                                    {i < plan.timeline.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-black mt-1" />
                                    )}
                                </div>
                                <div className="pb-4">
                                    <div className="text-xs font-black uppercase tracking-wide text-[#1040C0] mb-0.5">{event.time}</div>
                                    <div className="text-sm text-black font-bold">{event.activity}</div>
                                    <span className="text-xs font-black uppercase tracking-wide px-2 py-0.5 border-2 border-black mt-1 inline-block"
                                        style={{
                                            backgroundColor: CATEGORY_BG[event.category] || "#E0E0E0",
                                            color: CATEGORY_TEXT[event.category] || "#121212"
                                        }}>
                                        {event.category}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Explanation */}
                    {plan.explanation && (
                        <div className="p-3 bg-[#1040C0] border-2 border-black">
                            <div className="text-xs text-white/80 font-black uppercase tracking-widest mb-1">AI Explanation</div>
                            <p className="text-sm text-white leading-relaxed font-medium">{plan.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
