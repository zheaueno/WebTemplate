/**
 * PIXELVERSE — Navigation, Warp Speed Controls & Pixel Microinteractions
 * Handles single-page section navigation, hash synchronization, IntersectionObserver
 * active-section highlighting, Warp Speed triggers, spaceship cursor response,
 * and reusable pixel particle bursts.
 */

export class InteractionController {
  /**
   * @param {object} siteData
   * @param {import('./settings.js').SettingsManager} settings
   * @param {import('./spaceflight.js').SpaceflightEngine} spaceflight
   */
  constructor(siteData, settings, spaceflight) {
    this.data = siteData;
    this.settings = settings;
    this.spaceflight = spaceflight;
    this.sectionObserver = null;
    this.activeSectionId = 'home';

    // Reusable pool of DOM sparkle particles to prevent GC churn
    this.particlePool = [];
    this.maxPoolSize = 18;

    this.init();
  }

  init() {
    this.bindHudControls();
    this.bindInternalNavigation();
    this.setupSectionObserver();
    this.bindPointerInteractions();
    this.handleInitialHash();
  }

  /**
   * Binds the Warp Speed button, Spaceship Companion button, and Motion Toggle button.
   */
  bindHudControls() {
    const warpBtn = document.getElementById('warp-speed-btn');
    const warpLabel = document.getElementById('warp-speed-label');
    const shipBtn = document.getElementById('spaceship-companion-btn');
    const shipLabel = document.getElementById('spaceship-dock-label');
    const motionBtn = document.getElementById('motion-toggle-btn');
    const motionLabel = document.getElementById('motion-toggle-label');

    const syncWarpUI = (isWarping) => {
      if (warpBtn) {
        warpBtn.classList.toggle('is-warping', isWarping);
        warpBtn.setAttribute('aria-pressed', String(isWarping));
      }
      if (warpLabel) {
        warpLabel.textContent = isWarping ? 'WARPING...' : 'WARP SPEED';
      }
      if (shipBtn) {
        shipBtn.classList.toggle('is-warping', isWarping);
        shipBtn.setAttribute('aria-pressed', String(isWarping));
      }
      if (shipLabel) {
        shipLabel.textContent = isWarping ? 'WARPING...' : 'ENGAGE WARP';
      }
    };

    const syncMotionUI = (motionEnabled) => {
      if (motionBtn) {
        motionBtn.setAttribute('aria-pressed', String(motionEnabled));
      }
      if (motionLabel) {
        motionLabel.textContent = motionEnabled ? 'MOTION: ON' : 'MOTION: OFF';
      }
      if (!motionEnabled) {
        syncWarpUI(false);
      }
    };

    // Initialize button state from SettingsManager
    syncMotionUI(this.settings.motionEnabled);
    this.settings.onChange((enabled) => {
      this.spaceflight.setMotionEnabled(enabled);
      syncMotionUI(enabled);
    });

    const handleEngageWarp = (event) => {
      // If motion was turned off, enable it when user explicitly clicks Warp Speed
      if (!this.settings.motionEnabled) {
        this.settings.toggleMotion();
      }
      this.spaceflight.triggerWarpSpeed(syncWarpUI);
      if (event && event.currentTarget instanceof HTMLElement) {
        const rect = event.currentTarget.getBoundingClientRect();
        this.spawnSparkleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    if (warpBtn) {
      warpBtn.addEventListener('click', handleEngageWarp);
    }

    if (shipBtn) {
      shipBtn.addEventListener('click', handleEngageWarp);
    }

    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        this.settings.toggleMotion();
      });
    }
  }

  /**
   * Binds internal anchor clicks (`#home`, `#about`, `#projects`, `#contact`)
   * for smooth scrolling, URL hash synchronization, and keyboard focus management.
   */
  bindInternalNavigation() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href === '#') return;

      const sectionId = href.slice(1);
      const sectionEl = document.getElementById(sectionId);
      if (!sectionEl) return;

      event.preventDefault();
      this.navigateToSection(sectionId, { updateHistory: true });
    });

    // Browser Back/Forward hash navigation support
    window.addEventListener('hashchange', () => {
      const hashId = window.location.hash.replace(/^#/, '');
      if (hashId && document.getElementById(hashId)) {
        this.navigateToSection(hashId, { updateHistory: false });
      } else if (!hashId) {
        this.navigateToSection('home', { updateHistory: false });
      }
    });
  }

  /**
   * Scrolls to the target section, updates URL hash, and sets active nav state.
   * @param {string} sectionId
   * @param {object} [options]
   * @param {boolean} [options.updateHistory=true]
   */
  navigateToSection(sectionId, { updateHistory = true } = {}) {
    const sectionEl = document.getElementById(sectionId);
    if (!sectionEl) return;

    const behavior = this.settings.motionEnabled ? 'smooth' : 'auto';
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior });
    } else {
      sectionEl.scrollIntoView({ behavior, block: 'start' });
    }

    if (updateHistory) {
      const newHash = `#${sectionId}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }
    }

    this.setActiveNavSection(sectionId);
  }

  /**
   * Updates active navigation indicator across all `[data-section-link]` anchors.
   * @param {string} sectionId
   */
  setActiveNavSection(sectionId) {
    this.activeSectionId = sectionId;
    const navLinks = document.querySelectorAll('.hud-nav__link[data-section-link]');
    for (const link of navLinks) {
      const isMatch = link.getAttribute('data-section-link') === sectionId;
      link.classList.toggle('is-active', isMatch);
      if (isMatch) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  /**
   * Uses IntersectionObserver to automatically highlight the current navigation item
   * as the user scrolls through sections.
   */
  setupSectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    const sections = document.querySelectorAll('.game-section[id]');
    if (sections.length === 0) return;

    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            if (id) {
              this.setActiveNavSection(id);
            }
          }
        }
      },
      {
        root: null,
        rootMargin: '-25% 0px -55% 0px',
        threshold: 0.05
      }
    );

    for (const sec of sections) {
      this.sectionObserver.observe(sec);
    }
  }

  /**
   * Handles deep-link loading when the page opens directly with `#about`, `#projects`, etc.
   */
  handleInitialHash() {
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (!rawHash) return;

    const targetEl = document.getElementById(rawHash);
    if (targetEl) {
      window.requestAnimationFrame(() => {
        this.navigateToSection(rawHash, { updateHistory: false });
      });
    }
  }

  /**
   * Binds cursor parallax for the spaceflight engine and subtle tilt for the spaceship sprite,
   * plus click feedback and pixel sparkle bursts on link cards.
   */
  bindPointerInteractions() {
    const shipSprite = document.querySelector('.spaceship-btn__sprite');

    window.addEventListener(
      'pointermove',
      (e) => {
        if (!this.settings.motionEnabled) return;
        this.spaceflight.setPointerPosition(e.clientX, e.clientY);

        if (shipSprite && window.innerWidth >= 768) {
          const normX = (e.clientX / window.innerWidth) - 0.5;
          const tiltDeg = Math.round(normX * 14);
          shipSprite.style.transform = `rotate(${tiltDeg}deg)`;
        }
      },
      { passive: true }
    );

    // Brief pressed state and pixel sparkle particles on interactive cards & buttons
    document.addEventListener('pointerdown', (e) => {
      const card = e.target instanceof Element
        ? e.target.closest('.link-card, .project-link-btn, .channel-card, .profile-cta')
        : null;
      if (!card) return;

      card.classList.add('is-pressed');
      window.setTimeout(() => card.classList.remove('is-pressed'), 160);

      if (this.settings.motionEnabled && this.data.animation?.particleEffects !== false) {
        this.spawnSparkleBurst(e.clientX, e.clientY);
      }
    });
  }

  /**
   * Spawns a small burst of reusable pixel-art particles at (x, y).
   * Reuses pooled DOM elements to avoid allocation overhead.
   * @param {number} x
   * @param {number} y
   */
  spawnSparkleBurst(x, y) {
    if (!this.settings.motionEnabled || this.data.animation?.particleEffects === false) return;

    const colors = [
      this.data.theme?.secondary || '#64E9FF',
      this.data.theme?.accent || '#FF77C8',
      '#FFE59A',
      this.data.theme?.primary || '#9775FA'
    ];

    const count = 6;
    for (let i = 0; i < count; i++) {
      const el = this.getPooledParticle();
      const angle = (Math.PI * 2 * i) / count;
      const dist = 18 + Math.random() * 18;
      const dx = Math.round(Math.cos(angle) * dist);
      const dy = Math.round(Math.sin(angle) * dist);

      el.style.backgroundColor = colors[i % colors.length];
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.style.opacity = '1';
      el.style.transform = 'translate(0, 0) scale(1)';

      // Trigger layout & transition on next frame
      window.requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
        el.style.opacity = '0';
      });
    }
  }

  /**
   * Retrieves or creates a pooled sparkle DOM node.
   * @returns {HTMLElement}
   */
  getPooledParticle() {
    if (this.particlePool.length < this.maxPoolSize) {
      const node = document.createElement('span');
      node.className = 'pixel-sparkle-particle';
      node.setAttribute('aria-hidden', 'true');
      document.body.appendChild(node);
      this.particlePool.push(node);
      return node;
    }

    const recycled = this.particlePool.shift();
    this.particlePool.push(recycled);
    return recycled;
  }
}
