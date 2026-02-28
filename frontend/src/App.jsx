import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Home from "./pages/Home.jsx";
import Budget from "./pages/Budget.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Planner from "./pages/Planner.jsx";
import ContentGen from "./pages/ContentGen.jsx";
import Profile from "./pages/Profile.jsx";

function OnboardingRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-black border-t-[#D02020] animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (user.is_onboarded) return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Onboarding (requires auth, not yet onboarded) */}
            <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

            {/* Protected app routes */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/budget" element={<Budget />} />
                                <Route path="/recommendations" element={<Recommendations />} />
                                <Route path="/planner" element={<Planner />} />
                                <Route path="/content" element={<ContentGen />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

