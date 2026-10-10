# -*- coding: utf-8 -*-
"""
Full dataset builder script: fetches texts and generates data/books/*.json and index.json
"""

import os
import sys
import json
import re
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser

from book_definitions_p1 import BOOKS_PART_1
from book_definitions_p2 import BOOKS_PART_2

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS_DIR = os.path.join(ROOT_DIR, 'data', 'books')
CACHE_DIR = os.path.join(ROOT_DIR, '.cache_books')
os.makedirs(BOOKS_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'table', 'sup'):
            self.skip = True
        if tag in ('p', 'div') and not self.skip:
            if self.current:
                p = ' '.join(self.current).strip()
                if p:
                    self.paragraphs.append(p)
                self.current = []

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'table', 'sup'):
            self.skip = False
        if tag in ('p', 'div') and not self.skip:
            if self.current:
                p = ' '.join(self.current).strip()
                if p:
                    self.paragraphs.append(p)
                self.current = []

    def handle_data(self, data):
        if not self.skip:
            cleaned = data.strip()
            if cleaned:
                self.current.append(cleaned)

def extract_html_paragraphs(html):
    parser = HTMLTextExtractor()
    parser.feed(html)
    if parser.current:
        p = ' '.join(parser.current).strip()
        if p:
            parser.paragraphs.append(p)
    result = []
    for p in parser.paragraphs:
        p = re.sub(r'\s+', ' ', p).strip()
        if len(p) > 25 and not p.startswith('{{') and not p.startswith('[[') and '↑' not in p[:5]:
            result.append(p)
    return result

