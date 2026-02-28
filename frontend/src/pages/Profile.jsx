import { useState, useEffect, useRef } from "react";
import {
    User, School, MapPin, Wallet, Sparkles, Brain, Save, Loader2,
    RefreshCw, Check, ChevronDown, ChevronUp, Edit3, X,
    Camera, Map, Trash2, Upload, CheckCircle, AlertTriangle,
} from "lucide-react";
import { getProfile, updateProfile, updateBudget, uploadAvatar, uploadCampusMap, getCampusMap, deleteCampusMap } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────────────────────────────────
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

const SOCIAL_STYLES = [
    { id: "solo", label: "Solo Explorer" },
    { id: "small_group", label: "Small Crew (2–4)" },
    { id: "large_group", label: "Group Vibes" },
    { id: "mixed", label: "Depends on Mood" },
];

const TIMES = [
    { id: "morning", label: "Morning 🌅" },
    { id: "afternoon", label: "Afternoon ☀️" },
    { id: "evening", label: "Evening 🌆" },
];

const MOTIVATIONS = [
    { id: "relaxation", label: "Unwind & Relax 🧘" },
    { id: "learning", label: "Learn & Grow 📚" },
    { id: "fitness", label: "Stay Fit 💪" },
    { id: "socializing", label: "Meet People 🤝" },
    { id: "entertainment", label: "Entertainment 🎉" },
    { id: "creativity", label: "Create Things ✨" },
];

const CAMPUS_AREAS = [
    "Main Campus", "Library Block", "Canteen", "Sports Complex", "Auditorium", "Hostel",
];

const COLLEGE_CITY_MAP = {
    "anna university": "Chennai", "iit madras": "Chennai", "nit trichy": "Tiruchirappalli",
    "sastra university": "Thanjavur", "vit vellore": "Vellore", "srm university": "Chennai",
    "psg college": "Coimbatore", "amrita university": "Coimbatore", "bits pilani": "Pilani",
    "iisc": "Bengaluru", "rvce": "Bengaluru", "msrit": "Bengaluru",
    "manipal university": "Manipal", "pesit": "Bengaluru", "iit bombay": "Mumbai",
    "college of engineering pune": "Pune", "symbiosis": "Pune", "vit pune": "Pune",
    "iit delhi": "Delhi", "delhi university": "Delhi", "jamia millia": "Delhi",
    "iit kanpur": "Kanpur", "iit roorkee": "Roorkee", "iit hyderabad": "Hyderabad",
    "nit warangal": "Warangal", "jntu": "Hyderabad", "vit ap": "Amaravati",
    "iit kharagpur": "Kharagpur", "jadavpur university": "Kolkata",
};

function autoCity(name) {
    const lower = name.toLowerCase().trim();
    for (const [key, city] of Object.entries(COLLEGE_CITY_MAP)) {
        if (lower.includes(key)) return city;
    }
    return "";
}

