(function () {
  const SOURCES = [
    { owner: "Elcapitanoe", repo: "Build-Prop-BETA", label: "Elcapitanoe" },
    { owner: "Pixel-Props", repo: "build.prop", label: "0x11DFE" },
  ];

  function getToken() {
    const meta = document.querySelector('meta[name="gh-token"]');
    return (window.GH_TOKEN || (meta && meta.content) || "").trim();
  }

  async function gh(path, { method = "GET" } = {}) {
    const headers = { Accept: "application/vnd.github+json" };
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(`https://api.github.com${path}`, { method, headers });
  }

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const fmtDate = (s) => {
    try {
      return new Date(s).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    } catch {
      return s || "";
    }
  };

  function byPublishedDesc(a, b) {
    const da = new Date(a.published_at || a.created_at);
    const db = new Date(b.published_at || b.created_at);
    return db - da;
  }

  async function fetchAllReleases(owner, repo) {
    let page = 1;
    const releases = [];
    while (true) {
      const res = await gh(`/repos/${owner}/${repo}/releases?per_page=100&page=${page}`);
      if (!res.ok) throw new Error(`GitHub /releases ${owner}/${repo} ${res.status}`);
      const chunk = await res.json();
      releases.push(...chunk);
      const link = res.headers.get("Link") || "";
      if (!link.includes('rel="next"')) break;
      page++;
      if (page > 10) break; 
    }
    return releases.filter((r) => !r.draft);
  }

  function pickLatest(all) {
    if (!all || all.length === 0) return null;
    const sorted = all.slice().sort(byPublishedDesc);
    return sorted[0] || null;
  }

  function renderLatestBlock(latestRows) {
    if (!latestRows.length) return `<p class="muted">No releases</p>`;
    const rowsHtml = latestRows
      .map(({ label, latest }) => {
        const pub = latest.published_at || latest.created_at;
        const tag = esc(latest.tag_name || latest.name || "Untitled");
        const assets = latest.assets || [];
        const assetsTotal = assets.reduce((s, a) => s + (a.download_count || 0), 0);
        const assetsHtml = assets.length
          ? `<ul>` +
            assets
              .map(
                (a) =>
                  `<li><a href="${esc(
                    a.browser_download_url
                  )}" target="_blank" rel="noopener noreferrer">${esc(
                    a.name
                  )}</a> <span class="meta">(${a.download_count ?? 0}x)</span></li>`
              )
              .join("") +
            `</ul>`
          : `<p class="muted">No assets</p>`;
        return `
        <div class="latest" data-release-downloads="${assetsTotal}">
          <p class="meta"><strong>${tag} - ${esc(fmtDate(pub))} by <a href="https://github.com/${esc(label)}">${esc(label)}</a></strong></p>
          ${assetsHtml}
          <p class="meta">Total for this release: <strong>${assetsTotal}x</strong></p>
        </div> <hr class="dash" />`;
      })
      .join("");

    const grandTotal = latestRows.reduce((s, r) => {
      const t = (r.latest && r.latest.assets) ? r.latest.assets.reduce((ss, a) => ss + (a.download_count || 0), 0) : 0;
      return s + t;
    }, 0);

    return rowsHtml;
  }

  async function main() {
    const latestEl = document.getElementById("latestBlock");
    if (!latestEl) return console.warn("Element with id 'latestBlock' not found.");

    try {
      const datasets = [];
      for (const s of SOURCES) {
        const all = await fetchAllReleases(s.owner, s.repo);
        const latest = pickLatest(all);
        datasets.push({ ...s, all, latest });
      }

      const latestRows = datasets
        .filter((d) => !!d.latest)
        .sort((a, b) => byPublishedDesc(a.latest, b.latest));

      latestRows.forEach((d) => {
        const assets = d.latest.assets || [];
        d.latest._total_downloads = assets.reduce((s, a) => s + (a.download_count || 0), 0);
      });

      const grandTotal = latestRows.reduce((s, d) => s + (d.latest._total_downloads || 0), 0);

      window.GH_DOWNLOADS = {
        perRepo: latestRows.map((d) => ({
          label: d.label,
          owner: d.owner,
          repo: d.repo,
          total: d.latest._total_downloads || 0,
        })),
        total: grandTotal,
      };

      latestEl.dataset.totalDownloads = String(grandTotal);

      latestEl.innerHTML = renderLatestBlock(latestRows);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      latestEl.innerHTML = `<div class="err"><strong>Error:</strong> ${esc(msg)}</div>`;
    }
  }

  main();
})();