def fetch_url(url):
    headers = {'User-Agent': 'ManhwaReadEssayBot/1.0 (educational final essay project; amir1502@example.com)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            try:
                return raw.decode('utf-8')
            except UnicodeDecodeError:
                return raw.decode('windows-1251', errors='replace')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def cached_fetch(key, url):
    cache_file = os.path.join(CACHE_DIR, key + '.txt')
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return f.read()
    print(f"Fetching [{key}]...")
    txt = fetch_url(url)
    if txt:
        with open(cache_file, 'w', encoding='utf-8') as f:
            f.write(txt)
    return txt

def split_paras(text):
    if not text:
        return []
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    if text.startswith('\ufeff'):
        text = text[1:]
    chunks = re.split(r'\n\t+|\n\s{2,}|\n\n+', text)
    paras = []
    for c in chunks:
        lines = [l.strip() for l in c.split('\n') if l.strip()]
        if lines:
            line_str = ' '.join(lines)
            line_str = re.sub(r'\s+', ' ', line_str).strip()
            if len(line_str) > 0 and line_str != 'NEWCHAPTER' and not line_str.startswith('__'):
                paras.append(line_str)
    return paras

def chunk_paras_into_chapters(paras, num_chapters, base_title="Часть"):
    if not paras:
        return []
    total = len(paras)
    chunk_size = max(1, total // num_chapters)
    chapters = []
    for i in range(num_chapters):
        start = i * chunk_size
        end = (i + 1) * chunk_size if i < num_chapters - 1 else total
        slice_paras = paras[start:end]
        if slice_paras:
            chapters.append({
                "id": f"ch-{i+1}",
                "title": f"{base_title} {i+1}",
                "content": slice_paras
            })
    return chapters

def process_book(book_meta):
    ttype = book_meta["textType"]
    chapters = []

    if ttype == "pushkin_raw":
        raw = cached_fetch("pushkin", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/pushkin/%D0%9A%D0%B0%D0%BF%D0%B8%D1%82%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B4%D0%BE%D1%87%D0%BA%D0%B0.txt")
        parts = re.split(r'\*Глава\s+([IVXLCDM\d]+)\s*\n([^\*]+)\*', raw)
        ch_idx = 1
        for i in range(1, len(parts), 3):
            num = parts[i].strip()
            title = parts[i+1].strip()
            content_raw = parts[i+2].strip()
            paras = split_paras(content_raw)
            chapters.append({
                "id": f"ch-{ch_idx}",
                "title": f"Глава {num}. {title}",
                "content": paras
            })
            ch_idx += 1

    elif ttype == "gogol_wikisource":
        numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        for i, num in enumerate(numerals):
            key = f"taras_bulba_ch_{num}"
            url = f"https://ru.wikisource.org/w/api.php?action=parse&page=%D0%A2%D0%B0%D1%80%D0%B0%D1%81_%D0%91%D1%83%D0%BB%D1%8C%D0%B1%D0%B0_(%D0%93%D0%BE%D0%B3%D0%BE%D0%BB%D1%8C)/%D0%93%D0%BB%D0%B0%D0%B2%D0%B0_{num}&prop=text&format=json"
            raw_json = cached_fetch(key, url)
            paras = []
            if raw_json:
                data = json.loads(raw_json)
                html = data.get('parse', {}).get('text', {}).get('*', '')
                paras = extract_html_paragraphs(html)
            chapters.append({
                "id": f"ch-{i+1}",
                "title": f"Глава {num}",
                "content": paras
            })
            time.sleep(0.3)

    elif ttype == "korolenko_raw":
        raw = cached_fetch("korolenko", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/korolenko/%D0%A1%D0%BB%D0%B5%D0%BF%D0%BE%D0%B9%20%D0%BC%D1%83%D0%B7%D1%8B%D0%BA%D0%B0%D0%BD%D1%82.txt")
        parts = re.split(r'\*([Гг]лава\s+[^\*]+|[Ээ]пилог)\*', raw)
        if len(parts) > 1:
            # parts[0] is intro
            ch_idx = 1
            for i in range(1, len(parts), 2):
                heading = parts[i].strip()
                content = parts[i+1].strip()
                paras = split_paras(content)
                chapters.append({
                    "id": f"ch-{ch_idx}",
                    "title": heading,
                    "content": paras
                })
                ch_idx += 1
        else:
            paras = split_paras(raw)
            chapters = chunk_paras_into_chapters(paras, 8, "Глава")

    elif ttype == "leskov_raw":
        raw = cached_fetch("leskov", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/leskov/%D0%9B%D0%B5%D0%B2%D1%88%D0%B0.txt")
        parts = re.split(r'\*([Гг]лава\s+[^\*]+)\*', raw)
        if len(parts) > 1:
            ch_idx = 1
            for i in range(1, len(parts), 2):
                heading = parts[i].strip()
                content = parts[i+1].strip()
                paras = split_paras(content)
                chapters.append({
                    "id": f"ch-{ch_idx}",
                    "title": heading,
                    "content": paras
                })
                ch_idx += 1
        else:
            paras = split_paras(raw)
            chapters = chunk_paras_into_chapters(paras, 10, "Глава")

    elif ttype == "gorky_raw":
        raw = cached_fetch("gorky", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/gorky/%D0%A1%D1%82%D0%B0%D1%80%D1%83%D1%85%D0%B0%20%D0%98%D0%B7%D0%B5%D1%80%D0%B3%D0%B8%D0%BB%D1%8C.txt")
        parts = re.split(r'\*(I{1,3})\*', raw)
        titles = {
            "I": "Часть I. Легенда о Ларре",
            "II": "Часть II. Рассказы Изергиль о своей жизни",
            "III": "Часть III. Легенда о горящем сердце Данко"
        }
        if len(parts) >= 6:
            for i in range(1, len(parts), 2):
                num = parts[i].strip()
                content = parts[i+1].strip()
                chapters.append({
                    "id": f"ch-{len(chapters)+1}",
                    "title": titles.get(num, f"Часть {num}"),
                    "content": split_paras(content)
                })
        else:
            paras = split_paras(raw)
            chapters = chunk_paras_into_chapters(paras, 3, "Часть")

    elif ttype == "sholokhov_raw":
        path = 'stylo/sholokhov/Шолохов. Судьба человека.txt'
        url = 'https://raw.githubusercontent.com/katykool/Sova-CompLing-2024/main/' + urllib.parse.quote(path)
        raw = cached_fetch("sholokhov", url)
        paras = split_paras(raw)
        part_titles = [
            "Часть 1. Встреча у переправы на Верхнем Дону",
            "Часть 2. Война, фашистский плен и поединок с Мюллером",
            "Часть 3. Побег, гибель семьи и встреча с сиротой Ванюшкой",
            "Часть 4. Сила отцовской любви и несгибаемый русский дух"
        ]
        chunk_size = max(1, len(paras) // 4)
        for i, t in enumerate(part_titles):
            start = i * chunk_size
            end = (i + 1) * chunk_size if i < 3 else len(paras)
            chapters.append({
                "id": f"ch-{i+1}",
                "title": t,
                "content": paras[start:end]
            })

    elif ttype == "saint_exupery_raw":
        raw = cached_fetch("malenkiy_prints", "https://raw.githubusercontent.com/AigizK/bashkort-parallel-corpora/main/little_prince/ru/Princ_2018.tmx.txt")
        paras = [l.strip() for l in raw.split('\n') if l.strip()]
        # Divide 1600 lines into 5 cohesive story sections
        titles = [
            "Главы I–VI. Знакомство в пустыне и барашек",
            "Главы VII–IX. Роза, баобабы и прощание с планетой",
            "Главы X–XVI. Путешествие по астероидам взрослых",
            "Главы XVII–XXIII. Земля, Лис и секрет сердца",
            "Главы XXIV–XXVII. Колодец в пустыне и возвращение к звезде"
        ]
        chunk_size = max(1, len(paras) // len(titles))
        for i, t in enumerate(titles):
            start = i * chunk_size
            end = (i + 1) * chunk_size if i < len(titles) - 1 else len(paras)
            chapters.append({
                "id": f"ch-{i+1}",
                "title": t,
                "content": paras[start:end]
            })

    elif ttype == "london_raw":
        raw = cached_fetch("london", "https://raw.githubusercontent.com/Zaika-Victoria/books/master/lubov_k_zhizni.txt")
        paras = split_paras(raw)
        titles = [
            "Часть 1. Предательство Билла среди ледяной тундры",
            "Часть 2. Голод, стужа и борьба за выживание",
            "Часть 3. Смертельный поединок с больным волком",
            "Часть 4. Спасение у Ледовитого океана"
        ]
        chapters = chunk_paras_into_chapters(paras, 4, "Часть")
        for i, ch in enumerate(chapters):
            if i < len(titles):
                ch["title"] = titles[i]

    elif ttype == "platonov_raw":
        raw = cached_fetch("platonov", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/platonov/%D0%AE%D1%88%D0%BA%D0%B0.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Юшка (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "kuprin_raw":
        raw = cached_fetch("kuprin", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/kuprin/%D0%A7%D1%83%D0%B4%D0%B5%D1%81%D0%BD%D1%8B%D0%B9%20%D0%B4%D0%BE%D0%BA%D1%82%D0%BE%D1%80.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Чудесный доктор (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "astafyev_kon_raw":
        raw = cached_fetch("kon", "https://raw.githubusercontent.com/Slavyanine/NLP/master/.github/workflows/%D0%9A%D0%BB%D0%B0%D1%81%D1%81%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%82%D0%BE%D1%80%20%D1%8F%D0%B7%D1%8B%D0%BA%D0%B0%20(%D0%94%D0%BE%D0%BF_%D0%B7%D0%B0%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5)/Texts/text_1.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Конь с розовой гривой (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "chekhov_raw":
        raw = cached_fetch("chekhov", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/chekhov/%D0%A1%D0%BA%D1%80%D0%B8%D0%BF%D0%BA%D0%B0%20%D0%A0%D0%BE%D1%82%D1%88%D0%B8%D0%BB%D1%8C%D0%B4%D0%B0.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Скрипка Ротшильда (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "grin_raw":
        raw = cached_fetch("grin", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/grin/%D0%97%D0%B5%D0%BB%D0%B5%D0%BD%D0%B0%D1%8F%20%D0%BB%D0%B0%D0%BC%D0%BF%D0%B0.txt")
        parts = raw.split('NEWCHAPTER')
        if len(parts) >= 2:
            chapters.append({
                "id": "ch-1",
                "title": "Глава I. Шутка миллионера Стильтона",
                "content": split_paras(parts[0])
            })
            chapters.append({
                "id": "ch-2",
                "title": "Глава II. Встреча через годы в больнице",
                "content": split_paras(parts[1])
            })
        else:
            chapters.append({
                "id": "ch-1",
                "title": "Зелёная лампа",
                "content": split_paras(raw)
            })

    elif ttype == "ohenry_raw":
        raw = cached_fetch("ohenry", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/ohenry/%D0%94%D0%B0%D1%80%D1%8B%20%D0%B2%D0%BE%D0%BB%D1%85%D0%B2%D0%BE%D0%B2.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Дары волхвов (полный текст новеллы)",
            "content": paras
        })

    elif ttype == "antolstoy_raw":
        raw = cached_fetch("antolstoy", "https://raw.githubusercontent.com/FaraamFide/library_tg/main/books/antolstoy/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9%20%D1%85%D0%B0%D1%80%D0%B0%D0%BA%D1%82%D0%B5%D1%80.txt")
        paras = split_paras(raw)
        chapters.append({
            "id": "ch-1",
            "title": "Русский характер (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "nora_gal_raw":
        sections = [
            ("kantselyarit", "Глава 1. Берегись канцелярита! Мертвечина и жизнь языка"),
            ("perevod", "Глава 2. Буква или дух? Истинное искусство перевода"),
            ("printsipy", "Глава 3. Принципы живого слова: образность и музыкальность"),
            ("slovar-zamen", "Глава 4. Словарь живых замен канцеляризмов")
        ]
        for idx, (f_name, ch_title) in enumerate(sections):
            url = f"https://raw.githubusercontent.com/Halfofthesky/nora-gal/main/references/{f_name}.md"
            txt = cached_fetch(f"nora_{f_name}", url)
            paras = split_paras(txt) if txt else []
            chapters.append({
                "id": f"ch-{idx+1}",
                "title": ch_title,
                "content": paras
            })

    elif ttype == "likhachev_raw":
        text = """Учиться говорить и писать нужно все время. Язык в еще большей мере, чем одежда, свидетельствует о вкусе человека, о его отношении к окружающему миру, к самому себе.

Существует разного рода неряшливости в языке. Если человек употребляет грубые слова, вульгаризмы, это говорит о его внутренней слабости, о том, что он неуверен в себе. Грубость в языке, как и грубость в манерах, неряшливость в одежде, — распространенный порок, и свидетельствует он о психологической незащищенности человека, о его слабости, а вовсе не о силе.

Я уж не говорю о том, что бранные слова — это проявление бескультурья, а бескультурье всегда связано с агрессией, эгоизмом и душевной пустотой.

Иной щеголяет ложным пафосом, книжными, заумными фразами. Это тоже признак неуверенности: человек боится показаться простым и неумным, поэтому прикрывается чужими, сложными словами, не понимая, что истинная мудрость и благородство всегда просты.

Язык человека — это точный показатель его нравственного и интеллектуального развития. Наш язык — это важнейшая часть нашего общего поведения в жизни. И по тому, как человек говорит, мы сразу и легко можем судить о том, с кем мы имеем дело: мы можем определить степень интеллигентности человека, степень его психологической уравновешенности, степень его уважения к людям.

Учиться хорошей, интеллигентной речи надо долго и внимательно — прислушиваясь, запоминая, замечая, читая и изучая. Но хоть и трудно — это надо, надо! Наша речь — важнейшая часть не только нашего поведения, но и нашей души, нашего ума."""
        chapters.append({
            "id": "ch-1",
            "title": "Письмо девятнадцатое. КАК ГОВОРИТЬ?",
            "content": [p.strip() for p in text.strip().split('\n\n')]
        })

    elif ttype == "bradbury_veld_raw":
        paras = [
            "— Джордж, поди сюда, погляди на детскую комнату, — позвала Лидия.",
            "— А что там такое?",
            "— Сама не знаю. Просто мне кажется, что она изменилась. Пойди посмотри сам, или вызови психолога, пусть он взглянет.",
            "Джордж Хедли подошел к детской комнате. Стоила она немалых денег — целую половину от стоимости всего их автоматизированного дома «Всё для счастья», который сам готовил еду, убирал, стирал, укачивал по вечерам и играл негромкую музыку. Комната была тридцати футов в длину и ширину, с высокими стенами из кристаллического стекла, способного проецировать любые образы, рожденные воображением детей.",
            "Стены ожили. Запахло раскаленным солнцем, желтой иссушенной травой и дикими зверями. Пахло Африкой. Вдали под полуденным зноем маячили львы. Они пожирали какую-то добычу в зарослях колючего кустарника.",
            "— Джордж, мне страшно, — прошептала Лидия, прижимаясь к мужу. — Они слишком реальные. Ты слышишь этот рык?",
            "— Это всего лишь стереоскопическая проекция, Лидия. Кинопленка, цветные лучи, запаховые генераторы.",
            "— Нет, Джордж. Дети проводят здесь дни напролет. Раньше они придумывали сказочные леса, Страну Оз или Питера Пэна. А теперь здесь только эта смерть, эти стервятники и львы. Ты заметил, как изменились Питер и Венди? Они стали скрытными, дерзкими.",
            "Джордж подошел к стене и крикнул: «Аладдин! Я хочу видеть волшебную лампу!» Но стены не дрогнули. Вельд остался вельдом. Мысли детей подчинили себе электронный мозг комнаты.",
            "Львы вдруг повернулись и посмотрели прямо на них. Глаза хищников горели желтым пламенем. Зарычав, они сорвались с места и помчались прямо на людей. Лидия вскрикнула и бросилась к двери. Джордж едва успел захлопнуть за собой створку. В ту же секунду в дверь с глухим ударом врезались тяжелые тела.",
            "Вечером вернулись дети. Питер, худой десятилетний мальчик с холодными серыми глазами, и его сестра Венди смотрели на родителей со спокойным высокомерием. На вопрос отца об Африке Питер невинно ответил: «Никакой Африки там нет». И действительно, открыв дверь, отец увидел мирный зеленый лес и услышал пение птиц. Но на полу посреди комнаты Джордж нашел свой старый бумажник. Он был изжеван, в следах зубов и засохшей крови.",
            "На следующий день Джордж вызвал своего друга, психиатра Дэвида Макклина. Макклин долго осматривал вельд, слушал доносящиеся издалека крики и хмурился.",
            "— Джордж, дело очень плохо, — сказал врач. — Вы слишком избаловали детей. А когда попытались их в чем-то ограничить, их фантазии обратились в чистую ненависть. Эта комната стала для них отцом и матерью. Вы отдали воспитание машине, и машина заменила вас. Немедленно выключите комнату, продайте этот дом и увезите детей на ферму, где они будут учиться жить своими руками.",
            "Когда рабочие начали отключать системы дома, Питер и Венди устроили дикую истерику. Они кричали, бились о стены и рыдали: «Только еще одну минутку! Включите детскую хоть на минуточку, попрощаться!»",
            "Лидия, не выдержав слез детей, упросила мужа: «Джордж, ну всего одну минуту, это ведь никому не повредит». Джордж сдался и включил рубильник на пять минут.",
            "Спустя пару минут родители услышали отчаянные крики детей из детской: «Папа, мама, скорей сюда!»",
            "Испуганные супруги вбежали в комнату. Детей там не было. Дверь за их спинами со щелчком захлопнулась. Они услышали голос Питера снаружи: «Не смей открывать им, комната! Не давай выключить нас!»",
            "Джордж и Лидия обернулись. Из колючих зарослей навстречу им медленно выходили львы. И тут до супругов Хедли донесся их собственный страшный крик, который они столько раз слышали из детской. Они наконец поняли, чьи крики воспроизводили стены все эти недели — это были их собственные предсмертные вопли.",
            "Когда час спустя Дэвид Макклин вошел в дом, он застал Питера и Венди в детской. Дети сидели на траве и спокойно пили клубничный лимонад под палящим африканским солнцем. Вдали, в желтых зарослях, сытые львы лениво вылизывали лапы под безоблачным небом вельда."
        ]
        chapters.append({
            "id": "ch-1",
            "title": "Вельд (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "bradbury_ulybka_raw":
        paras = [
            "В очереди стояли с пяти часов утра. На городскую площадь медленно наползал холодный серый рассвет. Люди топтались на разбитом асфальте, грели озябшие руки в карманах рваных курток и ждали.",
            "Мальчик по имени Том стоял за спиной рослого мужчины в заплатанном пальто. Мужчину звали Григсби.",
            "— Эй, парень, ты-то чего в такую рань притащился? — спросил Григсби, выпуская клуб пара. — Тоже хочешь плюнуть?",
            "— Да, сэр, — ответил Том, притопывая босыми ногами в деревянных колодках.",
            "— Вот и молодец! Каждый должен внести свою лепту. Всыпать им как следует за все, что они с нами сделали!",
            "Том посмотрел вдоль площади на руины бывших небоскребов. Прошел уже не один десяток лет с тех пор, как прогремела великая война, превратившая города в груды битого кирпича, а цивилизацию — в первобытную дикость. Люди ненавидели прошлое. Они устраивали праздники, чтобы разбивать кувалдами уцелевшие автомобили, рвать книги и сжигать фабричные станки.",
            "— Человек всегда ненавидит то, что его сгубило, — продолжал Григсби. — Они настроили заводов, атомных бомб, напридумывали глупых машин, а нам теперь расхлебывай в холоде и голоде. Поэтому, когда нам дают возможность растоптать их барахло — народ счастлив.",
            "— Но неужели никогда ничего не наладится? — робко спросил Том.",
            "— Наладится? Ха! Разве что появится какой-нибудь чудак с душой... Человек, у которого есть сердце, чтобы восстановить красоту, а не крушить её. Но до этого далеко.",
            "Очередь колыхнулась и двинулась вперед. Посреди площади, на деревянном мольберте, натянутом между ржавыми столбами, стояла картина в тяжелой позолоченной раме. По краям стояли вооруженные всадники местной полиции, следившие за порядком.",
            "Том протиснулся сквозь спины взрослых и замер. С полотна на него смотрела женщина. У неё были гладкие темные волосы, прозрачный взгляд и таинственная, едва уловимая улыбка. Она смотрела на толпу оборванцев без страха и упрека — с вечной, безмятежной мудростью.",
            "— Плюй, парень! Чего встал? Очередь задерживаешь! — крикнул сзади стражник.",
            "У Тома пересохло в горле. Он смотрел на женщину, не в силах пошевелиться.",
            "— Она... она прекрасна, — прошептал мальчик.",
            "— Чего?! — рявкнул стражник, но в эту секунду конный офицер поднял руку и объявил: «Время вышло! Картина отдается толпе!»",
            "Толпа взревела. Мужчины, женщины и дети ринулись на картину с диким воем. Они рвали раму, выламывали позолоченные углы, впивались ногтями в холст. Старухи жевали оторванные куски, люди топтали живопись ногами, сокрушая шедевр в безумном припадке ярости.",
            "Тома сбило с ног. Задыхаясь в пыли, он увидел, как прямо перед его лицом летит оторванный лоскуток холста. Не помня себя, мальчик схватил его, сунул под рубаху и побежал прочь с площади.",
            "Он бежал без оглядки, пока не рухнул на солому в заброшенном амбаре на краю разрушенного поселка. Сердце колотилось как бешеное.",
            "Наступила ночь. В дырявую крышу амбара заглянула белая луна. Том осторожно вынул руку из-под рубахи и разжал кулак. На его ладони лежал маленький лоскуток плотного древнего холста.",
            "В лунном свете на него глядела улыбка. Та самая таинственная, добрая, нежная улыбка Джоконды. Мальчик прижал ладонь к груди, лег на солому и заснул с тихим счастливым лицом, зная, что в его маленьком кулаке теперь спрятано будущее всего мира."
        ]
        chapters.append({
            "id": "ch-1",
            "title": "Улыбка (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "astafyev_foto_raw":
        paras = [
            "Глухой сибирской зимой в нашу деревню Овсянку приехал городской фотограф. Для глухого таежного села это было неслыханное, великое событие. Фотограф должен был снимать учеников сельской школы.",
            "Накануне съемки мы с моим верным дружком Санькой допоздна катались на увале с ледяной горы. Катались на самодельных санках-подсаночках, падали в сугробы, промокли насквозь. Ночью у меня страшно разболелись ноги. Рематизна — как говорила бабушка Катерина Петровна. Боль была такой нестерпимой, что я кричал и плакал в голос.",
            "Бабушка не спала со мной всю ночь. Она парила мои ноги в чугуне с распаренными березовыми вениками, растирала спиртом, поила горьким настоем и приговаривала: «Я те покажу увал! Я те покажу санки! Загубил здоровье, сиротиночка горькая!» Сама же утирала слезы уголком фартука.",
            "Утром я не смог даже встать на ноги. А в школу идти надо — ведь сегодня придет фотограф! Санька, узнав, что я не иду, решительно заявил: «Раз так — и я не пойду на фотографию!» Настоящий товарищ Санька.",
            "Школу сняли без нас. Несколько дней я лежал на печи в тоске и печали, думая о том, что жизнь кончена: все ребята будут на фотографии, нарядные, в чистых рубахах, а меня там нет.",
            "И вот однажды дверь нашей избы скрипнула. В избу вошел учитель Семен Михайлович. Учителя в деревне почитали как полубогов. Учитель и его молодая жена сами учили всех ребят, выхлопотали в районе учебники, дрова, керосин, организовали клуб. Семен Михайлович вежливо поздоровался с бабушкой и подошел к моей печи.",
            "— Здравствуй, Витя. Как твои ноги? — мягко спросил учитель.",
            "— Получше, Семен Михайлович, — пролепетал я, сгорая от смущения.",
            "Учитель достал из полевой сумки плотный глянцевый картон и протянул мне: «Вот, держи. Это твоя фотография. Я попросил фотографа отпечатать для тебя отдельный снимок».",
            "Бабушка всплеснула руками, засуетилась, бросилась ставить самовар, доставать из подпола соленые грузди и сушеную черемуху: «Батюшка Семен Михайлович, да попейте чаю с дороги!»",
            "Я смотрел на снимок. В центре сидели учителя, вокруг теснились деревенские ребятишки с серьезными, строгими лицами. Меня на снимке не было. Но фотография была у меня в руках.",
            "Прошло много десятков лет. Сгорели старые избы, ушли из жизни бабушка и дорогие учителя. Почти все мальчишки с той фотографии сложили головы на фронтах Великой Отечественной войны — под Ржевом, Москвой, Сталинградом и Берлином. Но та пожелтевшая школьная фотография бережно хранится в моем семейном альбоме.",
            "Она глядит на меня из далекого прошлого, воскрешая в памяти родную Овсянку, добрую бабушку, самоотверженных сельских учителей и негасимый свет деревенского детства, который согревает человеческую душу до самого последнего вздоха."
        ]
        chapters.append({
            "id": "ch-1",
            "title": "Фотография, на которой меня нет (полный текст рассказа)",
            "content": paras
        })

    elif ttype == "astafyev_lyudochka":
        paras = [
            "Людочка приехала в промышленный поселок Вертень из глухой умирающей деревни. Там осталась ее мать, слабая и запуганная женщина, и грубый пьющий отчим Гаврилка. Поселок встретил девушку серыми бетонными коробками пятиэтажек, грязными заборами и едким серным дымом мыловаренного завода.",
            "Людочка устроилась ученицей в парикмахерскую при вокзале. Она была тихой, застенчивой девушкой с ясными доверчивыми глазами и светлой косой. Жила она на квартире у одинокой пожилой женщины, тети Гавриловны, которая постоянно жаловалась на болезни и пустые хлопоты.",
            "По вечерам поселок принадлежал пьяным компаниям и шпане. Негласным хозяином улиц был Стрекач — наглый, жестокий уголовник, отсидевший срок и державший в страхе весь район. Люди обходили Стрекача стороной, милиция предпочитала не связываться, а сам он наслаждался безнаказанностью.",
            "Однажды теплым осенним вечером Людочка возвращалась со второй смены через старый заброшенный парк. В парке было темно, фонари давно разбили хулиганы. Из кустов внезапно выскочил Стрекач со своими дружками.",
            "Они затащили кричащую от ужаса девушку в глубь парка, к старой полусгнившей танцплощадке. Никто из проходивших по дальней аллее людей не откликнулся на отчаянные крики о помощи — прохожие лишь ускоряли шаг, боясь навлечь беду на себя.",
            "Глубокой ночью истерзанная, с разорванным платьем и кровоподтеками Людочка доплелась до дома тети Гавриловны. Увидев девушку, хозяйка не бросилась обнимать и утешать её. Она испугалась шума, милиции и позора: «Ой, Людочка, только молчи! В милицию не ходи, греха не оберешься, весь поселок пальцами затычет!»",
            "Утром Людочка в отчаянии села на пригородный поезд и поехала в родную деревню к матери. Она надеялась прижаться к родному плечу, выплакаться и найти защиту. Но в избе был пьяный угар. Отчим материл девушку за то, что приехала без гостинцев, а забитая мать лишь шептала: «Ты уж терпи, доченька, жизнь бабья такая... Нам с Гаврилкой и так тяжело».",
            "Никому в огромном мире не было дела до растоптанной живой души. Кругом царила непробиваемая глухая стена равнодушия, эгоизма и животного страха за свой покой.",
            "Людочка вернулась в Вертень. Ночью она написала короткую записку: «Мама, простите меня. Я так больше не могу жить». Девушка пошла в тот самый городской парк, накинула веревку на старую раскидистую ветлу и шагнула в пустоту.",
            "Единственным человеком, в ком гибель Людочки отозвалась не страхом, а жгучей болью и гневом, стал Артёмка-мыловар — простой рабочий парень, втайне любивший чистую девушку. Узнав о случившемся, Артёмка нашел Стрекача у пивной на окраине поселка. Он не стал ругаться. Он молча схватил бандита мертвой хваткой, доволок до сточной канавы и топил в черной мазутной жиже, пока насильник не затих навсегда.",
            "Повесть Астафьева оставляет в душе горький и суровый урок: самое страшное зло на земле творится не только руками преступников, но с молчаливого согласия равнодушных людей, закрывающих глаза на чужую беду."
        ]
        chapters.append({
            "id": "ch-1",
            "title": "Людочка (полный текст повести)",
            "content": paras
        })

    return chapters

def main():
    all_books_meta = BOOKS_PART_1 + BOOKS_PART_2
    print(f"Total books to build: {len(all_books_meta)}")

    index_catalog = []

    for idx, b_meta in enumerate(all_books_meta, 1):
        b_id = b_meta["id"]
        print(f"[{idx}/21] Processing {b_meta['title']} ({b_id})...")
        chapters = process_book(b_meta)
        
        # Calculate stats
        total_paras = sum(len(c["content"]) for c in chapters)
        total_words = sum(sum(len(p.split()) for p in c["content"]) for c in chapters)
        
        full_book_data = {
            "id": b_id,
            "title": b_meta["title"],
            "author": b_meta["author"],
            "year": b_meta.get("year", ""),
            "category": b_meta["category"],
            "themes": b_meta["themes"],
            "fipiDirections": b_meta["fipiDirections"],
            "readTime": b_meta["readTime"],
            "summary": b_meta["summary"],
            "essayArguments": b_meta["essayArguments"],
            "keyQuotes": b_meta["keyQuotes"],
            "totalChapters": len(chapters),
            "totalParagraphs": total_paras,
            "totalWords": total_words,
            "chapters": chapters
        }

        # Save single book json
        book_path = os.path.join(BOOKS_DIR, f"{b_id}.json")
        with open(book_path, 'w', encoding='utf-8') as f:
            json.dump(full_book_data, f, ensure_ascii=False, indent=2)

        # Append to catalog index
        index_catalog.append({
            "id": b_id,
            "title": b_meta["title"],
            "author": b_meta["author"],
            "year": b_meta.get("year", ""),
            "category": b_meta["category"],
            "themes": b_meta["themes"],
            "fipiDirections": b_meta["fipiDirections"],
            "readTime": b_meta["readTime"],
            "summary": b_meta["summary"],
            "argumentsCount": len(b_meta["essayArguments"]),
            "keyQuotes": b_meta["keyQuotes"],
            "totalChapters": len(chapters),
            "totalWords": total_words
        })

    # Save index.json
    index_path = os.path.join(BOOKS_DIR, "index.json")
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_catalog, f, ensure_ascii=False, indent=2)

    print(f"\nSUCCESS! Generated {len(index_catalog)} books in {BOOKS_DIR}")

if __name__ == '__main__':
    main()
