import React from 'react';
import { Character, CHARACTERS, CharKind, Mood, Pose } from '../components/Character';

const MOODS: Mood[] = ['idle', 'happy', 'excited', 'surprised', 'confused', 'sad', 'thinking'];
const POSES: Pose[] = ['wave', 'point', 'celebrate'];

/** Character model sheet: every character, every expression, and key poses. Open at /model-sheet. */
export function ModelSheet() {
  const kinds = Object.keys(CHARACTERS) as CharKind[];
  return (
    <div style={{ padding: 24, background: '#f7f6f3', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 6px' }}>Manchester Technologies · Character model sheet</h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>Six original characters. Every character uses the same face rig, so expressions match across the app.</p>
      {kinds.map((k) => (
        <section key={k} className="card" style={{ marginBottom: 18 }} aria-label={CHARACTERS[k].name}>
          <div className="spread"><h2 style={{ fontSize: 22 }}>{CHARACTERS[k].name}</h2><span className="muted">{CHARACTERS[k].role}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginTop: 10 }}>
            {MOODS.map((m) => (
              <figure key={m} style={{ margin: 0, textAlign: 'center' }}>
                <Character kind={k} mood={m} size={110} />
                <figcaption className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{m}</figcaption>
              </figure>
            ))}
            {POSES.map((p) => (
              <figure key={p} style={{ margin: 0, textAlign: 'center' }}>
                <Character kind={k} mood="happy" pose={p} size={110} />
                <figcaption className="muted" style={{ fontSize: 13, fontWeight: 700 }}>pose: {p}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
