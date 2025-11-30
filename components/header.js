class MyHeader extends HTMLElement {
  connectedCallback() {
    const isSubPage = window.location.pathname.match(/\/(about|guides|disclaimer|changelogs|downloads)\//);
    const basePath = isSubPage ? '..' : '.';
    const currentPath = window.location.pathname;

    const menuItems = [
      { name: 'Home', link: `${basePath}/` },
      { name: 'About', link: `${basePath}/about/` },
      { name: 'Disclaimer', link: `${basePath}/disclaimer/` },
      { name: 'Guides', link: `${basePath}/guides/` },
      { name: 'Changelogs', link: `${basePath}/changelogs/` },
      { name: 'Source Code', link: 'https://github.com/Elcapitanoe/PixelProp-Website', target: '_blank' }
    ];

    const checkActive = (link) => {
      const cleanLink = link.replace(/^\.\.?\//, '');
      if (cleanLink === '') {
        return (currentPath.endsWith('/') || currentPath.endsWith('index.html')) && !isSubPage;
      }
      return currentPath.includes(cleanLink);
    };

    const renderDesktopLinks = () => {
      return menuItems.map(item => {
        const isActive = checkActive(item.link);

        const baseClasses = "relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out overflow-hidden group";
        const activeClasses = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(96,165,250,0.2)] ring-1 ring-blue-500/20 dark:ring-blue-400/20";
        const inactiveClasses = "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5";

        const className = isActive ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;

        return `
          <a href="${item.link}" ${item.target ? `target="${item.target}"` : ''} class="${className}">
             <span class="relative z-10">${item.name}</span>
          </a>
        `;
      }).join('');
    };

    const renderMobileLinks = () => {
      return menuItems.map(item => {
        const isActive = checkActive(item.link);

        const baseClasses = "flex items-center justify-between w-full px-5 py-4 text-base font-medium border-l-[3px] transition-all duration-300";
        const activeClasses = "border-blue-500 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-500/10 dark:to-transparent text-blue-700 dark:text-blue-400";
        const inactiveClasses = "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200";

        const className = isActive ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
        const arrowIcon = isActive
          ? `<svg class="w-4 h-4 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`
          : `<svg class="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;

        return `
          <a href="${item.link}" ${item.target ? `target="${item.target}"` : ''} class="${className}">
             <span>${item.name}</span>
             ${arrowIcon}
          </a>
        `;
      }).join('');
    };

    const sunIcon = `<svg class="w-5 h-5 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
    const moonIcon = `<svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;

    this.innerHTML = `
      <nav class="fixed w-full z-50 top-0 
                  bg-white/80 dark:bg-[#020617]/80 
                  backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 
                  transition-all duration-300 shadow-sm dark:shadow-black/20">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            
            <div class="flex items-center gap-2 md:gap-3 group cursor-pointer min-w-0" onclick="window.location.href='${basePath}/'">
              <div class="relative shrink-0">
                <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div class="relative w-10 h-10 bg-white dark:bg-[#0B1120] rounded-lg flex items-center justify-center shadow-sm ring-1 ring-slate-200 dark:ring-white/10">
                   <img src="${basePath}/src/pixelprop-logo-rc.png" />
                </div>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">Pixel Prop</span>
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-widest truncate">Project</span>
              </div>
            </div>

            <div class="hidden md:flex items-center gap-1">
              ${renderDesktopLinks()}
            </div>

            <div class="hidden md:flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-white/5 ml-4">
              <button id="theme-toggle-desktop" class="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50" aria-label="Toggle Theme">
                <span id="icon-sun-desktop" class="hidden">${sunIcon}</span>
                <span id="icon-moon-desktop" class="hidden">${moonIcon}</span>
              </button>

              <a href="${basePath}/downloads/" class="relative group overflow-hidden px-6 py-2.5 rounded-full bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span class="relative z-10 flex items-center gap-2">
                  Download
                  <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </span>
              </a>
            </div>

            <div class="md:hidden flex items-center gap-2 shrink-0">
              <button id="theme-toggle-mobile" class="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 transition active:scale-95">
                 <span id="icon-sun-mobile" class="hidden">${sunIcon}</span>
                 <span id="icon-moon-mobile" class="hidden">${moonIcon}</span>
              </button>

              <button id="mobile-menu-btn" class="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition focus:outline-none active:scale-95" aria-label="Menu">
                <div class="w-6 h-5 flex flex-col justify-between" id="hamburger-icon">
                  <span class="block w-full h-0.5 bg-current rounded-full transition-all duration-300 origin-left"></span>
                  <span class="block w-full h-0.5 bg-current rounded-full transition-all duration-300"></span>
                  <span class="block w-full h-0.5 bg-current rounded-full transition-all duration-300 origin-left"></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div id="mobile-menu" class="hidden md:hidden absolute w-full left-0 top-[80px] h-[calc(100dvh-80px)] bg-white/95 dark:bg-[#020617]/95 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5 shadow-2xl origin-top transition-all duration-300 overflow-y-auto">
          <div class="flex flex-col h-full">
            <div class="flex-1 py-4 space-y-1">
              ${renderMobileLinks()}
            </div>
            
            <div class="px-6 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] mt-auto border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <a href="${basePath}/downloads/" class="flex items-center justify-center w-full gap-2 px-6 py-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-transform">
                Download Module
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </a>
              <p class="text-center text-xs text-slate-400 dark:text-slate-600 mt-4 font-medium">Pixel Prop Project &copy; ${new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </nav>
    `;

    this.initializeEvents();
    this.updateIcons();
  }

  initializeEvents() {
    this.addEventListener('click', (e) => {
      const btnMenu = e.target.closest('#mobile-menu-btn');
      const link = e.target.closest('a');
      const btnTheme = e.target.closest('#theme-toggle-desktop') || e.target.closest('#theme-toggle-mobile');

      if (btnMenu) {
        this.toggleMenu();
      }

      if (link && this.querySelector('#mobile-menu').contains(link)) {
        this.closeMenu();
      }

      if (btnTheme) {
        this.toggleTheme();
      }
    });
  }

  toggleMenu() {
    const menu = this.querySelector("#mobile-menu");
    const spans = this.querySelectorAll("#hamburger-icon span");
    const isHidden = menu.classList.contains("hidden");

    if (isHidden) {
      menu.classList.remove("hidden");
      document.body.style.overflow = 'hidden';
      spans[0].classList.add("rotate-45", "translate-x-px");
      spans[1].classList.add("opacity-0", "translate-x-2");
      spans[2].classList.add("-rotate-45", "translate-x-px");
    } else {
      this.closeMenu();
    }
  }

  closeMenu() {
    const menu = this.querySelector("#mobile-menu");
    const spans = this.querySelectorAll("#hamburger-icon span");

    menu.classList.add("hidden");
    document.body.style.overflow = '';
    spans[0].classList.remove("rotate-45", "translate-x-px");
    spans[1].classList.remove("opacity-0", "translate-x-2");
    spans[2].classList.remove("-rotate-45", "translate-x-px");
  }

  toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
    this.updateIcons();
  }

  updateIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const targets = [
      { sun: '#icon-sun-desktop', moon: '#icon-moon-desktop' },
      { sun: '#icon-sun-mobile', moon: '#icon-moon-mobile' }
    ];

    targets.forEach(t => {
      const sun = this.querySelector(t.sun);
      const moon = this.querySelector(t.moon);
      if (sun && moon) {
        if (isDark) {
          sun.classList.remove('hidden');
          moon.classList.add('hidden');
        } else {
          sun.classList.add('hidden');
          moon.classList.remove('hidden');
        }
      }
    });
  }
}

customElements.define('my-header', MyHeader);