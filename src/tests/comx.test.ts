import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseComxCatalog,
  parseComxRss,
  parseComxDetails,
  parseComxChapters,
  parseComxPages,
  comxSource,
} from '../lib/sources/comx';

const MOCK_READED_CATALOG_HTML = `
<div id="dle-content">
  <div class="readed d-flex short">
    <a href="https://com-x.life/34079-unylye-budni-juuko.html" class="readed__img img-fit-cover anim">
      <img data-src="https://rus.com-x.life/uploads/mini/mid/bb/7f514f4936a0eafafdc52b787f8bb8.webp" alt="Yuuko's Gloomy Days / Унылые будни Юуко">
    </a>
    <div class="readed__desc flex-grow-1 d-flex fd-column">
      <h3 class="readed__title">
        <a href="https://com-x.life/34079-unylye-budni-juuko.html">Yuuko's Gloomy Days / Унылые будни Юуко</a>
      </h3>
      <div class="readed__meta d-flex flex-grow-1">
        <div class="readed__meta-item">Webtoon</div>
        <div class="readed__meta-item">2017</div>
      </div>
      <ul class="readed__info">
        <li>Описание мрачной манхвы...</li>
        <li><span>Жанр:</span> <a href="/ComicList/g=191/">антигерой</a>, <a href="/ComicList/g=29/">драма</a></li>
      </ul>
    </div>
    <div class="readed__progress">
      <div class="readed__rating">
        <ul class="unit-rating"><li class="current-rating">4.2</li></ul>
      </div>
    </div>
  </div>

  <div class="pagination">
    <div class="pagination__pages d-flex jc-center">
      <span>1</span>
      <a href="https://com-x.life/comix-read/page/2/">2</a>
      <a href="https://com-x.life/comix-read/page/3/">3</a>
    </div>
  </div>
</div>
`;

const MOCK_POSTER_CATALOG_HTML = `
<div id="dle-content">
  <a class="poster grid-item has-overlay" href="https://com-x.life/15548-kak-vyzhit-v-akademii.html">
    <div class="poster__img">
      <img src="https://rus.com-x.life/uploads/posts/2024-05/1716577240-kak-vyzhit-v-akademii.jpg" alt="How to Survive at the Academy / Как выжить в академии">
      <div class="poster__label poster__label--rate"><span class="fal fa-star"></span>4.5</div>
    </div>
    <div class="poster__desc">
      <h3 class="poster__title">How to Survive at the Academy / Как выжить в академии</h3>
      <ul class="poster__subtitle"><li>Naver</li><li>2023</li></ul>
    </div>
  </a>
</div>
`;

const MOCK_DETAILS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>Solo Leveling / Поднятие уровня в одиночку</h1>
  <div class="page__poster">
    <img src="https://rus.com-x.life/uploads/posts/2026-03/solo.jpg">
  </div>
  <div class="page__text full-text clearfix">
    10 лет назад открылись таинственные Врата...
  </div>
  <ul class="page__list">
    <li><div>Год:</div> 2018</li>
    <li><div>Издатель:</div> D&C Media</li>
    <li><div>Статус:</div> Завершён</li>
    <li><div>Автор:</div> Chugong</li>
  </ul>
  <div class="page__tags">
    <a href="/tag/action">боевик</a>
    <a href="/tag/fantasy">фэнтези</a>
  </div>
  <div class="current-rating">95</div>
  <script>
    window.__DATA__ = {
      "news_id": 9117,
      "chapters": [
        {"id": 1002, "posi": 2, "pages": 15, "title": "1 - 2", "volume": 1, "number": 2, "date": "10.05.2020"},
        {"id": 1001, "posi": 1, "pages": 20, "title": "1 - 1", "volume": 1, "number": 1, "date": "03.05.2020"}
      ]
    };
  </script>
</body>
</html>
`;

const MOCK_READER_HTML = `
<!DOCTYPE html>
<html>
<body>
  <script>
    window.__DATA__ = {
      "host": "img.com-x.life",
      "images": [
        "9117/1001/p1.webp",
        "9117/1001/p2.webp",
        "9117/1001/p3.webp"
      ]
    };
  </script>
