import { env } from "@/config/env";
import { requireUser } from "@/server/authorization";
import { MfaForm } from "./setup-form";
export default async function SecurityPage() {
  const session = await requireUser();
  let enabled = false;
  if (env.DATA_SOURCE === "prisma") {
    const { prisma } = await import("@/server/db/prisma");
    enabled = Boolean(
      (await prisma.userMfa.findUnique({ where: { userId: session.userId } }))?.enabledAt,
    );
  }
  const required = env.ADMIN_MFA_REQUIRED && ["admin", "moderador"].includes(session.role);
  return (
    <section className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-bold">Autenticação adicional</h1>
      <p>Use um aplicativo autenticador compatível com TOTP. Confirme sua senha para iniciar.</p>
      {env.DATA_SOURCE === "prisma" && env.MFA_ENCRYPTION_KEY ? (
        <MfaForm enabled={enabled} required={required} />
      ) : (
        <p role="status">A autenticação adicional ainda não está disponível neste ambiente.</p>
      )}
    </section>
  );
}
