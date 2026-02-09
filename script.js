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

const DEVICE_MAP = {
  "rango": "Pixel 10 Pro Fold",
  "frankel": "Pixel 10 Pro XL",
  "blazer": "Pixel 10 Pro",
  "mustang": "Pixel 10",
  "comet": "Pixel 9 Pro Fold",
  "komodo": "Pixel 9 Pro XL",
  "caiman": "Pixel 9 Pro",
  "tokay": "Pixel 9",
  "tegu": "Pixel 9a",
  "felix": "Pixel Fold",
  "husky": "Pixel 8 Pro",
  "shiba": "Pixel 8",
  "akita": "Pixel 8a",
  "cheetah": "Pixel 7 Pro",
  "panther": "Pixel 7",
  "lynx": "Pixel 7a",
  "tangorpro": "Pixel Tablet",
  "raven": "Pixel 6 Pro",
  "oriole": "Pixel 6",
  "bluejay": "Pixel 6a",
  "redfin": "Pixel 5",
  "barbet": "Pixel 5a",
  "coral": "Pixel 4 XL",
  "flame": "Pixel 4",
  "bramble": "Pixel 4a (5G)",
  "sunfish": "Pixel 4a",
  "crosshatch": "Pixel 3 XL",
  "blueline": "Pixel 3",
  "bonito": "Pixel 3a XL",
  "sargo": "Pixel 3a",
  "taimen": "Pixel 2 XL",
  "walleye": "Pixel 2",
  "marlin": "Pixel XL",
  "sailfish": "Pixel",
  "ryu": "Pixel C"
};

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const attrEscape = (s) => String(s ?? "").replace(/"/g, "&quot;");

  const fmtDate = (s) => {
    try {
      return new Date(s).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    } catch { return s || ""; }
  };

  async function fetchLatestRelease(owner, repo) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: { "Accept": "application/vnd.github+json" }
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`API Error ${res.status}`);
    }
    return res.json();
  }

  function getChecksum(asset, body) {
    if (asset.digest) {
      return asset.digest.replace(/^sha256:/, '');
    }

    if (body) {
      const sha256Regex = /\b[a-fA-F0-9]{64}\b/;
      const lines = body.split('\n');
      const targetLine = lines.find(line => line.includes(asset.name) && sha256Regex.test(line));
      if (targetLine) {
        const match = targetLine.match(sha256Regex);
        if (match) return match[0];
      }
    }

    return "Checksum not found";
  }

  function detectDeviceName(filename) {
    const lowerName = filename.toLowerCase();
    for (const [codename, marketName] of Object.entries(DEVICE_MAP)) {
      if (lowerName.includes(codename)) {
        return marketName;
      }
    }
    return "Universal / Unknown";
  }

  function renderLatestBlock(dataList) {
    if (!dataList.length) {
      return `<div class="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-center border border-red-100 dark:border-red-500/20 text-sm">No releases found.</div>`;
    }

    return dataList.map(({ label, release, type }) => {
      const pubDate = fmtDate(release.published_at);
      const tag = esc(release.tag_name);
      const assets = release.assets || [];
      const assetsTotal = assets.reduce((s, a) => s + (a.download_count || 0), 0);

      const badgeHtml = type === "beta"
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wide">Beta</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 uppercase tracking-wide">Stable</span>`;

      let assetsHtml = "";
      if (assets.length) {
        assetsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">' +
          assets.map(a => {
            const fileNameRaw = a.name || "";
            const fileName = esc(fileNameRaw);
            const dlUrl = esc(a.browser_download_url);
            const dlCount = a.download_count || 0;
            
            const checksum = getChecksum(a, release.body);
            const deviceName = detectDeviceName(fileNameRaw);

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
                      <span class="truncate font-medium text-slate-700 dark:text-slate-300">${deviceName}</span>
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
                  data-filename="${attrEscape(fileName)}" 
                  data-checksum="${attrEscape(checksum)}">Hash</button>
              </div>
            </div>`;
          }).join("") + '</div>';
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
               By <a href="https://github.com/${esc(label)}" target="_blank" class="font-medium text-blue-600 dark:text-blue-400 hover:underline">${esc(label)}</a> &bull; ${pubDate}
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
    }).join("");
  }

  function initChecksumModals() {
    const modal = document.getElementById("checksumModal");
    if (!modal) return;
    
    const elements = {
      title: document.getElementById("modalFileName"),
      body: document.getElementById("modalChecksumData"),
      close: document.getElementById("modalCloseBtn"),
      backdrop: document.getElementById("modalBackdrop")
    };

    const closeModal = () => modal.classList.add("hidden");
    
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".show-checksum-btn");
      if (btn) {
        elements.title.textContent = btn.dataset.filename;
        elements.body.textContent = btn.dataset.checksum;
        modal.classList.remove("hidden");

        const copyBtn = document.getElementById("modalCopyBtn");
        const newBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newBtn, copyBtn);

        newBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(btn.dataset.checksum);
            const originalText = newBtn.textContent;
            newBtn.textContent = "Copied ✓";
            newBtn.classList.add("bg-green-600", "text-white");
            setTimeout(() => {
              newBtn.textContent = originalText;
              newBtn.classList.remove("bg-green-600", "text-white");
            }, 1500);
          } catch {
            newBtn.textContent = "Failed";
          }
        });
      }
    });

    elements.close.addEventListener("click", closeModal);
    if (elements.backdrop) elements.backdrop.addEventListener("click", closeModal);
  }

  async function main() {
    const latestEl = document.getElementById("latestBlock");
    if (!latestEl) return;

    try {
      const promises = SOURCES.map(async (src) => {
        try {
          const release = await fetchLatestRelease(src.owner, src.repo);
          return release ? { ...src, release } : null;
        } catch (e) {
          console.error(`Skipping ${src.repo}:`, e);
          return null;
        }
      });

      const results = (await Promise.all(promises)).filter(Boolean);
      results.sort((a, b) => new Date(b.release.published_at) - new Date(a.release.published_at));

      latestEl.innerHTML = renderLatestBlock(results);
      initChecksumModals();
      
    } catch (err) {
      console.error(err);
      latestEl.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-xl text-center">System Error: ${esc(err.message)}</div>`;
    }
  }

  main();
})();
