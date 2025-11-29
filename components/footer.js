class MyFooter extends HTMLElement {
  connectedCallback() {
    const isSubPage = window.location.pathname.match(/\/(about|guides|disclaimer|changelogs|downloads)\//);
    const basePath = isSubPage ? '..' : '.';

    this.innerHTML = `
      <footer class="bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/5 pt-10 md:pt-16 pb-8 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 text-center md:text-left">
            <div class="mb-6 md:mb-0">
              <div class="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div class="w-10 h-10 bg-white dark:bg-[#0B1120] rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
                  <img src="${basePath}/src/pixelprop-logo-rc.png" />
                </div>
                <span class="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Pixel Prop Project</span>
              </div>
              <p class="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto md:mx-0 leading-relaxed">
                Open source Android modification project. <br />Designed for educational and enhancement purposes.
              </p>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 dark:text-slate-500 text-center md:text-left">
            <div class="mb-4 md:mb-0">
              &copy; ${new Date().getFullYear()} Pixel Prop Project. All rights reserved.
            </div>
            <div class="flex gap-4">
             <span>Maintained by 
                <a href="https://github.com/0x11DFE" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">0x11DFE</a>
              </span>
             <span>&bull;</span>
             <span>Website by 
               <a href="https://github.com/Elcapitanoe" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">Elcapitanoe</a>
             </span>
            </div>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('my-footer', MyFooter);