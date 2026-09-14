import { pathToFileURL } from "node:url";

// Read-only deployment preflight. Never print environment values or response bodies.
export function checkEnvironment(env, target) {
  const checks = [];
  const check = (id, passed, message) => checks.push({ id, passed: Boolean(passed), message });
  check(
    "target",
    ["staging", "production"].includes(target),
    "Destino deve ser staging ou production.",
  );
  check("app-env", env.APP_ENV === target, "APP_ENV deve coincidir com o destino.");
  check(
    "mfa-policy",
    ["true", "false"].includes(env.ADMIN_MFA_REQUIRED) &&
      (target !== "production" || env.ADMIN_MFA_REQUIRED === "true"),
    "Declare a política MFA; produção exige MFA administrativo.",
  );
  if (env.ADMIN_MFA_REQUIRED === "true") {
    check(
      "mfa-key",
      /^[a-fA-F0-9]{64}$/.test(env.MFA_ENCRYPTION_KEY ?? "") &&
        env.MFA_ENCRYPTION_KEY !== env.AUTH_SECRET &&
        env.MFA_ENCRYPTION_KEY !== env.CRON_SECRET,
      "MFA exige chave de criptografia própria de 32 bytes em hexadecimal.",
    );
  }
  check("data-source", env.DATA_SOURCE === "prisma", "Persistência Prisma obrigatória.");
  check(
    "demo-seed",
    env.ALLOW_DEMO_SEED === "false",
    "Seed de demonstração deve estar explicitamente desativado.",
  );
  for (const key of ["AUTH_SECRET", "CRON_SECRET"]) {
    check(
      key.toLowerCase(),
      typeof env[key] === "string" &&
        env[key].length >= 32 &&
        !/dev-only|ci-test|example|changeme|placeholder/i.test(env[key]),
      `${key}: segredo próprio, sem valor demonstrativo e com pelo menos 32 caracteres.`,
    );
  }
  check(
    "separate-secrets",
    env.AUTH_SECRET && env.CRON_SECRET && env.AUTH_SECRET !== env.CRON_SECRET,
    "Autenticação e cron devem usar segredos diferentes.",
  );
  const isPublicHost = (host) =>
    host &&
    !/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i.test(host) &&
    !/(\.localhost|\.local|\.example|\.mock|\.invalid|\.test)$/.test(host);
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    let valid = false;
    try {
      const url = new URL(env[key]);
      valid =
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        url.username &&
        url.password &&
        isPublicHost(url.hostname);
    } catch {
      /* A missing/malformed URL is reported without echoing its value. */
    }
    check(
      key.toLowerCase(),
      valid,
      `${key}: conexão PostgreSQL do ambiente hospedado obrigatória; validar TLS e permissões no provedor.`,
    );
  }
  let validAppUrl = false;
  try {
    const url = new URL(env.APP_URL);
    validAppUrl =
      url.protocol === "https:" &&
      isPublicHost(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash;
  } catch {
    /* Do not expose the URL. */
  }
  check(
    "app-url",
    validAppUrl,
    "APP_URL deve ser a origem HTTPS canônica, sem credenciais, caminho ou parâmetros.",
  );
  check(
    "email-provider",
    Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()),
    "Configurar envio de e-mail para o ciclo de contas; entrega real ainda precisa de teste.",
  );
  const emailKey = env.ACCOUNT_EMAIL_ENCRYPTION_KEY ?? "";
  check(
    "email-encryption",
    /^[A-Za-z0-9+/]{43}=$/.test(emailKey) &&
      Buffer.from(emailKey, "base64").length === 32 &&
      emailKey !== env.AUTH_SECRET,
    "Fila de e-mail exige chave própria de 32 bytes em Base64; guardar no cofre e incluir na recuperação operacional.",
  );
  check(
    "billing-mode",
    ["true", "false"].includes(env.BILLING_REQUIRED),
    "Definir explicitamente se o acesso exige assinatura.",
  );
  if (env.BILLING_REQUIRED === "true") {
    check(
      "billing-provider",
      Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID),
      "Acesso pago exige configuração completa; validar webhook e ciclo de cobrança no provedor.",
    );
  }
  return checks;
}

export async function checkHttp(origin, fetcher = fetch) {
  const probes = [
    ["health", "/api/health", (response, body) => response.status === 200 && body?.status === "ok"],
    ["login", "/login", (response) => response.status === 200],
    [
      "admin-anonymous",
      "/admin",
      (response) => {
        const location = new URL(response.headers.get("location") ?? "", origin);
        return (
          [302, 303, 307, 308].includes(response.status) &&
          location.origin === new URL(origin).origin &&
          location.pathname === "/login"
        );
      },
    ],
  ];
  const checks = [];
  for (const [id, pathname, validate] of probes) {
    let passed = false;
    try {
      const response = await fetcher(new URL(pathname, origin), {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      const body = id === "health" ? await response.json() : undefined;
      passed = validate(response, body);
      if (id !== "health") await response.body?.cancel();
    } catch {
      /* Only a sanitized outcome is retained. */
    }
    checks.push({ id, passed: Boolean(passed), message: `Verificação HTTP: ${pathname}.` });
  }
  return checks;
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => arg.startsWith("--environment="))?.split("=")[1];
  const checks = checkEnvironment(process.env, target);
  if (args.includes("--http") && checks.every((check) => check.passed)) {
    checks.push(...(await checkHttp(process.env.APP_URL)));
  }
  const passed = checks.every((check) => check.passed);
  console.log(
    JSON.stringify(
      {
        passed,
        checks,
        scope:
          "Configuração declarada e, quando solicitado, três leituras HTTP. Não certifica release, banco, e-mail, pagamentos, backups ou segurança completa.",
      },
      null,
      2,
    ),
  );
  process.exitCode = passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
