(function () {
  const SOURCES = [
    {
      owner: "Pixel-Props",
      repo: "build.prop",
      label: "0x11DFE",
      type: "stable",
    },
    {
      owner: "Elcapitanoe",
      repo: "Build-Prop-BETA",
      label: "Elcapitanoe",
      type: "beta",
    },
  ];

  function getToken() {
    const meta = document.querySelector('meta[name="gh-token"]');
    return (window.GH_TOKEN || (meta && meta.content) || "").trim();
  }

  function gh(path, { method = "GET" } = {}) {
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
  const attrEscape = (s) => String(s ?? "").replace(/"/g, "&quot;");

  const decodeHtml = (html) => {
    const t = document.createElement("textarea");
    t.innerHTML = html;
    return t.value || t.textContent || "";
  };

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
      const res = await gh(
        `/repos/${owner}/${repo}/releases?per_page=100&page=${page}`
      );
      if (!res.ok)
        throw new Error(`GitHub /releases ${owner}/${repo} ${res.status}`);
      const chunk = await res.json();
      releases.push(...chunk);
      const link = res.headers.get("Link") || "";
      if (!link.includes('rel="next"')) break;
      page++;
      if (page > 10) break;
    }
    return releases.filter((r) => !r.draft);
  }

  function sanitizeDeviceName(raw) {
    if (!raw) return "Unknown Device";
    return String(raw)
      .replace(/^[#\s\-\*]+/, "")
      .replace(/[:\s]+$/, "")
      .trim();
  }

  function findSha256Around(rawLines, lineIndex) {
    const sha64Rx = /([A-Fa-f0-9]{64})/;
    const windowStart = Math.max(0, lineIndex - 4);
    const windowEnd = Math.min(rawLines.length - 1, lineIndex + 4);
    for (let i = windowStart; i <= windowEnd; i++) {
      const l = rawLines[i];
      const hex = sha64Rx.exec(l);
      if (hex && /sha|sha-?256|file\s*hash|sha256/i.test(l)) return hex[1];
    }
    for (let i = windowStart; i <= windowEnd; i++) {
      const l = rawLines[i];
      const hex = sha64Rx.exec(l);
      if (hex) return hex[1];
    }
    return null;
  }

  function extractFilesFromChunk(chunk, deviceName) {
    const found = [];
    const fileLabelRx = /(File name|Filename|File):?[\s\u00A0\-]*([^\r\n]+)/i;
    const fileAltRx = /([A-Za-z0-9_\-\.]+?\.(zip|img|bin|tar|gz|7z|apk))/gi;
    const rawLines = chunk.split(/\r?\n/);
    const lines = rawLines.map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lm = fileLabelRx.exec(line);
      if (lm) {
        let fn = lm[2]
          .trim()
          .replace(/^["'`]+|["'`]+$/g, "")
          .trim();
        let foundIndex = 0;
        for (let k = 0; k < rawLines.length; k++) {
          if (rawLines[k].trim() === lines[i]) {
            foundIndex = k;
            break;
          }
        }
        const checksum =
          findSha256Around(rawLines, foundIndex) || "Checksum not found";
        found.push({ deviceName, fileName: fn, checksum });
      }
    }
    if (found.length === 0) {
      let m;
      const seen = new Set();
      while ((m = fileAltRx.exec(chunk)) !== null) {
        const fn = m[0].trim();
        if (seen.has(fn)) continue;
        seen.add(fn);
        const pos = m.index;
        let acc = 0;
        let lineIndex = 0;
        for (let k = 0; k < rawLines.length; k++) {
          acc += rawLines[k].length + 1;
          if (acc >= pos) {
            lineIndex = k;
            break;
          }
        }
        const checksum =
          findSha256Around(rawLines, lineIndex) || "Checksum not found";
        found.push({ deviceName, fileName: fn, checksum });
      }
    }
    return found;
  }

  function parseReleaseBody(body) {
    const infoMap = new Map();
    if (!body) return infoMap;
    const headerRx = /^(.+?)\s*\(([^)]+)\)\s*$/gm;
    const headers = [];
    let m;
    while ((m = headerRx.exec(body)) !== null) {
      headers.push({ index: m.index, raw: m[1], codename: m[2] });
    }

    if (headers.length === 0) {
      const fileEntries = extractFilesFromChunk(body, "Unknown Device");
      fileEntries.forEach((e) => {
        const d = sanitizeDeviceName(e.deviceName);
        infoMap.set(e.fileName, { deviceName: d, checksum: e.checksum });
        infoMap.set(e.fileName.toLowerCase(), {
          deviceName: d,
          checksum: e.checksum,
        });
      });
      return infoMap;
    }
    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : body.length;
      const chunk = body.substring(start, end);
      const rawDevice = headers[i].raw || "Unknown Device";
      const device = sanitizeDeviceName(rawDevice);
      const fileEntries = extractFilesFromChunk(chunk, device);
      fileEntries.forEach((e) => {
        const key = e.fileName;
        infoMap.set(key, { deviceName: device, checksum: e.checksum });
        infoMap.set(key.toLowerCase(), {
          deviceName: device,
          checksum: e.checksum,
        });
      });
    }
    return infoMap;
  }

  function initChecksumModals() {
    const modal = document.getElementById("checksumModal");
    const modalTitle = document.getElementById("modalFileName");
    const modalBody = document.getElementById("modalChecksumData");
    const closeBtn = document.getElementById("modalCloseBtn");
    const backdrop = document.getElementById("modalBackdrop");

    if (!modal || !modalTitle || !modalBody || !closeBtn) return;
    const closeModal = () => modal.classList.add("hidden");
    const openModalWith = (fileName, checksumRaw) => {
      modalTitle.textContent = fileName || "File";
      const decoded = esc(checksumRaw || "Checksum not found");
      modalBody.textContent = decodeHtml(decoded);
      modal.classList.remove("hidden");

      const copyBtn = document.getElementById("modalCopyBtn");
      const newBtn = copyBtn.cloneNode(true);
      copyBtn.parentNode.replaceChild(newBtn, copyBtn);

      newBtn.addEventListener("click", async () => {
        const text = decodeHtml(decoded);
        try {
          await navigator.clipboard.writeText(text);
          const originalText = newBtn.textContent;
          newBtn.textContent = "Copied ✓";
          newBtn.classList.add("bg-green-600", "hover:bg-green-700");
          setTimeout(() => {
            newBtn.textContent = originalText;
            newBtn.classList.remove("bg-green-600", "hover:bg-green-700");
          }, 1500);
        } catch {
          newBtn.textContent = "Failed";
        }
      });
    };

    document.addEventListener("click", (ev) => {
      const tgt = ev.target;
      if (!(tgt instanceof Element)) return;
      if (tgt.closest(".show-checksum-btn")) {
        const btn = tgt.closest(".show-checksum-btn");
        openModalWith(
          btn.getAttribute("data-filename"),
          btn.getAttribute("data-checksum")
        );
      }
    });
    closeBtn.addEventListener("click", closeModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);
  }

  function renderLatestBlock(latestRows) {
    if (!latestRows.length)
      return `<div class="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-center border border-red-100 dark:border-red-500/20 text-sm">No releases found.</div>`;

    return latestRows
      .map(({ label, latest, type }) => {
        const pub = latest.published_at || latest.created_at;
        const tag = esc(latest.tag_name || latest.name || "Untitled");
        const pubDate = fmtDate(pub);
        const assets = latest.assets || [];
        const assetsTotal = assets.reduce(
          (s, a) => s + (a.download_count || 0),
          0
        );
        const bodyInfoMap = parseReleaseBody(latest.body || "");

        let badgeHtml =
          type === "beta"
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wide">Beta</span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 uppercase tracking-wide">Stable</span>`;

        let assetsHtml = "";
        if (assets.length) {
          assetsHtml =
            '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">' +
            assets
              .map((a) => {
                const fileNameRaw = a.name || "";
                const fileName = esc(fileNameRaw);
                const dlCount = a.download_count ?? 0;
                const dlUrl = esc(a.browser_download_url || "");

                let meta =
                  bodyInfoMap.get(fileNameRaw) ||
                  bodyInfoMap.get(fileNameRaw.toLowerCase());
                if (!meta) {
                  for (const [k, v] of bodyInfoMap.entries()) {
                    if (k.toLowerCase() === String(fileNameRaw).toLowerCase()) {
                      meta = v;
                      break;
                    }
                  }
                }
                if (!meta)
                  meta = {
                    deviceName: "Unknown Device",
                    checksum: "Checksum not found",
                  };

                return `
                  <div class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md dark:hover:shadow-blue-500/5 transition duration-300 flex flex-col justify-between group h-full">
                    <div class="mb-4">
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 break-all leading-tight" title="${fileName}">${fileName}</h3>
                            <span class="bg-white dark:bg-[#020617] p-1.5 rounded-lg border border-slate-100 dark:border-white/10 text-blue-500 dark:text-blue-400 shadow-sm shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </span>
                        </div>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                <span class="truncate">${esc(
                                  meta.deviceName
                                )}</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                <span>${dlCount} Downloads</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-4 border-t border-slate-200/60 dark:border-white/10 mt-auto">
                      <a href="${dlUrl}" class="flex-1 text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-500/20 active:scale-95" target="_blank">Download</a>
                      <button type="button" class="px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-semibold rounded-lg transition show-checksum-btn active:scale-95" 
                        data-filename="${attrEscape(
                          fileNameRaw
                        )}" data-checksum="${attrEscape(
                  meta.checksum
                )}">Hash</button>
                    </div>
                  </div>`;
              })
              .join("") +
            "</div>";
        } else {
          assetsHtml = `<div class="text-center py-10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 rounded-2xl mt-6 border border-dashed border-slate-200 dark:border-white/10 text-sm">No assets available.</div>`;
        }

        return `
          <div class="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg dark:hover:shadow-none transition duration-300 mb-8">
            
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3 flex-wrap">
                    <h2 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white break-all">${tag}</h2>
                    ${badgeHtml}
                </div>
                <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    By <a href="https://github.com/${esc(
                      label
                    )}" target="_blank" class="font-medium text-blue-600 dark:text-blue-400 hover:underline">${esc(
          label
        )}</a>
                    &bull; ${pubDate}
                </p>
              </div>

              <div class="flex items-center justify-between md:justify-end bg-slate-50 dark:bg-white/5 px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5 md:ml-auto w-full md:w-auto gap-6">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider md:hidden">Total Downloads</span>
                <div class="text-right flex items-baseline gap-2 md:block">
                    <span class="block text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-none">${assetsTotal}</span>
                    <span class="hidden md:block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Downloads</span>
                </div>
              </div>
            </div>

            ${assetsHtml}
          </div>`;
      })
      .join("");
  }

  function pickLatest(all) {
    if (!all || all.length === 0) return null;
    return all.slice().sort(byPublishedDesc)[0] || null;
  }

  async function main() {
    const latestEl = document.getElementById("latestBlock");
    if (!latestEl) return;
    try {
      const datasets = [];
      for (const s of SOURCES) {
        const all = await fetchAllReleases(s.owner, s.repo);
        datasets.push({ ...s, all, latest: pickLatest(all) });
      }
      const latestRows = datasets
        .filter((d) => !!d.latest)
        .sort((a, b) => byPublishedDesc(a.latest, b.latest));
      latestEl.innerHTML = renderLatestBlock(latestRows);
      initChecksumModals();
    } catch (err) {
      latestEl.innerHTML = `<div class="p-6 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl text-center text-sm">Error: ${esc(
        err.message
      )}</div>`;
    }
  }

  main();
})();