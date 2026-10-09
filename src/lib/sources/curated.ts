import { SManga, SChapter, Page, OverlaySpec } from '../types';

export const CURATED_MANGAS: SManga[] = [
  {
    id: 'solo-leveling',
    sourceId: 'curated',
    title: 'Поднятие уровня в одиночку',
    altTitle: 'Solo Leveling / Наедине с богами',
    description: '10 лет назад распахнулись «Врата», соединившие наш мир с миром монстров. Обычные люди пробудили в себе сверхсилы и стали «Охотниками». Сон Джин-у — охотник E-ранга, самый слабый из всех, едва сводящий концы с концами. Но однажды в скрытом двойном подземелье он получает уникальную способность — Систему, видимую только ему одному.',
    coverUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=800&q=80',
    authors: ['Чхугон', 'DUBU (REDICE STUDIO)'],
    status: 'COMPLETED',
    rating: 9.8,
    genres: ['Экшен', 'Фэнтези', 'Система', 'Приключения', 'Сверхъестественное'],
    totalChapters: 200,
    lastUpdated: '2026-10-01',
    views: 1420500,
  },
  {
    id: 'omniscient-reader',
    sourceId: 'curated',
    title: 'Точка зрения всеведущего читателя',
    altTitle: "Omniscient Reader's Viewpoint / Читатель",
    description: 'Ким Докча — обычный офисный клерк, чье единственное хобби — чтение забытой веб-новеллы «Три способа выжить в разрушенном мире». Он был ее единственным верным читателем на протяжении 10 лет. Но когда вышла финальная глава, мир вокруг внезапно стал точной копией этой новеллы. Теперь только Докча знает финал надвигающегося апокалипсиса.',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    authors: ['sing N song', 'Sleepy-C'],
    status: 'ONGOING',
    rating: 9.9,
    genres: ['Экшен', 'Психология', 'Апокалипсис', 'Сёнэн', 'Фэнтези'],
    totalChapters: 220,
    lastUpdated: '2026-10-07',
    views: 980400,
  },
  {
    id: 'beginning-after-the-end',
    sourceId: 'curated',
    title: 'Начало после конца',
    altTitle: 'The Beginning After the End',
    description: 'Король Грей обладал несравненной силой, богатством и авторитетом в мире, где миром правила боевая доблесть. Однако одиночество преследовало его до последнего вздоха. Переродившись в новом мире, полном магии и монстров, он получает второй шанс исправить ошибки прошлой жизни.',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    authors: ['TurtleMe', 'Fuyuki23'],
    status: 'ONGOING',
    rating: 9.7,
    genres: ['Исекай', 'Магия', 'Фэнтези', 'Приключения', 'Драма'],
    totalChapters: 195,
    lastUpdated: '2026-10-05',
    views: 865000,
  },
  {
    id: 'nano-machine',
    sourceId: 'curated',
    title: 'Наномашина',
    altTitle: 'Nano Machine / Нано-технологии в Муриме',
    description: 'Чхон Ё Ун — бастард Великого Владыки Демонического Культа, чья жизнь висела на волоске каждый день. Но однажды к нему прибывает потомок из далекого будущего и внедряет в его тело передовую наномашину. Теперь боевые искусства Мурима изучаются со скоростью искусственного интеллекта.',
    coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    authors: ['Хан Джунвольсо', 'GGBG'],
    status: 'ONGOING',
    rating: 9.6,
    genres: ['Мурим', 'Научная фантастика', 'Боевые искусства', 'Экшен'],
    totalChapters: 235,
    lastUpdated: '2026-10-08',
    views: 742100,
  },
  {
    id: 'tower-of-god',
    sourceId: 'curated',
    title: 'Башня Бога',
    altTitle: 'Tower of God / Kami no Tou',
    description: 'Что ты желаешь? Богатство? Славу? Силу? Месть? Или нечто, превосходящее всё это? Чего бы ты ни желал — всё это здесь, на вершине Башни. Баам провел всю жизнь во тьме у подножия башни, пока единственная подруга Рахиль не оставила его ради восхождения. Ради нее Баам решает открыть врата Башни сам.',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    authors: ['SIU'],
    status: 'ONGOING',
    rating: 9.7,
    genres: ['Мистика', 'Приключения', 'Фэнтези', 'Сёнэн'],
    totalChapters: 600,
    lastUpdated: '2026-10-09',
    views: 1650000,
  },
  {
    id: 'greatest-estate-developer',
    sourceId: 'curated',
    title: 'Величайший застройщик усадьбы',
    altTitle: 'The Greatest Estate Developer',
    description: 'Студент инженерного факультета Ким Су Хо заснул за чтением веб-новеллы и проснулся в теле Ллойда Фронтеры — пьяницы, лентяя и дворянина из семьи, погрязшей в гигантских долгах. Используя современные инженерные знания и строительную технику, он решает спасти поместье от банкротства любой ценой.',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    authors: ['Lee hyunmin', 'Kim Hyunsoo'],
    status: 'ONGOING',
    rating: 9.9,
    genres: ['Комедия', 'Исекай', 'Строительство', 'Фэнтези'],
    totalChapters: 160,
    lastUpdated: '2026-10-04',
    views: 920000,
  }
];

