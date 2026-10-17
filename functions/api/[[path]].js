const ALLOWED_REPOSITORIES = Object.freeze({
  "pixel-props/build.prop": Object.freeze({
    owner: "Pixel-Props",
    repo: "build.prop",
    endpoints: Object.freeze(["releases", "commits"]),
  }),
  "elcapitanoe/build-prop-beta": Object.freeze({
    owner: "Elcapitanoe",
    repo: "Build-Prop-BETA",
    endpoints: Object.freeze(["releases", "commits"]),
  }),
  "elcapitanoe/pixelprop-website": Object.freeze({
    owner: "Elcapitanoe",
    repo: "PixelProp-Website",
    endpoints: Object.freeze(["commits"]),
  }),
});

const MAX_UPSTREAM_BODY_BYTES = 2 * 1024 * 1024;
const RELEASE_CACHE_TTL_SECONDS = 60 * 60;
const COMMIT_EDGE_CACHE_TTL_SECONDS = 60;

const JSON_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
});

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": "no-store",
    },
  });
}

function parsePositiveInteger(value, fallback, maximum) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    return null;
  }

  return parsed;
}

async function readBoundedBody(response, maximumBytes) {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && /^\d+$/.test(contentLength) && Number(contentLength) > maximumBytes) {
    await response.body?.cancel().catch(() => {});
    const error = new Error("Upstream response exceeded size limit");
    error.code = "UPSTREAM_RESPONSE_TOO_LARGE";
    throw error;
  }

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => {});
        const error = new Error("Upstream response exceeded size limit");
        error.code = "UPSTREAM_RESPONSE_TOO_LARGE";
        throw error;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
}

