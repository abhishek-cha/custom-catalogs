export type RecommendedCatalog = {
  source: 'recommended';
  type: 'movie' | 'series';
  name: string;
};

export type ListCatalog = {
  source: 'list';
  type: 'movie' | 'series';
  name: string;
  username: string;
  slug: string;
};

export type CatalogEntry = RecommendedCatalog | ListCatalog;

export function getId(entry: CatalogEntry): string {
  return entry.source === 'recommended'
    ? `trakt-recommended-${entry.type}`
    : `trakt-list-${entry.username}-${entry.slug}`;
}

const catalogs: CatalogEntry[] = [
  { source: 'list', type: 'movie',  name: 'Curated Recommendations', username: 'testabhi', slug: 'recommended-movies-couchmoney-tv' },
  { source: 'list', type: 'series',  name: 'Curated Recommendations', username: 'testabhi', slug: 'recommended-shows-couchmoney-tv' },
  { source: 'recommended', type: 'movie',  name: 'Trakt Recommendations' },
  { source: 'recommended', type: 'series', name: 'Trakt Recommendations' },
  { source: 'list', type: 'movie',  name: 'Trakt Trending', username: 'tvgeniekodi', slug: 'trending-movies' },
  { source: 'list', type: 'series',  name: 'Trakt Trending', username: 'tvgeniekodi', slug: 'trending-shows' },
  { source: 'list', type: 'movie',  name: 'Trakt Popular', username: 'justin', slug: 'trakt-popular-movies' },
  { source: 'list', type: 'series',  name: 'Trakt Popular', username: 'justin', slug: 'trakt-popular-tv-shows' },
];

export default catalogs;
