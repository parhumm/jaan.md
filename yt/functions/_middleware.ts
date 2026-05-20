type Env = { ASSETS: { fetch: (req: Request) => Promise<Response> } };

const HOST_MAP: Record<string, string> = {
  "a.yt.jaan.md": "/a-current-televika/",
  "b.yt.jaan.md": "/b-referrer-policy/",
  "c.yt.jaan.md": "/c-origin-api/",
  "d.yt.jaan.md": "/d-widget-referrer/",
  "e.yt.jaan.md": "/e-full-fixed/",
  "f.yt.jaan.md": "/f-full-api-player/",
};

function withSecurityHeaders(response: Response): Response {
  const next = new Response(response.body, response);
  next.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next.headers.set("X-Content-Type-Options", "nosniff");
  return next;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const target = HOST_MAP[url.hostname];
  let response: Response;
  if (
    target &&
    (url.pathname === "/" || url.pathname === "" || url.pathname === "/index.html")
  ) {
    const rewritten = new URL(target, url.origin);
    response = await ctx.env.ASSETS.fetch(new Request(rewritten, ctx.request));
  } else {
    response = await ctx.next();
  }
  return withSecurityHeaders(response);
};
