/**
 * PIXELVERSE — Automatic Content & Social Link Resolver
 * Single source of truth resolver for social references, internal section links,
 * and external URLs across Link Cards, Profile, About Me, Projects, Contact, and Footer.
 */

import { isNonEmptyString, sanitizeUrl } from './utils.js';

export class LinkResolver {
  /**
   * @param {object} siteData Normalized data from data-loader.js
   */
  constructor(siteData) {
    this.siteData = siteData;
    this.socialMap = new Map();
    this.enabledSections = new Set(['home']);

    // Index socials by ID
    if (Array.isArray(siteData.socials)) {
      for (const social of siteData.socials) {
        this.socialMap.set(social.id, social);
      }
    }

    // Track enabled sections
    if (siteData.about?.enabled) {
      this.enabledSections.add(siteData.about.id || 'about');
    }
    if (siteData.projects?.enabled) {
      this.enabledSections.add(siteData.projects.id || 'projects');
    }
    if (siteData.contact?.enabled) {
      this.enabledSections.add(siteData.contact.id || 'contact');
    }
  }

  /**
   * Resolves a social item by its unique ID.
   * Returns null if missing or disabled, logging a helpful developer warning.
   * @param {string} socialId
   * @returns {object|null}
   */
  resolveSocialById(socialId) {
    if (!isNonEmptyString(socialId)) return null;
    const id = socialId.trim();
    const social = this.socialMap.get(id);

    if (!social) {
      console.warn(`[Pixelverse LinkResolver] Referenced socialId "${id}" does not exist in site.json -> socials.`);
      return null;
    }

    if (!social.enabled) {
      return null;
    }

    const isMailto = social.url.toLowerCase().startsWith('mailto:');
    return {
      id: social.id,
      type: 'social',
      title: social.name,
      username: social.username,
      description: social.description,
      href: social.url,
      icon: social.icon || social.id,
      color: social.color || '#F4F6FF',
      isExternal: !isMailto,
      target: isMailto ? null : '_blank',
      rel: isMailto ? null : 'noopener noreferrer'
    };
  }

  /**
   * Resolves an array of social IDs into active social link descriptors.
   * Used by about.socialIds, contact.socialIds, and footer.socialIds.
   * @param {string[]} socialIds
   * @returns {object[]}
   */
  resolveSocialList(socialIds) {
    if (!Array.isArray(socialIds)) return [];
    const resolved = [];
    const seen = new Set();

    for (const id of socialIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const item = this.resolveSocialById(id);
      if (item) {
        resolved.push(item);
      }
    }
    return resolved;
  }

  /**
   * Returns all enabled social entries marked as `featured: true` for the profile header.
   * @returns {object[]}
   */
  getFeaturedSocials() {
    const featured = [];
    for (const social of this.socialMap.values()) {
      if (social.enabled && social.featured) {
        const resolved = this.resolveSocialById(social.id);
        if (resolved) featured.push(resolved);
      }
    }
    return featured;
  }

  /**
   * Checks whether a given section ID is enabled and renderable.
   * @param {string} sectionId
   * @returns {boolean}
   */
  isSectionEnabled(sectionId) {
    if (!isNonEmptyString(sectionId)) return false;
    return this.enabledSections.has(sectionId.trim());
  }

  /**
   * Resolves a section reference to an internal anchor (#sectionId).
   * @param {string} sectionId
   * @param {object} [overrides]
   * @returns {object|null}
   */
  resolveSectionLink(sectionId, overrides = {}) {
    if (!isNonEmptyString(sectionId)) return null;
    const targetId = sectionId.trim();

    if (!this.isSectionEnabled(targetId)) {
      console.warn(`[Pixelverse LinkResolver] Section "${targetId}" is disabled or does not exist; hiding link.`);
      return null;
    }

    return {
      type: 'section',
      sectionId: targetId,
      title: isNonEmptyString(overrides.title) ? overrides.title.trim() : targetId.toUpperCase(),
      description: isNonEmptyString(overrides.description) ? overrides.description.trim() : '',
      href: `#${targetId}`,
      icon: isNonEmptyString(overrides.icon) ? overrides.icon.trim() : 'user',
      color: overrides.color || '#64E9FF',
      isExternal: false,
      target: null,
      rel: null
    };
  }

  /**
   * Resolves a generic link descriptor (`social`, `section`, or `external`).
   * Used by linkCards, profile.primaryAction, and project.links.
   * @param {object} item
   * @returns {object|null}
   */
  resolveLinkItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.enabled === false) return null;

    const linkType = isNonEmptyString(item.type) ? item.type.trim().toLowerCase() : 'external';

    if (linkType === 'social') {
      const social = this.resolveSocialById(item.socialId);
      if (!social) return null;

      return {
        ...social,
        id: item.id || `social-${social.id}`,
        title: isNonEmptyString(item.title) ? item.title.trim() : social.title,
        label: isNonEmptyString(item.label) ? item.label.trim() : social.title,
        description: isNonEmptyString(item.description) ? item.description.trim() : social.description,
        icon: isNonEmptyString(item.icon) ? item.icon.trim() : social.icon,
        style: item.style || 'default'
      };
    }

    if (linkType === 'section') {
      const section = this.resolveSectionLink(item.sectionId, {
        title: item.title || item.label,
        description: item.description,
        icon: item.icon
      });
      if (!section) return null;

      return {
        ...section,
        id: item.id || `section-${section.sectionId}`,
        label: isNonEmptyString(item.label) ? item.label.trim() : section.title,
        style: item.style || 'default'
      };
    }

    if (linkType === 'external') {
      const safeUrl = sanitizeUrl(item.url, { allowRelative: false });
      if (!safeUrl) {
        console.warn(`[Pixelverse LinkResolver] External link "${item.id || item.title || item.label}" has an invalid URL.`);
        return null;
      }
      const isMailto = safeUrl.toLowerCase().startsWith('mailto:');
      const title = isNonEmptyString(item.title)
        ? item.title.trim()
        : (isNonEmptyString(item.label) ? item.label.trim() : 'EXTERNAL LINK');

      return {
        id: item.id || `ext-${title.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'external',
        title,
        label: isNonEmptyString(item.label) ? item.label.trim() : title,
        description: isNonEmptyString(item.description) ? item.description.trim() : '',
        href: safeUrl,
        icon: isNonEmptyString(item.icon) ? item.icon.trim() : 'external',
        color: '#64E9FF',
        style: item.style || 'default',
        isExternal: !isMailto,
        target: isMailto ? null : '_blank',
        rel: isMailto ? null : 'noopener noreferrer'
      };
    }

    console.warn(`[Pixelverse LinkResolver] Unsupported link type "${linkType}".`);
    return null;
  }

  /**
   * Resolves all enabled navigation items whose target sections are enabled.
   * @returns {object[]}
   */
  resolveNavigation() {
    if (!Array.isArray(this.siteData.navigation)) return [];
    const navItems = [];

    for (const nav of this.siteData.navigation) {
      if (!nav || nav.enabled === false) continue;
      if (!this.isSectionEnabled(nav.sectionId)) continue;

      navItems.push({
        id: nav.id,
        label: nav.label,
        sectionId: nav.sectionId,
        href: `#${nav.sectionId}`,
        icon: nav.icon || 'home'
      });
    }

    return navItems;
  }
}
