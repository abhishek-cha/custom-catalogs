import 'dotenv/config';
import express from 'express';
import { Environment, traktApi } from '@jsr/trakt__api';
import { getAccessToken, startDeviceFlow } from './auth';
import { getCached, setCached } from './cache';
// @ts-ignore
import catalogs, { getId, type CatalogEntry } from './catalogs';

const { TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET } = process.env;
if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
  console.error('Missing required env vars: TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

const trakt = traktApi({
  environment: Environment.production,
  apiKey: process.env.TRAKT_CLIENT_ID!,
});

const manifest = {
  id: 'com.custom.catalogs',
  version: '1.0.0',
  name: 'Custom Catalogs',
  description: 'Personalized movie and series recommendations and custom lists',
  resources: ['catalog'],
  types: ['movie', 'series'],
  catalogs: catalogs.map(c => ({ type: c.type, id: getId(c), name: c.name })),
};

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/manifest.json', (_req, res) => res.json(manifest));

app.get('/auth', async (_req, res) => {
  try {
    res.redirect(await startDeviceFlow(trakt));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

function toMeta(item: any, type: 'movie' | 'series') {
  const imdbId = item.ids?.imdb ? `${item.ids.imdb}` : undefined;
  return {
    id: imdbId,
    type,
    name: item.title,
    poster: imdbId ? `https://images.metahub.space/poster/medium/${imdbId}/img` : undefined,
    description: item.overview ?? undefined,
    releaseInfo: item.year?.toString() ?? undefined,
    imdbRating: item.rating?.toFixed(1) ?? undefined,
    genres: item.genres ?? undefined,
    runtime: item.runtime ? `${item.runtime}m` : undefined,
  };
}

app.get('/catalog/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const stremioType = type as 'movie' | 'series';

  const entry = catalogs.find(c => getId(c) === id);
  if (!entry) { res.status(404).json({ error: 'Unknown catalog' }); return; }

  try {
    if (entry.source === 'recommended') {
      const accessToken = await getAccessToken(trakt);
      if (!accessToken) { res.status(401).json({ error: 'Not authenticated. Visit /auth to authorize.' }); return; }

      const cacheKey = getId(entry);
      const cached = await getCached<unknown[]>(cacheKey);
      if (cached) { res.json({ metas: cached }); return; }

      const result = stremioType === 'movie'
        ? await trakt.recommendations.movies.recommend({ query: { limit: 100, extended: 'full' }, extraHeaders: { Authorization: `Bearer ${accessToken}` } })
        : await trakt.recommendations.shows.recommend({ query: { limit: 100, extended: 'full' }, extraHeaders: { Authorization: `Bearer ${accessToken}` } });

      if (result.status !== 200) { res.status(502).json({ error: 'Failed to fetch from Trakt' }); return; }

      const metas = (result.body as any[]).map(m => toMeta(m, stremioType));
      await setCached(cacheKey, metas);
      res.json({ metas });
    } else {
      const cacheKey = getId(entry);
      const cached = await getCached<unknown[]>(cacheKey);
      if (cached) { res.json({ metas: cached }); return; }

      const result = entry.type === 'movie'
        ? await trakt.users.lists.list.items.movie({ params: { id: entry.username, list_id: entry.slug }, query: { extended: 'full' } })
        : await trakt.users.lists.list.items.show({ params: { id: entry.username, list_id: entry.slug }, query: { extended: 'full' } });

      if (result.status !== 200) { res.status(502).json({ error: 'Failed to fetch list from Trakt' }); return; }

      const metas = (result.body as any[]).map(entry => toMeta(entry.type === 'movie' ? entry.movie : entry.show, stremioType));
      await setCached(cacheKey, metas);
      res.json({ metas });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
