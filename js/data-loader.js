/**
 * PIXELVERSE — Centralized Data Loader & Validator
 * Fetches data/site.json, validates schema integrity, checks unique IDs,
 * normalizes defaults, and guarantees malformed config will not crash the UI.
 */

import { isNonEmptyString, sanitizeColor, sanitizeUrl } from './utils.js';

const DEFAULT_THEME = {
  primary: '#9775FA',
  secondary: '#64E9FF',
  accent: '#FF77C8',
  background: '#080B1A',
  surface: '#151B35',
  text: '#F4F6FF',
  muted: '#99A6CC'
};

const DEFAULT_ANIMATION = {
  enabled: true,
  starCount: 180,
  baseSpeed: 1,
  warpMultiplier: 4,
  parallax: true,
  shootingStars: true,
  planets: true,
  spaceship: true,
  particleEffects: true,
  adaptiveQuality: true
};

/**
 * Fetches and validates the centralized JSON configuration file.
 * @param {string} [jsonPath='./data/site.json']
 * @returns {Promise<object>} Normalized and validated site data
 */
export async function loadSiteData(jsonPath = './data/site.json') {
  let response;
  try {
    response = await fetch(jsonPath, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-cache'
    });
  } catch (networkErr) {
    throw new Error(`Network failure while loading "${jsonPath}": ${networkErr.message}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${response.statusText}) while loading "${jsonPath}"`);
  }

  let rawData;
  try {
    rawData = await response.json();
  } catch (parseErr) {
    throw new Error(`Invalid JSON syntax in "${jsonPath}": ${parseErr.message}`);
  }

  return validateAndNormalizeData(rawData);
}

/**
 * Validates required top-level fields, unique IDs, and normalizes optional values.
 * @param {unknown} raw
 * @returns {object}
 */
