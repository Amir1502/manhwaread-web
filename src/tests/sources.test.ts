import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DEMO_MANGA_ID, demoSource, getDemoPages } from '../lib/sources/demo';
import { findNeighbours, getMangaById, isAllowedImageHost, parseMangaId } from '../lib/sources/index';
import { normalizeMangaDexChapters, parseMangaDexItem } from '../lib/sources/mangadex';
import { decodeLibChapterId, libSummaryToText, parseLibChapters, parseLibManga } from '../lib/sources/mangalib';
import { parseRemangaChapters, parseRemangaTitle } from '../lib/sources/remanga';
import { coverSize, parseMangaMirCatalog, parseMangaMirDetails, parseMangaMirPages } from '../lib/sources/mangamir';
import { parseFxCatalog, parseFxDate, parseFxDetails } from '../lib/sources/manga18fx';
import { parseChapterNumber } from '../lib/sources/http';
import { SChapter } from '../lib/types';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

describe('ids & registry', () => {
  it('parses global, legacy MangaDex and legacy curated ids', () => {
    assert.strictEqual(parseMangaId('mangalib~206--one-piece').source.meta.id, 'mangalib');
    assert.strictEqual(parseMangaId('mangalib~206--one-piece').slug, '206--one-piece');
    assert.strictEqual(parseMangaId('mangalib%7E206--one-piece').slug, '206--one-piece');
    assert.strictEqual(parseMangaId('md-abc-123').source.meta.id, 'mangadex');
    assert.strictEqual(parseMangaId('md-abc-123').slug, 'abc-123');
    assert.strictEqual(parseMangaId('solo-leveling').source.meta.id, 'demo');
    assert.throws(() => parseMangaId('unknown~x'));
  });

  it('returns null for missing titles instead of throwing', async () => {
    assert.strictEqual(await getMangaById('non-existent-id-999'), null);
    assert.strictEqual((await getMangaById(DEMO_MANGA_ID))?.id, DEMO_MANGA_ID);
  });

  it('computes prev/next on newest-first lists', () => {
    const ch = (id: string) => ({ id }) as SChapter;
    const list = [ch('3'), ch('2'), ch('1')];
    const n = findNeighbours(list, '2');
    assert.strictEqual(n.next?.id, '3');
    assert.strictEqual(n.prev?.id, '1');
    assert.strictEqual(findNeighbours(list, '3').next, null);
    assert.strictEqual(findNeighbours(list, 'md-ch-1').current?.id, '1');
  });

  it('image proxy only allows hosts of the given source', () => {
    assert.ok(isAllowedImageHost('mangalib', 'img3.cdnlibs.org'));
    assert.ok(isAllowedImageHost('mangamir', 'img.mangamir.com'));
    assert.strictEqual(isAllowedImageHost('mangalib', 'evil.example.com'), null);
    assert.strictEqual(isAllowedImageHost('mangalib', 'cdnlibs.org.evil.com'), null);
    assert.strictEqual(isAllowedImageHost('nope', 'img.mangamir.com'), null);
  });

  it('parses chapter numbers from titles', () => {
    assert.strictEqual(parseChapterNumber('Глава 300.1'), 300.1);
    assert.strictEqual(parseChapterNumber('Chapter 12'), 12);
    assert.strictEqual(parseChapterNumber('Глава 214 Конец'), 214);
  });
});

describe('demo source', () => {
  it('has pages with normalized AI overlay bubbles', async () => {
    const pages = getDemoPages();
    assert.ok(pages.length > 0);
    const b = pages.find(p => p.overlay?.bubbles.length)!.overlay!.bubbles[0];
    assert.ok(b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1 && b.width > 0 && b.width <= 1);
    assert.ok(b.translatedText.length > 0);
    assert.strictEqual((await demoSource.search('демо', 1)).items.length, 1);
    assert.strictEqual((await demoSource.search('несуществующий', 1)).items.length, 0);
  });
});

