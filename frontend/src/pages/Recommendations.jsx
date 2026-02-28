import { useState } from "react";
import { Sparkles, Loader2, Filter } from "lucide-react";
import { getRecommendations } from "../api/client.js";
import RecommendationCard from "../components/RecommendationCard.jsx";
import toast from "react-hot-toast";

const PREF_OPTIONS = ["cafe", "music", "sports", "tech", "art", "social", "study", "yoga", "games", "coding"];
const CATEGORIES = ["food", "event", "activity"];
const LOCATIONS = ["Main Campus", "Library Block", "Canteen", "Sports Complex", "Auditorium", "Hostel"];

export default function Recommendations() {
    const [form, setForm] = useState({
        budget: 300,
        free_time_minutes: 120,
        preferences: ["cafe", "tech"],
        location: "Main Campus",
        time_of_day: "afternoon",
        categories: [],
        top_k: 5,
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const togglePref = (p) =>
        setForm((f) => ({
            ...f,
            preferences: f.preferences.includes(p) ? f.preferences.filter((x) => x !== p) : [...f.preferences, p],
        }));

    const toggleCat = (c) =>
        setForm((f) => ({
            ...f,
            categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
        }));

    const search = async () => {
        setLoading(true);
        setSearched(true);
        try {
            const payload = { ...form, categories: form.categories.length ? form.categories : null };
            const { data } = await getRecommendations(payload);
            setResults(data);
        } catch {
            toast.error("Failed to get recommendations.");
        } finally {
            setLoading(false);
        }
    };

    const diversityNote = results[0]?.diversity_note;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Page title */}
            <div className="mb-6">
                <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <Sparkles className="text-[#D02020]" />
                    Smart Recommendations
                </h1>
                <p className="text-[#555] text-sm mt-1 font-medium">
                    AI-ranked suggestions optimised across budget, preferences, time, and location.
                </p>
            </div>

            {/* Filter panel */}
            <div className="bg-white border-4 border-black p-5 mb-6" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={16} className="text-[#D02020]" />
                    <span className="font-black uppercase tracking-widest text-sm">Your Constraints</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Budget (₹)</label>
                        <input
                            className="input w-full"
                            type="number"
                            value={form.budget}
                            onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Free Time (min)</label>
                        <input
                            className="input w-full"
                            type="number"
                            value={form.free_time_minutes}
                            onChange={(e) => setForm({ ...form, free_time_minutes: Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Location</label>
                        <select
                            className="input w-full"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                        >
                            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest mb-1 block">Time of Day</label>
                        <select
                            className="input w-full"
                            value={form.time_of_day}
                            onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
                        >
                            {["morning", "afternoon", "evening"].map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Preferences */}
                <div className="mb-3">
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Preferences</label>
                    <div className="flex flex-wrap gap-2">
                        {PREF_OPTIONS.map((p) => (
                            <button
                                key={p}
                                onClick={() => togglePref(p)}
                                className={`text-xs font-black uppercase tracking-widest border-2 border-black px-3 py-1 transition-all ${form.preferences.includes(p)
                                        ? "bg-[#D02020] text-white"
                                        : "bg-white text-black hover:bg-[#F0C020]"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category filter */}
                <div className="mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest mb-2 block">Category (optional filter)</label>
                    <div className="flex gap-2">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c}
                                onClick={() => toggleCat(c)}
                                className={`text-xs font-black uppercase tracking-widest border-2 border-black px-3 py-1 transition-all capitalize ${form.categories.includes(c)
                                        ? "bg-[#1040C0] text-white"
                                        : "bg-white text-black hover:bg-[#F0C020]"
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={search} disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Get Recommendations
                </button>
            </div>

            {/* Diversity notice */}
            {diversityNote && (
                <div className="p-3 bg-[#F0C020] border-2 border-black text-black text-sm font-bold mb-4">
                    {diversityNote}
                </div>
            )}

            {/* Results */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-black border-t-[#D02020] animate-spin mx-auto mb-3" />
                        <p className="text-[#555] text-sm font-medium">Optimising recommendations…</p>
                    </div>
                </div>
            ) : searched && results.length === 0 ? (
                <div className="text-center py-16 text-[#555] font-medium">
                    No recommendations found. Try relaxing your constraints.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((rec, i) => (
                        <RecommendationCard key={rec.id} rec={rec} rank={i + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
