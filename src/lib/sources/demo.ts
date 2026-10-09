import { Page, SChapter, SManga } from '../types';
import { MangaSource, makeMangaId } from './base';
import { SourceError } from './http';

/**
 * Demo source: showcases the vector AI overlay (OverlaySpec) on sample pages.
 * Pages are placeholder art, not real chapters.
 */
export const DEMO_SLUG = 'ai-overlay';
export const DEMO_MANGA_ID = makeMangaId('demo', DEMO_SLUG);
export const DEMO_CHAPTER_ID = 'ch-1';

/** Old ids of the former "curated" catalog → mapped to the demo title so saved libraries keep working. */
export const LEGACY_DEMO_IDS = [
  'solo-leveling',
  'omniscient-reader',
  'beginning-after-the-end',
  'nano-machine',
  'tower-of-god',
  'greatest-estate-developer',
];

export const DEMO_MANGA: SManga = {
  id: DEMO_MANGA_ID,
  sourceId: 'demo',
  title: 'Демо: векторный AI-оверлей',
  altTitle: 'OverlaySpec showcase',
  description:
    'Демонстрация фирменного векторного оверлея ManhwaRead: перевод хранится как набор векторных слоёв (координаты баббла, маска, кегль) и рендерится поверх скана без запекания в растр. Нажмите на баббл, чтобы переключить оригинал и перевод. Изображения — заглушки.',
  coverUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=600&q=80',
  authors: ['ManhwaRead'],
  status: 'COMPLETED',
  rating: 0,
  genres: ['Демо', 'AI-перевод'],
  type: 'Демо',
  totalChapters: 1,
};

export const DEMO_CHAPTERS: SChapter[] = [
  {
    id: DEMO_CHAPTER_ID,
    mangaId: DEMO_MANGA_ID,
    sourceId: 'demo',
    number: 1,
    title: 'Глава 1: Векторные бабблы',
    pagesCount: 5,
  },
];

export function getDemoPages(): Page[] {
  // Demo pages with AI overlay translation bubbles (reflecting manhwaread's signature feature)
  return [
    {
      index: 1,
      imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
      width: 1200,
      height: 1800,
      overlay: {
        pageIndex: 1,
        bubbles: [
          {
            id: 'b-1-1',
            x: 0.15,
            y: 0.12,
            width: 0.38,
            height: 0.11,
            originalText: '이 던전은 일반적인 D급이 아니야... 무언가 잘못됐어!',
            translatedText: 'Это подземелье явно не D-ранга... Здесь что-то не так!',
            fontSize: 14,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          },
          {
            id: 'b-1-2',
            x: 0.52,
            y: 0.28,
            width: 0.4,
            height: 0.12,
            originalText: '도망쳐야 해! 문이 닫히고 있어!',
            translatedText: 'Нам нужно бежать! Врата закрываются прямо сейчас!',
            fontSize: 14,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          },
        ],
      },
    },
    {
      index: 2,
      imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=85',
      width: 1200,
      height: 1800,
      overlay: {
        pageIndex: 2,
        bubbles: [
          {
            id: 'b-2-1',
            x: 0.2,
            y: 0.18,
            width: 0.44,
            height: 0.13,
            originalText: '신을 경배하라. 신을 찬양하라. 신을 증명하라.',
            translatedText: 'Поклонись Господу. Восславь Господа. Докажи свою веру.',
            fontSize: 15,
            fontWeight: 'bold',
            textColor: '#991B1B',
            backgroundColor: '#FEF2F2',
          },
          {
            id: 'b-2-2',
            x: 0.35,
            y: 0.65,
            width: 0.5,
            height: 0.14,
            originalText: '[시스템: 플레이어 자격 요건을 충족하셨습니다.]',
            translatedText: '[СИСТЕМА: Вы выполнили все секретные условия для получения статуса Игрока.]',
            fontSize: 13,
            fontWeight: 'bold',
            textColor: '#1E3A8A',
            backgroundColor: '#EFF6FF',
          },
        ],
      },
    },
    {
      index: 3,
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
      width: 1200,
      height: 1800,
      overlay: {
        pageIndex: 3,
        bubbles: [
          {
            id: 'b-3-1',
            x: 0.18,
            y: 0.22,
            width: 0.42,
            height: 0.12,
            originalText: '내가... 살아남은 건가? 상처가 전부 사라졌어?',
            translatedText: 'Я... выжил? Все мои смертельные раны полностью исцелились?!',
            fontSize: 14,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          },
        ],
      },
    },
    {
      index: 4,
      imageUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=1200&q=85',
      width: 1200,
      height: 1800,
      overlay: {
        pageIndex: 4,
        bubbles: [
          {
            id: 'b-4-1',
            x: 0.25,
            y: 0.15,
            width: 0.5,
            height: 0.13,
            originalText: '[일일 퀘스트: 강해지기 위한 준비가 도착했습니다]',
            translatedText: '[ЕЖЕДНЕВНОЕ ЗАДАНИЕ: Подготовка к становлению сильнейшим]',
            fontSize: 14,
            fontWeight: 'bold',
            textColor: '#065F46',
            backgroundColor: '#ECFDF5',
          },
          {
            id: 'b-4-2',
            x: 0.3,
            y: 0.7,
            width: 0.45,
            height: 0.12,
            originalText: '이제부터... 오직 나만이 레벨업할 수 있다.',
            translatedText: 'Отныне... только я способен повышать свой уровень!',
            fontSize: 15,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          },
        ],
      },
    },
    {
      index: 5,
      imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
      width: 1200,
      height: 1800,
      overlay: {
        pageIndex: 5,
        bubbles: [
          {
            id: 'b-5-1',
            x: 0.22,
            y: 0.4,
            width: 0.55,
            height: 0.15,
            originalText: '다음 화에 계속됩니다... / To be continued',
            translatedText: 'Продолжение следует в следующей главе...',
            fontSize: 16,
            fontWeight: 'bold',
            textColor: '#FF6740',
            backgroundColor: '#1E1F28',
          },
        ],
      },
    },
  ];
}

export const demoSource: MangaSource = {
  meta: { id: 'demo', name: 'Демо AI-оверлея', lang: 'ru', baseUrl: '', isOnline: true, supportsSearch: false },
  imageHosts: [/(^|\.)unsplash\.com$/],
  list: async () => ({ items: [DEMO_MANGA], hasNextPage: false }),
  search: async query => ({
    items: DEMO_MANGA.title.toLowerCase().includes(query.toLowerCase()) ? [DEMO_MANGA] : [],
    hasNextPage: false,
  }),
  details: async slug => {
    if (slug !== DEMO_SLUG && !LEGACY_DEMO_IDS.includes(slug)) throw new SourceError('Тайтл не найден', 404);
    return DEMO_MANGA;
  },
  chapters: async () => DEMO_CHAPTERS,
  pages: async () => getDemoPages(),
};