describe('MangaDex', () => {
  it('parses manga payloads', () => {
    const parsed = parseMangaDexItem({
      id: 'abc-123',
      type: 'manga',
      attributes: {
        title: { en: 'Test Manhwa' },
        altTitles: [{ ru: 'Тестовая Манхва' }],
        description: { ru: 'Описание' },
        status: 'ongoing',
        originalLanguage: 'ko',
        updatedAt: '2026-10-09T12:00:00Z',
        tags: [{ attributes: { name: { ru: 'Экшен' }, group: 'genre' } }],
      },
      relationships: [
        { id: 'c', type: 'cover_art', attributes: { fileName: 'cover.jpg' } },
        { id: 'a', type: 'author', attributes: { name: 'Автор' } },
        { id: 'a', type: 'artist', attributes: { name: 'Автор' } },
      ],
    });
    assert.strictEqual(parsed.id, 'mangadex~abc-123');
    assert.strictEqual(parsed.title, 'Тестовая Манхва');
    assert.strictEqual(parsed.altTitle, 'Test Manhwa');
    assert.strictEqual(parsed.type, 'Манхва');
    assert.deepStrictEqual(parsed.authors, ['Автор']);
    assert.ok(decodeURIComponent(parsed.coverUrl).includes('cover.jpg.512.jpg'));
  });

  it('dedupes translations (prefers RU) and skips external chapters', () => {
    const mk = (id: string, chapter: string, lang: string, extra = {}) => ({
      id,
      attributes: { chapter, translatedLanguage: lang, pages: 10, ...extra },
    });
    const res = normalizeMangaDexChapters('mangadex~x', [
      mk('a', '1', 'en'),
      mk('b', '1', 'ru'),
      mk('c', '2', 'en', { externalUrl: 'https://example.com' }),
      mk('d', '1.5', 'en'),
    ]);
    assert.deepStrictEqual(
      res.map(c => c.id),
      ['d', 'b'],
    );
  });
});

describe('MangaLib', () => {
  it('parses list items and ProseMirror summaries', () => {
    const m = parseLibManga({
      id: 206,
      name: 'One Piece',
      rus_name: 'Ван Пис',
      eng_name: 'One Piece',
      slug_url: '206--one-piece',
      cover: { default: 'https://cover.cdnlibs.org/x.jpg' },
      rating: { average: '9.72' },
      status: { id: 1, label: 'Онгоинг' },
      type: { id: 1, label: 'Манга' },
      ageRestriction: { id: 3, label: '16+' },
      summary: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Абзац' }] }] },
    });
    assert.strictEqual(m.id, 'mangalib~206--one-piece');
    assert.strictEqual(m.title, 'Ван Пис');
    assert.strictEqual(m.rating, 9.7);
    assert.strictEqual(m.status, 'ONGOING');
    assert.strictEqual(m.description, 'Абзац');
    assert.strictEqual(libSummaryToText('plain'), 'plain');
  });

  it('encodes chapters as volume_number[_branch], newest first', () => {
    const list = parseLibChapters('mangalib~x', [
      { id: 1, volume: '1', number: '1', name: 'Начало', branches: [{ id: 1, branch_id: null }] },
      { id: 2, volume: '1', number: '1.5', branches: [{ id: 2, branch_id: 7 }] },
    ]);
    assert.strictEqual(list[0].id, '1_1.5_7');
    assert.strictEqual(list[1].id, '1_1');
    assert.strictEqual(list[1].title, 'Том 1 Глава 1: Начало');
    assert.deepStrictEqual(decodeLibChapterId('1_1.5_7'), { volume: '1', number: '1.5', branchId: '7' });
  });
});

describe('ReManga', () => {
  it('parses titles and hides paid chapters', () => {
    const t = parseRemangaTitle({
      id: 1,
      dir: 'the_boxer_',
      main_name: 'Боксёр',
      secondary_name: 'The Boxer',
      cover: { high: '/media/titles/the_boxer_/high.jpg' },
      avg_rating: '9.6',
      status: { id: 1, name: 'Закончен' },
      type: { id: 1, name: 'Манхва' },
      genres: [{ id: 1, name: 'Спорт' }],
    });
    assert.strictEqual(t.id, 'remanga~the_boxer_');
    assert.strictEqual(t.status, 'COMPLETED');
    assert.strictEqual(t.type, 'Манхва');
    assert.ok(decodeURIComponent(t.coverUrl).includes('https://api.remanga.org/media/titles/the_boxer_/high.jpg'));
    const ch = parseRemangaChapters(t.id, [
      { id: 10, chapter: '2', tome: 1, is_paid: true, is_bought: false },
      { id: 9, chapter: '1', tome: 1, name: 'Пролог' },
    ]);
    assert.deepStrictEqual(
      ch.map(c => c.id),
      ['9'],
    );
    assert.strictEqual(ch[0].title, 'Том 1 Глава 1: Пролог');
  });
});

