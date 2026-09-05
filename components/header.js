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
      { name: 'GitHub', link: 'https://github.com/Elcapitanoe/PixelProp-Website', target: '_blank' }
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

        const baseClasses = "relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors";
        const activeClasses = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-semibold";
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

    const sunIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
    const moonIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

    this.innerHTML = `
      <nav class="fixed w-full z-50 top-0 
                  bg-white/80 dark:bg-[#020617]/80 
                  backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 
                  transition-all duration-300 shadow-sm dark:shadow-black/20">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            
            <div class="flex items-center gap-2 md:gap-3 group cursor-pointer min-w-0" onclick="window.location.href='${basePath}/'">
              <div class="relative shrink-0 w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center border border-slate-200/60 dark:border-white/10">
                <img src="${basePath}/src/pixelprop-logo-rc-us.webp" class="w-7 h-7 object-contain" alt="Pixel Prop Logo" />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">Pixel Prop</span>
                <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Project</span>
              </div>
            </div>

            <div class="hidden md:flex items-center gap-1">
              ${renderDesktopLinks()}
            </div>

            <div class="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/5 ml-3">
              <button id="theme-toggle-desktop" class="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition focus:outline-none" aria-label="Toggle Theme">
                <span id="icon-sun-desktop" class="hidden">${sunIcon}</span>
                <span id="icon-moon-desktop" class="hidden">${moonIcon}</span>
              </button>

              <a href="${basePath}/downloads/" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5">
                Download
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </a>
            </div>

            <div class="md:hidden flex items-center gap-2 shrink-0">
              <button id="theme-toggle-mobile" class="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 transition active:scale-95" aria-label="Toggle Theme">
                 <span id="icon-sun-mobile" class="hidden">${sunIcon}</span>
                 <span id="icon-moon-mobile" class="hidden">${moonIcon}</span>
              </button>

              <button id="mobile-menu-btn" class="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition focus:outline-none active:scale-95" aria-label="Menu">
                <svg id="menu-icon-open" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
                <svg id="menu-icon-close" class="hidden w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
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
              <a href="${basePath}/downloads/" class="flex items-center justify-center w-full gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm active:scale-95 transition">
                Download Module
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
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
    const iconOpen = this.querySelector("#menu-icon-open");
    const iconClose = this.querySelector("#menu-icon-close");
    const isHidden = menu.classList.contains("hidden");

    if (isHidden) {
      menu.classList.remove("hidden");
      document.body.style.overflow = 'hidden';
      iconOpen.classList.add("hidden");
      iconClose.classList.remove("hidden");
    } else {
      this.closeMenu();
    }
  }

  closeMenu() {
    const menu = this.querySelector("#mobile-menu");
    const iconOpen = this.querySelector("#menu-icon-open");
    const iconClose = this.querySelector("#menu-icon-close");

    menu.classList.add("hidden");
    document.body.style.overflow = '';
    iconOpen.classList.remove("hidden");
    iconClose.classList.add("hidden");
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
