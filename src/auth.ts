import fs from 'node:fs';
import type { OAuthTokenResponse, TraktApi } from '@jsr/trakt__api';
import { getRedis } from './redis.js';

const TOKENS_KEY = 'trakt:tokens';
const TOKENS_FILE = '.tokens.json';

async function loadTokens(): Promise<OAuthTokenResponse | null> {
  const redis = getRedis();
  if (redis) return redis.get<OAuthTokenResponse>(TOKENS_KEY);
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8')); } catch { return null; }
}

async function saveTokens(tokens: OAuthTokenResponse): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(TOKENS_KEY, tokens);
  } else {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  }
}

function isExpired(tokens: OAuthTokenResponse): boolean {
  return Date.now() / 1000 > tokens.created_at + tokens.expires_in - 60;
}

async function pollForToken(api: TraktApi, clientId: string, clientSecret: string, deviceCode: string, expiresIn: number, interval: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    const poll = setInterval(async () => {
      if (Date.now() > expiresAt) {
        clearInterval(poll);
        return reject(new Error('Device code expired'));
      }
      const tokenRes = await api.oauth.device
        .token({ body: { code: deviceCode, client_id: clientId, client_secret: clientSecret } })
        .catch(() => ({ status: 400, body: undefined } as { status: 400; body: undefined }));
      if (tokenRes.status === 200) {
        clearInterval(poll);
        await saveTokens(tokenRes.body);
        console.log('Authorization complete.');
        resolve();
      }
    }, interval * 1000);
  });
}

export async function startDeviceFlow(api: TraktApi): Promise<string> {
  const clientId = process.env.TRAKT_CLIENT_ID!;
  const clientSecret = process.env.TRAKT_CLIENT_SECRET!;

  const codeRes = await api.oauth.device.code({ body: { client_id: clientId } });
  if (codeRes.status !== 200) throw new Error('Failed to get device code');

  const { device_code, user_code, verification_url, expires_in, interval } = codeRes.body;

  // Poll in background, don't await
  pollForToken(api, clientId, clientSecret, device_code, expires_in, interval)
    .catch(err => console.error('Device flow failed:', err));

  return `${verification_url}/${user_code}`;
}

async function refreshTokens(api: TraktApi, tokens: OAuthTokenResponse, clientId: string, clientSecret: string): Promise<OAuthTokenResponse> {
  const res = await api.oauth.token({
    body: {
      refresh_token: tokens.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'refresh_token',
    },
  });
  if (res.status !== 200) throw new Error('Failed to refresh token');
  return res.body;
}

export async function getAccessToken(api: TraktApi): Promise<string | null> {
  const clientId = process.env.TRAKT_CLIENT_ID!;
  const clientSecret = process.env.TRAKT_CLIENT_SECRET!;

  const tokens = await loadTokens();

  if (!tokens) return null;

  if (isExpired(tokens)) {
    const refreshed = await refreshTokens(api, tokens, clientId, clientSecret);
    await saveTokens(refreshed);
    return refreshed.access_token;
  }

  return tokens.access_token;
}
