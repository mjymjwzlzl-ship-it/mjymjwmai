export type Badge = 'UP' | 'NEW' | 'FREE' | 'ADULT' | 'END';

export type Card = {
  id: string;
  title: string;
  author?: string;
  thumb: string;
  tags?: string[];
  badges?: Badge[];
  isAdult?: boolean;
  isEnded?: boolean;
  lastUpdatedAt?: string;
  latestEp?: number;
  progress?: { ep: number } | null;
};

export type Section =
  | { type: 'hero'; items: Card[] }
  | { type: 'retention'; items: string[] }
  | { type: 'personal'; mode: 'continue' | 'trending' }
  | { type: 'ranking'; tabs: ('realtime' | 'new' | 'complete')[]; limit: number }
  | { type: 'strip'; title: string; query: string; limit: number }
  | { type: 'chips'; title: string; tags: string[] }
  | { type: 'genreTop'; genres: string[]; limit: number }
  | { type: 'banners'; items: string[] };


