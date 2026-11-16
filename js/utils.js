/**
 * PIXELVERSE — Utility Helpers & Safe DOM Construction
 * Ensures zero XSS surface area, strict URL sanitization, and crisp pixel icons.
 */

const SAFE_URL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

const KNOWN_ICON_FILES = new Set([
  'github',
  'discord',
  'instagram',
  'youtube',
  'linkedin',
  'email',
  'portfolio',
  'external'
]);

/**
 * Validates whether a string is a safe, non-empty string.
 * @param {unknown} val
 * @returns {boolean}
 */
export function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Validates a hex or standard named CSS color.
 * @param {unknown} color
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeColor(color, fallback = '#9775FA') {
  if (!isNonEmptyString(color)) return fallback;
  const trimmed = color.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^(green|yellow|red|cyan|purple|pink|blue|white)$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

/**
 * Sanitizes external URLs or relative asset paths.
 * Rejects javascript:, data:, vbscript:, or malformed schemes.
 * @param {unknown} rawUrl
 * @param {object} [options]
 * @param {boolean} [options.allowRelative=false]
 * @returns {string|null}
 */
export function sanitizeUrl(rawUrl, { allowRelative = false } = {}) {
  if (!isNonEmptyString(rawUrl)) return null;
  const trimmed = rawUrl.trim();

  // Reject any dangerous schemes immediately
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    console.warn(`[Pixelverse Security] Blocked unsafe URL scheme: "${trimmed}"`);
    return null;
  }

  // Handle internal hash anchors
  if (allowRelative && trimmed.startsWith('#') && /^#[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Handle relative local asset paths
  if (allowRelative && (trimmed.startsWith('./') || trimmed.startsWith('assets/') || trimmed.startsWith('/'))) {
    if (trimmed.includes('..')) {
      console.warn(`[Pixelverse Security] Blocked path traversal attempt: "${trimmed}"`);
      return null;
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
      console.warn(`[Pixelverse Security] Blocked unsupported protocol "${parsed.protocol}" in URL: "${trimmed}"`);
      return null;
    }
    return parsed.href;
  } catch {
    console.warn(`[Pixelverse Validation] Malformed URL skipped: "${trimmed}"`);
    return null;
  }
}

/**
 * Safe DOM element factory. Uses textContent exclusively for text nodes.
 * @param {string} tag
 * @param {object} [options]
 * @param {string|string[]} [options.className]
 * @param {string} [options.text]
 * @param {Record<string, string>} [options.attrs]
 * @param {Record<string, string>} [options.dataset]
 * @param {HTMLElement[]} [options.children]
 * @returns {HTMLElement}
 */
export function createEl(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.id) {
    el.id = String(options.id);
  }

  if (options.className) {
    if (Array.isArray(options.className)) {
      el.className = options.className.filter(Boolean).join(' ');
    } else {
      el.className = options.className;
    }
  }

  if (options.text !== undefined && options.text !== null) {
    el.textContent = String(options.text);
  }

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) {
        el.setAttribute(key, String(value));
      }
    }
  }

  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      if (value !== undefined && value !== null) {
        el.dataset[key] = String(value);
      }
    }
  }

  if (Array.isArray(options.children)) {
    for (const child of options.children) {
      if (child instanceof Node) {
        el.appendChild(child);
      }
    }
  }

  return el;
}

/**
 * Creates a crisp pixel-art icon element.
 * Supports local SVG icon files in ./assets/icons/<name>.svg as well as built-in pixel glyphs
 * for UI icons (user, folder, home, mail, code, palette, rocket).
 * @param {string} iconName
 * @param {string} [className='']
 * @returns {HTMLElement}
 */
