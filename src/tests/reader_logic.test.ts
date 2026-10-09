import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { formatDate, plural } from '../lib/labels';

describe('Reader defaults & helpers', () => {
  it('provides default reader settings', () => {
    assert.strictEqual(DEFAULT_SETTINGS.mode, 'webtoon');
    assert.strictEqual(DEFAULT_SETTINGS.aiOverlayEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.maxWidth, 900);
    assert.strictEqual(DEFAULT_SETTINGS.showAdult, false);
  });

  it('pluralizes Russian nouns', () => {
    assert.strictEqual(plural(1, ['глава', 'главы', 'глав']), 'глава');
    assert.strictEqual(plural(3, ['глава', 'главы', 'глав']), 'главы');
    assert.strictEqual(plural(11, ['глава', 'главы', 'глав']), 'глав');
    assert.strictEqual(plural(21, ['глава', 'главы', 'глав']), 'глава');
  });

  it('formats relative dates', () => {
    assert.strictEqual(formatDate(new Date().toISOString()), 'сегодня');
    assert.strictEqual(formatDate(undefined), '');
  });
});
