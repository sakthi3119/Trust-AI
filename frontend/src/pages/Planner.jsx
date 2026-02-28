import { CalendarDays } from "lucide-react";
import DayPlanner from "../components/DayPlanner.jsx";

export default function Planner() {
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <CalendarDays className="text-[#D02020]" />
                    Mini Day Planner
                </h1>
                <p className="text-[#555] text-sm mt-1 font-medium">
                    Get a complete day plan with food, activities, and events — all within your budget and free time.
                </p>
            </div>
            <DayPlanner />
        </div>
    );
}
