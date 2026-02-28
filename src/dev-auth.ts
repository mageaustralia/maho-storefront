/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Env } from './types';
import { CloudflareKVStore } from './content-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEV_COOKIE = '__dev_session';
export const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevSession {
  tokenHash: string;
  preview: boolean;
  pageconfig: string | null;
  /** Unix timestamp in milliseconds */
  issued: number;
  /** Unix timestamp in milliseconds */
  expires: number;
}

export interface DevData {
  storeCode: string | undefined;
  pageConfig: string | null;
  themeName: string;
  preview: boolean;
  edgeCache: string;
  kvReads: Array<{ key: string; hit: boolean; ms: number }>;
  apiCalls: Array<{ url: string; ms: number; status: number }>;
  renderMs: number;
  availablePageConfigs: string[];
  currentPath: string;

}

interface StoredToken {
  label: string;
  created: number;
  expires: number;
  permissions: string[];
}

// ---------------------------------------------------------------------------
// HMAC helpers (Web Crypto API — available in Cloudflare Workers)
// ---------------------------------------------------------------------------

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bufferToHex(sig);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Constant-time comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Token hashing
// ---------------------------------------------------------------------------

/**
 * Hash a raw dev token with HMAC-SHA256 to produce the KV lookup key suffix.
 */
export async function hashToken(token: string, secret: string): Promise<string> {
  return hmacSign(token, secret);
}

// ---------------------------------------------------------------------------
// Session cookie encode / decode
// ---------------------------------------------------------------------------

/**
 * Encode a DevSession into a signed cookie value.
 * Format: `base64(json_payload).hmac_signature`
 */
export async function encodeSession(session: DevSession, secret: string): Promise<string> {
  const json = JSON.stringify(session);
  const payload = btoa(json);
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

/**
 * Decode and verify a signed session cookie.
 * Returns null if the signature is invalid or the session has expired.
 */
export async function decodeSession(cookie: string, secret: string): Promise<DevSession | null> {
  const dotIdx = cookie.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const payload = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);

  const expectedSig = await hmacSign(payload, secret);
  if (!timingSafeEqual(sig, expectedSig)) return null;

  try {
    const session = JSON.parse(atob(payload)) as DevSession;
    if (session.expires < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Build a Set-Cookie header value for the dev session.
 * Skips the Secure flag for localhost / 127.x origins.
 */
export function setSessionCookie(session: string, hostname: string): string {
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  const flags = [
    `${DEV_COOKIE}=${session}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_TTL}`,
  ];
  if (!isLocal) {
    flags.push('Secure');
  }
  return flags.join('; ');
}

/** Build a Set-Cookie header that clears the dev session cookie. */
export function clearSessionCookie(): string {
  return `${DEV_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/** Parse a Cookie header string into key/value pairs. */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}

// ---------------------------------------------------------------------------
// Dev token validation (KV lookup)
// ---------------------------------------------------------------------------

/**
 * Validate a raw dev token against Cloudflare KV.
 * Hashes the token, looks up `dev:token:<hash>`, checks expiry.
 */
export async function validateDevToken(
  rawToken: string,
  env: Env,
): Promise<{ valid: boolean; tokenHash: string; permissions: string[] }> {
  const secret = env.DEV_SECRET;
  if (!secret) {
    return { valid: false, tokenHash: '', permissions: [] };
  }

  const tokenHash = await hashToken(rawToken, secret);
  const store = new CloudflareKVStore(env.CONTENT);
  const stored = await store.get<StoredToken>(`dev:token:${tokenHash}`);

  if (!stored) {
    return { valid: false, tokenHash, permissions: [] };
  }

  // Check expiry
  if (stored.expires > 0 && stored.expires < Date.now()) {
    return { valid: false, tokenHash, permissions: [] };
  }

  return { valid: true, tokenHash, permissions: stored.permissions ?? [] };
}

// ---------------------------------------------------------------------------
// Password gate helpers
// ---------------------------------------------------------------------------

/** Check whether the storefront password gate is enabled in KV. */
export async function isPasswordGateActive(env: Env): Promise<boolean> {
  const store = new CloudflareKVStore(env.CONTENT);
  const active = await store.get<boolean>('config:password_gate');
  return active === true;
}

/** Validate a submitted password against the stored storefront password. */
export async function validatePassword(password: string, env: Env): Promise<boolean> {
  const store = new CloudflareKVStore(env.CONTENT);
  const stored = await store.get<string>('config:storefront_password');
  if (!stored) return false;
  return timingSafeEqual(stored, password);
}

// ---------------------------------------------------------------------------
// Session extraction from Hono context
// ---------------------------------------------------------------------------

/**
 * Extract a DevSession from the current request cookies.
 * Accepts a Hono context object (uses `c.req.header` and `c.env`).
 * Returns null if no valid session cookie is present.
 */
export async function getSessionFromRequest(c: any): Promise<DevSession | null> {
  const env = c.env as Env;
  const secret = env.DEV_SECRET;
  if (!secret) return null;

  const cookieHeader = c.req.header('cookie') as string | undefined;
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[DEV_COOKIE];
  if (!raw) return null;

  return decodeSession(raw, secret);
}

// ---------------------------------------------------------------------------
// Timing instrumentation
// ---------------------------------------------------------------------------

export function createDevTimer() {
  const kvReads: Array<{ key: string; hit: boolean; ms: number }> = [];
  const apiCalls: Array<{ url: string; ms: number; status: number }> = [];
  const startTime = Date.now();

  /**
   * Wrap a KV read, recording key, hit/miss, and duration.
   */
  async function trackKv<T>(key: string, fn: () => Promise<T | null>): Promise<T | null> {
    const t0 = performance.now();
    const result = await fn();
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    kvReads.push({ key, hit: result !== null, ms });
    return result;
  }

  /**
   * Wrap an API call, recording URL, status, and duration.
   */
  async function trackApi(url: string, fn: () => Promise<Response>): Promise<Response> {
    const t0 = performance.now();
    const response = await fn();
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    apiCalls.push({ url, ms, status: response.status });
    return response;
  }

  function getRenderMs(): number {
    return Date.now() - startTime;
  }

  return { kvReads, apiCalls, startTime, trackKv, trackApi, getRenderMs };
}
