import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEnvironment, checkHttp } from "./preflight.mjs";

const fixture = () => ({
  APP_ENV: "staging",
  DATA_SOURCE: "prisma",
  ALLOW_DEMO_SEED: "false",
  AUTH_SECRET: "a".repeat(48),
  CRON_SECRET: "b".repeat(48),
  DATABASE_URL: "postgresql://user:pass@db.provider.com/app",
  DIRECT_URL: "postgresql://user:pass@db.provider.com/app",
  APP_URL: "https://study.provider.com",
  RESEND_API_KEY: "fixture",
  EMAIL_FROM: "study@provider.com",
  ACCOUNT_EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64"),
  BILLING_REQUIRED: "false",
  ADMIN_MFA_REQUIRED: "false",
});
const passed = (env) => checkEnvironment(env, "staging").every((check) => check.passed);

test("requires an email queue key and explicit billing configuration", () => {
  assert.equal(passed({ ...fixture(), ACCOUNT_EMAIL_ENCRYPTION_KEY: undefined }), false);
  assert.equal(passed({ ...fixture(), ACCOUNT_EMAIL_ENCRYPTION_KEY: "x".repeat(44) }), false);
  assert.equal(passed({ ...fixture(), BILLING_REQUIRED: "true" }), false);
  assert.equal(
    passed({
      ...fixture(),
      BILLING_REQUIRED: "true",
      STRIPE_SECRET_KEY: "fixture",
      STRIPE_WEBHOOK_SECRET: "fixture",
      STRIPE_PRICE_ID: "fixture",
    }),
    true,
  );
});

test("accepts a declared hosted environment; does not claim live validation", () =>
  assert.equal(passed(fixture()), true));
test("rejects missing configuration, mocks and demo seeding", () => {
  assert.equal(passed({}), false);
  assert.equal(passed({ ...fixture(), DATA_SOURCE: "mock" }), false);
  assert.equal(passed({ ...fixture(), ALLOW_DEMO_SEED: "true" }), false);
});
test("rejects reused/demo secrets without printing their values", () => {
  const env = { ...fixture(), CRON_SECRET: fixture().AUTH_SECRET };
  assert.equal(passed(env), false);
  assert.equal(passed({ ...fixture(), AUTH_SECRET: "ci-test-".repeat(10) }), false);
  assert.equal(JSON.stringify(checkEnvironment(env, "staging")).includes(env.AUTH_SECRET), false);
});
test("rejects development databases and noncanonical application URLs", () => {
  assert.equal(passed({ ...fixture(), DATABASE_URL: "postgresql://x:y@localhost/app" }), false);
  for (const APP_URL of [
    "http://study.provider.com",
    "https://x:y@study.provider.com",
    "https://study.provider.com/reset?token=x",
  ]) {
    assert.equal(passed({ ...fixture(), APP_URL }), false);
  }
});
test("checks anonymous redirects without following them or sending credentials", async () => {
  const checks = await checkHttp("https://study.provider.com", async (url, options) => {
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers, undefined);
    if (url.pathname === "/api/health") return Response.json({ status: "ok" });
    if (url.pathname === "/admin")
      return new Response(null, { status: 307, headers: { location: "/login" } });
    return new Response("login");
  });
  assert.equal(
    checks.every((check) => check.passed),
    true,
  );
});
test("fails closed on unavailable service and unexpected admin access", async () => {
  const checks = await checkHttp("https://study.provider.com", async (url) => {
    if (url.pathname === "/api/health") throw new Error("private connection details");
    return new Response("private body");
  });
  assert.equal(checks.find((check) => check.id === "health").passed, false);
  assert.equal(checks.find((check) => check.id === "admin-anonymous").passed, false);
  assert.equal(JSON.stringify(checks).includes("private"), false);
});

test("production requires administrative MFA and its own encryption key", () => {
  const production = { ...fixture(), APP_ENV: "production" };
  const valid = (env) => checkEnvironment(env, "production").every((check) => check.passed);
  assert.equal(valid(production), false);
  assert.equal(valid({ ...production, ADMIN_MFA_REQUIRED: "true" }), false);
  assert.equal(
    valid({ ...production, ADMIN_MFA_REQUIRED: "true", MFA_ENCRYPTION_KEY: "d".repeat(64) }),
    true,
  );
});
