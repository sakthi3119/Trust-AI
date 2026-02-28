import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 60000 });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("trustai_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/auth/me");

// ── Onboarding ────────────────────────────────────────────────────────────────
export const submitOnboarding = (answers) => api.post("/onboarding/submit", answers);
export const getProfile = () => api.get("/onboarding/profile"); export const updateProfile = (data) => api.patch("/onboarding/update", data);
// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendMessage = (message, sessionId = null) => api.post("/chat", { message, session_id: sessionId });
export const getChatHistory = (sessionId) => api.get(sessionId ? `/chat/history?session_id=${sessionId}` : "/chat/history");
export const clearHistory = () => api.delete("/chat/history");

// ── Chat Sessions ─────────────────────────────────────────────────────────────
export const getChatSessions = () => api.get("/chat/sessions");
export const createChatSession = () => api.post("/chat/sessions");
export const updateChatSession = (id, data) => api.patch(`/chat/sessions/${id}`, data);
export const deleteChatSession = (id) => api.delete(`/chat/sessions/${id}`);

// ── Budget ────────────────────────────────────────────────────────────────────
export const getBudgetStatus = () => api.get("/budget/status");
export const addTransaction = (tx) => api.post("/budget/transaction", tx);
export const checkBudget = (amount) => api.get(`/budget/check?amount=${amount}`);
export const updateBudget = (d, m) => api.put(`/budget/settings?daily=${d}&monthly=${m}`);

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = (params) => api.post("/recommendations", params);
export const getAllRecommendations = () => api.get("/recommendations/all");

// ── Planner ───────────────────────────────────────────────────────────────────
export const generatePlan = (params) => api.post("/planner/generate", params);
export const getPlanHistory = () => api.get("/planner/history");

// ── Content ───────────────────────────────────────────────────────────────────
export const generateContent = (params) => api.post("/content/generate", params);
export const planCampaign = (params) => api.post("/content/campaign", params);
export const getCaptionVariants = (params) => api.post("/content/caption-variants", params);
export const getEngagementKit = (params) => api.post("/content/engagement-kit", params);

// ── Campus ─────────────────────────────────────────────────────────────────────
export const uploadCampusMap = (formData) => api.post("/campus/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getCampusMap = () => api.get("/campus/map");
export const deleteCampusMap = () => api.delete("/campus/map");
export const uploadAvatar = (formData) => api.post("/campus/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getAvatar = () => api.get("/campus/avatar");

export default api;