describe('MangaMir (real HTML fixtures)', () => {
  it('parses catalog cards via poster anchors only', () => {
    const res = parseMangaMirCatalog(fixture('mangamir_catalog.html'));
    assert.strictEqual(res.items.length, 20);
    assert.strictEqual(res.hasNextPage, true);
    const first = res.items[0];
    assert.strictEqual(first.id, 'mangamir~ot-goblina-k-bogu-goblinov-a4izl1');
    assert.strictEqual(first.type, 'Маньхуа');
    assert.strictEqual(first.status, 'ONGOING');
    assert.ok(decodeURIComponent(first.coverUrl).includes('_md.jpeg'));
    assert.strictEqual(new Set(res.items.map(i => i.id)).size, 20);
  });

  it('parses details: JSON-LD chapters ordered by position, forecast row dropped', () => {
    const { manga, chapters } = parseMangaMirDetails(fixture('mangamir_details.html'), 'korol-mecha');
    assert.strictEqual(manga.title, 'Король меча');
    assert.strictEqual(manga.status, 'ONGOING');
    assert.strictEqual(manga.type, 'Манхва');
    assert.strictEqual(manga.ageRating, '16+');
    assert.ok(manga.rating > 9 && manga.rating <= 10);
    assert.ok(manga.description.length > 200, 'description comes from DOM, not truncated JSON-LD');
    assert.strictEqual(chapters.length, 6);
    assert.ok(!chapters.some(c => c.id === 'tom-7-glava-303'));
    assert.strictEqual(chapters[0].id, 'tom-7-glava-302');
    const c3001 = chapters.find(c => c.id === 'tom-7-glava-300-1')!;
    assert.strictEqual(c3001.number, 300.1);
    assert.strictEqual(c3001.volume, 7);
    assert.strictEqual(chapters[0].releaseDate, '2026-10-04');
  });

  it('falls back to DOM when JSON-LD is broken', () => {
    const { manga, chapters } = parseMangaMirDetails(fixture('mangamir_details_broken_jsonld.html'), 'korol-mecha');
    assert.strictEqual(manga.title, 'Король меча');
    assert.strictEqual(manga.rating, 0);
    assert.strictEqual(manga.genres.length, 4, 'carousel genres excluded');
    assert.strictEqual(chapters.length, 6);
    assert.strictEqual(chapters[0].id, 'tom-7-glava-302');
  });

  it('parses reader pages sorted by data-number, deduped, ignoring header poster', () => {
    const pages = parseMangaMirPages(fixture('mangamir_reader.html'));
    assert.strictEqual(pages.length, 3);
    assert.deepStrictEqual(
      pages.map(p => p.index),
      [1, 2, 3],
    );
    assert.ok(pages.every(p => decodeURIComponent(p.imageUrl).includes('/pages/')));
    assert.ok(pages[0].width && pages[0].height);
  });

  it('upgrades cover sizes', () => {
    assert.strictEqual(coverSize('https://x/a_sm.jpeg', 'md'), 'https://x/a_md.jpeg');
    assert.strictEqual(coverSize('https://x/a_sm.jpeg', 'full'), 'https://x/a.jpeg');
  });
});

describe('Manga18fx (real HTML fixtures)', () => {
  it('parses catalog', () => {
    const res = parseFxCatalog(fixture('manga18fx_catalog.html'));
    assert.strictEqual(res.items.length, 24);
    assert.strictEqual(res.hasNextPage, true);
    assert.ok(res.items.every(i => i.isAdult && i.id.startsWith('manga18fx~')));
  });

  it('parses details and chapters', () => {
    const { manga, chapters } = parseFxDetails(fixture('manga18fx_details.html'), 'wireless-onahole-raw');
    assert.ok(manga.title.length > 0);
    assert.ok(manga.genres.length > 0);
    assert.ok(manga.authors.length > 0);
    assert.ok(chapters.length > 100);
    assert.strictEqual(chapters[0].number, 124);
    assert.strictEqual(chapters[0].releaseDate, '2026-10-02');
    assert.strictEqual(parseFxDate('02 Oct 26'), '2026-10-02');
  });
});