</body>
</html>
`;

test('Com-X parser', async (t) => {
  await t.test('parses .readed catalog cards and pagination', () => {
    const res = parseComxCatalog(MOCK_READED_CATALOG_HTML);
    assert.equal(res.items.length, 1);
    const item = res.items[0];
    assert.equal(item.id, 'comx~34079-unylye-budni-juuko');
    assert.equal(item.title, 'Унылые будни Юуко');
    assert.equal(item.altTitle, "Yuuko's Gloomy Days");
    assert.equal(item.type, 'Webtoon');
    assert.equal(item.releaseYear, 2017);
    assert.equal(item.rating, 4.2);
    assert.deepEqual(item.genres, ['антигерой', 'драма']);
    assert.equal(res.hasNextPage, true);
  });

  await t.test('parses .poster grid catalog cards', () => {
    const res = parseComxCatalog(MOCK_POSTER_CATALOG_HTML);
    assert.equal(res.items.length, 1);
    const item = res.items[0];
    assert.equal(item.id, 'comx~15548-kak-vyzhit-v-akademii');
    assert.equal(item.title, 'Как выжить в академии');
    assert.equal(item.altTitle, 'How to Survive at the Academy');
    assert.equal(item.releaseYear, 2023);
    assert.equal(item.rating, 4.5);
  });

  await t.test('parses title details and embedded chapter metadata', () => {
    const details = parseComxDetails(MOCK_DETAILS_HTML, '9117-solo-leveling');
    assert.equal(details.title, 'Поднятие уровня в одиночку');
    assert.equal(details.altTitle, 'Solo Leveling');
    assert.equal(details.releaseYear, 2018);
    assert.equal(details.status, 'COMPLETED');
    assert.deepEqual(details.authors, ['Chugong']);
    assert.deepEqual(details.genres, ['боевик', 'фэнтези']);
    assert.equal(details.totalChapters, 2);
    assert.equal(details.rating, 9.5);
  });

  await t.test('parses chapters list newest first', () => {
    const chapters = parseComxChapters(MOCK_DETAILS_HTML, '9117-solo-leveling');
    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].id, '1002');
    assert.equal(chapters[0].number, 2);
    assert.equal(chapters[0].releaseDate, '2020-05-10');
    assert.equal(chapters[1].id, '1001');
    assert.equal(chapters[1].number, 1);
    assert.equal(chapters[1].releaseDate, '2020-05-03');
  });

  await t.test('parses reader pages and wraps with proxy', () => {
    const pages = parseComxPages(MOCK_READER_HTML);
    assert.equal(pages.length, 3);
    assert.equal(pages[0].index, 1);
    assert.ok(pages[0].imageUrl.includes('img.com-x.life%2Fcomix%2F9117%2F1001%2Fp1.webp'));
  });

  await t.test('parses RSS feed as catalog fallback', () => {
    const mockRss = `
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <item>
          <title>Унылые будни Юуко</title>
          <link>https://com-x.life/34079-unylye-budni-juuko.html</link>
          <description><![CDATA[Описание комикса]]></description>
          <category><![CDATA[Разные комиксы]]></category>
          <media:content url="https://rus.com-x.life/uploads/posts/2026-10/001_png_res.jpg" type="image/jpeg"/>
        </item>
      </channel>
    </rss>`;
    const result = parseComxRss(mockRss);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'comx~34079-unylye-budni-juuko');
    assert.equal(result.items[0].title, 'Унылые будни Юуко');
    assert.deepEqual(result.items[0].genres, ['Разные комиксы']);
    assert.ok(result.items[0].coverUrl.includes('rus.com-x.life%2Fuploads%2Fposts%2F2026-10%2F001_png_res.jpg'));
    assert.equal(result.hasNextPage, false);
  });

  await t.test('registers allowed image hosts for Com-X', () => {
    assert.ok(comxSource.imageHosts.some(re => re.test('com-x.life')));
    assert.ok(comxSource.imageHosts.some(re => re.test('rus.com-x.life')));
    assert.ok(comxSource.imageHosts.some(re => re.test('img.com-x.life')));
    assert.ok(!comxSource.imageHosts.some(re => re.test('other-site.com')));
  });
});

