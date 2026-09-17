"use client";
import { useState } from "react";
import Link from "next/link";
import { beginMfaAction, confirmMfaAction, manageMfaAction } from "@/server/actions/mfa";
export function MfaForm({
  enabled = false,
  required = false,
}: {
  enabled?: boolean;
  required?: boolean;
}) {
  const [disabled, setDisabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (disabled)
    return (
      <p>
        Autenticação adicional desativada. <Link href="/login">Entre novamente.</Link>
      </p>
    );
  if (codes.length)
    return (
      <div className="space-y-4">
        <p>
          Ativado. Guarde estes códigos de recuperação em local seguro. Cada código só pode ser
          usado uma vez. Suas sessões anteriores foram encerradas.
        </p>
        <pre className="overflow-x-auto select-all">{codes.join("\n")}</pre>
        <Link href="/login" className="underline">
          Entrar novamente
        </Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
          if (enabled) {
            const result = await manageMfaAction({
              password: form.get("password"),
              code: form.get("code"),
              disable: form.get("disable") === "on",
            });
            if (result.ok) {
              if (result.data.length) setCodes(result.data);
              else setDisabled(true);
            } else setError(result.error);
          } else if (!secret) {
            const result = await beginMfaAction(form.get("password"));
            if (result.ok) setSecret(result.data.secret);
            else setError(result.error);
          } else {
            const result = await confirmMfaAction(form.get("code"));
            if (result.ok) {
              setSecret("");
              setCodes(result.data);
            } else setError(result.error);
          }
        } catch {
          setError("Falha de conexão. Tente novamente.");
        } finally {
          setPending(false);
        }
      }}
    >
      {enabled && (
        <>
          <p>
            MFA ativado. Para renovar os códigos de recuperação, confirme senha e código atual. A
            operação encerra suas sessões.
          </p>
          <label>
            Código atual ou recuperação
            <input name="code" required autoComplete="one-time-code" className="block border p-2" />
          </label>
          {!required && (
            <label>
              <input type="checkbox" name="disable" /> Desativar autenticação adicional
            </label>
          )}
          {required && (
            <p>
              A política administrativa exige MFA. Para trocar de dispositivo, preserve o
              autenticador atual e solicite recuperação administrativa segura.
            </p>
          )}
        </>
      )}
      {secret ? (
        <>
          <p>Adicione manualmente esta chave ao aplicativo (TOTP, 6 dígitos, 30 segundos):</p>
          <code className="block break-all select-all">{secret}</code>
          <label className="block">
            Código do aplicativo
            <input
              className="block border p-2"
              name="code"
              required
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
            />
          </label>
        </>
      ) : (
        <label className="block">
          Senha atual
          <input
            className="block border p-2"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button disabled={pending} className="rounded border p-2" type="submit">
        {pending
          ? "Aguarde…"
          : secret
            ? "Confirmar ativação"
            : enabled
              ? "Confirmar alteração"
              : "Configurar autenticador"}
      </button>
    </form>
  );
}
