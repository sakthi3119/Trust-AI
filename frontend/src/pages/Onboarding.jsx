import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Check, School, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { submitOnboarding } from "../api/client.js";
import toast from "react-hot-toast";

// ── College → City lookup (auto-populate) ────────────────────────────────────
const COLLEGE_CITY_MAP = {
    // Tamil Nadu
    "anna university": "Chennai",
    "iit madras": "Chennai",
    "nit trichy": "Tiruchirappalli",
    "sastra university": "Thanjavur",
    "vit vellore": "Vellore",
    "srm university": "Chennai",
    "psg college": "Coimbatore",
    "amrita university": "Coimbatore",
    "bits pilani": "Pilani",
    // Karnataka
    "iit bangalore": "Bengaluru",
    "iisc": "Bengaluru",
    "rvce": "Bengaluru",
    "msrit": "Bengaluru",
    "manipal university": "Manipal",
    "pesit": "Bengaluru",
    // Maharashtra
    "iit bombay": "Mumbai",
    "college of engineering pune": "Pune",
    "coe pune": "Pune",
    "symbiosis": "Pune",
    "vit pune": "Pune",
    // Delhi / North India
    "iit delhi": "Delhi",
    "delhi university": "Delhi",
    "du": "Delhi",
    "jamia millia": "Delhi",
    "iit kanpur": "Kanpur",
    "iit roorkee": "Roorkee",
    // Andhra / Telangana
    "iit hyderabad": "Hyderabad",
    "nit warangal": "Warangal",
    "jntu": "Hyderabad",
    "vit ap": "Amaravati",
    // West Bengal
    "iit kharagpur": "Kharagpur",
    "jadavpur university": "Kolkata",
    // General
    "nit": "",
    "iit": "",
};

function autoCity(name) {
    const lower = name.toLowerCase().trim();
    for (const [key, city] of Object.entries(COLLEGE_CITY_MAP)) {
        if (lower.includes(key)) return city;
    }
    return "";
}

// ── Question definitions ──────────────────────────────────────────────────────
const ACTIVITIES = [
    { id: "sports", label: "Sports & Fitness", emoji: "⚽" },
    { id: "music", label: "Music & Concerts", emoji: "🎵" },
    { id: "arts", label: "Arts & Crafts", emoji: "🎨" },
    { id: "tech events", label: "Tech Events", emoji: "💻" },
    { id: "food discovery", label: "Food Discovery", emoji: "🍜" },
    { id: "cultural", label: "Cultural Programs", emoji: "🎭" },
    { id: "cafe", label: "Cafés & Chill", emoji: "☕" },
    { id: "coding", label: "Hackathons / Coding", emoji: "🚀" },
];

const TIMES = [
    { id: "morning", label: "Morning", sub: "Before 12 PM", emoji: "🌅" },
    { id: "afternoon", label: "Afternoon", sub: "12 PM – 5 PM", emoji: "☀️" },
    { id: "evening", label: "Evening", sub: "After 5 PM", emoji: "🌆" },
];

const SOCIAL_STYLES = [
    { id: "solo", label: "Solo Explorer", sub: "I prefer doing things alone" },
    { id: "small_group", label: "Small Crew", sub: "Best with 2–4 close friends" },
    { id: "large_group", label: "Group Vibes", sub: "The more the merrier" },
    { id: "mixed", label: "Depends on Mood", sub: "Sometimes solo, sometimes social" },
];

const MOTIVATIONS = [
    { id: "relaxation", label: "Unwind & Relax", emoji: "🧘" },
    { id: "learning", label: "Learn & Grow", emoji: "📚" },
    { id: "fitness", label: "Stay Fit", emoji: "💪" },
    { id: "socializing", label: "Meet People", emoji: "🤝" },
    { id: "entertainment", label: "Entertainment", emoji: "🎉" },
    { id: "creativity", label: "Create Things", emoji: "✨" },
];

const CAMPUS_AREAS = [
    { id: "Main Campus", label: "Main Campus" },
    { id: "Library Block", label: "Library Block" },
    { id: "Canteen", label: "Canteen / Food Court" },
    { id: "Sports Complex", label: "Sports Complex" },
    { id: "Auditorium", label: "Auditorium" },
    { id: "Hostel", label: "Hostel Area" },
];

const TOTAL_STEPS = 7;

