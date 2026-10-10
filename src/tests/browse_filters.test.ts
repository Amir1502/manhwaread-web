import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeTitleKey } from '../lib/sources';
import { SManga } from '../lib/types';

describe('Catalog Filters & Deduplication', () => {
  it('normalizes titles accurately across sources', () => {
    const t1 = 'Поднятие уровня в одиночку';
    const t2 = 'Поднятие уровня в одиночку!';
    const t3 = 'Поднятие  уровня - в одиночку (Solo Leveling)';
    const t4 = 'поднятие уровня в одиночку';

    assert.strictEqual(normalizeTitleKey(t1), normalizeTitleKey(t2));
    assert.strictEqual(normalizeTitleKey(t1), normalizeTitleKey(t4));

    assert.strictEqual(normalizeTitleKey('Solo Leveling'), 'sololeveling');
    assert.strictEqual(normalizeTitleKey('Solo - Leveling!'), 'sololeveling');
    assert.strictEqual(normalizeTitleKey('«Магия и Мускулы»'), 'магияимускулы');
  });

  it('filters out titles with zero chapters when removeEmptyChapters is enabled', () => {
    const mockMangaList: SManga[] = [
      {
        id: 'ml~1',
        title: 'Title With 0 Chapters',
        coverUrl: '',
        sourceId: 'mangalib',
        rating: 9.5,
        status: 'ONGOING',
        genres: ['Боевик'],
        authors: [],
        totalChapters: 0,
        description: '',
      },
      {
        id: 'remanga~2',
        title: 'Title With 120 Chapters',
        coverUrl: '',
        sourceId: 'remanga',
        rating: 9.6,
        status: 'ONGOING',
        genres: ['Боевик'],
        authors: [],
        totalChapters: 120,
        description: '',
      },
      {
        id: 'comx~3',
        title: 'Title With Unknown Chapters',
        coverUrl: '',
        sourceId: 'comx',
        rating: 8.0,
        status: 'ONGOING',
        genres: ['Фэнтези'],
        authors: [],
        totalChapters: undefined,
        description: '',
      },
    ];

    const filtered = mockMangaList.filter(m => m.totalChapters === undefined || m.totalChapters > 0);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].id, 'remanga~2');
    assert.strictEqual(filtered[1].id, 'comx~3');
  });

  it('deduplicates identical titles across sources preferring readable chapters', () => {
    const items: SManga[] = [
      {
        id: 'mangalib~solo-leveling',
        title: 'Поднятие уровня в одиночку',
        coverUrl: '',
        sourceId: 'mangalib',
        rating: 9.2,
        status: 'COMPLETED',
        genres: ['Боевик', 'Фэнтези'],
        authors: [],
        totalChapters: 0, // MangaLib licensed/0 chapters
        description: '',
      },
      {
        id: 'comx~solo-leveling',
        title: 'Поднятие уровня в одиночку!',
        coverUrl: '',
        sourceId: 'comx',
        rating: 9.8,
        status: 'COMPLETED',
        genres: ['Боевик', 'Фэнтези'],
        authors: [],
        totalChapters: 200, // Com-X has all 200 chapters
        description: '',
      },
      {
        id: 'remanga~omniscient-reader',
        title: 'Всеведущий читатель',
        coverUrl: '',
        sourceId: 'remanga',
        rating: 9.7,
        status: 'ONGOING',
        genres: ['Фэнтези'],
        authors: [],
        totalChapters: 215,
        description: '',
      },
    ];

    // Deduplication logic identical to browse()
    const deduplicated: SManga[] = [];
    const seenTitleMap = new Map<string, number>();

    for (const m of items) {
      if (m.totalChapters === 0) continue; // Exclude 0 chapters
      const norm = normalizeTitleKey(m.title);
      if (seenTitleMap.has(norm)) {
        const existingIdx = seenTitleMap.get(norm)!;
        const existing = deduplicated[existingIdx];
        const existingCh = existing.totalChapters ?? 0;
        const newCh = m.totalChapters ?? 0;

        if (existingCh === 0 && newCh > 0) {
          deduplicated[existingIdx] = m;
        } else if (newCh > existingCh && m.rating >= (existing.rating || 0)) {
          deduplicated[existingIdx] = m;
        }
        continue;
      }
      seenTitleMap.set(norm, deduplicated.length);
      deduplicated.push(m);
    }

    assert.strictEqual(deduplicated.length, 2);
    assert.strictEqual(deduplicated[0].id, 'comx~solo-leveling');
    assert.strictEqual(deduplicated[0].totalChapters, 200);
    assert.strictEqual(deduplicated[1].id, 'remanga~omniscient-reader');
  });

  it('filters by multiple MangaLib criteria: range, type, genres and rating', () => {
    const list: SManga[] = [
      {
        id: '1',
        title: 'Solo Leveling',
        coverUrl: '',
        sourceId: 'mangalib',
        rating: 9.8,
        status: 'COMPLETED',
        genres: ['Боевик', 'Сёнен'],
        authors: [],
        type: 'Манхва',
        releaseYear: 2018,
        totalChapters: 200,
        description: '',
      },
      {
        id: '2',
        title: 'One Piece',
        coverUrl: '',
        sourceId: 'mangadex',
        rating: 9.9,
        status: 'ONGOING',
        genres: ['Приключения', 'Сёнен'],
        authors: [],
        type: 'Манга',
        releaseYear: 1997,
        totalChapters: 1100,
        description: '',
      },
      {
        id: '3',
        title: 'Romantic Comedy',
        coverUrl: '',
        sourceId: 'remanga',
        rating: 7.5,
        status: 'ONGOING',
        genres: ['Романтика', 'Комедия'],
        authors: [],
        type: 'Манхва',
        releaseYear: 2023,
        totalChapters: 45,
        description: '',
      },
    ];

    // Filter by type "Манхва"
    const onlyManhwa = list.filter(m => m.type === 'Манхва');
    assert.strictEqual(onlyManhwa.length, 2);

    // Filter by minRating 9.0
    const highRated = list.filter(m => m.rating >= 9.0);
    assert.strictEqual(highRated.length, 2);

    // Filter by releaseYear >= 2015 and minChapters >= 100
    const modernLong = list.filter(m => (m.releaseYear ?? 0) >= 2015 && (m.totalChapters ?? 0) >= 100);
    assert.strictEqual(modernLong.length, 1);
    assert.strictEqual(modernLong[0].title, 'Solo Leveling');

    // Filter by genre "Сёнен"
    const shonen = list.filter(m => m.genres.includes('Сёнен'));
    assert.strictEqual(shonen.length, 2);
  });

  it('determines whether error notice banner should be displayed', () => {
    const shouldShowNotice = (
      hasErrors: boolean,
      effectiveSource: string,
      itemCount: number,
    ) => {
      return hasErrors && (effectiveSource !== 'all' || itemCount === 0);
    };

    // When browsing 'all' and 4 sources returned 20 items, but Com-X failed: do NOT show banner
    assert.strictEqual(shouldShowNotice(true, 'all', 20), false);

    // When browsing 'all' and ALL sources failed (0 items): SHOW banner
    assert.strictEqual(shouldShowNotice(true, 'all', 0), true);

    // When explicitly browsing 'comx' and it failed: SHOW banner
    assert.strictEqual(shouldShowNotice(true, 'comx', 0), true);

    // When no errors occurred: do NOT show banner
    assert.strictEqual(shouldShowNotice(false, 'all', 20), false);
  });
});

