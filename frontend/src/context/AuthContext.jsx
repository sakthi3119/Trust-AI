import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);       // { id, username, name, is_onboarded, avatar }
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true); // true while reading localStorage

    // Rehydrate on mount
    useEffect(() => {
        const stored = localStorage.getItem("trustai_token");
        const storedUser = localStorage.getItem("trustai_user");
        if (stored && storedUser) {
            setToken(stored);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const _persist = (tokenVal, userVal) => {
        setToken(tokenVal);
        setUser(userVal);
        localStorage.setItem("trustai_token", tokenVal);
        localStorage.setItem("trustai_user", JSON.stringify(userVal));
    };

    const register = async ({ username, email, password, name }) => {
        const { data } = await api.post("/auth/register", { username, email, password, name });
        _persist(data.access_token, {
            id: data.user_id,
            username: data.username,
            name: data.name,
            is_onboarded: data.is_onboarded,
            avatar: data.avatar || "",
        });
        return data;
    };

    const login = async ({ username, password }) => {
        const { data } = await api.post("/auth/login", { username, password });
        _persist(data.access_token, {
            id: data.user_id,
            username: data.username,
            name: data.name,
            is_onboarded: data.is_onboarded,
            avatar: data.avatar || "",
        });
        return data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("trustai_token");
        localStorage.removeItem("trustai_user");
    };

    const markOnboarded = () => {
        const updated = { ...user, is_onboarded: true };
        setUser(updated);
        localStorage.setItem("trustai_user", JSON.stringify(updated));
    };

    const updateAvatar = (avatar) => {
        const updated = { ...user, avatar };
        setUser(updated);
        localStorage.setItem("trustai_user", JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, markOnboarded, updateAvatar }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
