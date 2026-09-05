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
    "yogi": "Pixel 11 Pro Fold",
    "kodiak": "Pixel 11 Pro XL",
    "grizzly": "Pixel 11 Pro",
    "cubs": "Pixel 11",
    "rango": "Pixel 10 Pro Fold",
    "mustang": "Pixel 10 Pro XL",
    "blazer": "Pixel 10 Pro",
    "frankel": "Pixel 10",
    "stallion": "Pixel 10a",
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

  async function fetchRecentReleases(owner, repo, count = 2) {
    const headers = { "Accept": "application/vnd.github+json" };
    const token = localStorage.getItem("GH_TOKEN");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=${count}`, {
      headers
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`API Error ${res.status}`);
    }
    return res.json();
  }

  function getChecksum(asset, body) {
    if (asset.digest) {
      return asset.digest.replace(/^sha256:/, "");
    }

    if (body) {
      const sha256Regex = /\b[a-fA-F0-9]{64}\b/;
      const lines = body.split("\n");
      const targetLine = lines.find(line => line.includes(asset.name) && sha256Regex.test(line));
      if (targetLine) {
        const match = targetLine.match(sha256Regex);
        if (match) return match[0];
      }
    }

    return "Checksum not found";
  }

  function detectDevice(filename) {
    const lowerName = filename.toLowerCase();
    for (const [codename, marketName] of Object.entries(DEVICE_MAP)) {
      if (lowerName.includes(codename)) {
        return { codename, marketName };
      }
    }
    const clean = filename.replace(/\.zip$/i, "");
    return { codename: clean, marketName: clean };
  }

  function mergeReleases(releases) {
    if (!releases || !releases.length) return null;

    const latestRelease = releases[0];
    const deviceMap = new Map();

    releases.forEach((rel, index) => {
      const isLatest = index === 0;
      const assets = rel.assets || [];

      assets.forEach((asset) => {
        const { codename, marketName } = detectDevice(asset.name || "");
        const key = codename.toLowerCase();

        // Keep newer build if device appears in multiple releases
        if (!deviceMap.has(key)) {
          deviceMap.set(key, {
            asset,
            release: rel,
            isLatest,
            marketName,
            checksum: getChecksum(asset, rel.body)
          });
        }
      });
    });

    const deviceOrder = Object.values(DEVICE_MAP);
    const mergedAssets = Array.from(deviceMap.values()).sort((a, b) => {
      const idxA = deviceOrder.indexOf(a.marketName);
      const idxB = deviceOrder.indexOf(b.marketName);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.marketName.localeCompare(b.marketName);
    });

    const totalDownloads = releases.reduce((sum, rel) => {
      const assets = rel.assets || [];
      return sum + assets.reduce((s, a) => s + (a.download_count || 0), 0);
    }, 0);

    return {
      latestRelease,
      mergedAssets,
      totalDownloads
    };
  }

  function renderReleaseBlock(dataList) {
    if (!dataList.length) {
      return `<div class="p-6 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-center border border-red-100 dark:border-red-500/20 text-sm">No releases found.</div>`;
    }

    return dataList.map(({ label, releases, type }) => {
      const merged = mergeReleases(releases);
      if (!merged) return "";

      const { mergedAssets, totalDownloads } = merged;
      const channelTitle = type === "beta" ? "Beta Channel" : "Stable Channel";

      let assetsHtml = "";
      if (mergedAssets.length) {
        assetsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">' +
          mergedAssets.map(({ asset, release, isLatest, marketName, checksum }) => {
            const fileNameRaw = asset.name || "";
            const fileName = esc(fileNameRaw);
            const dlUrl = esc(asset.browser_download_url);
            const dlCount = asset.download_count || 0;
            const releaseTag = esc(release.tag_name);

            const statusBadge = isLatest
              ? `<span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/30">Latest</span>`
              : `<span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">Previous</span>`;

            return `
            <div class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md dark:hover:shadow-blue-500/5 transition duration-300 flex flex-col justify-between group h-full">
              <div class="mb-4">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight truncate" title="${esc(marketName)}">${esc(marketName)}</h3>
                  <div class="shrink-0">
                    ${statusBadge}
                  </div>
                </div>

                <div class="space-y-1.5">
                   <div class="flex items-start gap-2 text-xs">
                      <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span class="font-mono text-slate-800 dark:text-slate-200 break-all leading-snug">${fileName}</span>
                   </div>
                   <div class="flex items-center gap-2 text-xs">
                      <svg class="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                      <span class="font-mono text-slate-800 dark:text-slate-200 leading-none">${releaseTag}</span>
                   </div>
                   <div class="flex items-center gap-2 text-xs">
                      <svg class="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      <span class="font-mono text-slate-800 dark:text-slate-200 leading-none">${dlCount.toLocaleString()} downloads</span>
                   </div>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-4 border-t border-slate-200/60 dark:border-white/10 mt-auto">
                <a href="${dlUrl}" class="flex-1 text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-500/20 active:scale-95" target="_blank">Download</a>
                <button type="button" class="px-3 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-mono font-medium rounded-lg transition show-checksum-btn active:scale-95" 
                  data-filename="${attrEscape(fileName)}" 
                  data-checksum="${attrEscape(checksum)}">SHA-256</button>
              </div>
            </div>`;
          }).join("") + '</div>';
      } else {
        assetsHtml = `<div class="text-center py-10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 rounded-2xl mt-6 border border-dashed border-slate-200 dark:border-white/10 text-sm">No assets available.</div>`;
      }

      return `
      <div class="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg dark:hover:shadow-none transition duration-300 mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">${channelTitle}</h2>
            <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400">
               Maintained by <span class="font-medium text-slate-700 dark:text-slate-300">${esc(label)}</span> &bull; ${mergedAssets.length} devices available
            </p>
          </div>
          <div class="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 self-start sm:self-center shrink-0">
             <span class="text-sm font-bold text-slate-900 dark:text-white leading-none">${totalDownloads.toLocaleString()}</span>
             <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">downloads</span>
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
      backdrop: document.getElementById("modalBackdrop"),
      fileInput: document.getElementById("fileVerifierInput"),
      dropZone: document.getElementById("dropZone"),
      result: document.getElementById("verifierResult"),
      promptText: document.getElementById("verifierPromptText")
    };

    let targetChecksum = "";

    const resetVerifier = () => {
      if (elements.fileInput) elements.fileInput.value = "";
      if (elements.result) {
        elements.result.className = "hidden mt-2 p-3 rounded-xl border text-xs font-mono";
        elements.result.innerHTML = "";
      }
      if (elements.promptText) {
        elements.promptText.innerHTML = `<strong class="font-semibold text-slate-900 dark:text-white">Choose .zip file</strong> or drag & drop`;
      }
    };

    const closeModal = () => {
      modal.classList.add("hidden");
      resetVerifier();
    };

    const computeSHA256 = async (file) => {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    };

    const handleFileVerification = async (file) => {
      if (!file || !elements.result) return;
      
      elements.promptText.innerHTML = `Scanning: <span class="font-mono text-slate-900 dark:text-white">${file.name}</span>`;
      elements.result.className = "mt-2 p-3 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 text-xs font-mono text-blue-700 dark:text-blue-400";
      elements.result.textContent = "Computing SHA-256 hash...";
      elements.result.classList.remove("hidden");

      try {
        const computedHash = await computeSHA256(file);
        const isMatch = computedHash.toLowerCase() === targetChecksum.trim().toLowerCase();

        if (isMatch) {
          elements.result.className = "mt-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 text-xs font-mono text-emerald-800 dark:text-emerald-300 space-y-1";
          elements.result.innerHTML = `
            <div class="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              Verified Authentic
            </div>
            <div class="text-[11px] text-emerald-700 dark:text-emerald-400/90 break-all select-all">${computedHash}</div>
          `;
        } else {
          elements.result.className = "mt-2 p-3 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 text-xs font-mono text-rose-800 dark:text-rose-300 space-y-1";
          elements.result.innerHTML = `
            <div class="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Checksum Mismatch
            </div>
            <div class="text-[11px] text-rose-700 dark:text-rose-400/90 break-all select-all">${computedHash}</div>
          `;
        }
      } catch (err) {
        elements.result.className = "mt-2 p-3 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-xs font-mono text-rose-700 dark:text-rose-400";
        elements.result.textContent = `Error: ${err.message || "Failed to read file"}`;
      }
    };

    if (elements.fileInput) {
      elements.fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileVerification(e.target.files[0]);
        }
      });
    }

    if (elements.dropZone) {
      ["dragenter", "dragover"].forEach(evt => {
        elements.dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          elements.dropZone.classList.add("border-blue-500", "bg-blue-50/50", "dark:bg-blue-500/10");
        });
      });
      ["dragleave", "drop"].forEach(evt => {
        elements.dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          elements.dropZone.classList.remove("border-blue-500", "bg-blue-50/50", "dark:bg-blue-500/10");
        });
      });
      elements.dropZone.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileVerification(e.dataTransfer.files[0]);
        }
      });
    }

    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".show-checksum-btn");
      if (btn) {
        targetChecksum = btn.dataset.checksum || "";
        elements.title.textContent = btn.dataset.filename;
        elements.body.textContent = targetChecksum;
        resetVerifier();
        modal.classList.remove("hidden");

        const copyBtn = document.getElementById("modalCopyBtn");
        const newBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newBtn, copyBtn);

        newBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(targetChecksum);
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
          const releases = await fetchRecentReleases(src.owner, src.repo, 2);
          return releases && releases.length ? { ...src, releases } : null;
        } catch (e) {
          console.error(`Skipping ${src.repo}:`, e);
          return null;
        }
      });

      const results = (await Promise.all(promises)).filter(Boolean);
      results.sort((a, b) => {
        const dateA = a.releases[0] ? new Date(a.releases[0].published_at) : 0;
        const dateB = b.releases[0] ? new Date(b.releases[0].published_at) : 0;
        return dateB - dateA;
      });

      latestEl.innerHTML = renderReleaseBlock(results);
      initChecksumModals();

    } catch (err) {
      console.error(err);
      latestEl.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-xl text-center">System Error: ${esc(err.message)}</div>`;
    }
  }

  main();
})();
