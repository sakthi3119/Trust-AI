import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
    Send, Loader2, Trash2, Bot, User, Plus, Pin, PinOff,
    Pencil, Check, X, MessageSquare, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
    sendMessage, getChatHistory, getChatSessions,
    createChatSession, updateChatSession, deleteChatSession,
} from "../api/client.js";
import toast from "react-hot-toast";

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ role, content }) {
    const isBot = role === "assistant";
    const { user } = useAuth();
    return (
        <div className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"}`}>
            <div className={`w-8 h-8 border-2 border-black flex items-center justify-center shrink-0 font-black text-xs overflow-hidden
                ${isBot ? "bg-[#1040C0] text-white" : "bg-[#F0C020] text-black"}`}>
                {isBot
                    ? <Bot size={15} />
                    : (user?.avatar
                        ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                        : <User size={15} />)
                }
            </div>
            <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border-2 border-black font-medium
                ${isBot ? "bg-white text-black" : "bg-[#D02020] text-white"}`}
                style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                {content}
            </div>
        </div>
    );
}

// ── Date grouping helper ──────────────────────────────────────────────────────
function dateGroup(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return "This Week";
    if (diff < 30) return "This Month";
    return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Older"];

// ── Single sidebar session row ────────────────────────────────────────────────
function SessionRow({ sess, active, onSelect, onRename, onPin, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(sess.title);
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commitRename = () => {
        if (draft.trim() && draft.trim() !== sess.title) onRename(sess.id, draft.trim());
        setEditing(false);
    };

    return (
        <div
            onClick={() => !editing && onSelect(sess.id)}
            className={`group relative flex items-center gap-2 px-3 py-2 cursor-pointer border-l-4 transition-all
                ${active
                    ? "bg-[#121212] text-white border-[#D02020]"
                    : "text-black border-transparent hover:bg-[#E8E8E8] hover:border-[#1040C0]"
                }`}
        >
            {/* Pin indicator */}
            {sess.is_pinned && (
                <Pin size={10} className={`shrink-0 ${active ? "text-[#F0C020]" : "text-[#1040C0]"}`} />
            )}

            {/* Title / rename input */}
            {editing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent border-b-2 border-[#F0C020] outline-none text-sm font-medium min-w-0"
                />
            ) : (
                <span className="flex-1 text-sm font-medium truncate">{sess.title}</span>
            )}

            {/* Action icons — visible on hover or when active */}
            {!editing && (
                <div className={`flex gap-1 shrink-0 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                    <button onClick={(e) => { e.stopPropagation(); onPin(sess.id, !sess.is_pinned); }}
                        title={sess.is_pinned ? "Unpin" : "Pin"}
                        className={`p-1 hover:text-[#F0C020] transition-colors ${active ? "text-white" : "text-[#555]"}`}>
                        {sess.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(sess.title); }}
                        title="Rename"
                        className={`p-1 hover:text-[#F0C020] transition-colors ${active ? "text-white" : "text-[#555]"}`}>
                        <Pencil size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(sess.id); }}
                        title="Delete"
                        className={`p-1 hover:text-[#D02020] transition-colors ${active ? "text-white" : "text-[#555]"}`}>
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatInterface() {
    const [sessions, setSessions] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const endRef = useRef(null);
    const skipHistoryReloadRef = useRef(false); // prevents useEffect from overwriting optimistic messages

    const activeSession = sessions.find((s) => s.id === activeId);

    // Load sessions list
    const loadSessions = useCallback(async () => {
        try {
            const { data } = await getChatSessions();
            setSessions(data);
        } catch { /* backend unavailable */ }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    // Load messages when active session changes
    useEffect(() => {
        if (skipHistoryReloadRef.current) {
            skipHistoryReloadRef.current = false;
            return;
        }
        if (!activeId) {
            setMessages([{ role: "assistant", content: "Hey! 👋 I'm TRUSTAI, your smart campus assistant. Start a new chat or pick a previous one from the sidebar." }]);
            return;
        }
        setLoadingMsgs(true);
        getChatHistory(activeId)
            .then(({ data }) => {
                if (data.length === 0) {
                    setMessages([{ role: "assistant", content: "Hey! 👋 I'm TRUSTAI. Tell me your budget, free time, and preferences — I'll sort you out!" }]);
                } else {
                    setMessages(data);
                }
            })
            .catch(() => { })
            .finally(() => setLoadingMsgs(false));
    }, [activeId]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

    // ── New chat ───────────────────────────────────────────────────────────────
    const handleNewChat = async () => {
        try {
            const { data } = await createChatSession();
            setSessions((prev) => [data, ...prev]);
            setActiveId(data.id);
        } catch {
            toast.error("Could not create new chat");
        }
    };

    // ── Send message ───────────────────────────────────────────────────────────
    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");

        // If no active session, create one on the fly
        let sessionId = activeId;
        if (!sessionId) {
            try {
                const { data: sess } = await createChatSession();
                setSessions((prev) => [sess, ...prev]);
                skipHistoryReloadRef.current = true; // don't reload (empty) history on setActiveId
                setActiveId(sess.id);
                sessionId = sess.id;
            } catch {
                toast.error("Could not start a chat session");
                return;
            }
        }

        setMessages((m) => [...m, { role: "user", content: text }]);
        setLoading(true);
        try {
            const { data } = await sendMessage(text, sessionId);
            setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
            // Refresh session list so title / last_message updates
            loadSessions();
        } catch {
            toast.error("Could not reach the AI. Make sure Ollama is running.");
            setMessages((m) => [...m, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please check that Ollama is running." }]);
        } finally {
            setLoading(false);
        }
    };

    // ── Rename ─────────────────────────────────────────────────────────────────
    const handleRename = async (id, title) => {
        try {
            await updateChatSession(id, { title });
            setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title } : s));
        } catch {
            toast.error("Rename failed");
        }
    };

    // ── Pin ────────────────────────────────────────────────────────────────────
    const handlePin = async (id, is_pinned) => {
        try {
            await updateChatSession(id, { is_pinned });
            setSessions((prev) => {
                const updated = prev.map((s) => s.id === id ? { ...s, is_pinned } : s);
                return [...updated].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
            });
        } catch {
            toast.error("Pin failed");
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        try {
            await deleteChatSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeId === id) setActiveId(null);
            toast.success("Chat deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    // ── Group sessions by date ─────────────────────────────────────────────────
    const pinned = sessions.filter((s) => s.is_pinned);
    const unpinned = sessions.filter((s) => !s.is_pinned);

    const grouped = {};
    for (const s of unpinned) {
        const g = dateGroup(s.updated_at || s.created_at);
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(s);
    }

    const QUICK = ["I have ₹300 and 2 hours free", "Suggest evening events", "What's cheap near hostel?", "Plan my afternoon"];

    return (
        <div className="flex h-full bg-[#F0F0F0] overflow-hidden">

            {/* ── SIDEBAR ── */}
            <div className={`flex flex-col bg-white border-r-4 border-black transition-all duration-200 shrink-0
                ${sidebarOpen ? "w-72" : "w-0 overflow-hidden"}`}>

                {/* Sidebar header */}
                <div className="flex items-center justify-between px-4 py-4 border-b-4 border-black shrink-0">
                    <span className="font-black text-xs uppercase tracking-widest text-black">Chats</span>
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1040C0] text-white text-xs font-black uppercase tracking-wide border-2 border-black hover:bg-[#D02020] transition-colors"
                        style={{ boxShadow: "2px 2px 0 0 #121212" }}>
                        <Plus size={12} /> New
                    </button>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto py-2">
                    {sessions.length === 0 && (
                        <div className="px-4 py-8 text-center">
                            <MessageSquare size={28} className="mx-auto mb-2 text-[#CCC]" />
                            <p className="text-xs font-bold uppercase tracking-widest text-[#AAA]">No chats yet</p>
                        </div>
                    )}

                    {/* Pinned */}
                    {pinned.length > 0 && (
                        <>
                            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#888]">📌 Pinned</div>
                            {pinned.map((s) => (
                                <SessionRow key={s.id} sess={s} active={activeId === s.id}
                                    onSelect={setActiveId} onRename={handleRename}
                                    onPin={handlePin} onDelete={handleDelete} />
                            ))}
                            {unpinned.length > 0 && <div className="mx-3 my-2 border-t-2 border-[#E8E8E8]" />}
                        </>
                    )}

                    {/* Grouped by date */}
                    {GROUP_ORDER.map((group) => grouped[group]?.length > 0 && (
                        <div key={group}>
                            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#888]">{group}</div>
                            {grouped[group].map((s) => (
                                <SessionRow key={s.id} sess={s} active={activeId === s.id}
                                    onSelect={setActiveId} onRename={handleRename}
                                    onPin={handlePin} onDelete={handleDelete} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── MAIN CHAT AREA ── */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-white border-b-4 border-black shrink-0">
                    <button onClick={() => setSidebarOpen((v) => !v)}
                        className="p-1.5 border-2 border-black hover:bg-[#F0C020] transition-colors"
                        style={{ boxShadow: "2px 2px 0 0 #121212" }}>
                        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-xl uppercase tracking-tighter text-black truncate">
                            {activeSession ? activeSession.title : "AI Chat"}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#888]">Powered by Ollama · Local LLM</p>
                    </div>
                    {activeId && (
                        <button onClick={() => handleDelete(activeId)}
                            title="Delete this chat"
                            className="p-2 border-2 border-black text-black hover:bg-[#D02020] hover:text-white transition-all"
                            style={{ boxShadow: "2px 2px 0 0 #121212" }}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {loadingMsgs ? (
                        <div className="flex justify-center pt-20">
                            <Loader2 size={24} className="animate-spin text-[#1040C0]" />
                        </div>
                    ) : (
                        <>
                            {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 border-2 border-black bg-[#1040C0] text-white flex items-center justify-center">
                                        <Bot size={15} />
                                    </div>
                                    <div className="bg-white border-2 border-black px-4 py-3" style={{ boxShadow: "3px 3px 0 0 #121212" }}>
                                        <Loader2 size={16} className="animate-spin text-[#1040C0]" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input area */}
                <div className="px-6 py-4 bg-white border-t-4 border-black shrink-0">
                    <div className="flex gap-2 flex-wrap mb-3">
                        {QUICK.map((p) => (
                            <button key={p} onClick={() => setInput(p)}
                                className="text-xs px-3 py-1.5 border-2 border-black font-bold uppercase tracking-wide text-black bg-[#F0F0F0] hover:bg-[#F0C020] transition-all">
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input
                            className="input flex-1"
                            placeholder="Tell me your budget, time, preferences…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                        />
                        <button onClick={send} disabled={loading || !input.trim()} className="btn-blue flex items-center gap-2 px-4">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
