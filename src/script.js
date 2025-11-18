(function () {
  const SOURCES = [
    { owner: 'Elcapitanoe', repo: 'Build-Prop-BETA', label: 'Elcapitanoe' },
    { owner: 'Pixel-Props', repo: 'build.prop', label: '0x11DFE' },
  ];

  function getToken() {
    const meta = document.querySelector('meta[name="gh-token"]');
    return (window.GH_TOKEN || (meta && meta.content) || '').trim();
  }

  function gh(path, { method = 'GET' } = {}) {
    const headers = { Accept: 'application/vnd.github+json' };
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
    return fetch(`https://api.github.com${path}`, { method, headers });
  }

  const esc = (s) =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const attrEscape = (s) => String(s ?? '').replace(/"/g, '&quot;');

  const decodeHtml = (html) => {
    const t = document.createElement('textarea');
    t.innerHTML = html;
    return t.value || t.textContent || '';
  };

  const fmtDate = (s) => {
    try {
      return new Date(s).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });
    } catch {
      return s || '';
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
      const link = res.headers.get('Link') || '';
      if (!link.includes('rel="next"')) break;
      page++;
      if (page > 10) break;
    }
    return releases.filter((r) => !r.draft);
  }

  function sanitizeDeviceName(raw) {
    if (!raw) return 'Unknown Device';
    return String(raw)
      .replace(/^[#\s\-\*]+/, '')
      .replace(/[:\s]+$/, '')
      .trim();
  }

  function findSha256Around(rawLines, lineIndex) {
    const sha64Rx = /([A-Fa-f0-9]{64})/;
    const windowStart = Math.max(0, lineIndex - 4);
    const windowEnd = Math.min(rawLines.length - 1, lineIndex + 4);

    for (let i = windowStart; i <= windowEnd; i++) {
      const l = rawLines[i];
      const hex = sha64Rx.exec(l);
      if (hex && /sha|sha-?256|file\s*hash|sha256/i.test(l)) {
        return hex[1];
      }
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
    const fileAltRx = /([A-Za-z0-9_\-\.]+?\.(zip|img|bin|tar|gz|7z|apk))/ig;

    const rawLines = chunk.split(/\r?\n/);
    const lines = rawLines.map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lm = fileLabelRx.exec(line);
      if (lm) {
        let fn = lm[2].trim().replace(/^["'`]+|["'`]+$/g, '').trim();
        let foundIndex = 0;
        for (let k = 0; k < rawLines.length; k++) {
          if (rawLines[k].trim() === lines[i]) {
            foundIndex = k;
            break;
          }
        }
        const checksum = findSha256Around(rawLines, foundIndex) || 'Checksum not found';
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
        const checksum = findSha256Around(rawLines, lineIndex) || 'Checksum not found';
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
      const fileEntries = extractFilesFromChunk(body, 'Unknown Device');
      fileEntries.forEach((e) => {
        const d = sanitizeDeviceName(e.deviceName);
        infoMap.set(e.fileName, { deviceName: d, checksum: e.checksum });
        infoMap.set(e.fileName.toLowerCase(), { deviceName: d, checksum: e.checksum });
      });
      return infoMap;
    }

    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : body.length;
      const chunk = body.substring(start, end);
      const rawDevice = headers[i].raw || 'Unknown Device';
      const device = sanitizeDeviceName(rawDevice);
      const fileEntries = extractFilesFromChunk(chunk, device);
      fileEntries.forEach((e) => {
        const key = e.fileName;
        infoMap.set(key, { deviceName: device, checksum: e.checksum });
        infoMap.set(key.toLowerCase(), { deviceName: device, checksum: e.checksum });
      });
    }

    return infoMap;
  }

  function initChecksumModals() {
    const modal = document.getElementById('checksumModal');
    const modalTitle = document.getElementById('modalFileName');
    const modalBody = document.getElementById('modalChecksumData');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (!modal || !modalTitle || !modalBody || !closeBtn) return;

    const openModalWith = (fileName, checksumRaw) => {
      modalTitle.textContent = fileName || 'File';
      const decoded = esc(checksumRaw || 'Checksum not found');
      modalBody.innerHTML = `
        <pre id="modalChecksumText" style="white-space: pre-wrap; user-select: text; margin:0; padding:8px; border-radius:6px; background:#f6f6f6;">${decoded}</pre>
        <div style="margin-top:8px;">
          <button id="modalCopyBtn" class="btn btn-primary">Copy checksum</button>
          <button id="modalCloseBtnInner" class="btn btn-secondary">Close</button>
        </div>
      `;
      modal.classList.add('show');

      const copyBtn = document.getElementById('modalCopyBtn');
      const closeInner = document.getElementById('modalCloseBtnInner');
      copyBtn?.addEventListener('click', async () => {
        const text = decodeHtml(decoded);
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = 'Copied ✓';
          setTimeout(() => (copyBtn.textContent = 'Copy checksum'), 1400);
        } catch {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.textContent = 'Copied ✓';
            setTimeout(() => (copyBtn.textContent = 'Copy checksum'), 1400);
          } catch {
            copyBtn.textContent = 'Copy failed';
          }
        }
      });

      closeInner?.addEventListener('click', () =>
        modal.classList.remove('show')
      );
    };

    document.addEventListener('click', (ev) => {
      const tgt = ev.target;
      if (!(tgt instanceof Element)) return;

      if (tgt.matches('.show-checksum-btn')) {
        const fileName = tgt.getAttribute('data-filename') || 'File';
        const checksum =
          tgt.getAttribute('data-checksum') || 'Checksum not found';
        openModalWith(fileName, checksum);
      }
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });
  }

  function renderLatestBlock(latestRows) {
    if (!latestRows.length) return `<p class="muted">No releases</p>`;

    const rowsHtml = latestRows
      .map(({ label, latest }) => {
        const pub = latest.published_at || latest.created_at;
        const tag = esc(latest.tag_name || latest.name || 'Untitled');
        const pubDate = fmtDate(pub);
        const assets = latest.assets || [];
        const assetsTotal = assets.reduce(
          (s, a) => s + (a.download_count || 0),
          0
        );

        const bodyInfoMap = parseReleaseBody(latest.body || '');

        let assetsHtml = '';
        if (assets.length) {
          assetsHtml =
            '<ul class="assets-grid">' +
            assets
              .map((a) => {
                const fileNameRaw = a.name || '';
                const fileName = esc(fileNameRaw);
                const dlCount = a.download_count ?? 0;
                const dlUrl = esc(a.browser_download_url || '');

                let meta =
                  bodyInfoMap.get(fileNameRaw) ||
                  bodyInfoMap.get(fileNameRaw.toLowerCase()) ||
                  null;
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
                    deviceName: 'Unknown Device',
                    checksum: 'Checksum not found',
                  };

                const deviceMeta = esc(meta.deviceName || 'Unknown Device');
                const checksumAttr = attrEscape(meta.checksum || 'Checksum not found');

                return `
                  <li class="asset-item">
                    <h3>${fileName}</h3>
                    <div class="asset-meta">[${deviceMeta}]</div>
                    <div class="asset-meta">${dlCount}x Downloads</div>
                    <div class="asset-actions">
                      <a href="${dlUrl}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Download</a>
                      <button type="button" class="btn btn-secondary show-checksum-btn" 
                        data-filename="${attrEscape(fileNameRaw)}" 
                        data-checksum="${checksumAttr}">
                        Show Checksum
                      </button>
                    </div>
                  </li>`;
              })
              .join('') +
            '</ul>';
        } else {
          assetsHtml = `<p class="muted">No assets</p>`;
        }

        return `
          <div class="release-section">
            <div class="release-header">
              <div>
                <h2>Build: ${tag}</h2>
                <p class="release-meta">Maintainer: <a href="https://github.com/${esc(
                  label
                )}" target="_blank" rel="noopener noreferrer">${esc(
          label
        )}</a><br/>
        Released: ${pubDate}
        </p>
              </div>
              <div class="release-total">
                ${assetsTotal}<span>x</span>
                <span class="release-total-label">Total Downloads</span>
              </div>
            </div>
            ${assetsHtml}
          </div>`;
      })
      .join('<hr class="dash" />');

    return rowsHtml;
  }

  function pickLatest(all) {
    if (!all || all.length === 0) return null;
    const sorted = all.slice().sort(byPublishedDesc);
    return sorted[0] || null;
  }

  async function main() {
    const latestEl = document.getElementById('latestBlock');
    if (!latestEl) return;

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
        d.latest._total_downloads = assets.reduce(
          (s, a) => s + (a.download_count || 0),
          0
        );
      });

      const grandTotal = latestRows.reduce(
        (s, d) => s + (d.latest._total_downloads || 0),
        0
      );

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

      initChecksumModals();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      latestEl.innerHTML = `<div class="err"><strong>Error:</strong> ${esc(
        msg
      )}</div>`;
    }
  }

  main();
})();
