/**
 * 只有猫 · 管理后台独立登录（基于 env 中的 ADMIN_USERNAME / ADMIN_PASSWORD）
 * 与站点用户体系完全解耦。仅服务端使用。
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export const ADMIN_COOKIE = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function adminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin';
}

/** HMAC 签名密钥：由管理员密码派生，密码变更即会话失效 */
function adminSecret(): Buffer {
  const pw = process.env.ADMIN_PASSWORD || '';
  return crypto.createHash('sha256').update('catsjust-admin-secret:' + pw).digest();
}

/** 创建带签名的会话 token：payloadB64.signature */
export function createAdminSessionToken(): string {
  const payloadB64 = Buffer.from(
    JSON.stringify({ u: adminUsername(), exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', adminSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;

  const expected = crypto.createHmac('sha256', adminSecret()).update(payloadB64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/** 当前请求是否已登录管理后台 */
export function isAdminAuthed(): boolean {
  return verifyAdminSessionToken(cookies().get(ADMIN_COOKIE)?.value);
}

/** 未登录则跳转登录页（用于布局/页面） */
export function requireAdmin(): void {
  if (!isAdminAuthed()) {
    redirect('/admin/login');
  }
}

/** 常量时间比较（防时序攻击） */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
