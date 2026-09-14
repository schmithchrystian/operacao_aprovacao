import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/db/prisma";
import { env } from "../src/config/env";
const origin = "http://localhost:3100";
const jar = new Map<string, string>();
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(origin + path, {
    ...options,
    redirect: "manual",
    headers: { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...options.headers },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0]!,
      equal = pair.indexOf("=");
    jar.set(pair.slice(0, equal), pair.slice(equal + 1));
  }
  return response;
}
async function login(email: string, password: string) {
  const csrf = await request("/api/auth/csrf");
  const { csrfToken } = await csrf.json();
  return request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: origin + "/dashboard" }),
  });
}
async function main() {
  assert.equal(env.APP_ENV, "test");
  assert.ok(new URL(env.DATABASE_URL!).pathname.includes("test"));
  const suffix = randomBytes(8).toString("hex"),
    email = `http-${suffix}@example.invalid`,
    password = randomBytes(24).toString("base64url");
  const user = await prisma.user.create({
    data: { email, name: "HTTP smoke", passwordHash: await bcrypt.hash(password, 12) },
  });
  try {
    assert.equal((await request("/api/health")).status, 200);
    assert.equal((await request("/api/ops/metrics")).status, 401);
    const publicPage = await request("/cadastro");
    assert.equal(publicPage.status, 200);
    const csp = publicPage.headers.get("content-security-policy")!;
    assert.match(csp, /script-src[^;]*'nonce-/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
    const html = await publicPage.text();
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    assert.ok(html.includes(`nonce="${nonce}"`));
    const loggedIn = await login(email, password);
    assert.equal(loggedIn.status, 200);
    const session = await (await request("/api/auth/session")).json();
    assert.equal(session.user.id, user.id);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const denied = await request("/dashboard");
    const deniedHtml = await denied.text();
    assert.ok(
      ([303, 307].includes(denied.status) && denied.headers.get("location")?.includes("/login")) ||
        (denied.status === 200 && /http-equiv="refresh"[^>]*url=\/login/.test(deniedHtml)),
      `Revocation response status ${denied.status}; refresh=${deniedHtml.match(/<meta[^>]*refresh[^>]*>/)?.[0] ?? "none"}`,
    );
    jar.clear();
    const unknown = `unknown-${suffix}@example.invalid`;
    for (let i = 0; i < 6; i++) await login(unknown, "incorrect-but-long-enough");
    const key = createHash("sha256").update(unknown).digest("hex");
    assert.equal((await prisma.securityRateLimit.findUnique({ where: { key } }))?.count, 5);
    await prisma.securityRateLimit.deleteMany({ where: { key } });
    console.log(
      "HTTP smoke PASS: readiness, protected metrics, public account routes, CSP nonce, direct Credentials login, revoked session redirect, shared callback rate limit.",
    );
  } finally {
    await prisma.auditLog.deleteMany({ where: { actorUserId: user.id } });
    await prisma.securityRateLimit.deleteMany({
      where: { key: createHash("sha256").update(email).digest("hex") },
    });
    await prisma.user.delete({ where: { id: user.id } });
  }
}
main().finally(() => prisma.$disconnect());
