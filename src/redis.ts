import { Redis } from '@upstash/redis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!client && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    client = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return client;
}
