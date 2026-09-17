import type { Instrumentation } from "next";
/** Structured operational signal, deliberately excluding request headers, URL/query and error message. */
export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  console.error(
    JSON.stringify({
      event: "request.error",
      at: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      route: context.routePath,
      router: context.routerKind,
      kind: context.routeType,
    }),
  );
};
