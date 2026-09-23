/**
 * The login/register hero: a warm real photograph as the backdrop, with the
 * signature OCBC-style red curve sweeping in from the top-left and a soft
 * gradient scrim so the brand mark and welcome text stay legible over any
 * part of the image.
 *
 * The photo lives at /login-hero.jpg (public/) — swap that file to change
 * the image without touching this component. A gradient fallback shows if
 * the image is missing, so the layout never breaks.
 */
export function BrandHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="relative overflow-hidden h-60">
      {/* Photo backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-hero.jpg'), linear-gradient(135deg, #f6dadd, #faf6ef)" }}
        aria-hidden="true"
      />

      {/* Scrim: darkens the top for the brand mark and, more heavily, the
          bottom third where the title/subtitle sit, so white text keeps
          strong contrast over any photo. Fades into the app background at
          the very bottom so the card below sits seamlessly. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(32,28,22,0.35) 0%, rgba(32,28,22,0.10) 35%, rgba(32,28,22,0.45) 72%, rgba(32,28,22,0.62) 90%, rgba(250,246,239,0.55) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Signature red curve from the top-left */}
      <svg viewBox="0 0 480 240" width="100%" height="240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" aria-hidden="true">
        <defs>
          <linearGradient id="heroRed" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0273f" />
            <stop offset="100%" stopColor="#c8102e" />
          </linearGradient>
        </defs>
        <path d="M-170 -60 C 40 -30, 120 90, 40 220 C 0 290, -110 300, -210 270 Z" fill="url(#heroRed)" opacity="0.96" />
      </svg>

      {/* Brand + welcome text */}
      <div className="absolute inset-0 px-6 pt-12 flex flex-col">
        <div className="flex items-center gap-2 text-white drop-shadow-md">
          <ShieldGlyph />
          <span className="text-xl font-extrabold">Silver Guard</span>
        </div>
        <div className="mt-auto pb-10">
          <h1 className="text-2xl font-extrabold text-white leading-tight text-balance drop-shadow-md">{title}</h1>
          <p className="mt-1 text-white/90 max-w-[30ch] drop-shadow">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

function ShieldGlyph() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
