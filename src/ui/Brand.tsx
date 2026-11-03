import { BRAND } from '../text/he.ts';

/** The fixed brand: "Noa's English World" + Hebrew tagline. Never personalised. */
export function Brand({ size = 'l', tagline = true }: { size?: 'l' | 's'; tagline?: boolean }) {
  return (
    <div className={`brand brand--${size}`}>
      <p className="brand__name" dir="ltr" lang="en">
        <span className="brand__noa">Noa's</span> <span className="brand__rest">English World</span>
      </p>
      {tagline && <p className="brand__tag">{BRAND.tagline}</p>}
    </div>
  );
}