export const CURATED_CHAPTERS: Record<string, SChapter[]> = {
  'solo-leveling': [
    { id: 'sl-ch-3', mangaId: 'solo-leveling', sourceId: 'curated', number: 3, title: 'Глава 3: Скрытое подземелье двойного ранга', releaseDate: '2026-10-08', pagesCount: 6 },
    { id: 'sl-ch-2', mangaId: 'solo-leveling', sourceId: 'curated', number: 2, title: 'Глава 2: Заповеди бога храма Картен', releaseDate: '2026-10-05', pagesCount: 5 },
    { id: 'sl-ch-1', mangaId: 'solo-leveling', sourceId: 'curated', number: 1, title: 'Глава 1: Самый слабый охотник человечества', releaseDate: '2026-10-01', pagesCount: 5 },
  ],
  'omniscient-reader': [
    { id: 'orv-ch-2', mangaId: 'omniscient-reader', sourceId: 'curated', number: 2, title: 'Глава 2: Первый сценарий — Спаси жизнь', releaseDate: '2026-10-07', pagesCount: 5 },
    { id: 'orv-ch-1', mangaId: 'omniscient-reader', sourceId: 'curated', number: 1, title: 'Глава 1: Конец новеллы и начало мира', releaseDate: '2026-10-01', pagesCount: 5 },
  ],
  'beginning-after-the-end': [
    { id: 'tbate-ch-1', mangaId: 'beginning-after-the-end', sourceId: 'curated', number: 1, title: 'Глава 1: Пробуждение в Дикате', releaseDate: '2026-10-05', pagesCount: 5 },
  ],
  'nano-machine': [
    { id: 'nm-ch-1', mangaId: 'nano-machine', sourceId: 'curated', number: 1, title: 'Глава 1: Потомок из будущего', releaseDate: '2026-10-08', pagesCount: 5 },
  ],
  'tower-of-god': [
    { id: 'tog-ch-1', mangaId: 'tower-of-god', sourceId: 'curated', number: 1, title: 'Глава 1: 1F — Этаж Хедона', releaseDate: '2026-10-09', pagesCount: 5 },
  ],
  'greatest-estate-developer': [
    { id: 'ged-ch-1', mangaId: 'greatest-estate-developer', sourceId: 'curated', number: 1, title: 'Глава 1: Инженер в теле дворянина', releaseDate: '2026-10-04', pagesCount: 5 },
  ]
};

// High resolution aesthetic panels with realistic vector speech bubble overlay definitions
export function getCuratedPages(chapterId: string): Page[] {
  // Demo pages with AI overlay translation bubbles (reflecting manhwaread's signature feature)
  return [
    {
      index: 1,
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85',
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
            width: 0.40,
            height: 0.12,
            originalText: '도망쳐야 해! 문이 닫히고 있어!',
            translatedText: 'Нам нужно бежать! Врата закрываются прямо сейчас!',
            fontSize: 14,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          }
        ]
      }
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
            x: 0.20,
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
            width: 0.50,
            height: 0.14,
            originalText: '[시스템: 플레이어 자격 요건을 충족하셨습니다.]',
            translatedText: '[СИСТЕМА: Вы выполнили все секретные условия для получения статуса Игрока.]',
            fontSize: 13,
            fontWeight: 'bold',
            textColor: '#1E3A8A',
            backgroundColor: '#EFF6FF',
          }
        ]
      }
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
          }
        ]
      }
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
            width: 0.50,
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
            x: 0.30,
            y: 0.70,
            width: 0.45,
            height: 0.12,
            originalText: '이제부터... 오직 나만이 레벨업할 수 있다.',
            translatedText: 'Отныне... только я способен повышать свой уровень!',
            fontSize: 15,
            fontWeight: 'bold',
            textColor: '#0B0C10',
            backgroundColor: '#FFFFFF',
          }
        ]
      }
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
            y: 0.40,
            width: 0.55,
            height: 0.15,
            originalText: '다음 화에 계속됩니다... / To be continued',
            translatedText: 'Продолжение следует в следующей главе...',
            fontSize: 16,
            fontWeight: 'bold',
            textColor: '#FF6740',
            backgroundColor: '#1E1F28',
          }
        ]
      }
    }
  ];
}