export function validateAndNormalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Root configuration in site.json must be a JSON object.');
  }

  if (!raw.profile || typeof raw.profile !== 'object') {
    throw new Error('Missing required "profile" object in site.json.');
  }

  if (!isNonEmptyString(raw.profile.name)) {
    throw new Error('Missing required "profile.name" in site.json.');
  }

  // 1. Site metadata
  const site = {
    name: isNonEmptyString(raw.site?.name) ? raw.site.name.trim() : 'Pixelverse',
    title: isNonEmptyString(raw.site?.title) ? raw.site.title.trim() : `${raw.profile.name} | Pixelverse`,
    description: isNonEmptyString(raw.site?.description)
      ? raw.site.description.trim()
      : 'Personal links, projects, and adventures across the universe.',
    language: isNonEmptyString(raw.site?.language) ? raw.site.language.trim() : 'en',
    favicon: sanitizeUrl(raw.site?.favicon, { allowRelative: true }) || './favicon.svg',
    theme: isNonEmptyString(raw.site?.theme) ? raw.site.theme.trim() : 'cosmic-pixel'
  };

  // 2. Socials (Single Source of Truth)
  const seenSocialIds = new Set();
  const socials = [];
  if (Array.isArray(raw.socials)) {
    for (const item of raw.socials) {
      if (!item || typeof item !== 'object') continue;
      if (!isNonEmptyString(item.id)) {
        console.warn('[Pixelverse Validation] Skipping social entry without a valid "id".');
        continue;
      }
      const id = item.id.trim();
      if (seenSocialIds.has(id)) {
        console.warn(`[Pixelverse Validation] Duplicate social ID "${id}" ignored.`);
        continue;
      }
      seenSocialIds.add(id);

      const enabled = item.enabled !== false;
      const safeUrl = sanitizeUrl(item.url, { allowRelative: false });
      if (enabled && !safeUrl) {
        console.warn(`[Pixelverse Validation] Social "${id}" has an invalid or unsafe URL and will be disabled.`);
      }

      socials.push({
        id,
        name: isNonEmptyString(item.name) ? item.name.trim() : id,
        username: isNonEmptyString(item.username) ? item.username.trim() : '',
        description: isNonEmptyString(item.description) ? item.description.trim() : '',
        url: safeUrl || '',
        icon: isNonEmptyString(item.icon) ? item.icon.trim() : id,
        color: sanitizeColor(item.color, '#F4F6FF'),
        enabled: Boolean(enabled && safeUrl),
        featured: Boolean(item.featured)
      });
    }
  }

  // 3. Profile
  const profile = {
    name: raw.profile.name.trim(),
    username: isNonEmptyString(raw.profile.username) ? raw.profile.username.trim() : '',
    headline: isNonEmptyString(raw.profile.headline) ? raw.profile.headline.trim() : '',
    avatar: sanitizeUrl(raw.profile.avatar, { allowRelative: true }) || './assets/avatar/profile.svg',
    status: {
      label: isNonEmptyString(raw.profile.status?.label) ? raw.profile.status.label.trim() : 'ONLINE',
      color: sanitizeColor(raw.profile.status?.color, 'green'),
      visible: raw.profile.status?.visible !== false
    },
    location: isNonEmptyString(raw.profile.location) ? raw.profile.location.trim() : '',
    shortBio: isNonEmptyString(raw.profile.shortBio) ? raw.profile.shortBio.trim() : '',
    primaryAction: raw.profile.primaryAction && typeof raw.profile.primaryAction === 'object'
      ? {
          label: isNonEmptyString(raw.profile.primaryAction.label) ? raw.profile.primaryAction.label.trim() : 'ABOUT ME',
          type: isNonEmptyString(raw.profile.primaryAction.type) ? raw.profile.primaryAction.type.trim() : 'section',
          sectionId: isNonEmptyString(raw.profile.primaryAction.sectionId) ? raw.profile.primaryAction.sectionId.trim() : 'about',
          socialId: isNonEmptyString(raw.profile.primaryAction.socialId) ? raw.profile.primaryAction.socialId.trim() : '',
          url: isNonEmptyString(raw.profile.primaryAction.url) ? raw.profile.primaryAction.url.trim() : ''
        }
      : null
  };

  // 4. Skills
  const seenSkillIds = new Set();
  const skillItems = [];
  if (Array.isArray(raw.skills?.items)) {
    for (const sk of raw.skills.items) {
      if (!sk || typeof sk !== 'object' || !isNonEmptyString(sk.name)) continue;
      const id = isNonEmptyString(sk.id) ? sk.id.trim() : sk.name.trim().toLowerCase().replace(/\s+/g, '-');
      if (seenSkillIds.has(id)) {
        console.warn(`[Pixelverse Validation] Duplicate skill ID "${id}" ignored.`);
        continue;
      }
      seenSkillIds.add(id);
      skillItems.push({
        id,
        name: sk.name.trim(),
        category: isNonEmptyString(sk.category) ? sk.category.trim().toLowerCase() : 'general'
      });
    }
  }

  const skills = {
    enabled: raw.skills?.enabled !== false && skillItems.length > 0,
    title: isNonEmptyString(raw.skills?.title) ? raw.skills.title.trim() : 'MY SKILLS',
    items: skillItems
  };

  // 5. About Me
  const highlights = [];
  const seenHighlightIds = new Set();
  if (Array.isArray(raw.about?.highlights)) {
    for (const hl of raw.about.highlights) {
      if (!hl || typeof hl !== 'object' || !isNonEmptyString(hl.title)) continue;
      const id = isNonEmptyString(hl.id) ? hl.id.trim() : hl.title.trim().toLowerCase();
      if (seenHighlightIds.has(id)) continue;
      seenHighlightIds.add(id);
      highlights.push({
        id,
        icon: isNonEmptyString(hl.icon) ? hl.icon.trim() : 'rocket',
        title: hl.title.trim(),
        description: isNonEmptyString(hl.description) ? hl.description.trim() : ''
      });
    }
  }

  const about = {
    id: isNonEmptyString(raw.about?.id) ? raw.about.id.trim() : 'about',
    enabled: raw.about?.enabled !== false,
    title: isNonEmptyString(raw.about?.title) ? raw.about.title.trim() : 'ABOUT ME',
    subtitle: isNonEmptyString(raw.about?.subtitle) ? raw.about.subtitle.trim() : '',
    intro: isNonEmptyString(raw.about?.intro) ? raw.about.intro.trim() : '',
    paragraphs: Array.isArray(raw.about?.paragraphs)
      ? raw.about.paragraphs.filter(isNonEmptyString).map((p) => p.trim())
      : [],
    highlights,
    socialIds: Array.isArray(raw.about?.socialIds)
      ? raw.about.socialIds.filter(isNonEmptyString).map((s) => s.trim())
      : [],
    showSkills: raw.about?.showSkills !== false,
    showProjects: raw.about?.showProjects !== false
  };

  // 6. Projects
  const seenProjectIds = new Set();
  const projectItems = [];
  if (Array.isArray(raw.projects?.items)) {
    for (const proj of raw.projects.items) {
      if (!proj || typeof proj !== 'object' || !isNonEmptyString(proj.title)) continue;
      const id = isNonEmptyString(proj.id) ? proj.id.trim() : proj.title.trim().toLowerCase().replace(/\s+/g, '-');
      if (seenProjectIds.has(id)) {
        console.warn(`[Pixelverse Validation] Duplicate project ID "${id}" ignored.`);
        continue;
      }
      seenProjectIds.add(id);
      projectItems.push({
        id,
        title: proj.title.trim(),
        description: isNonEmptyString(proj.description) ? proj.description.trim() : '',
        tags: Array.isArray(proj.tags) ? proj.tags.filter(isNonEmptyString).map((t) => t.trim()) : [],
        featured: Boolean(proj.featured),
        links: Array.isArray(proj.links) ? proj.links.filter((l) => l && typeof l === 'object') : []
      });
    }
  }

  const projects = {
    id: isNonEmptyString(raw.projects?.id) ? raw.projects.id.trim() : 'projects',
    enabled: raw.projects?.enabled !== false && projectItems.length > 0,
    title: isNonEmptyString(raw.projects?.title) ? raw.projects.title.trim() : 'MY PROJECTS',
    description: isNonEmptyString(raw.projects?.description) ? raw.projects.description.trim() : '',
    items: projectItems
  };

  // 7. Contact
  const contact = {
    id: isNonEmptyString(raw.contact?.id) ? raw.contact.id.trim() : 'contact',
    enabled: raw.contact?.enabled !== false,
    title: isNonEmptyString(raw.contact?.title) ? raw.contact.title.trim() : 'CONTACT ME',
    description: isNonEmptyString(raw.contact?.description) ? raw.contact.description.trim() : '',
    socialIds: Array.isArray(raw.contact?.socialIds)
      ? raw.contact.socialIds.filter(isNonEmptyString).map((s) => s.trim())
      : []
  };

  // 8. Link Cards
  const seenCardIds = new Set();
  const linkCards = [];
  if (Array.isArray(raw.linkCards)) {
    for (const card of raw.linkCards) {
      if (!card || typeof card !== 'object') continue;
      const id = isNonEmptyString(card.id) ? card.id.trim() : `card-${linkCards.length + 1}`;
      if (seenCardIds.has(id)) {
        console.warn(`[Pixelverse Validation] Duplicate linkCard ID "${id}" ignored.`);
        continue;
      }
      seenCardIds.add(id);
      linkCards.push({
        id,
        type: isNonEmptyString(card.type) ? card.type.trim().toLowerCase() : 'external',
        socialId: isNonEmptyString(card.socialId) ? card.socialId.trim() : '',
        sectionId: isNonEmptyString(card.sectionId) ? card.sectionId.trim() : '',
        title: isNonEmptyString(card.title) ? card.title.trim() : '',
        description: isNonEmptyString(card.description) ? card.description.trim() : '',
        url: isNonEmptyString(card.url) ? card.url.trim() : '',
        icon: isNonEmptyString(card.icon) ? card.icon.trim() : '',
        style: ['primary', 'accent', 'default'].includes(card.style) ? card.style : 'default',
        enabled: card.enabled !== false
      });
    }
  }

  // 9. Navigation
  const seenNavIds = new Set();
  const navigation = [];
  if (Array.isArray(raw.navigation)) {
    for (const nav of raw.navigation) {
      if (!nav || typeof nav !== 'object' || !isNonEmptyString(nav.label) || !isNonEmptyString(nav.sectionId)) continue;
      const id = isNonEmptyString(nav.id) ? nav.id.trim() : `nav-${nav.sectionId.trim()}`;
      if (seenNavIds.has(id)) continue;
      seenNavIds.add(id);
      navigation.push({
        id,
        label: nav.label.trim(),
        sectionId: nav.sectionId.trim(),
        icon: isNonEmptyString(nav.icon) ? nav.icon.trim() : 'home',
        enabled: nav.enabled !== false
      });
    }
  }

  // 10. Footer
  const footer = {
    text: isNonEmptyString(raw.footer?.text) ? raw.footer.text.trim() : 'Made somewhere in the universe.',
    showCopyright: raw.footer?.showCopyright !== false,
    showYear: raw.footer?.showYear !== false,
    showSocialIcons: raw.footer?.showSocialIcons !== false,
    socialIds: Array.isArray(raw.footer?.socialIds)
      ? raw.footer.socialIds.filter(isNonEmptyString).map((s) => s.trim())
      : []
  };

  // 11. Theme
  const theme = {
    primary: sanitizeColor(raw.theme?.primary, DEFAULT_THEME.primary),
    secondary: sanitizeColor(raw.theme?.secondary, DEFAULT_THEME.secondary),
    accent: sanitizeColor(raw.theme?.accent, DEFAULT_THEME.accent),
    background: sanitizeColor(raw.theme?.background, DEFAULT_THEME.background),
    surface: sanitizeColor(raw.theme?.surface, DEFAULT_THEME.surface),
    text: sanitizeColor(raw.theme?.text, DEFAULT_THEME.text),
    muted: sanitizeColor(raw.theme?.muted, DEFAULT_THEME.muted)
  };

  // 12. Animation
  const animation = {
    enabled: raw.animation?.enabled !== false,
    starCount: clampNumber(raw.animation?.starCount, 20, 600, DEFAULT_ANIMATION.starCount),
    baseSpeed: clampNumber(raw.animation?.baseSpeed, 0.1, 10, DEFAULT_ANIMATION.baseSpeed),
    warpMultiplier: clampNumber(raw.animation?.warpMultiplier, 1.5, 15, DEFAULT_ANIMATION.warpMultiplier),
    parallax: raw.animation?.parallax !== false,
    shootingStars: raw.animation?.shootingStars !== false,
    planets: raw.animation?.planets !== false,
    spaceship: raw.animation?.spaceship !== false,
    particleEffects: raw.animation?.particleEffects !== false,
    adaptiveQuality: raw.animation?.adaptiveQuality !== false
  };

  return {
    site,
    profile,
    about,
    skills,
    socials,
    navigation,
    linkCards,
    projects,
    contact,
    footer,
    theme,
    animation
  };
}

/**
 * Clamps a numeric config setting to a safe range.
 */
function clampNumber(val, min, max, fallback) {
  const num = Number(val);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
