import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CURATED_MANGAS, CURATED_CHAPTERS, getCuratedPages } from '../lib/sources/curated';
import { getPopularManga, searchManga, getMangaById, getMangaChapters } from '../lib/sources/index';
import { parseMangaDexItem } from '../lib/sources/mangadex';

describe('Manhwa Sources Service', () => {
  it('loads curated mangas correctly with required fields', () => {
    assert.ok(CURATED_MANGAS.length >= 5, 'Should have at least 5 curated manhwas');
    
    for (const manga of CURATED_MANGAS) {
      assert.ok(manga.id, 'Manga must have an ID');
      assert.ok(manga.title, 'Manga must have a title');
      assert.ok(manga.coverUrl.startsWith('http'), 'Cover must be a valid URL');
      assert.ok(manga.rating > 0 && manga.rating <= 10, 'Rating must be between 0 and 10');
      assert.ok(Array.isArray(manga.genres) && manga.genres.length > 0, 'Must have at least one genre');
    }
  });

  it('searches manhwas by Russian and English titles', async () => {
    const soloResults = await searchManga('Поднятие', 'curated');
    assert.strictEqual(soloResults.length, 1);
    assert.strictEqual(soloResults[0].id, 'solo-leveling');

    const englishResults = await searchManga('Omniscient', 'curated');
    assert.strictEqual(englishResults.length, 1);
    assert.strictEqual(englishResults[0].id, 'omniscient-reader');

    const emptySearch = await searchManga('', 'curated');
    assert.strictEqual(emptySearch.length, CURATED_MANGAS.length);

    const nonExistent = await searchManga('НесуществующийТайтл123456', 'curated');
    assert.strictEqual(nonExistent.length, 0);
  });

  it('retrieves manga by ID and returns null for non-existent ID', async () => {
    const found = await getMangaById('solo-leveling');
    assert.ok(found);
    assert.strictEqual(found?.id, 'solo-leveling');

    const missing = await getMangaById('non-existent-id-999');
    assert.strictEqual(missing, null);
  });

  it('retrieves chapter list with correct order and IDs', async () => {
    const chapters = await getMangaChapters('solo-leveling');
    assert.ok(chapters.length >= 3);
    assert.strictEqual(chapters[0].id, 'sl-ch-3'); // chapter 3 is latest
    assert.strictEqual(chapters[0].number, 3);
  });

  it('retrieves pages with AI vector overlay speech bubbles', () => {
    const pages = getCuratedPages('sl-ch-1');
    assert.ok(pages.length > 0, 'Should return pages');

    const pageWithOverlay = pages.find(p => p.overlay && p.overlay.bubbles.length > 0);
    assert.ok(pageWithOverlay, 'Must have at least one page with AI vector overlay');

    const bubble = pageWithOverlay!.overlay!.bubbles[0];
    assert.ok(bubble.x >= 0 && bubble.x <= 1, 'x coordinate must be normalized between 0 and 1');
    assert.ok(bubble.y >= 0 && bubble.y <= 1, 'y coordinate must be normalized between 0 and 1');
    assert.ok(bubble.width > 0 && bubble.width <= 1, 'width must be valid');
    assert.ok(bubble.translatedText.length > 0, 'Translated text must not be empty');
  });

  it('correctly parses MangaDex raw API payloads', () => {
    const mockMangaDexPayload = {
      id: 'abc-123',
      type: 'manga',
      attributes: {
        title: { ru: 'Тестовая Манхва', en: 'Test Manhwa' },
        description: { ru: 'Описание для теста' },
        status: 'ongoing',
        updatedAt: '2026-10-09T12:00:00Z',
        tags: [
          { attributes: { name: { ru: 'Экшен' } } }
        ]
      },
      relationships: [
        {
          id: 'cover-1',
          type: 'cover_art',
          attributes: { fileName: 'cover.jpg' }
        },
        {
          id: 'author-1',
          type: 'author',
          attributes: { name: 'Известный Автор' }
        }
      ]
    };

    const parsed = parseMangaDexItem(mockMangaDexPayload);
    assert.strictEqual(parsed.id, 'md-abc-123');
    assert.strictEqual(parsed.title, 'Тестовая Манхва');
    assert.strictEqual(parsed.status, 'ONGOING');
    assert.strictEqual(parsed.authors[0], 'Известный Автор');
    assert.strictEqual(parsed.genres[0], 'Экшен');
    assert.ok(parsed.coverUrl.includes('cover.jpg'));
  });
});
