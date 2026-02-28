import { useState } from "react";
import { MapPin, Clock, DollarSign, Star, Info } from "lucide-react";
import ExplanationModal from "./ExplanationModal.jsx";

const CATEGORY_BG = {
    food: { bg: "#F0C020", border: "#121212" },
    event: { bg: "#1040C0", text: "white", border: "#121212" },
    activity: { bg: "#D02020", text: "white", border: "#121212" },
};

export default function RecommendationCard({ rec, rank }) {
    const [showExplain, setShowExplain] = useState(false);
    const cat = CATEGORY_BG[rec.category] || { bg: "#E0E0E0", border: "#121212" };
    const scorePercent = Math.round((rec.score || 0) * 100);

    return (
        <>
            <div className="bg-white border-4 border-black p-5 relative hover:-translate-y-1 transition-transform"
                style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                {/* Rank badge */}
                {rank <= 3 && (
                    <div className="absolute top-4 right-4 w-7 h-7 border-2 border-black bg-[#D02020] text-white text-xs font-black flex items-center justify-center">
                        #{rank}
                    </div>
                )}

                {/* Category + diversity note */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 border-2 border-black"
                        style={{ backgroundColor: cat.bg, color: cat.text || "#121212" }}>
                        {rec.sub_category?.replace(/_/g, " ") || rec.category}
                    </span>
                    {rec.diversity_note && (
                        <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-2 border-black bg-[#F0F0F0]">
                            🔀 Diversified
                        </span>
                    )}
                </div>

                {/* Title & description */}
                <h3 className="font-black text-base text-black mb-1 pr-8 uppercase tracking-tight">{rec.name}</h3>
                <p className="text-sm text-[#555] mb-3 leading-relaxed font-medium">{rec.description}</p>

                {/* Details */}
                <div className="flex flex-wrap gap-3 text-xs text-[#555] mb-3 font-bold">
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-[#1040C0]" />{rec.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-[#D02020]" />{rec.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} className="text-[#F0C020]" style={{ filter: "drop-shadow(0 0 0 #121212)" }} />
                        {rec.cost === 0 ? "Free" : `₹${rec.cost}`}</span>
                    <span className="flex items-center gap-1"><Star size={12} className="text-[#D02020]" />{rec.rating}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                    {(rec.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 border-2 border-black bg-[#F0F0F0] text-black">
                            {t}
                        </span>
                    ))}
                </div>

                {/* Score bar + Why button */}
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wide">
                            <span className="text-[#555]">Match Score</span>
                            <span className="text-[#D02020]">{scorePercent}%</span>
                        </div>
                        <div className="w-full bg-[#E0E0E0] border-2 border-black h-2.5">
                            <div className="h-full bg-[#D02020] transition-all" style={{ width: `${scorePercent}%` }} />
                        </div>
                    </div>
                    {rec.explanation && (
                        <button onClick={() => setShowExplain(true)}
                            className="flex items-center gap-1 text-xs font-black uppercase tracking-wide px-2 py-1 border-2 border-black text-black hover:bg-[#F0C020] transition-all shrink-0">
                            <Info size={12} /> Why?
                        </button>
                    )}
                </div>
            </div>

            {showExplain && <ExplanationModal rec={rec} onClose={() => setShowExplain(false)} />}
        </>
    );
}
