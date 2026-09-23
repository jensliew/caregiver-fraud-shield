/**
 * The signature OCBC-style red curve sweeping in from the top-left edge —
 * the app's brand anchor on full-bleed screens (login, register). Rendered
 * as an absolutely positioned SVG behind the content, with a soft blush
 * gradient fading into the warm background so it never fights the text.
 */
export function BrandCurve() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 480 320" width="100%" height="320" preserveAspectRatio="xMidYMin slice" className="block">
        <defs>
          <linearGradient id="brandBlush" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbe3e3" />
            <stop offset="100%" stopColor="#faf6ef" />
          </linearGradient>
        </defs>
        {/* soft blush wash across the whole header area */}
        <rect x="0" y="0" width="480" height="320" fill="url(#brandBlush)" />
        {/* the bold red sweep, anchored off the left edge */}
        <path d="M-140 -40 C 60 -20, 150 120, 60 240 C 10 300, -80 320, -180 300 Z" fill="#c8102e" />
        <path d="M-160 -40 C 30 30, 90 150, 20 250" fill="none" stroke="#a50d26" strokeOpacity="0.25" strokeWidth="2" />
      </svg>
    </div>
  );
}
