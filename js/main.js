/**
 * PIXELVERSE — Application Entry Point & Bootstrapper
 * Coordinates JSON data loading, link resolution, content rendering,
 * theme/motion settings, spaceflight canvas animation, and error recovery.
 */

import { loadSiteData } from './data-loader.js';
import { LinkResolver } from './link-resolver.js';
import { SettingsManager } from './settings.js';
import { ContentRenderer } from './content-renderer.js';
import { SpaceflightEngine } from './spaceflight.js';
import { InteractionController } from './interactions.js';

let activeSpaceflight = null;

/**
 * Initializes the Pixelverse application.
 */
async function initPixelverse() {
  const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('spaceflight-canvas'));

  try {
    // 1. Load and validate centralized JSON content
    const siteData = await loadSiteData('./data/site.json');

    // 2. Initialize Settings & Theme Manager
    const settings = new SettingsManager(siteData);

    // 3. Initialize Centralized Link Resolver
    const resolver = new LinkResolver(siteData);

    // 4. Render all UI components from JSON
    const renderer = new ContentRenderer(siteData, resolver);
    renderer.renderAll();

    // 5. Initialize Procedural Pixel-Art Spaceflight Background
    if (canvas && !activeSpaceflight) {
      activeSpaceflight = new SpaceflightEngine(
        canvas,
        siteData.animation,
        siteData.theme,
        settings.motionEnabled
      );
    } else if (activeSpaceflight) {
      activeSpaceflight.setMotionEnabled(settings.motionEnabled);
    }

    // 6. Attach Navigation, Warp Speed, and Microinteractions
    if (activeSpaceflight) {
      new InteractionController(siteData, settings, activeSpaceflight);
    }
  } catch (err) {
    console.error('[Pixelverse Initialization Error]', err);

    // Render fallback static stars on canvas so the background still looks cohesive
    if (canvas && !activeSpaceflight) {
      activeSpaceflight = new SpaceflightEngine(
        canvas,
        { enabled: false, starCount: 120, planets: true, adaptiveQuality: true },
        {
          primary: '#9775FA',
          secondary: '#64E9FF',
          accent: '#FF77C8',
          background: '#080B1A',
          text: '#F4F6FF',
          muted: '#99A6CC'
        },
        false
      );
    }

    // Display accessible error state with retry button (never fabricates user profile data)
    ContentRenderer.renderErrorState(
      err instanceof Error ? err.message : String(err),
      () => {
        initPixelverse();
      }
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPixelverse);
} else {
  initPixelverse();
}
