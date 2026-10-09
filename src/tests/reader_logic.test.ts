import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_SETTINGS } from '../lib/storage';

describe('Reader Logic & Defaults', () => {
  it('provides default reader settings matching design specifications', () => {
    assert.strictEqual(DEFAULT_SETTINGS.mode, 'webtoon');
    assert.strictEqual(DEFAULT_SETTINGS.aiOverlayEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.maxWidth, 900);
  });

  it('verifies reading progress calculations and percentages', () => {
    const calculateProgressPercentage = (pageIndex: number, totalPages: number): number => {
      if (totalPages <= 0) return 0;
      if (pageIndex <= 0) return 0;
      if (pageIndex >= totalPages) return 100;
      return Math.round((pageIndex / totalPages) * 100);
    };

    assert.strictEqual(calculateProgressPercentage(1, 10), 10);
    assert.strictEqual(calculateProgressPercentage(5, 10), 50);
    assert.strictEqual(calculateProgressPercentage(10, 10), 100);
    assert.strictEqual(calculateProgressPercentage(0, 10), 0);
    assert.strictEqual(calculateProgressPercentage(15, 10), 100);
  });

  it('validates bubble overlay bounding box clamping within viewport (0..1)', () => {
    const clampRect = (x: number, y: number, w: number, h: number) => {
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));
      const clampedW = Math.max(0, Math.min(1 - clampedX, w));
      const clampedH = Math.max(0, Math.min(1 - clampedY, h));
      return { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
    };

    const valid = clampRect(0.1, 0.2, 0.3, 0.4);
    assert.deepStrictEqual(valid, { x: 0.1, y: 0.2, width: 0.3, height: 0.4 });

    const overflowing = clampRect(0.8, 0.7, 0.5, 0.5);
    assert.ok(overflowing.x + overflowing.width <= 1.0001);
    assert.ok(overflowing.y + overflowing.height <= 1.0001);
  });
});