// ── Chip selector ─────────────────────────────────────────────────────────────
function Chips({ options, selected, multi = true, onChange }) {
    const toggle = (id) => {
        if (multi) {
            onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
        } else {
            onChange(id);
        }
    };
    const isSelected = (id) => (multi ? selected.includes(id) : selected === id);

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {options.map(({ id, label, sub, emoji }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 border-2 text-sm font-bold uppercase tracking-wide transition-all duration-150 ${isSelected(id)
                        ? "bg-[#D02020] border-black text-white shadow-[3px_3px_0_0_#121212]"
                        : "bg-white border-black text-black hover:bg-[#F0C020]"
                        }`}
                >
                    {emoji && <span className="text-base leading-none">{emoji}</span>}
                    <span>{label}</span>
                    {sub && <span className="text-xs opacity-60 hidden sm:inline">— {sub}</span>}
                    {isSelected(id) && <Check size={12} className="shrink-0" />}
                </button>
            ))}
        </div>
    );
}

// ── Main Onboarding Component ─────────────────────────────────────────────────
export default function Onboarding() {
    const { user, markOnboarded } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const [answers, setAnswers] = useState({
        college_name: "",
        city: "",
        favorite_activities: [],
        daily_budget: 300,
        active_time: "",
        social_style: "",
        motivation: "",
        exploration_score: 3,
        campus_areas: [],
    });

    const set = (k, v) => setAnswers((a) => ({ ...a, [k]: v }));

    // When college name changes, try to auto-fill city
    const setCollege = (name) => {
        const guessedCity = autoCity(name);
        setAnswers((a) => ({
            ...a,
            college_name: name,
            city: guessedCity || a.city,
        }));
    };

    const canNext = () => {
        switch (step) {
            case 1: return answers.college_name.trim().length > 0;
            case 2: return answers.favorite_activities.length > 0;
            case 3: return answers.daily_budget > 0;
            case 4: return !!answers.active_time;
            case 5: return !!answers.social_style;
            case 6: return !!answers.motivation;
            case 7: return answers.campus_areas.length > 0;
            default: return true;
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await submitOnboarding(answers);
            markOnboarded();
            toast.success("Profile built! TRUSTAI is now personalized for you.");
            navigate("/");
        } catch (err) {
            toast.error("Could not save profile. Please try again.");
            setSubmitting(false);
        }
    };

    const stepContent = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase flex items-center gap-2">
                            <School size={22} className="text-[#1040C0]" />
                            Where do you study?
                        </h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Help us suggest places near your campus.</p>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-black block mb-2">
                                    College / Institution <span className="text-[#D02020]">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. VIT Vellore, IIT Madras, Anna University..."
                                    value={answers.college_name}
                                    onChange={(e) => setCollege(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-black block mb-2 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-[#1040C0]" />
                                    City / Location
                                    {answers.city && <span className="text-[#1040C0] text-[10px] font-bold normal-case">— auto-detected</span>}
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chennai, Bengaluru, Pune..."
                                    value={answers.city}
                                    onChange={(e) => set("city", e.target.value)}
                                    className="input w-full"
                                />
                                <p className="text-[11px] text-[#888] mt-1.5 font-medium">Used to suggest nearby food spots and events.</p>
                            </div>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">What do you enjoy on campus?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Select all that apply.</p>
                        <Chips options={ACTIVITIES} selected={answers.favorite_activities} onChange={(v) => set("favorite_activities", v)} />
                    </>
                );
            case 3:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">Daily budget?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">How much do you typically spend per day (₹)?</p>
                        <div className="mt-6">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-3xl font-black text-[#D02020]">₹{answers.daily_budget}</span>
                            </div>
                            <input
                                type="range" min={50} max={1000} step={50}
                                value={answers.daily_budget}
                                onChange={(e) => set("daily_budget", Number(e.target.value))}
                                className="w-full cursor-pointer accent-[#D02020]"
                            />
                            <div className="flex justify-between text-xs font-bold text-[#888] mt-1">
                                <span>₹50</span><span>₹500</span><span>₹1000</span>
                            </div>
                            <div className="flex gap-2 mt-4 flex-wrap">
                                {[100, 200, 300, 500, 800].map((b) => (
                                    <button key={b} type="button" onClick={() => set("daily_budget", b)}
                                        className={`px-3 py-1.5 text-sm border-2 font-bold uppercase transition-all ${answers.daily_budget === b
                                            ? "bg-[#D02020] border-black text-white shadow-[3px_3px_0_0_#121212]"
                                            : "bg-white border-black text-black hover:bg-[#F0C020]"
                                            }`}>
                                        ₹{b}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 4:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">When are you most active?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Your peak energy time shapes our suggestions.</p>
                        <Chips options={TIMES} selected={answers.active_time} multi={false} onChange={(v) => set("active_time", v)} />
                    </>
                );
            case 5:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">How do you prefer to spend time?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Your social style shapes your activity feed.</p>
                        <Chips options={SOCIAL_STYLES} selected={answers.social_style} multi={false} onChange={(v) => set("social_style", v)} />
                    </>
                );
            case 6:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">What motivates you?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Pick your primary campus motivation.</p>
                        <Chips options={MOTIVATIONS} selected={answers.motivation} multi={false} onChange={(v) => set("motivation", v)} />
                        <div className="mt-6">
                            <p className="text-sm font-bold text-black uppercase mb-3">
                                How adventurous are you? <span className="text-[#D02020]">{answers.exploration_score}/5</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-[#888] shrink-0">Safe zone</span>
                                <input type="range" min={1} max={5} step={1} value={answers.exploration_score}
                                    onChange={(e) => set("exploration_score", Number(e.target.value))}
                                    className="flex-1 accent-[#D02020] cursor-pointer" />
                                <span className="text-xs font-bold text-[#888] shrink-0">Explorer</span>
                            </div>
                            <div className="flex justify-between text-xs font-black mt-1 px-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <span key={n} className={n === answers.exploration_score ? "text-[#D02020]" : "text-[#888]"}>{n}</span>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 7:
                return (
                    <>
                        <h2 className="text-xl font-black text-black uppercase">Where do you hang out most?</h2>
                        <p className="text-[#555] text-sm mt-1 font-medium">Select your usual campus spots.</p>
                        <Chips options={CAMPUS_AREAS} selected={answers.campus_areas} onChange={(v) => set("campus_areas", v)} />
                    </>
                );
            default:
                return null;
        }
    };

    // Analyzing screen
    if (submitting) {
        return (
            <div className="min-h-screen bg-[#F0C020] border-b-4 border-black flex flex-col items-center justify-center p-4 text-center">
                {/* Animated geometric shapes */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 bg-[#D02020] border-4 border-black animate-spin"
                        style={{ animationDuration: "3s" }} />
                    <div className="absolute inset-3 bg-[#1040C0] border-4 border-black animate-spin"
                        style={{ animationDuration: "2s", animationDirection: "reverse" }} />
                    <div className="absolute inset-6 bg-white border-4 border-black" />
                </div>
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-2">
                    Building Your Profile
                </h2>
                <p className="text-black/70 font-bold text-sm max-w-xs uppercase tracking-wide">
                    AI is learning your behaviour to personalize your entire experience.
                </p>
                <div className="flex gap-2 mt-8">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="w-3 h-3 bg-black border-2 border-black animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center p-4">
            <div className="w-full max-w-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-4 h-4 rounded-full bg-[#D02020] border-2 border-black" />
                        <div className="w-4 h-4 bg-[#1040C0] border-2 border-black" />
                        <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-[#F0C020]"
                            style={{ filter: "drop-shadow(0 0 0 1px #121212)" }} />
                    </div>
                    <div>
                        <p className="text-[#D02020] text-xs font-black uppercase tracking-widest">
                            Personalizing for {user?.name || "you"}
                        </p>
                        <h1 className="text-xl font-black text-black uppercase tracking-tight">
                            Campus Profile Setup
                        </h1>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex gap-1.5 mb-8">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div key={i} className={`h-2.5 flex-1 border-2 border-black transition-all duration-300 ${i + 1 <= step ? "bg-[#D02020]" : "bg-[#E0E0E0]"}`} />
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white border-4 border-black p-8 min-h-[320px]" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="text-xs font-black text-[#D02020] uppercase tracking-widest mb-4">
                        Step {step} of {TOTAL_STEPS}
                    </div>
                    {stepContent()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <button
                        onClick={() => setStep((s) => s - 1)}
                        disabled={step === 1}
                        className="flex items-center gap-2 px-5 py-2.5 border-2 border-black text-sm font-bold uppercase tracking-wider text-black bg-white hover:bg-[#E0E0E0] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        style={{ boxShadow: step > 1 ? "4px 4px 0 0 #121212" : "none" }}
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>

                    {step < TOTAL_STEPS ? (
                        <button
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canNext()}
                            className="flex items-center gap-2 px-6 py-2.5 border-2 border-black text-sm font-bold uppercase tracking-wider bg-[#1040C0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            style={{ boxShadow: canNext() ? "4px 4px 0 0 #121212" : "none" }}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!canNext()}
                            className="flex items-center gap-2 px-6 py-2.5 border-2 border-black text-sm font-bold uppercase tracking-wider bg-[#D02020] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            style={{ boxShadow: canNext() ? "4px 4px 0 0 #121212" : "none" }}
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Build My Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
