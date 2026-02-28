/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: { DEFAULT: "#6366f1", hover: "#4f46e5" },
                surface: "#1e1e2e",
                card: "#27273f",
                border: "#3f3f5c",
                accent: "#a78bfa",
                success: "#34d399",
                warning: "#fbbf24",
                danger: "#f87171",
            },
            fontFamily: { sans: ["Inter", "sans-serif"] },
        },
    },
    plugins: [],
};
