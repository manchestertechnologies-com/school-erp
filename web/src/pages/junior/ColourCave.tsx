import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { speak } from '../../lib/motion';
import { Character, Mood } from '../../components/Character';

const W = 720, H = 440;
const COLOURS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#6366f1', '#ec4899', '#7c3aed', '#92400e', '#111827'];

type Stroke = { color: string; size: number; erase: boolean; points: { x: number; y: number }[] };

/**
 * Colouring studio.
 * Model: every stroke keeps its own colour, size and erase flag. The picture is rebuilt by replaying
 * the stroke list, so choosing a new colour only changes future strokes. Earlier colours stay.
 * Eraser strokes remove ink by compositing "destination-out" on a transparent ink layer.
 */
export function ColourCave({ activity, studentId, onDone }: { activity: any; studentId: number; onDone: (stars: number) => void }) {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const outlineRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const redo = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [colour, setColour] = useState(COLOURS[0]);
  const [size, setSize] = useState(14);
  const [eraser, setEraser] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [msg, setMsg] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Keep the latest tool settings in refs so pointer handlers never read stale state.
  const toolRef = useRef({ colour, size, eraser });
  toolRef.current = { colour, size, eraser };

  useEffect(() => {
    // Momo outline drawn on its own canvas so it never gets painted over or erased.
    const o = outlineRef.current!.getContext('2d')!;
    o.clearRect(0, 0, W, H);
    o.strokeStyle = '#1f2937'; o.lineWidth = 5; o.lineJoin = 'round';
    o.beginPath(); o.arc(W / 2, 170, 120, 0, Math.PI * 2); o.stroke(); // head
    o.beginPath(); o.ellipse(W / 2, 330, 110, 90, 0, 0, Math.PI * 2); o.stroke(); // body
    o.beginPath(); o.arc(W / 2 - 150, 120, 36, 0, Math.PI * 2); o.stroke(); // left ear
    o.beginPath(); o.arc(W / 2 + 150, 120, 36, 0, Math.PI * 2); o.stroke(); // right ear
    o.beginPath(); o.arc(W / 2 - 40, 150, 14, 0, Math.PI * 2); o.stroke(); // left eye
    o.beginPath(); o.arc(W / 2 + 40, 150, 14, 0, Math.PI * 2); o.stroke(); // right eye
    o.beginPath(); o.arc(W / 2, 200, 42, 0.15 * Math.PI, 0.85 * Math.PI); o.stroke(); // smile
    speak('Pick a colour and paint Momo!');
  }, []);

  function render() {
    const ctx = inkRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      if (s.points.length === 0) continue;
      ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.color; // colour is part of the stroke, so old colours survive
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      if (s.points.length === 1) ctx.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    setCanUndo(strokes.current.length > 0);
    setCanRedo(redo.current.length > 0);
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = inkRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = toolRef.current;
    current.current = { color: t.colour, size: t.size, erase: t.eraser, points: [pos(e)] };
    strokes.current.push(current.current);
    redo.current = [];
    render();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!current.current) return;
    current.current.points.push(pos(e));
    render();
  }
  function up() { current.current = null; }

  function undo() { const s = strokes.current.pop(); if (s) redo.current.push(s); render(); }
  function redoIt() { const s = redo.current.pop(); if (s) strokes.current.push(s); render(); }
  function clearAll() { redo.current = strokes.current.splice(0); render(); setConfirmClear(false); setMsg('Picture cleared. Press Undo to bring it back.'); }

  function save() {
    try {
      const url = composite();
      localStorage.setItem('mt-colour-' + studentId, url);
      setMsg('Saved in this browser.');
    } catch { setMsg('Could not save in this browser.'); }
  }

  function composite() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.drawImage(inkRef.current!, 0, 0);
    x.drawImage(outlineRef.current!, 0, 0);
    return c.toDataURL('image/png');
  }

  async function submit() {
    setMsg('Sending to your teacher…');
    try {
      await api(`/learning/${activity.id}/complete`, { method: 'POST', body: { student_id: studentId, stars: 2, xp: 20 } });
      setMsg('Your picture is submitted! ⭐⭐');
      setMood('excited');
      speak('Great colouring! Your teacher will see it.');
      onDone(2);
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Character kind="bubbles" mood={mood} pose={mood === 'excited' ? 'celebrate' : 'none'} size={96} />
        <div className="speech" style={{ fontSize: 18 }}>Pick a colour and paint Momo!</div>
      </div>
      <div className="row" aria-label="Colours">
        {COLOURS.map((c) => (
          <button key={c} className="swatch-big" style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={!eraser && colour === c}
            onClick={() => { setColour(c); setEraser(false); }} />
        ))}
      </div>
      <div className="row">
        <label className="field" style={{ minWidth: 200 }}>Brush size
          <input type="range" min={4} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <button className="tool-big" aria-pressed={eraser} onClick={() => setEraser((v) => !v)}>🧽 Eraser</button>
        <button className="tool-big" onClick={undo} disabled={!canUndo}>↶ Undo</button>
        <button className="tool-big" onClick={redoIt} disabled={!canRedo}>↷ Redo</button>
        <button className="tool-big" onClick={() => setConfirmClear(true)}>🗑 Clear</button>
      </div>
      {confirmClear && (
        <div className="row" role="alertdialog" aria-label="Confirm clear" style={{ background: '#fff7ed', padding: 12, borderRadius: 16 }}>
          <strong>Clear the whole picture?</strong>
          <button className="tool-big" onClick={clearAll}>Yes, clear</button>
          <button className="tool-big" onClick={() => setConfirmClear(false)}>Keep it</button>
        </div>
      )}
      <div className="canvas-frame" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={inkRef} width={W} height={H}
          style={{ background: '#fff' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <canvas ref={outlineRef} width={W} height={H} className="overlay" aria-hidden="true" />
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="muted" role="status" style={{ fontWeight: 700 }}>{msg}</div>
        <div className="row">
          <button className="tool-big" onClick={save}>💾 Save</button>
          <button className="big-btn green" style={{ minHeight: 64, fontSize: 20 }} onClick={submit}>Submit to teacher ⭐</button>
        </div>
      </div>
    </div>
  );
}
