export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  avatar: string;
  bio: string;
  exp: number;
  level: number;
  rankTitle: string;
  nextLevelExp: number;
  currentLevelExp: number;
  createdAt: number;
}

export function calculateLevel(exp: number): { level: number; rankTitle: string; currentLevelExp: number; nextLevelExp: number } {
  // exp based curve: level = floor(sqrt(exp / 20)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, exp) / 20)) + 1);
  const currentLevelExp = Math.round(20 * Math.pow(level - 1, 2));
  const nextLevelExp = Math.round(20 * Math.pow(level, 2));

  let rankTitle = 'Новичок';
  if (level >= 75) rankTitle = 'Архимаг';
  else if (level >= 50) rankTitle = 'Сенсей';
  else if (level >= 35) rankTitle = 'Знаток';
  else if (level >= 20) rankTitle = 'Отаку';
  else if (level >= 10) rankTitle = 'Любитель';
  else if (level >= 5) rankTitle = 'Читатель';

  return { level, rankTitle, currentLevelExp, nextLevelExp };
}

export const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=JinWoo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ChaeHaeIn',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Igris',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowMonarch',
  'https://api.dicebear.com/7.x/bottts/svg?seed=BaekYoonho',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SungIlHwan',
];
