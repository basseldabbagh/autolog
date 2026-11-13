interface PagesContext {
  request: Request;
  next: () => Promise<Response>;
  env: {
    ASSETS?: {
      fetch: (input: Request | string) => Promise<Response>;
    };
  };
}

/**
 * Cloudflare Pages Middleware:
 * Supports HTTP Markdown Content Negotiation (`Accept: text/markdown`) for AI agents
 * while continuing to serve standard HTML to browsers.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, next, env } = context;
  const accept = request.headers.get("Accept") || "";

  if (!accept.includes("text/markdown") || request.method !== "GET") {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  let targetAsset: string | null = null;
  if (path === "/") {
    targetAsset = "/llms.txt";
  } else if (path === "/faqs") {
    targetAsset = "/faqs.md";
  }

  if (!targetAsset || !env.ASSETS) {
    return next();
  }

  const assetUrl = new URL(targetAsset, url.origin);
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString()));
  if (!assetRes.ok) {
    return next();
  }

  const markdown = await assetRes.text();
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
