# Custom Catalogs

A [Stremio](https://www.stremio.com/) addon that surfaces personalized movie and series catalogs powered by [Trakt.tv](https://trakt.tv).

## Catalogs

| Name | Type | Source |
|---|---|---|
| Curated Recommendations | Movie & Series | Trakt public list |
| Trakt Recommendations | Movie & Series | Trakt personalized (requires auth) |
| Trakt Trending | Movie & Series | Trakt public list |
| Trakt Popular | Movie & Series | Trakt public list |

## Prerequisites

- Node.js 18+
- A [Trakt API app](https://trakt.tv/oauth/applications/new) (Client ID + Secret)
- (Optional) [Upstash Redis](https://upstash.com/) for persistent caching and token storage

## Setup

1. Copy `.env.example` to `.env` and fill in your values:

```env
TRAKT_CLIENT_ID=your_client_id_here
TRAKT_CLIENT_SECRET=your_client_secret_here
PORT=3000

# Optional: Upstash Redis (falls back to in-memory cache + local .tokens.json)
KV_REST_API_URL=
KV_REST_API_TOKEN=
CACHE_TTL_SECONDS=43200
```

2. Install dependencies:

```bash
npm install
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Authentication (Trakt Recommendations)

The "Trakt Recommendations" catalog requires a Trakt account. To authenticate:

1. Visit `http://localhost:3000/auth` in your browser
2. You'll be redirected to a Trakt device authorization URL
3. Enter the code and approve access
4. Tokens are saved to `.tokens.json` locally, or to Redis if configured

## Adding to Stremio

Point Stremio to your addon manifest:

```
http://localhost:3000/manifest.json
```

## Caching

Catalog responses are cached (default: 12 hours) to avoid hitting Trakt rate limits. Set `CACHE_TTL_SECONDS` in `.env` to adjust. Uses Redis if configured, otherwise falls back to in-memory cache.

## Customizing Catalogs

Edit [`src/catalogs.ts`](src/catalogs.ts) to add, remove, or change catalogs. Each entry is either:

- `recommended` — uses Trakt's personalized recommendations (requires auth)
- `list` — pulls from any public Trakt user list via `username` + `slug`
