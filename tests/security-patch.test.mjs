import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { onRequest } from "../functions/api/[[path]].js";

const MAX_UPSTREAM_BODY_BYTES = 2 * 1024 * 1024;

function context({
  path = ["repos", "Pixel-Props", "build.prop", "releases"],
  method = "GET",
  query = "",
  headers = {},
} = {}) {
  const url = new URL(`https://prop.example/api/${path.map(encodeURIComponent).join("/")}`);
  if (query) url.search = query.startsWith("?") ? query.slice(1) : query;
  return {
    request: new Request(url, { method, headers }),
    params: { path },
    env: { GH_TOKEN: "must-not-be-used" },
  };
}

async function withMockFetch(t, mock) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
}

test("rejects methods other than GET without contacting GitHub", async (t) => {
  let fetchCalled = false;
  await withMockFetch(t, async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  });

  const response = await onRequest(context({ method: "DELETE" }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(fetchCalled, false);
});

test("rejects non-allowlisted repositories and endpoints", async (t) => {
  let fetchCalled = false;
  await withMockFetch(t, async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  });

  const wrongRepo = await onRequest(context({
    path: ["repos", "attacker", "repo", "releases"],
  }));
  const wrongEndpoint = await onRequest(context({
    path: ["repos", "Pixel-Props", "build.prop", "contents"],
  }));

  assert.equal(wrongRepo.status, 404);
  assert.equal(wrongEndpoint.status, 404);
  assert.equal(fetchCalled, false);
});

test("rejects unknown, duplicate, or out-of-range query parameters", async (t) => {
  let fetchCalled = false;
  await withMockFetch(t, async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  });

  const unknown = await onRequest(context({ query: "per_page=2&path=users" }));
  const duplicate = await onRequest(context({ query: "per_page=2&per_page=3" }));
  const tooMany = await onRequest(context({ query: "per_page=6" }));
  const invalidPage = await onRequest(context({
    path: ["repos", "Pixel-Props", "build.prop", "commits"],
    query: "page=1e2",
  }));
  const invalidSha = await onRequest(context({
    path: ["repos", "Pixel-Props", "build.prop", "commits"],
    query: "sha=..%2Fmain",
  }));

  for (const response of [unknown, duplicate, tooMany, invalidPage, invalidSha]) {
    assert.equal(response.status, 400);
  }
  assert.equal(fetchCalled, false);
});

test("constructs a fixed GitHub URL and forwards no visitor credentials", async (t) => {
  let observedUrl;
  let observedInit;
  await withMockFetch(t, async (url, init) => {
    observedUrl = new URL(url);
    observedInit = init;
    return new Response(JSON.stringify([{ sha: "abc123" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  const response = await onRequest(context({
    path: ["repos", "PIXEL-PROPS", "BUILD.PROP", "commits"],
    query: "per_page=3&page=2&sha=main",
    headers: { cookie: "session=secret", authorization: "Bearer visitor-secret" },
  }));

  assert.equal(response.status, 200);
  assert.equal(observedUrl.origin, "https://api.github.com");
  assert.equal(observedUrl.pathname, "/repos/Pixel-Props/build.prop/commits");
  assert.equal(observedUrl.searchParams.get("per_page"), "3");
  assert.equal(observedUrl.searchParams.get("page"), "2");
  assert.equal(observedUrl.searchParams.get("sha"), "main");
  assert.equal(observedInit.method, "GET");
  assert.equal(observedInit.redirect, "error");
  assert.equal(observedInit.headers.Authorization, undefined);
  assert.equal(observedInit.headers.Cookie, undefined);
  assert.equal(response.headers.get("cloudflare-cdn-cache-control"), "public, max-age=60");
  assert.equal((await response.json())[0].sha, "abc123");
});

test("does not cache upstream error responses", async (t) => {
  await withMockFetch(t, async () => new Response(JSON.stringify({ message: "rate limited" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  }));

  const response = await onRequest(context());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("cloudflare-cdn-cache-control"), null);
});

test("rejects non-JSON upstream responses", async (t) => {
  await withMockFetch(t, async () => new Response("not JSON", {
    status: 200,
    headers: { "content-type": "text/html" },
  }));

  const response = await onRequest(context());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /Unexpected response/);
});

test("rejects upstream responses whose declared size exceeds the limit", async (t) => {
  await withMockFetch(t, async () => new Response("{}", {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-length": String(MAX_UPSTREAM_BODY_BYTES + 1),
    },
  }));

  const response = await onRequest(context());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /size limit/);
});

test("bounds streamed upstream responses even without Content-Length", async (t) => {
  await withMockFetch(t, async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_UPSTREAM_BODY_BYTES + 1));
      controller.close();
    },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  const response = await onRequest(context());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /size limit/);
});

test("turns upstream fetch failures into bounded 502 responses", async (t) => {
  await withMockFetch(t, async () => {
    throw new TypeError("upstream unavailable");
  });

  const response = await onRequest(context());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "GitHub API request failed");
});


