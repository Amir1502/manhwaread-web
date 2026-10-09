import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMangaBuffCatalog,
  parseMangaBuffDetails,
  parseMangaBuffChapters,
  parseMangaBuffPages,
  mangabuffSource,
} from '../lib/sources/mangabuff';

const MOCK_CATALOG_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="cards">
    <div class="cards__item">
      <a href="/manga/solo-leveling">
        <img data-src="/img/manga/posters/solo-leveling.jpg" />
        <div class="cards__name">Поднятие уровня в одиночку</div>
      </a>
    </div>
    <div class="cards__item">
      <a href="/manga/omniscient-reader">
        <img src="https://mangabuff.ru/img/manga/posters/omniscient-reader.jpg" />
        <div class="cards__name">Всеведущий читатель</div>
      </a>
    </div>
  </div>
  <div class="pagination">
    <div class="pagination__button"><a href="/manga?page=2">Вперёд</a></div>
  </div>
</body>
</html>
`;

const MOCK_DETAILS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="manga">
    <h1 class="manga__name">Поднятие уровня в одиночку</h1>
    <div class="manga__name-alt"><span>Solo Leveling</span></div>
    <div class="manga__img"><img src="/img/manga/posters/solo-leveling.jpg" /></div>
    <div class="manga__description">10 лет назад открылись врата, соединившие наш мир с миром монстров...</div>
    <div class="manga__rating">9.8</div>
    <div class="manga__middle-links">
      <a href="/manga?genres[]=action">Боевик</a>
      <a href="/manga?genres[]=fantasy">Фэнтези</a>
      <a href="/manga?status=completed">Завершен</a>
    </div>
    <div class="chapters__list">
      <a class="chapters__item" href="/manga/solo-leveling/1">
        <span class="chapters__value">Глава 1</span>
        <span class="chapters__add-date">10.01.2024</span>
      </a>
      <a class="chapters__item" href="/manga/solo-leveling/2">
        <span class="chapters__value">Глава 2: Пробуждение</span>
        <span class="chapters__add-date">11.01.2024</span>
      </a>
    </div>
  </div>
</body>
</html>
`;

const MOCK_READER_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="reader__pages">
    <img data-src="https://img.mangabuff.ru/manga/solo-leveling/1/page-1.jpg" />
    <img data-src="https://img.mangabuff.ru/manga/solo-leveling/1/page-2.jpg" />
    <img src="https://img.mangabuff.ru/manga/solo-leveling/1/page-3.jpg" />
  </div>
</body>
</html>
`;

test('MangaBuff parser', async (t) => {
  await t.test('parses catalog cards and pagination', () => {
    const res = parseMangaBuffCatalog(MOCK_CATALOG_HTML);
    assert.equal(res.items.length, 2);
    assert.equal(res.hasNextPage, true);

    const first = res.items[0];
    assert.equal(first.id, 'mangabuff~solo-leveling');
    assert.equal(first.title, 'Поднятие уровня в одиночку');
    assert.ok(first.coverUrl.includes('solo-leveling.jpg'));

    const second = res.items[1];
    assert.equal(second.id, 'mangabuff~omniscient-reader');
    assert.equal(second.title, 'Всеведущий читатель');
  });

  await t.test('parses title details', () => {
    const details = parseMangaBuffDetails(MOCK_DETAILS_HTML, 'solo-leveling');
    assert.equal(details.title, 'Поднятие уровня в одиночку');
    assert.equal(details.altTitle, 'Solo Leveling');
    assert.equal(details.status, 'COMPLETED');
    assert.equal(details.rating, 9.8);
    assert.ok(details.genres.includes('Боевик'));
    assert.ok(details.genres.includes('Фэнтези'));
    assert.ok(details.description.includes('10 лет назад'));
  });

  await t.test('parses chapters list newest first', () => {
    const chapters = parseMangaBuffChapters(MOCK_DETAILS_HTML, 'solo-leveling');
    assert.equal(chapters.length, 2);
    // Newest first -> chapter 2 then chapter 1
    assert.equal(chapters[0].number, 2);
    assert.equal(chapters[0].id, '2');
    assert.equal(chapters[1].number, 1);
    assert.equal(chapters[1].id, '1');
  });

  await t.test('parses reader pages with data-src fallback', () => {
    const pages = parseMangaBuffPages(MOCK_READER_HTML);
    assert.equal(pages.length, 3);
    assert.equal(pages[0].index, 1);
    assert.ok(pages[0].imageUrl.includes('page-1.jpg'));
    assert.equal(pages[2].index, 3);
    assert.ok(pages[2].imageUrl.includes('page-3.jpg'));
  });

  await t.test('registers allowed image hosts for MangaBuff', () => {
    assert.ok(mangabuffSource.imageHosts.some(re => re.test('mangabuff.ru')));
    assert.ok(mangabuffSource.imageHosts.some(re => re.test('img.mangabuff.ru')));
    assert.ok(mangabuffSource.imageHosts.some(re => re.test('cdn.mangabuff.ru')));
  });
});
