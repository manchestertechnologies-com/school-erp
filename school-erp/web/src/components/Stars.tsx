import React from 'react';

export function Stars({ count, total = 3 }: { count: number; total?: number }) {
  return (
    <div className="star-chip" aria-label={`${count} of ${total} stars`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < count ? 'on' : ''} aria-hidden="true">⭐</span>
      ))}
    </div>
  );
}
