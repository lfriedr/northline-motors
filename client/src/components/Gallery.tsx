// =============================================================================
// Gallery — photo viewer for the vehicle detail page.
// Features: thumbnails, prev/next arrows, swipe on phones, arrow keys on
// desktop, and a full-screen mode (tap the main photo).
// =============================================================================
import { useEffect, useRef, useState } from 'react';

export default function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState(0);              // index of the current photo
  const [full, setFull] = useState(false);    // full-screen overlay open?
  const touchX = useRef<number | null>(null); // where a swipe started (useRef = no re-render)
  // Move by d photos, wrapping around at either end (modulo arithmetic).
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length);

  // Keyboard support. We add a listener on mount and remove it on cleanup
  // so we don't leak listeners when leaving the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Swipe detection: remember the start X; on release, if the finger moved
  // more than 40px horizontally, go to the next/previous photo.
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touchX.current = null;
    },
  };

  // The large photo with arrows + counter, used inside the full-screen overlay.
  const Main = ({ className }: { className: string }) => (
    <div className={`relative select-none ${className}`} {...swipe}>
      <img src={photos[i]} alt={`${alt} – photo ${i + 1}`} className="h-full w-full object-contain" />
      <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow hover:bg-white">‹</button>
      <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow hover:bg-white">›</button>
      <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1} / {photos.length}</span>
    </div>
  );

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-slate-200">
        <button className="block w-full" onClick={() => setFull(true)} aria-label="Open full-screen gallery">
          <img src={photos[i]} alt={`${alt} – photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" {...swipe} />
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, n) => (
          <button key={p} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`}
            className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${n === i ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <img src={p} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {full && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Photo gallery">
          <button onClick={() => setFull(false)} className="ml-auto p-4 text-3xl text-white" aria-label="Close gallery">×</button>
          <Main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8" />
        </div>
      )}
    </div>
  );
}
