import type { UserColorKey } from '@/types';

export const USER_COLOR_KEYS: UserColorKey[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'destructive',
];

export function userColorKeyToCss(key: UserColorKey): string {
  switch (key) {
    case 'chart-1':
      return 'hsl(var(--chart-1))';
    case 'chart-2':
      return 'hsl(var(--chart-2))';
    case 'chart-3':
      return 'hsl(var(--chart-3))';
    case 'chart-4':
      return 'hsl(var(--chart-4))';
    case 'chart-5':
      return 'hsl(var(--chart-5))';
    case 'destructive':
      return 'hsl(var(--destructive))';
  }
}

function hashStringFNV1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getStableColorKey(seed: string | undefined | null): UserColorKey {
  const safeSeed = seed || '';
  const index = hashStringFNV1a(safeSeed) % USER_COLOR_KEYS.length;
  return USER_COLOR_KEYS[index];
}

export function getUserChartColor(opts: {
  uid: string | undefined | null;
  colorKey?: UserColorKey | null;
}): string {
  const key = opts.colorKey || getStableColorKey(opts.uid);
  return userColorKeyToCss(key);
}
