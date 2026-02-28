import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Wallet, TrendingUp, AlertTriangle, Plus, Loader2, Edit3, Check, X } from "lucide-react";
import { getBudgetStatus, addTransaction, updateBudget } from "../api/client.js";
import toast from "react-hot-toast";

const CAT_BG = {
    food: "#F0C020", event: "#1040C0", activity: "#D02020", transport: "#888888", other: "#E0E0E0",
};

export default function BudgetDashboard() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ amount: "", category: "food", description: "" });
    const [adding, setAdding] = useState(false);
    const [editBudget, setEditBudget] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ daily: "", monthly: "" });
    const [savingBudget, setSavingBudget] = useState(false);

    const refresh = () => {
        setLoading(true);
        getBudgetStatus()
            .then((r) => setStatus(r.data))
            .catch(() => toast.error("Failed to load budget"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { refresh(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.amount || !form.description) return;
        setAdding(true);
        try {
            await addTransaction({ ...form, amount: parseFloat(form.amount) });
            toast.success("Transaction added");
            setForm({ amount: "", category: "food", description: "" });
            refresh();
        } catch { toast.error("Failed to add transaction"); }
        finally { setAdding(false); }
    };

    const openEditBudget = () => {
        setBudgetForm({ daily: status?.daily_budget ?? "", monthly: status?.monthly_budget ?? "" });
        setEditBudget(true);
    };

    const handleSaveBudget = async () => {
        setSavingBudget(true);
        try {
            await updateBudget(Number(budgetForm.daily), Number(budgetForm.monthly));
            toast.success("Budget updated!");
            setEditBudget(false);
            refresh();
        } catch { toast.error("Failed to update budget"); }
        finally { setSavingBudget(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-black border-t-[#D02020] animate-spin" />
        </div>
    );
    if (!status) return <div className="text-[#555] p-4 font-bold uppercase text-sm">No budget data.</div>;

    const todayPct = Math.min(100, (status.spent_today / status.daily_budget) * 100);
    const monthPct = Math.min(100, (status.spent_month / status.monthly_budget) * 100);

    const pieData = [
        { name: "Spent", value: status.spent_today },
        { name: "Remaining", value: Math.max(0, status.remaining_today) },
    ];

    return (
        <div className="space-y-5">
            {/* Warning banner */}
            {status.warning && (
                <div className="flex items-center gap-3 p-4 bg-[#F0C020] border-2 border-black text-black text-sm font-bold"
                    style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                    <AlertTriangle size={18} />
                    {status.warning}
                </div>
            )}

            {/* Edit budget panel */}
            {editBudget ? (
                <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-black text-sm uppercase tracking-widest">Edit Budget</span>
                        <button onClick={() => setEditBudget(false)} className="p-1 border-2 border-black hover:bg-[#D02020] hover:text-white transition-all">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Daily (₹)</label>
                            <input className="input w-full" type="number" min="50" value={budgetForm.daily}
                                onChange={(e) => setBudgetForm((f) => ({ ...f, daily: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest block mb-1">Monthly (₹)</label>
                            <input className="input w-full" type="number" min="500" value={budgetForm.monthly}
                                onChange={(e) => setBudgetForm((f) => ({ ...f, monthly: e.target.value }))} />
                        </div>
                    </div>
                    <button onClick={handleSaveBudget} disabled={savingBudget} className="btn-primary flex items-center gap-2 text-sm">
                        {savingBudget ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Budget
                    </button>
                </div>
            ) : (
                <button onClick={openEditBudget}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-2 border-2 border-black text-black hover:bg-[#F0C020] transition-all"
                    style={{ boxShadow: "2px 2px 0 0 #121212" }}>
                    <Edit3 size={12} /> Edit Budget Limits
                </button>
            )}

            {/* Cards row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily */}
                <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet size={18} className="text-[#1040C0]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#555]">Daily Budget</span>
                    </div>
                    <div className="text-2xl font-black text-black mb-1">₹{status.remaining_today.toFixed(0)}</div>
                    <div className="text-xs text-[#888] mb-3 font-medium">of ₹{status.daily_budget} remaining</div>
                    <div className="w-full bg-[#E0E0E0] border-2 border-black h-2.5">
                        <div className={`h-full transition-all ${todayPct > 85 ? "bg-[#D02020]" : todayPct > 60 ? "bg-[#F0C020]" : "bg-[#1040C0]"}`}
                            style={{ width: `${todayPct}%` }} />
                    </div>
                    <div className="text-xs text-[#888] mt-1 font-medium">{todayPct.toFixed(0)}% used today</div>
                </div>

                {/* Monthly */}
                <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={18} className="text-[#D02020]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#555]">Monthly Budget</span>
                    </div>
                    <div className="text-2xl font-black text-black mb-1">₹{status.remaining_month.toFixed(0)}</div>
                    <div className="text-xs text-[#888] mb-3 font-medium">of ₹{status.monthly_budget} remaining</div>
                    <div className="w-full bg-[#E0E0E0] border-2 border-black h-2.5">
                        <div className={`h-full transition-all ${monthPct > 85 ? "bg-[#D02020]" : "bg-[#F0C020]"}`}
                            style={{ width: `${monthPct}%` }} />
                    </div>
                    <div className="text-xs text-[#888] mt-1 font-medium">{monthPct.toFixed(0)}% used this month</div>
                </div>

                {/* Pie chart */}
                <div className="bg-white border-4 border-black p-5 flex flex-col items-center" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#555] mb-2">Today's Spend</div>
                    <ResponsiveContainer width="100%" height={80}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={36} dataKey="value" startAngle={90} endAngle={-270}>
                                <Cell fill="#D02020" />
                                <Cell fill="#E0E0E0" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="text-xl font-black text-black">₹{status.spent_today.toFixed(0)}</div>
                    <div className="text-xs text-[#888] font-medium">spent today</div>
                </div>
            </div>

            {/* Add transaction */}
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <div className="flex items-center gap-2 mb-4">
                    <Plus size={18} className="text-[#D02020]" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Add Transaction</h3>
                </div>
                <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
                    <input className="input w-28" type="number" placeholder="₹ Amount" value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" step="0.01" />
                    <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        {Object.keys(CAT_BG).map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>
                    <input className="input flex-1 min-w-40" placeholder="Description…" value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <button type="submit" className="btn-primary" disabled={adding}>
                        {adding ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                    </button>
                </form>
            </div>

            {/* Recent transactions */}
            <div className="bg-white border-4 border-black p-5" style={{ boxShadow: "8px 8px 0 0 #121212" }}>
                <h3 className="font-black text-sm uppercase tracking-widest mb-4">Today's Transactions</h3>
                {status.transactions_today.length === 0 ? (
                    <p className="text-[#888] text-sm font-medium">No transactions today.</p>
                ) : (
                    <div className="space-y-2">
                        {status.transactions_today.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b-2 border-black last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 border-2 border-black text-black"
                                        style={{ backgroundColor: CAT_BG[tx.category] || "#E0E0E0" }}>
                                        {tx.category}
                                    </span>
                                    <span className="text-sm text-black font-medium">{tx.description}</span>
                                </div>
                                <span className="text-sm font-black text-black">₹{tx.amount}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
