'use client';

import { OverlaySpec } from '@/lib/types';

/** Vector translation layer (OverlaySpec): crisp text on top of the scan, click toggles original/translation. */
export default function BubbleLayer({
  overlay,
  originals,
  onToggle,
}: {
  overlay: OverlaySpec;
  originals: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {overlay.bubbles.map(b => {
        const x = Math.max(0, Math.min(1, b.x));
        const y = Math.max(0, Math.min(1, b.y));
        const w = Math.max(0, Math.min(1 - x, b.width));
        const h = Math.max(0, Math.min(1 - y, b.height));
        const text = originals[b.id] ? b.originalText || b.translatedText : b.translatedText;
        return (
          <div
            key={b.id}
            role="button"
            tabIndex={0}
            className="bubble-overlay"
            title="Нажмите, чтобы переключить оригинал/перевод"
            onClick={e => {
              e.stopPropagation();
              onToggle(b.id);
            }}
            onKeyDown={e => e.key === 'Enter' && onToggle(b.id)}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              backgroundColor: b.backgroundColor || '#FFFFFF',
              color: b.textColor || '#0B0C10',
              padding: b.padding,
            }}
          >
            <span
              className="bubble-text"
              style={{
                // scale with page width: base font is designed for a ~900px page
                fontSize: `clamp(9px, ${((b.fontSize || 14) / 900) * 100}cqw, ${(b.fontSize || 14) * 1.4}px)`,
                fontWeight: b.fontWeight || 'bold',
                fontFamily: b.fontFamily || undefined,
              }}
            >
              {text}
            </span>
          </div>
        );
      })}
    </>
  );
}