export async function onRequest({ request, params }) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...JSON_HEADERS,
        "Allow": "GET",
        "Cache-Control": "no-store",
      },
    });
  }

  const rawPath = params?.path;
  const segments = Array.isArray(rawPath)
    ? rawPath
    : typeof rawPath === "string"
      ? rawPath.split("/")
      : [];

  if (segments.length !== 4 || segments[0] !== "repos") {
    return jsonError(404, "Endpoint not found");
  }

  const [, requestedOwner, requestedRepo, endpoint] = segments;
  const repository = ALLOWED_REPOSITORIES[
    `${String(requestedOwner).toLowerCase()}/${String(requestedRepo).toLowerCase()}`
  ];

  if (!repository || !repository.endpoints.includes(endpoint)) {
    return jsonError(404, "Endpoint not found");
  }

  const requestUrl = new URL(request.url);
  const allowedQueryKeys = endpoint === "releases"
    ? new Set(["per_page"])
    : new Set(["per_page", "page", "sha"]);

  for (const key of requestUrl.searchParams.keys()) {
    if (!allowedQueryKeys.has(key) || requestUrl.searchParams.getAll(key).length !== 1) {
      return jsonError(400, "Invalid query parameters");
    }
  }

  const perPage = parsePositiveInteger(
    requestUrl.searchParams.get("per_page"),
    endpoint === "releases" ? 2 : 5,
    5,
  );

  if (perPage === null) {
    return jsonError(400, "Invalid per_page value");
  }

  const page = endpoint === "commits"
    ? parsePositiveInteger(requestUrl.searchParams.get("page"), 1, 100)
    : null;

  if (endpoint === "commits" && page === null) {
    return jsonError(400, "Invalid page value");
  }

  const sha = requestUrl.searchParams.get("sha");
  if (sha !== null && (!/^[A-Za-z0-9._/-]{1,128}$/.test(sha) || sha.includes(".."))) {
    return jsonError(400, "Invalid sha value");
  }

  // Construct the upstream URL only from allowlisted values. Never proxy an
  // arbitrary GitHub path or forward browser-supplied headers/credentials.
  const upstreamUrl = new URL(
    `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/${endpoint}`,
  );
  upstreamUrl.searchParams.set("per_page", String(perPage));
  if (endpoint === "commits") {
    upstreamUrl.searchParams.set("page", String(page));
    if (sha !== null) upstreamUrl.searchParams.set("sha", sha);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      // GitHub may redirect API requests to a canonical repository path.
      // Follow redirects, then verify that the final URL is still the exact
      // allowlisted API resource before returning any data to the browser.
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "PixelProp-Website",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (upstreamResponse.url) {
      let finalUrl;
      try {
        finalUrl = new URL(upstreamResponse.url);
      } catch {
        await upstreamResponse.body?.cancel().catch(() => {});
        return jsonError(502, "Invalid upstream redirect target");
      }

      const sameOrigin = finalUrl.origin === "https://api.github.com" &&
        !finalUrl.username && !finalUrl.password;
      const samePath = finalUrl.pathname.toLowerCase() === upstreamUrl.pathname.toLowerCase();
      const normalizeQuery = (url) => JSON.stringify(
        [...url.searchParams.entries()].sort(([keyA, valueA], [keyB, valueB]) =>
          keyA.localeCompare(keyB) || valueA.localeCompare(valueB)),
      );
      const sameQuery = normalizeQuery(finalUrl) === normalizeQuery(upstreamUrl);
      if (!sameOrigin || !samePath || !sameQuery) {
        await upstreamResponse.body?.cancel().catch(() => {});
        return jsonError(502, "Unexpected upstream redirect target");
      }
    }

    const contentType = (upstreamResponse.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const isJsonContentType = contentType === "application/json" ||
      /^application\/[a-z0-9.!#$&^_-]+\+json$/.test(contentType);

    if (!isJsonContentType) {
      await upstreamResponse.body?.cancel().catch(() => {});
      return jsonError(502, "Unexpected response from upstream API");
    }

    const body = await readBoundedBody(upstreamResponse, MAX_UPSTREAM_BODY_BYTES);
    const responseHeaders = {
      ...JSON_HEADERS,
      "Cache-Control": "no-store",
    };

    // Release responses contain public release metadata and direct GitHub asset
    // URLs. Let browsers reuse the same API response for one hour, so a normal
    // page reload does not issue another request while the entry is fresh.
    // The binary ZIP files are not proxied or cached here: Download links still
    // point directly to github.com. Keep commit responses revalidating in the
    // browser and retain the shorter edge TTL for commits.
    if (upstreamResponse.status === 200 && endpoint === "releases") {
      responseHeaders["Cache-Control"] = `public, max-age=${RELEASE_CACHE_TTL_SECONDS}`;
      responseHeaders["Cloudflare-CDN-Cache-Control"] = `public, max-age=${RELEASE_CACHE_TTL_SECONDS}`;
    } else if (upstreamResponse.status === 200 && endpoint === "commits") {
      responseHeaders["Cache-Control"] = "public, max-age=0, must-revalidate";
      responseHeaders["Cloudflare-CDN-Cache-Control"] = `public, max-age=${COMMIT_EDGE_CACHE_TTL_SECONDS}`;
    }

    for (const headerName of ["x-ratelimit-remaining", "x-ratelimit-reset", "retry-after"]) {
      const value = upstreamResponse.headers.get(headerName);
      if (value !== null) responseHeaders[headerName] = value;
    }

    return new Response(body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error?.code === "UPSTREAM_RESPONSE_TOO_LARGE") {
      return jsonError(502, "Upstream response exceeded size limit");
    }

    const timedOut = error?.name === "AbortError";
    // Keep client errors generic, but retain a bounded diagnostic in the
    // Cloudflare function logs so upstream fetch failures are actionable.
    console.error("[PixelProp API] Upstream request failed", {
      name: typeof error?.name === "string" ? error.name.slice(0, 80) : "Error",
      message: typeof error?.message === "string" ? error.message.slice(0, 200) : "Unknown error",
    });
    return jsonError(502, timedOut ? "GitHub API request timed out" : "GitHub API request failed");
  } finally {
    clearTimeout(timeoutId);
  }
}
