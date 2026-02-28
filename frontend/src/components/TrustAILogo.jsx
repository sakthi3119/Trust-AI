/**
 * TrustAI Brand Logo
 *
 * Props:
 *   iconSize     {number}   px width/height of the icon mark        (default 36)
 *   showText     {boolean}  show the wordmark                        (default true)
 *   textClass    {string}   Tailwind text-size + color class         (default "text-xl text-black")
 *   orientation  {string}   "horizontal" | "stacked"                 (default "horizontal")
 *   className    {string}   extra wrapper classes
 *
 * Usage:
 *   <TrustAILogo />                                  sidebar (icon + wordmark, horizontal)
 *   <TrustAILogo iconSize={52} showText={false} />   auth left panel (icon mark only)
 *   <TrustAILogo iconSize={28} textClass="text-2xl text-black" />  mobile header
 */
export default function TrustAILogo({
    iconSize = 36,
    showText = true,
    textClass = "text-xl text-black",
    orientation = "horizontal",
    className = "",
}) {
    const isStacked = orientation === "stacked";

    return (
        <div
            className={`flex ${isStacked ? "flex-col items-start" : "items-center"} gap-2.5 ${className}`}
        >
            {/* ── Icon mark ── */}
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 40 40"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0, display: "block" }}
                aria-label="TrustAI"
                role="img"
            >
                {/* Black plate */}
                <rect width="40" height="40" fill="#121212" />

                {/* Red circle — top-left: campus life / people */}
                <circle cx="12" cy="13" r="9" fill="#D02020" />

                {/* Blue square — top-right: AI / precision */}
                <rect x="22" y="5" width="13" height="13" fill="#1040C0" />

                {/* Yellow triangle — bottom, apex bridging the two shapes: trust / direction */}
                <polygon points="5,35 35,35 20,18" fill="#F0C020" />
            </svg>

            {/* ── Wordmark ── */}
            {showText && (
                <span
                    className={`font-black uppercase tracking-tighter leading-none whitespace-nowrap ${textClass}`}
                >
                    TRUST<span className="text-[#D02020]">AI</span>
                </span>
            )}
        </div>
    );
}
