// Finger tracing over a letter outline. The check compares the finger path
// with the letter shape: enough of the letter must be covered (coverage) and
// most of the drawing must stay on the letter (accuracy).
import { useEffect, useRef, useState } from 'react';
import { IconEraser, IconCheck } from './icons.tsx';

const GRID = 64;
const FONT = '700 1px "Arial Rounded MT Bold", "Nunito", ui-rounded, "Helvetica Neue", Arial, sans-serif';

export interface TraceScore { coverage: number; accuracy: number; ok: boolean }

/** Letter cells whose neighbours are all letter too (the middle of each stroke). */
export function erode(mask: Uint8Array, size = GRID): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (!mask[(y + dy) * size + x + dx]) { all = 0; break; }
      out[y * size + x] = all;
    }
  }
  return out.some(Boolean) ? out : mask;
}

export function scoreTrace(letterMask: Uint8Array, tolMask: Uint8Array, user: Uint8Array): TraceScore {
  // Coverage is measured on the middle of the strokes, so a finger line
  // thinner than the bold letter still counts as "went over the letter".
  const core = erode(letterMask);
  let letterPx = 0, covered = 0, userPx = 0, inside = 0;
  for (let i = 0; i < core.length; i++) {
    if (core[i]) { letterPx++; if (user[i]) covered++; }
    if (user[i]) { userPx++; if (tolMask[i]) inside++; }
  }
  const coverage = letterPx ? covered / letterPx : 0;
  const accuracy = userPx ? inside / userPx : 0;
  return { coverage, accuracy, ok: coverage >= 0.6 && accuracy >= 0.75 };
}

function maskFrom(canvas: HTMLCanvasElement): Uint8Array {
  const g = document.createElement('canvas');
  g.width = GRID;
  g.height = GRID;
  const c = g.getContext('2d')!;
  c.drawImage(canvas, 0, 0, GRID, GRID);
  const d = c.getImageData(0, 0, GRID, GRID).data;
  const out = new Uint8Array(GRID * GRID);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 60 ? 1 : 0;
  return out;
}

export function TracePad({ glyph, onDone, disabled }: { glyph: string; onDone: (s: TraceScore) => void; disabled?: boolean }) {
  const guide = useRef<HTMLCanvasElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const SIZE = 600; // internal resolution

  const fontSize = /[a-z]/.test(glyph) ? 470 : 440;
  const baseline = /[a-z]/.test(glyph) ? 0.72 : 0.8;

  const drawGlyph = (c: CanvasRenderingContext2D, fill: string, stroke?: { color: string; width: number; dash?: number[] }) => {
    c.font = FONT.replace('1px', `${fontSize}px`);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    const y = SIZE * baseline;
    if (fill) { c.fillStyle = fill; c.fillText(glyph, SIZE / 2, y); }
    if (stroke) {
      c.setLineDash(stroke.dash ?? []);
      c.lineWidth = stroke.width;
      c.strokeStyle = stroke.color;
      c.lineJoin = 'round';
      c.strokeText(glyph, SIZE / 2, y);
      c.setLineDash([]);
    }
  };

  useEffect(() => {
    const g = guide.current!.getContext('2d')!;
    g.clearRect(0, 0, SIZE, SIZE);
    // writing lines (like an English notebook)
    g.strokeStyle = '#d8c8ef';
    g.lineWidth = 3;
    // top line, middle line, base line
    const base = SIZE * baseline;
    for (const y of [base - fontSize * 0.72, base - fontSize * 0.52, base]) {
      g.beginPath();
      g.moveTo(10, y);
      g.lineTo(SIZE - 10, y);
      g.stroke();
    }
    drawGlyph(g, '#efe6fb', { color: '#9b5de5', width: 6, dash: [18, 14] });
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph]);

  const clear = () => {
    const c = ink.current!.getContext('2d')!;
    c.clearRect(0, 0, SIZE, SIZE);
    setHasInk(false);
  };

  const pos = (e: React.PointerEvent) => {
    const r = ink.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const c = ink.current!.getContext('2d')!;
    c.strokeStyle = '#ff4fa3';
    c.lineWidth = 40;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  };

  const check = () => {
    const letter = document.createElement('canvas');
    letter.width = letter.height = SIZE;
    const lc = letter.getContext('2d')!;
    drawGlyph(lc, '#000');
    const tol = document.createElement('canvas');
    tol.width = tol.height = SIZE;
    const tc = tol.getContext('2d')!;
    drawGlyph(tc, '#000', { color: '#000', width: 70 });
    const score = scoreTrace(maskFrom(letter), maskFrom(tol), maskFrom(ink.current!));
    if (import.meta.env.DEV) (window as unknown as { __trace: TraceScore }).__trace = score;
    onDone(score);
  };

  return (
    <div className="trace">
      <div className="trace__pad" dir="ltr">
        <canvas ref={guide} width={SIZE} height={SIZE} className="trace__guide" />
        <canvas
          ref={ink}
          width={SIZE}
          height={SIZE}
          className="trace__ink"
          aria-label={`ציור האות ${glyph}`}
          onPointerDown={(e) => {
            if (disabled) return;
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = pos(e);
            line(last.current, last.current);
            setHasInk(true);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const p = pos(e);
            line(last.current, p);
            last.current = p;
          }}
          onPointerUp={() => { drawing.current = false; last.current = null; }}
          onPointerCancel={() => { drawing.current = false; last.current = null; }}
        />
      </div>
      <div className="trace__actions">
        <button type="button" className="btn btn--ghost" onClick={clear} disabled={disabled}><IconEraser /> מחיקה</button>
        <button type="button" className="btn btn--primary" onClick={check} disabled={!hasInk || disabled}><IconCheck /> סיימתי</button>
      </div>
    </div>
  );
}