export function createPixelIcon(iconName, className = '') {
  const normalized = isNonEmptyString(iconName) ? iconName.trim().toLowerCase() : 'external';

  if (KNOWN_ICON_FILES.has(normalized)) {
    const img = createEl('img', {
      className: ['pixel-art', className].filter(Boolean).join(' '),
      attrs: {
        src: `./assets/icons/${normalized}.svg`,
        alt: '',
        width: '24',
        height: '24',
        loading: 'lazy',
        decoding: 'async',
        'aria-hidden': 'true'
      }
    });
    img.addEventListener('error', () => {
      img.src = './assets/icons/external.svg';
    }, { once: true });
    return img;
  }

  // Built-in inline SVG pixel-art glyphs for game UI icons
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', `pixel-art ${className}`);
  }

  const rects = getInlineIconRects(normalized);
  for (const [x, y, w, h, fill] of rects) {
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('fill', fill);
    svg.appendChild(rect);
  }

  return svg;
}

/**
 * Returns pixel rect definitions [x, y, w, h, color] for UI icons.
 * @param {string} name
 * @returns {Array<[number, number, number, number, string]>}
 */
function getInlineIconRects(name) {
  switch (name) {
    case 'user':
      return [
        [6, 2, 4, 4, '#64E9FF'],
        [5, 3, 6, 2, '#F4F6FF'],
        [4, 8, 8, 2, '#9775FA'],
        [3, 10, 10, 4, '#F4F6FF'],
        [6, 10, 4, 2, '#FF77C8']
      ];
    case 'folder':
      return [
        [2, 3, 5, 2, '#FFE59A'],
        [2, 5, 12, 8, '#9775FA'],
        [3, 6, 10, 6, '#151B35'],
        [2, 7, 12, 6, '#64E9FF'],
        [3, 8, 10, 4, '#F4F6FF']
      ];
    case 'home':
      return [
        [7, 2, 2, 2, '#FFE59A'],
        [5, 4, 6, 2, '#FF77C8'],
        [3, 6, 10, 2, '#FF77C8'],
        [4, 8, 8, 6, '#F4F6FF'],
        [7, 10, 2, 4, '#151B35']
      ];
    case 'mail':
      return [
        [2, 3, 12, 10, '#FFE59A'],
        [3, 4, 10, 8, '#151B35'],
        [3, 4, 2, 2, '#64E9FF'],
        [11, 4, 2, 2, '#64E9FF'],
        [5, 6, 2, 2, '#64E9FF'],
        [9, 6, 2, 2, '#64E9FF'],
        [7, 7, 2, 2, '#FF77C8']
      ];
    case 'code':
      return [
        [4, 5, 2, 2, '#64E9FF'],
        [2, 7, 2, 2, '#64E9FF'],
        [4, 9, 2, 2, '#64E9FF'],
        [10, 5, 2, 2, '#64E9FF'],
        [12, 7, 2, 2, '#64E9FF'],
        [10, 9, 2, 2, '#64E9FF'],
        [7, 4, 2, 8, '#FF77C8']
      ];
    case 'palette':
      return [
        [4, 2, 8, 2, '#FF77C8'],
        [2, 4, 12, 8, '#9775FA'],
        [4, 12, 6, 2, '#9775FA'],
        [4, 5, 2, 2, '#FFE59A'],
        [8, 4, 2, 2, '#64E9FF'],
        [10, 7, 2, 2, '#FF77C8'],
        [5, 9, 2, 2, '#F4F6FF']
      ];
    case 'rocket':
      return [
        [7, 1, 2, 2, '#64E9FF'],
        [6, 3, 4, 6, '#F4F6FF'],
        [7, 5, 2, 2, '#9775FA'],
        [4, 7, 2, 4, '#FF77C8'],
        [10, 7, 2, 4, '#FF77C8'],
        [6, 9, 4, 2, '#99A6CC'],
        [7, 11, 2, 4, '#FFE59A']
      ];
    default:
      return [
        [3, 3, 10, 10, '#9775FA'],
        [5, 5, 6, 6, '#64E9FF'],
        [7, 7, 2, 2, '#FFE59A']
      ];
  }
}
