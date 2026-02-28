import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    MessageSquare, Wallet, Sparkles, CalendarDays, Megaphone, LogOut, User, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import TrustAILogo from "./TrustAILogo.jsx";

const NAV = [
    { to: "/", icon: MessageSquare, label: "Chat" },
    { to: "/budget", icon: Wallet, label: "Budget" },
    { to: "/recommendations", icon: Sparkles, label: "Explore" },
    { to: "/planner", icon: CalendarDays, label: "Planner" },
    { to: "/content", icon: Megaphone, label: "Content" },
    { to: "/profile", icon: User, label: "Profile" },
];



export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.success("Logged out!");
        navigate("/login");
    };

    const SidebarContent = () => (
        <>
            {/* Brand */}
            <div className="flex items-center px-4 py-5 border-b-4 border-black">
                <TrustAILogo iconSize={28} textClass="text-xl text-black" />
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1">
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 border-2 transition-all duration-150 font-bold uppercase tracking-wider text-xs ${isActive
                                ? "bg-[#D02020] border-black text-white shadow-[3px_3px_0px_0px_#121212]"
                                : "border-transparent text-black hover:bg-[#F0F0F0] hover:border-black"
                            }`
                        }
                    >
                        <Icon size={17} className="shrink-0" />
                        <span className="hidden md:block">{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="px-3 pb-4 border-t-4 border-black pt-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-2 mb-1">
                    {user?.avatar
                        ? <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full border-2 border-black object-cover shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-[#F0C020] border-2 border-black flex items-center justify-center shrink-0">
                            <User size={13} className="text-black" />
                        </div>
                    }
                    <div className="min-w-0">
                        <p className="text-xs font-black text-black uppercase truncate leading-none">{user?.name || "Student"}</p>
                        <p className="text-[10px] text-[#555] font-medium truncate">@{user?.username}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    title="Logout"
                    className="flex items-center gap-3 w-full px-3 py-2 border-2 border-transparent text-xs font-bold uppercase tracking-wider text-black hover:bg-[#D02020] hover:text-white hover:border-black transition-all duration-150"
                >
                    <LogOut size={15} className="shrink-0" />
                    <span className="hidden md:block">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#F0F0F0]">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-56 flex-col bg-white border-r-4 border-black shrink-0">
                <SidebarContent />
            </aside>

            {/* Mobile icon sidebar */}
            <aside className="flex md:hidden w-14 flex-col bg-white border-r-4 border-black shrink-0">
                <div className="flex items-center justify-center py-4 border-b-4 border-black">
                    <button onClick={() => setMobileOpen(true)} className="p-1">
                        <Menu size={20} className="text-black" />
                    </button>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    {NAV.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({ isActive }) =>
                                `flex items-center justify-center p-2 border-2 transition-all ${isActive ? "bg-[#D02020] border-black text-white" : "border-transparent text-black hover:border-black"}`
                            }
                        >
                            <Icon size={17} />
                        </NavLink>
                    ))}
                </nav>
                <button onClick={handleLogout} className="flex items-center justify-center p-3 border-t-4 border-black text-black hover:bg-[#D02020] hover:text-white transition-all">
                    <LogOut size={15} />
                </button>
            </aside>

            {/* Mobile drawer overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="w-64 bg-white border-r-4 border-black flex flex-col">
                        <div className="flex items-center justify-between px-4 py-4 border-b-4 border-black">
                            <div className="flex items-center">
                                <TrustAILogo iconSize={24} textClass="text-lg text-black" />
                            </div>
                            <button onClick={() => setMobileOpen(false)}><X size={20} /></button>
                        </div>
                        <SidebarContent />
                    </div>
                    <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 overflow-y-auto bg-[#F0F0F0]">
                {children}
            </main>
        </div>
    );
}
