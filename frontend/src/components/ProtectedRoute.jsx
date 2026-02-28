import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-black border-t-[#D02020] animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_onboarded) return <Navigate to="/onboarding" replace />;

    return children;
}
