import { X, Brain } from "lucide-react";
import {
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    ResponsiveContainer, Tooltip,
} from "recharts";

export default function ExplanationModal({ rec, onClose }) {
    const breakdown = rec.score_breakdown || {};
    const radarData = Object.entries(breakdown).map(([name, value]) => ({
        subject: name,
        score: value,
        fullMark: 30,
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-white border-4 border-black w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
                style={{ boxShadow: "12px 12px 0 0 #121212" }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Brain size={20} className="text-[#1040C0]" />
                        <h2 className="font-black text-base uppercase tracking-tight">Why recommended?</h2>
                    </div>
                    <button onClick={onClose}
                        className="p-1.5 border-2 border-black hover:bg-[#D02020] hover:text-white transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Rec name banner */}
                <div className="p-3 bg-[#1040C0] border-2 border-black mb-5">
                    <div className="font-black text-white uppercase tracking-tight">{rec.name}</div>
                    <div className="text-xs text-white/80 mt-0.5 font-medium">
                        Match: <span className="font-black">{Math.round((rec.score || 0) * 100)}%</span>
                    </div>
                </div>

                {/* Explanation text */}
                {rec.explanation && (
                    <div className="mb-5">
                        <div className="text-xs font-black uppercase tracking-widest mb-2 text-[#555]">AI Explanation</div>
                        <p className="text-sm text-black leading-relaxed whitespace-pre-wrap font-medium">{rec.explanation}</p>
                    </div>
                )}

                {/* Score breakdown */}
                {Object.keys(breakdown).length > 0 && (
                    <div className="mb-5">
                        <div className="text-xs font-black uppercase tracking-widest mb-3 text-[#555]">Score Breakdown</div>
                        <div className="space-y-3">
                            {Object.entries(breakdown).map(([key, val]) => (
                                <div key={key}>
                                    <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wide">
                                        <span className="text-black">{key}</span>
                                        <span className="text-[#D02020]">{val.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-[#E0E0E0] border-2 border-black h-2.5">
                                        <div className="h-full bg-[#1040C0]" style={{ width: `${(val / 30) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Radar chart */}
                {radarData.length > 0 && (
                    <div className="mb-5">
                        <div className="text-xs font-black uppercase tracking-widest mb-2 text-[#555]">Score Radar</div>
                        <div className="border-2 border-black bg-[#F0F0F0] p-2">
                            <ResponsiveContainer width="100%" height={180}>
                                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                    <PolarGrid stroke="#121212" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#121212", fontSize: 10, fontWeight: 700 }} />
                                    <Radar name="Score" dataKey="score" stroke="#D02020" fill="#D02020" fillOpacity={0.25} />
                                    <Tooltip contentStyle={{ background: "#fff", border: "2px solid #121212", borderRadius: 0, fontWeight: 700 }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <button onClick={onClose} className="btn-primary w-full">Got it!</button>
            </div>
        </div>
    );
}
