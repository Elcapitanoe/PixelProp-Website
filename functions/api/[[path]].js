export async function onRequest(context) {
  const { request, env, params } = context;
  const subPath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  const url = new URL(request.url);
  const targetUrl = `https://api.github.com/${subPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set("User-Agent", "PixelProp-Website");
  headers.set("Accept", "application/vnd.github+json");
  if (env.GH_TOKEN) {
    headers.set("Authorization", `Bearer ${env.GH_TOKEN}`);
  }

  return fetch(targetUrl, {
    method: request.method,
    headers: headers
  });
}
