/**
 * PIXELVERSE — Settings, Theme & Motion Preferences Manager
 * Synchronizes site.json theme colors to CSS custom properties,
 * respects prefers-reduced-motion, and persists optional user preferences in localStorage.
 */

const STORAGE_KEY_MOTION = 'pixelverse_motion_enabled';

export class SettingsManager {
  /**
   * @param {object} siteData Normalized data from data-loader.js
   */
  constructor(siteData) {
    this.siteData = siteData;
    this.listeners = new Set();

    // Check OS-level reduced motion preference
    this.mediaQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false, addEventListener: null };

    this.osPrefersReduced = Boolean(this.mediaQuery.matches);
    this.configAnimationEnabled = siteData.animation?.enabled !== false;

    // Determine initial animation state:
    // Priority: User explicit toggle in localStorage -> OS prefers-reduced-motion -> site.json animation.enabled
    const savedPref = this.readSavedPreference();
    if (savedPref !== null) {
      this.motionEnabled = savedPref;
    } else if (this.osPrefersReduced) {
      this.motionEnabled = false;
    } else {
      this.motionEnabled = this.configAnimationEnabled;
    }

    this.applyThemeVariables(siteData.theme);
    this.applyDocumentMetadata(siteData.site);
    this.applyMotionState();
    this.bindMediaQueryListener();
  }

  /**
   * Reads saved boolean preference from localStorage safely.
   * @returns {boolean|null}
   */
  readSavedPreference() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_MOTION);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Persists user's motion toggle choice in localStorage.
   * @param {boolean} enabled
   */
  savePreference(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY_MOTION, String(Boolean(enabled)));
    } catch {
      // Ignore storage quota or private-mode restrictions gracefully
    }
  }

  /**
   * Applies theme colors from site.json to :root CSS custom properties.
   * @param {object} theme
   */
  applyThemeVariables(theme) {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primary) root.style.setProperty('--color-primary', theme.primary);
    if (theme.secondary) root.style.setProperty('--color-secondary', theme.secondary);
    if (theme.accent) root.style.setProperty('--color-accent', theme.accent);
    if (theme.background) root.style.setProperty('--color-bg', theme.background);
    if (theme.surface) root.style.setProperty('--color-surface', theme.surface);
    if (theme.text) root.style.setProperty('--color-text', theme.text);
    if (theme.muted) root.style.setProperty('--color-muted', theme.muted);
  }

  /**
   * Synchronizes document title, language, meta description, and favicon with site.json.
   * @param {object} site
   */
  applyDocumentMetadata(site) {
    if (!site) return;

    if (site.language) {
      document.documentElement.lang = site.language;
    }
    if (site.title) {
      document.title = site.title;
    }
    if (site.description) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', site.description);
    }
    if (site.favicon) {
      let iconLink = document.querySelector('link[rel="icon"]');
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.setAttribute('rel', 'icon');
        iconLink.setAttribute('type', 'image/svg+xml');
        document.head.appendChild(iconLink);
      }
      iconLink.setAttribute('href', site.favicon);
    }
  }

  /**
   * Updates body class and notifies subscribers when motion state changes.
   */
  applyMotionState() {
    document.body.classList.toggle('motion-disabled', !this.motionEnabled);
    for (const callback of this.listeners) {
      callback(this.motionEnabled);
    }
  }

  /**
   * Toggles animation on or off and persists the setting.
   * @returns {boolean} New motionEnabled state
   */
  toggleMotion() {
    this.motionEnabled = !this.motionEnabled;
    this.savePreference(this.motionEnabled);
    this.applyMotionState();
    return this.motionEnabled;
  }

  /**
   * Subscribes to motion state changes.
   * @param {(enabled: boolean) => void} callback
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
  }

  /**
   * Listens for OS-level prefers-reduced-motion changes at runtime.
   */
  bindMediaQueryListener() {
    if (typeof this.mediaQuery.addEventListener === 'function') {
      this.mediaQuery.addEventListener('change', (e) => {
        this.osPrefersReduced = Boolean(e.matches);
        if (this.osPrefersReduced) {
          this.motionEnabled = false;
          this.applyMotionState();
        }
      });
    }
  }
}