// ── Chip toggle ────────────────────────────────────────────────────────────────
function ChipGroup({ options, selected, multi = true, onChange }) {
    const isSelected = (id) => (multi ? (selected || []).includes(id) : selected === id);
    const toggle = (id) => {
        if (multi) {
            const curr = selected || [];
            onChange(curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]);
        } else {
            onChange(id);
        }
    };
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {options.map((opt) => {
                const id = typeof opt === "string" ? opt : opt.id;
                const label = typeof opt === "string" ? opt : (opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label);
                return (
                    <button key={id} type="button" onClick={() => toggle(id)}
                        className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide border-2 border-black transition-all ${isSelected(id)
                            ? "bg-[#D02020] text-white"
                            : "bg-white text-black hover:bg-[#F0C020]"
                            }`}>
                        {isSelected(id) && <Check size={10} className="inline mr-1" />}
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

// ── Section wrapper ─────────────────────────────────────────────────
function Section({ title, icon: Icon, children, changed }) {
    return (
        <div className={`bg-white border-4 border-black p-5 transition-all ${changed ? "border-[#D02020]" : "border-black"}`}
            style={{ boxShadow: changed ? "8px 8px 0 0 #D02020" : "8px 8px 0 0 #121212" }}>
            <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className="text-[#1040C0] shrink-0" />
                <span className="text-sm font-black uppercase tracking-widest text-black">{title}</span>
                {changed && <span className="text-[10px] font-black uppercase tracking-widest text-[#D02020] border-2 border-[#D02020] px-2 py-0.5 ml-auto">modified</span>}
            </div>
            {children}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Profile() {
    const { updateAvatar } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reanalyzing, setReanalyzing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState(null);
    const [original, setOriginal] = useState(null);
    const [avatar, setAvatar] = useState("");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [campusMap, setCampusMap] = useState(null);
    const [uploadingMap, setUploadingMap] = useState(false);
    const avatarInputRef = useRef(null);
    const mapInputRef = useRef(null);

    const BEHAVIOR_FIELDS = new Set(["favorite_activities", "active_time", "social_style", "motivation", "exploration_score", "campus_areas"]);

    const isChanged = (field) => {
        if (!form || !original) return false;
        const a = JSON.stringify(form[field]);
        const b = JSON.stringify(original[field]);
        return a !== b;
    };

    const anyBehaviorChanged = () =>
        form && original && [...BEHAVIOR_FIELDS].some(isChanged);

    const anyChanged = () =>
        form && original && [...Object.keys(form)].some(isChanged);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data } = await getProfile();
            const answers = data.onboarding_answers || {};
            const initialForm = {
                college_name: data.college_name || "",
                city: data.city || "",
                daily_budget: data.daily_budget || 500,
                monthly_budget: answers.monthly_budget || 10000,
                favorite_activities: answers.favorite_activities || [],
                active_time: answers.active_time || "",
                social_style: answers.social_style || "",
                motivation: answers.motivation || "",
                exploration_score: answers.exploration_score || 3,
                campus_areas: answers.campus_areas || [],
            };
            setProfile(data);
            setForm(initialForm);
            setOriginal(JSON.parse(JSON.stringify(initialForm)));
            setAvatar(data.avatar || "");
            updateAvatar(data.avatar || ""); // sync to global context/localStorage
        } catch {
            toast.error("Could not load profile.");
        } finally {
            setLoading(false);
        }
    };

    const loadCampusMap = async () => {
        try {
            const { data } = await getCampusMap();
            setCampusMap(data.exists ? data : null);
        } catch { /* silent */ }
    };

    useEffect(() => {
        loadProfile();
        loadCampusMap();
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setUploadingAvatar(true);
        try {
            const { data } = await uploadAvatar(formData);
            setAvatar(data.avatar);
            updateAvatar(data.avatar);
            toast.success("Profile photo updated!");
        } catch {
            toast.error("Failed to upload photo. Max 2 MB.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleMapUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setUploadingMap(true);
        toast("Analyzing campus map with AI…", { icon: "🗺️" });
        try {
            const { data } = await uploadCampusMap(formData);
            setCampusMap({ exists: true, ...data, knowledge_graph: data.knowledge_graph, areas: data.knowledge_graph?.areas || [] });
            toast.success(`Campus map analyzed! ${data.areas_found} areas detected.`);
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Map upload failed.");
        } finally {
            setUploadingMap(false);
        }
    };

    const handleDeleteMap = async () => {
        try {
            await deleteCampusMap();
            setCampusMap(null);
            toast.success("Campus map removed.");
        } catch {
            toast.error("Could not remove campus map.");
        }
    };

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const setCollege = (name) => {
        const guessedCity = autoCity(name);
        setForm((f) => ({
            ...f,
            college_name: name,
            city: guessedCity || f.city,
        }));
    };

    const handleSave = async () => {
        if (!anyChanged()) return;
        const willReanalyze = anyBehaviorChanged();
        if (willReanalyze) setReanalyzing(true);
        else setSaving(true);

        try {
            // Build update payload (only changed fields)
            const payload = {};
            for (const key of Object.keys(form)) {
                if (isChanged(key)) payload[key] = form[key];
            }
            const { data } = await updateProfile(payload);
            setProfile(data);
            const answers = data.onboarding_answers || {};
            const updated = {
                college_name: data.college_name || "",
                city: data.city || "",
                daily_budget: data.daily_budget || 500,
                monthly_budget: answers.monthly_budget || 10000,
                favorite_activities: answers.favorite_activities || [],
                active_time: answers.active_time || "",
                social_style: answers.social_style || "",
                motivation: answers.motivation || "",
                exploration_score: answers.exploration_score || 3,
                campus_areas: answers.campus_areas || [],
            };
            setForm(updated);
            setOriginal(JSON.parse(JSON.stringify(updated)));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            toast.success(
                willReanalyze
                    ? "Profile updated! AI re-analyzed your behaviour and adjusted your weights."
                    : "Profile saved."
            );
        } catch {
            toast.error("Failed to save profile.");
        } finally {
            setSaving(false);
            setReanalyzing(false);
        }
    };

    const handleDiscard = () => {
        setForm(JSON.parse(JSON.stringify(original)));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-black border-t-[#D02020] animate-spin" />
            </div>
        );
    }

    if (!form) return null;

    const budgetChanged = isChanged("daily_budget") || isChanged("monthly_budget");
    const infoChanged = isChanged("college_name") || isChanged("city");
    const behaviorSectionChanged = [...BEHAVIOR_FIELDS].some(isChanged);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-black text-2xl uppercase tracking-tighter text-black flex items-center gap-2">
                        <User className="text-[#D02020]" size={22} />
                        My Profile
                    </h1>
                    <p className="text-[#555] text-sm mt-1 font-medium">
                        Edit your details. Behaviour changes trigger AI re-analysis.
                    </p>
                </div>
                <div className="flex gap-2">
                    {anyChanged() && (
                        <button onClick={handleDiscard}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 border-black text-black hover:bg-[#F0C020] transition-all"
                            style={{ boxShadow: "2px 2px 0 0 #121212" }}>
                            <X size={14} /> Discard
                        </button>
                    )}
                    <button onClick={handleSave} disabled={!anyChanged() || saving || reanalyzing}
                        className="flex items-center gap-2 btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        {reanalyzing ? <><Loader2 size={14} className="animate-spin" /> Re-analyzing...</>
                            : saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                                : saved ? <><Check size={14} /> Saved!</>
                                    : <><Save size={14} /> Save Changes</>}
                    </button>
                </div>
            </div>

            {/* ── Two-column grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                {/* ── LEFT COLUMN ── */}
                <div className="space-y-5">

                    {/* Avatar */}
                    <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Camera size={16} className="text-[#D02020]" />
                            <span className="text-sm font-black uppercase tracking-widest">Profile Photo</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-black overflow-hidden bg-[#F0F0F0] flex items-center justify-center"
                                    style={{ boxShadow: "4px 4px 0 0 #121212" }}>
                                    {avatar
                                        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                        : <User size={36} className="text-[#888]" />
                                    }
                                </div>
                                <button onClick={() => avatarInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#D02020] border-2 border-black flex items-center justify-center hover:bg-[#F0C020] transition-all">
                                    {uploadingAvatar
                                        ? <Loader2 size={14} className="text-white animate-spin" />
                                        : <Camera size={14} className="text-white" />
                                    }
                                </button>
                            </div>
                            <p className="text-[11px] text-[#888] font-medium text-center">Click the camera icon to change photo (max 2 MB)</p>
                        </div>
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>

                    {/* AI Persona card */}
                    {profile && (
                        <div className="p-4 bg-[#1040C0] border-4 border-black" style={{ boxShadow: "6px 6px 0 0 #121212" }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className="text-white" />
                                <span className="text-xs font-black uppercase tracking-widest text-white">AI Persona</span>
                            </div>
                            <p className="text-white text-sm leading-relaxed font-medium">{profile.personalization_summary || "Complete your profile to generate a persona."}</p>
                            <div className="flex gap-2 mt-3 flex-wrap">
                                {[profile.activity_persona, profile.spending_style, profile.social_preference, `energy: ${profile.energy_level}`].map((tag) => (
                                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-white text-[#1040C0] px-2.5 py-0.5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Campus Blueprint */}
                    <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Map size={16} className="text-[#1040C0]" />
                            <span className="text-sm font-black uppercase tracking-widest">Campus Blueprint</span>
                        </div>
                        <p className="text-[11px] text-[#555] mb-4 font-medium leading-relaxed">
                            Upload your college site map. AI extracts a knowledge graph to power smarter, location-aware recommendations.
                        </p>

                        {campusMap ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-black">
                                    <CheckCircle size={14} className="text-[#1040C0]" />
                                    <span className="truncate">{campusMap.filename}</span>
                                </div>
                                <p className="text-[11px] text-[#555] font-medium leading-relaxed">
                                    {campusMap.knowledge_graph?.description || "Map analyzed and stored."}
                                </p>
                                {(campusMap.areas || []).length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-1.5">
                                            Detected Areas ({campusMap.areas.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {campusMap.areas.slice(0, 10).map((a) => (
                                                <span key={a} className="text-[10px] font-bold border-2 border-black px-2 py-0.5 bg-[#F0F0F0]">{a}</span>
                                            ))}
                                            {campusMap.areas.length > 10 && (
                                                <span className="text-[10px] font-bold border-2 border-black px-2 py-0.5 bg-[#E0E0E0]">+{campusMap.areas.length - 10} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => mapInputRef.current?.click()} disabled={uploadingMap}
                                        className="flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1.5 hover:bg-[#F0C020] transition-all">
                                        {uploadingMap ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        Replace
                                    </button>
                                    <button onClick={handleDeleteMap}
                                        className="flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1.5 hover:bg-[#D02020] hover:text-white transition-all">
                                        <Trash2 size={12} /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="border-2 border-dashed border-[#888] p-4 text-center bg-[#F0F0F0] mb-3">
                                    <Map size={28} className="mx-auto mb-2 text-[#888]" />
                                    <p className="text-xs font-bold text-[#888]">No campus map uploaded</p>
                                    <p className="text-[10px] text-[#888] mt-1">JPEG / PNG / WebP · max 10 MB</p>
                                </div>
                                <button onClick={() => mapInputRef.current?.click()} disabled={uploadingMap}
                                    className="w-full flex items-center justify-center gap-2 btn-blue text-sm py-2.5">
                                    {uploadingMap ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    {uploadingMap ? "Analyzing…" : "Upload Site Map"}
                                </button>
                            </div>
                        )}
                        <input ref={mapInputRef} type="file" accept="image/*" className="hidden" onChange={handleMapUpload} />
                    </div>

                    {/* AI Optimization Weights */}
                    {profile?.optimization_weights && Object.keys(profile.optimization_weights).length > 0 && (
                        <Section title="AI Weights" icon={Sparkles} changed={false}>
                            <p className="text-xs text-[#555] mb-3 font-medium">Auto-tuned by AI based on your behaviour.</p>
                            <div className="space-y-2">
                                {Object.entries(profile.optimization_weights).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-3">
                                        <span className="text-xs font-bold uppercase tracking-wide text-black w-20 shrink-0">{key.replace("_weight", "").replace("_", " ")}</span>
                                        <div className="flex-1 bg-[#E0E0E0] border-2 border-black h-2.5">
                                            <div className="h-full bg-[#1040C0] transition-all" style={{ width: `${Math.round(val * 100)}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-[#1040C0] w-9 text-right">{Math.round(val * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="lg:col-span-2 space-y-4">

                    {anyBehaviorChanged() && (
                        <div className="p-3 bg-[#F0C020] border-2 border-black text-black text-xs flex items-center gap-2 font-bold"
                            style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                            <Brain size={14} className="shrink-0" />
                            Behaviour fields changed — saving will trigger AI re-analysis to update personalization weights.
                        </div>
                    )}

                    {/* Institution */}
                    <Section title="Institution & Location" icon={School} changed={infoChanged}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-1">College / Institution</label>
                                <input type="text" value={form.college_name} onChange={(e) => setCollege(e.target.value)}
                                    placeholder="e.g. VIT Vellore, IIT Madras..."
                                    className="input w-full" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-1 flex items-center gap-1">
                                    <MapPin size={10} className="text-[#1040C0]" />
                                    City
                                    {form.city && form.city !== original?.city && <span className="text-[#1040C0] ml-1 font-black">(auto)</span>}
                                </label>
                                <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)}
                                    placeholder="e.g. Chennai, Bengaluru..."
                                    className="input w-full" />
                            </div>
                        </div>
                        {form.city && (
                            <p className="text-[11px] text-[#555] mt-2 flex items-center gap-1 font-medium">
                                <MapPin size={10} />
                                AI will suggest nearby places in <span className="text-black font-bold ml-1">{form.city}</span>
                            </p>
                        )}
                    </Section>

                    {/* Budget */}
                    <Section title="Budget (₹)" icon={Wallet} changed={budgetChanged}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-1">Daily Budget (₹)</label>
                                <span className="text-[#D02020] font-black text-lg">₹{form.daily_budget}</span>
                                <input type="range" min={50} max={2000} step={50} value={form.daily_budget}
                                    onChange={(e) => set("daily_budget", Number(e.target.value))}
                                    className="w-full accent-[#D02020] cursor-pointer mt-1" />
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {[100, 200, 300, 500, 800, 1000, 1500].map((b) => (
                                        <button key={b} type="button" onClick={() => set("daily_budget", b)}
                                            className={`px-2.5 py-1 text-xs font-black border-2 border-black transition-all ${form.daily_budget === b ? "bg-[#D02020] text-white" : "bg-white text-black hover:bg-[#F0C020]"}`}>
                                            ₹{b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-1">Monthly Budget (₹)</label>
                                <span className="text-[#1040C0] font-black text-lg">₹{form.monthly_budget}</span>
                                <input type="range" min={1000} max={50000} step={500} value={form.monthly_budget}
                                    onChange={(e) => set("monthly_budget", Number(e.target.value))}
                                    className="w-full accent-[#1040C0] cursor-pointer mt-1" />
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {[3000, 5000, 8000, 10000, 15000, 20000].map((b) => (
                                        <button key={b} type="button" onClick={() => set("monthly_budget", b)}
                                            className={`px-2.5 py-1 text-xs font-black border-2 border-black transition-all ${form.monthly_budget === b ? "bg-[#1040C0] text-white" : "bg-white text-black hover:bg-[#F0C020]"}`}>
                                            ₹{b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="text-[11px] text-[#888] mt-3 font-medium">Budget changes take effect immediately in Budget Guardian and Recommendations.</p>
                    </Section>

                    {/* Behaviour */}
                    <Section title="Behaviour & Preferences" icon={Brain} changed={behaviorSectionChanged}>
                        {behaviorSectionChanged && (
                            <div className="mb-3 text-[11px] text-[#D02020] flex items-center gap-1.5 font-bold">
                                <RefreshCw size={10} className="animate-spin" />
                                Saving behaviour changes will re-run AI analysis
                            </div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest">Favourite Activities</label>
                                <ChipGroup options={ACTIVITIES} selected={form.favorite_activities} multi={true} onChange={(v) => set("favorite_activities", v)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest">Most Active Time</label>
                                <ChipGroup options={TIMES} selected={form.active_time} multi={false} onChange={(v) => set("active_time", v)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest">Social Style</label>
                                <ChipGroup options={SOCIAL_STYLES} selected={form.social_style} multi={false} onChange={(v) => set("social_style", v)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest">Motivation</label>
                                <ChipGroup options={MOTIVATIONS} selected={form.motivation} multi={false} onChange={(v) => set("motivation", v)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest block mb-2">
                                    Adventure Level: <span className="text-[#D02020]">{form.exploration_score}/5</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-[#888] shrink-0 font-medium">Stick to favorites</span>
                                    <input type="range" min={1} max={5} step={1} value={form.exploration_score}
                                        onChange={(e) => set("exploration_score", Number(e.target.value))}
                                        className="flex-1 accent-[#D02020] cursor-pointer" />
                                    <span className="text-[10px] text-[#888] shrink-0 font-medium">Love new things</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest">Campus Areas</label>
                                <ChipGroup
                                    options={[
                                        ...CAMPUS_AREAS,
                                        ...(campusMap?.areas || []).filter(a => !CAMPUS_AREAS.includes(a)),
                                    ]}
                                    selected={form.campus_areas} multi={true} onChange={(v) => set("campus_areas", v)} />
                                {campusMap && (
                                    <p className="text-[10px] text-[#1040C0] mt-1.5 font-bold flex items-center gap-1">
                                        <Map size={10} /> Areas from your campus blueprint are included above
                                    </p>
                                )}
                            </div>
                        </div>
                    </Section>
                </div>
            </div>

            {/* Floating save bar */}
            {anyChanged() && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white border-4 border-black px-5 py-3 z-50"
                    style={{ boxShadow: "6px 6px 0 0 #121212" }}>
                    <span className="text-sm font-bold text-black">
                        {anyBehaviorChanged() ? "Behaviour changed — AI will re-analyze" : "Unsaved changes"}
                    </span>
                    <button onClick={handleDiscard} className="text-xs font-bold text-[#888] hover:text-black transition-all">
                        Discard
                    </button>
                    <button onClick={handleSave} disabled={saving || reanalyzing}
                        className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50">
                        {reanalyzing ? <><Loader2 size={12} className="animate-spin" /> Re-analyzing...</> :
                            saving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> :
                                <><Save size={12} /> Save</>}
                    </button>
                </div>
            )}
        </div>
    );
}