test("aborts the upstream request when its timeout fires", async (t) => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };
  t.after(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  await withMockFetch(t, async (_url, init) => {
    assert.equal(init.signal.aborted, true);
    throw new DOMException("The operation was aborted", "AbortError");
  });

  const response = await onRequest(context());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "GitHub API request timed out");
});


test("release frontend does not render malicious API fields as HTML", async () => {
  const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
  let renderedHtml = "";
  let resolveRendered;
  const rendered = new Promise((resolve) => {
    resolveRendered = resolve;
  });
  const latestElement = {
    get innerHTML() {
      return renderedHtml;
    },
    set innerHTML(value) {
      renderedHtml = String(value);
      resolveRendered(renderedHtml);
    },
  };
  const localStorageRemovals = [];
  const document = {
    getElementById(id) {
      return id === "latestBlock" ? latestElement : null;
    },
  };

  const fetchMock = async (input, init) => {
    assert.equal(init.method, "GET");
    assert.equal(init.credentials, "omit");
    const url = new URL(input, "https://prop.example");
    const segments = url.pathname.split("/");
    const owner = decodeURIComponent(segments[3]);
    const repo = decodeURIComponent(segments[4]);

    return {
      ok: true,
      json: async () => [{
        tag_name: "<svg onload=alert(2)>",
        published_at: "2026-01-01T00:00:00Z",
        body: "",
        assets: [{
          name: 'test.zip"><img id=filename-payload onerror=alert(1)>',
          browser_download_url: `https://github.com/${owner}/${repo}/releases/download/v1.0/test.zip`,
          download_count: "<img id=download-count-payload onerror=alert(1)>",
          digest: `sha256:${"a".repeat(64)}`,
        }],
      }],
    };
  };

  runInNewContext(source, {
    window: {
      localStorage: {
        removeItem(key) {
          localStorageRemovals.push(key);
        },
      },
    },
    document,
    fetch: fetchMock,
    URL,
    console: { error() {}, log() {}, warn() {} },
  });

  const html = await rendered;
  assert.deepEqual(localStorageRemovals, ["GH_TOKEN"]);
  assert.doesNotMatch(html, /<img id=download-count-payload onerror=/i);
  assert.doesNotMatch(html, /<svg onload=alert\(2\)>/i);
  assert.match(html, /&lt;svg onload=alert\(2\)&gt;/i);
  assert.match(html, /&lt;img id=filename-payload onerror=alert\(1\)&gt;/i);
  assert.match(html, /0 downloads/);
});

test("changelog renders untrusted commit metadata as text and rejects unsafe commit links", async () => {
  const htmlDocument = await readFile(new URL("../changelogs/index.html", import.meta.url), "utf8");
  const inlineScript = [...htmlDocument.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .find((script) => script.includes("function loadCommits(type)"));
  assert.ok(inlineScript, "expected the changelog page to contain its commit-list script");

  const tabNames = ["stable", "beta", "website"];
  const completedHtml = new Map();
  const containers = new Map();
  let resolveAllRendered;
  const allRendered = new Promise((resolve) => {
    resolveAllRendered = resolve;
  });

  for (const tab of tabNames) {
    containers.set(`list-${tab}`, {
      _innerHTML: "",
      set innerHTML(value) {
        this._innerHTML = String(value);
        if (!this._innerHTML.includes("animate-pulse")) {
          completedHtml.set(tab, this._innerHTML);
          if (completedHtml.size === tabNames.length) resolveAllRendered();
        }
      },
      get innerHTML() {
        return this._innerHTML;
      },
    });
  }

  const button = () => ({
    disabled: false,
    classList: { add() {}, remove() {} },
  });
  const elements = new Map();
  for (const tab of tabNames) {
    elements.set(`btn-prev-${tab}`, button());
    elements.set(`btn-next-${tab}`, button());
    elements.set(`page-num-${tab}`, { innerText: "" });
  }

  const maliciousCommit = {
    sha: "<img id=sha-payload onerror=alert(1)>",
    html_url: "https://evil.example/commit/1234567",
    commit: {
      message: "<img id=message-payload onerror=alert(1)>",
      author: { name: "<img id=author-name-payload onerror=alert(1)>", date: "2026-10-01T00:00:00Z" },
    },
    author: { login: "<img id=author-login-payload onerror=alert(1)>" },
  };

  const document = {
    getElementById(id) {
      return containers.get(id) || elements.get(id) || null;
    },
  };

  runInNewContext(inlineScript, {
    document,
    URL,
    URLSearchParams,
    fetch: async (_url, init) => {
      assert.equal(init.method, "GET");
      assert.equal(init.credentials, "omit");
      return { ok: true, json: async () => [maliciousCommit] };
    },
    console: { error() {}, log() {}, warn() {} },
  });

  await allRendered;
  const renderedHtml = [...completedHtml.values()].join("\n");
  assert.doesNotMatch(renderedHtml, /<img id=(?:sha|message|author-name|author-login)-payload onerror=/i);
  assert.match(renderedHtml, /&lt;img id=message-payload onerror=alert\(1\)&gt;/i);
  assert.match(renderedHtml, /href="#"/);
});
