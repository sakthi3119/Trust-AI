import { Wallet } from "lucide-react";
import BudgetDashboard from "../components/BudgetDashboard.jsx";

export default function Budget() {
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <Wallet className="text-[#D02020]" />
                    Budget Guardian
                </h1>
                <p className="text-[#555] text-sm mt-1 font-medium">
                    Track your daily spending and stay within your budget.
                </p>
            </div>
            <BudgetDashboard />
        </div>
    );
}
