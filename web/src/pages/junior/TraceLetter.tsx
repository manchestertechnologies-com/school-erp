import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { speak, reduced } from '../../lib/motion';
import { gsap } from 'gsap';

const W = 640, H = 400;

/** Trace the dotted letter. Completion uses real pixel coverage of the guide letter, not a timer. */
export function TraceLetter({ activity, studentId, onDone }: { activity: any; studentId: number; onDone: (stars: number) => void }) {
  const letter: string = activity.content.letter || 'B';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    // guide mask (solid letter) in an offscreen canvas
    const g = document.createElement('canvas');
    g.width = W; g.height = H;
    const gctx = g.getContext('2d')!;
    gctx.fillStyle = '#000';
    gctx.font = '900 300px "Baloo 2", Arial, sans-serif';
    gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
    gctx.fillText(letter, W / 2, H / 2 + 10);
    guideRef.current = g;
    draw();
    speak(`Trace the letter ${letter}. Start at the dot.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const c = canvasRef.current!; const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    // dotted guide
    ctx.save();
    ctx.font = '900 300px "Baloo 2", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.setLineDash([14, 14]);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeText(letter, W / 2, H / 2 + 10);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(148,163,184,.12)';
    ctx.fillText(letter, W / 2, H / 2 + 10);
    ctx.restore();
  }

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  function down(e: React.PointerEvent) {
    if (done) return;
    drawing.current = true; canvasRef.current!.setPointerCapture(e.pointerId);
    last.current = pos(e);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current || done) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    const coverage = measure();
    setPct(coverage);
    if (coverage >= 0.6 && !done) finish();
  }

  // Coverage = share of the solid letter's pixels that now carry orange ink
  function measure() {
    const c = canvasRef.current!.getContext('2d')!;
    const g = guideRef.current!.getContext('2d')!;
    const ink = c.getImageData(0, 0, W, H).data;
    const mask = g.getImageData(0, 0, W, H).data;
    let total = 0, covered = 0;
    for (let i = 3; i < mask.length; i += 4 * 4) { // sample every 4th pixel for speed
      if (mask[i] > 128) {
        total++;
        const r = ink[i - 3], gg = ink[i - 2], b = ink[i - 1];
        if (r > 200 && gg > 80 && gg < 160 && b < 90) covered++;
      }
    }
    return total ? covered / total : 0;
  }

  async function finish() {
    setDone(true);
    if (!reduced()) gsap.fromTo(canvasRef.current, { scale: 1 }, { scale: 1.03, yoyo: true, repeat: 3, duration: 0.2 });
    speak('Wonderful! You traced the letter ' + letter + '!');
    await api(`/learning/${activity.id}/complete`, { method: 'POST', body: { student_id: studentId, stars: 3, xp: 25 } }).catch(() => {});
    onDone(3);
  }

  function reset() { setDone(false); setPct(0); draw(); }

  return (
    <div className="card" style={{ display: 'grid', gap: 14 }}>
      <div className="canvas-frame">
        <canvas ref={canvasRef} width={W} height={H} aria-label={`Trace the letter ${letter}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="muted" style={{ fontWeight: 700 }}>Traced: {Math.round(pct * 100)}%</div>
        <button className="big-btn blue" style={{ minHeight: 60, fontSize: 18 }} onClick={reset}>Try again ↺</button>
      </div>
    </div>
  );
}
