/**
 * PIXELVERSE — Dynamic Content Renderer
 * Renders all sections (Header, Profile, Link Cards, About Me, Skills, Projects,
 * Contact, Spaceship Companion, and Footer) strictly from normalized site.json data.
 * Uses safe DOM creation (createEl & textContent) with zero innerHTML injection.
 */

import { createEl, createPixelIcon } from './utils.js';

export class ContentRenderer {
  /**
   * @param {object} siteData Normalized data from data-loader.js
   * @param {import('./link-resolver.js').LinkResolver} resolver
   */
  constructor(siteData, resolver) {
    this.data = siteData;
    this.resolver = resolver;
  }

  /**
   * Renders the entire application into the root mount points.
   */
  renderAll() {
    this.renderHeader();
    this.renderMainSections();
    this.renderSpaceshipDock();
    this.renderFooter();
  }

  /**
   * Renders the sticky top HUD navigation bar and control buttons.
   */
  renderHeader() {
    const headerMount = document.getElementById('hud-header');
    if (!headerMount) return;
    headerMount.replaceChildren();

    const brandIcon = createEl('img', {
      className: 'hud-brand__icon pixel-art',
      attrs: {
        src: './assets/sprites/spaceship.svg',
        alt: '',
        width: '24',
        height: '24',
        'aria-hidden': 'true'
      }
    });

    const brandLink = createEl('a', {
      className: 'hud-brand',
      attrs: {
        href: '#home',
        'aria-label': `${this.data.site.name} Home`
      },
      children: [
        brandIcon,
        createEl('span', { text: this.data.site.name }),
        createEl('span', { className: 'hud-brand__tag', text: 'SYS.OK' })
      ]
    });

    // Navigation items from site.json -> navigation
    const navItems = this.resolver.resolveNavigation();
    const navList = createEl('ul', { className: 'hud-nav__list' });

    for (const item of navItems) {
      const link = createEl('a', {
        className: 'hud-nav__link',
        attrs: {
          href: item.href,
          'data-section-link': item.sectionId
        },
        children: [
          createPixelIcon(item.icon, 'hud-nav__icon'),
          createEl('span', { text: item.label })
        ]
      });
      if (item.sectionId === 'home') {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      }
      navList.appendChild(createEl('li', { children: [link] }));
    }

    const navEl = createEl('nav', {
      className: 'hud-nav',
      attrs: { 'aria-label': 'Primary Navigation' },
      children: [navList]
    });

    const inner = createEl('div', {
      className: 'hud-header__inner',
      children: [brandLink, navEl]
    });

    headerMount.appendChild(inner);
  }

  /**
   * Renders all enabled main sections (Home Hub, About Me, Projects, Contact).
   */
  renderMainSections() {
    const mainMount = document.getElementById('main-content');
    if (!mainMount) return;
    mainMount.replaceChildren();

    // 1. Home Section (Profile Card + Linktree Hub)
    mainMount.appendChild(this.buildHomeSection());

    // 2. About Me Section (Character Profile Screen)
    if (this.data.about?.enabled) {
      mainMount.appendChild(this.buildAboutSection());
    }

    // 3. Dedicated Skills Section (if enabled and not already embedded in About Me, or if About Me is disabled)
    if (this.data.skills?.enabled && (!this.data.about?.enabled || !this.data.about?.showSkills)) {
      mainMount.appendChild(this.buildStandaloneSkillsSection());
    }

    // 4. Projects Section (Mission Log Directory)
    if (this.data.projects?.enabled) {
      mainMount.appendChild(this.buildProjectsSection());
    }

    // 5. Contact Section (Communication Channels)
    if (this.data.contact?.enabled) {
      mainMount.appendChild(this.buildContactSection());
    }
  }

  /**
   * Builds the #home section containing the Profile Header and Link Cards.
   * @returns {HTMLElement}
   */
  buildHomeSection() {
    const { profile } = this.data;

    // Top telemetry bar inside profile card
    const sectorBadge = createEl('span', {
      text: profile.location ? `SECTOR // ${profile.location.toUpperCase()}` : 'SECTOR // DEEP SPACE'
    });

    const topBarChildren = [sectorBadge];
    if (profile.status?.visible) {
      const statusBadge = createEl('div', {
        className: 'status-badge',
        dataset: { statusColor: profile.status.color || 'green' },
        children: [
          createEl('span', { className: 'status-badge__led', attrs: { 'aria-hidden': 'true' } }),
          createEl('span', { text: profile.status.label || 'ONLINE' })
        ]
      });
      topBarChildren.push(statusBadge);
    }

    const topBar = createEl('div', {
      className: 'profile-card__top-bar',
      children: topBarChildren
    });

    // Avatar Frame with decorative corner stars
    const avatarImg = createEl('img', {
      className: 'avatar-frame__img pixel-art',
      attrs: {
        src: profile.avatar,
        alt: `${profile.name} pixel-art avatar`,
        width: '112',
        height: '112'
      }
    });
    avatarImg.addEventListener('error', () => {
      avatarImg.src = './assets/avatar/profile.svg';
    }, { once: true });

    const starTL = createEl('img', {
      className: 'avatar-star avatar-star--tl pixel-art',
      attrs: { src: './assets/sprites/stars.svg', alt: '', 'aria-hidden': 'true' }
    });
    const starBR = createEl('img', {
      className: 'avatar-star avatar-star--br pixel-art',
      attrs: { src: './assets/sprites/stars.svg', alt: '', 'aria-hidden': 'true' }
    });

    const avatarStage = createEl('div', {
      className: 'avatar-stage',
      children: [
        starTL,
        createEl('div', { className: 'avatar-frame', children: [avatarImg] }),
        starBR
      ]
    });

    // Identity details
    const metaChildren = [];
    if (profile.username) {
      metaChildren.push(createEl('span', { text: profile.username }));
    }
    if (profile.location) {
      metaChildren.push(createEl('span', {
        className: 'profile-identity__location',
        text: `LOC: ${profile.location}`
      }));
    }

    const identityChildren = [
      createEl('h1', { className: 'profile-identity__name', text: profile.name })
    ];
    if (metaChildren.length > 0) {
      identityChildren.push(createEl('div', { className: 'profile-identity__meta', children: metaChildren }));
    }
    if (profile.headline) {
      identityChildren.push(createEl('p', { className: 'profile-identity__headline', text: profile.headline }));
    }
    if (profile.shortBio) {
      identityChildren.push(createEl('p', { className: 'profile-identity__bio', text: profile.shortBio }));
    }

    const identityBlock = createEl('div', {
      className: 'profile-identity',
      children: identityChildren
    });

    const profileCardChildren = [topBar, avatarStage, identityBlock];

    // Featured Compact Social Icons Row
    const featuredSocials = this.resolver.getFeaturedSocials();
    if (featuredSocials.length > 0) {
      const socialRow = createEl('div', {
        className: 'social-icon-row',
        attrs: { role: 'list', 'aria-label': 'Featured social networks' }
      });

      for (const soc of featuredSocials) {
        const btn = this.buildCompactSocialButton(soc);
        socialRow.appendChild(createEl('div', { attrs: { role: 'listitem' }, children: [btn] }));
      }
      profileCardChildren.push(socialRow);
    }

    // Primary Action Button (e.g. ABOUT ME)
    if (profile.primaryAction) {
      const resolvedPrimary = this.resolver.resolveLinkItem(profile.primaryAction);
      if (resolvedPrimary) {
        const primaryAnchor = this.createAnchorFromResolved(resolvedPrimary, 'profile-cta');
        primaryAnchor.appendChild(createEl('span', { text: resolvedPrimary.label || 'ABOUT ME' }));
        primaryAnchor.appendChild(createEl('span', { text: '▼', attrs: { 'aria-hidden': 'true' } }));

        profileCardChildren.push(
          createEl('div', { className: 'profile-actions', children: [primaryAnchor] })
        );
      }
    }

    const profileCard = createEl('div', {
      className: 'pixel-panel profile-card',
      children: profileCardChildren
    });

    // Dynamic Linktree Cards List
    const cardsContainer = createEl('div', {
      className: 'link-cards-list',
      attrs: { role: 'list', 'aria-label': 'Personal links and destinations' }
    });

    for (const rawCard of this.data.linkCards) {
      const resolvedCard = this.resolver.resolveLinkItem(rawCard);
      if (!resolvedCard) continue;
      const cardEl = this.buildLinkCardElement(resolvedCard);
      cardsContainer.appendChild(createEl('div', { attrs: { role: 'listitem' }, children: [cardEl] }));
    }

    return createEl('section', {
      className: 'game-section game-section--hub',
      attrs: {
        id: 'home',
        'aria-label': `${profile.name} Profile and Links`
      },
      children: [profileCard, cardsContainer]
    });
  }

  /**
   * Builds a single interactive Linktree card element.
   * @param {object} resolved
   * @returns {HTMLElement}
   */
  buildLinkCardElement(resolved) {
    const variantClass = resolved.style === 'primary'
      ? 'link-card--primary'
      : (resolved.style === 'accent' ? 'link-card--accent' : 'link-card--default');

    const anchor = this.createAnchorFromResolved(resolved, `link-card ${variantClass}`);
    if (resolved.color) {
      anchor.style.setProperty('--card-accent', resolved.color);
    }

    const iconBox = createEl('div', {
      className: 'link-card__icon-box',
      children: [createPixelIcon(resolved.icon, 'link-card__icon')]
    });

    const titleRowChildren = [
      createEl('span', { className: 'link-card__title', text: resolved.title })
    ];

    if (resolved.type === 'social' && resolved.username) {
      titleRowChildren.push(
        createEl('span', { className: 'link-card__badge', text: resolved.username })
      );
    } else if (resolved.type === 'section') {
      titleRowChildren.push(
        createEl('span', { className: 'link-card__badge', text: 'SECTION' })
      );
    }

    const contentChildren = [
      createEl('div', { className: 'link-card__title-row', children: titleRowChildren })
    ];
    if (resolved.description) {
      contentChildren.push(
        createEl('span', { className: 'link-card__desc', text: resolved.description })
      );
    }

    const left = createEl('div', {
      className: 'link-card__left',
      children: [
        iconBox,
        createEl('div', { className: 'link-card__content', children: contentChildren })
      ]
    });

    const arrowSymbol = resolved.type === 'section' ? '↓' : '→';
    const right = createEl('div', {
      className: 'link-card__right',
      attrs: { 'aria-hidden': 'true' },
      children: [
        createEl('span', { className: 'link-card__sparkle', text: '✦' }),
        createEl('span', { className: 'link-card__arrow', text: arrowSymbol })
      ]
    });

    anchor.appendChild(left);
    anchor.appendChild(right);
    return anchor;
  }

  /**
   * Builds the dedicated #about Character Profile section.
   * @returns {HTMLElement}
   */
  buildAboutSection() {
    const { about, profile, skills, projects } = this.data;
    const sectionId = about.id || 'about';

    const header = this.buildSectionHeader({
      eyebrow: 'CHARACTER PROFILE // BIO-LOG',
      title: about.title,
      subtitle: about.subtitle
    });

    // Left Column: Character Portrait & Stats Card
    const portraitImg = createEl('img', {
      className: 'character-portrait-card__img pixel-art',
      attrs: {
        src: profile.avatar,
        alt: `${profile.name} explorer portrait`,
        width: '120',
        height: '120',
        loading: 'lazy'
      }
    });
    portraitImg.addEventListener('error', () => {
      portraitImg.src = './assets/avatar/profile.svg';
    }, { once: true });

    const statsRows = [
      ['CLASS', 'CREATOR'],
      ['BASE', profile.location || 'EARTH'],
      ['STATUS', profile.status?.label || 'ONLINE']
    ];

    const statsContainer = createEl('div', { className: 'character-stats' });
    for (const [k, v] of statsRows) {
      statsContainer.appendChild(
        createEl('div', {
          className: 'character-stats__row',
          children: [
            createEl('span', { className: 'character-stats__key', text: k }),
            createEl('span', { className: 'character-stats__val', text: v })
          ]
        })
      );
    }

    const portraitCard = createEl('div', {
      className: 'character-portrait-card',
      children: [
        createEl('div', { className: 'character-portrait-card__label', text: 'EXPLORER ID' }),
        portraitImg,
        createEl('strong', { text: profile.name }),
        statsContainer
      ]
    });

    // Right Column: About the Explorer narrative
    const storyChildren = [
      createEl('span', { className: 'character-story__label', text: 'ABOUT THE EXPLORER' })
    ];
    if (about.intro) {
      storyChildren.push(createEl('p', { className: 'character-story__intro', text: about.intro }));
    }
    if (about.paragraphs.length > 0) {
      const pWrap = createEl('div', { className: 'character-story__paragraphs' });
      for (const paragraph of about.paragraphs) {
        pWrap.appendChild(createEl('p', { text: paragraph }));
      }
      storyChildren.push(pWrap);
    }

    const bioGrid = createEl('div', {
      className: 'character-bio-grid',
      children: [
        portraitCard,
        createEl('div', { className: 'character-story', children: storyChildren })
      ]
    });

    const sheetChildren = [bioGrid];

    // Highlights Cards
    if (about.highlights.length > 0) {
      const hlGrid = createEl('div', { className: 'highlights-grid' });
      for (const hl of about.highlights) {
        hlGrid.appendChild(
          createEl('article', {
            className: 'highlight-card',
            children: [
              createEl('div', {
                className: 'highlight-card__icon',
                children: [createPixelIcon(hl.icon)]
              }),
              createEl('h3', { className: 'highlight-card__title', text: hl.title }),
              createEl('p', { className: 'highlight-card__desc', text: hl.description })
            ]
          })
        );
      }
      sheetChildren.push(hlGrid);
    }

    // Skill Inventory (Connected from site.json -> skills)
    if (about.showSkills && skills?.enabled && skills.items.length > 0) {
      sheetChildren.push(
        createEl('div', {
          className: 'about-subpanel',
          children: [
            createEl('h3', {
              className: 'about-subpanel__heading',
              text: `SKILL INVENTORY // ${skills.title}`
            }),
            this.buildSkillInventoryElement(skills.items)
          ]
        })
      );
    }

    // Featured Projects Preview inside About Me (Connected from site.json -> projects)
    if (about.showProjects && projects?.enabled && projects.items.length > 0) {
      const featuredProjects = projects.items.filter((p) => p.featured);
      const previewList = featuredProjects.length > 0 ? featuredProjects : projects.items.slice(0, 2);

      const previewGrid = createEl('div', { className: 'projects-grid' });
      for (const proj of previewList) {
        previewGrid.appendChild(this.buildProjectCardElement(proj));
      }

      sheetChildren.push(
        createEl('div', {
          className: 'about-subpanel',
          children: [
            createEl('h3', {
              className: 'about-subpanel__heading',
              text: 'CURRENT MISSIONS // FEATURED PROJECTS'
            }),
            previewGrid
          ]
        })
      );
    }

    // Connected Social Links inside About Me (Resolved from about.socialIds)
    const aboutSocials = this.resolver.resolveSocialList(about.socialIds);
    if (aboutSocials.length > 0) {
      const channelsGrid = createEl('div', { className: 'channels-grid' });
      for (const soc of aboutSocials) {
        channelsGrid.appendChild(this.buildChannelCard(soc));
      }

      sheetChildren.push(
        createEl('div', {
          className: 'about-subpanel',
          children: [
            createEl('h3', {
              className: 'about-subpanel__heading',
              text: 'COMMUNICATION CHANNELS // SOCIAL LINKS'
            }),
            channelsGrid
          ]
        })
      );
    }

    // Navigation back to Home
    sheetChildren.push(this.buildBackToHomeNav());

    const panel = createEl('div', {
      className: 'pixel-panel character-sheet',
      children: sheetChildren
    });

    return createEl('section', {
      className: 'game-section',
      attrs: {
        id: sectionId,
        'aria-labelledby': `${sectionId}-heading`
      },
      children: [header, panel]
    });
  }

  /**
   * Builds a grouped Skill Inventory badge layout.
   * @param {Array<{id: string, name: string, category: string}>} items
   * @returns {HTMLElement}
   */
  buildSkillInventoryElement(items) {
    const groups = new Map();
    for (const item of items) {
      const cat = item.category || 'general';
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat).push(item);
    }

    const wrapper = createEl('div', { className: 'skills-categories' });
    for (const [category, catItems] of groups.entries()) {
      const badgeList = createEl('ul', { className: 'skill-badge-list' });
      for (const sk of catItems) {
        badgeList.appendChild(
          createEl('li', {
            className: 'skill-badge',
            children: [
              createEl('span', { className: 'skill-badge__pip', attrs: { 'aria-hidden': 'true' } }),
              createEl('span', { text: sk.name })
            ]
          })
        );
      }

      wrapper.appendChild(
        createEl('div', {
          className: 'skill-category-group',
          children: [
            createEl('span', { className: 'skill-category-group__title', text: `[ ${category.toUpperCase()} ]` }),
            badgeList
          ]
        })
      );
    }

    return wrapper;
  }

  /**
   * Builds a standalone Skills section if About Me is disabled or configured not to show skills.
   * @returns {HTMLElement}
   */
  buildStandaloneSkillsSection() {
    const { skills } = this.data;
    const header = this.buildSectionHeader({
      eyebrow: 'SKILL INVENTORY',
      title: skills.title,
      subtitle: 'Technical capabilities & creative tools',
      headingId: 'skills-heading'
    });

    const panel = createEl('div', {
      className: 'pixel-panel',
      children: [this.buildSkillInventoryElement(skills.items)]
    });

    return createEl('section', {
      className: 'game-section',
      attrs: { id: 'skills', 'aria-labelledby': 'skills-heading' },
      children: [header, panel]
    });
  }

  /**
   * Builds the #projects section with retro mission cards and connected social/external links.
   * @returns {HTMLElement}
   */
  buildProjectsSection() {
    const { projects } = this.data;
    const sectionId = projects.id || 'projects';

    const header = this.buildSectionHeader({
      eyebrow: 'MISSION LOG // DISCOVERIES',
      title: projects.title,
      subtitle: projects.description,
      headingId: `${sectionId}-heading`
    });

    const grid = createEl('div', { className: 'projects-grid' });
    for (const proj of projects.items) {
      grid.appendChild(this.buildProjectCardElement(proj));
    }

    return createEl('section', {
      className: 'game-section',
      attrs: {
        id: sectionId,
        'aria-labelledby': `${sectionId}-heading`
      },
      children: [header, grid, this.buildBackToHomeNav()]
    });
  }

  /**
   * Builds a single Project Card element with resolved links.
   * @param {object} proj
   * @returns {HTMLElement}
   */
  buildProjectCardElement(proj) {
    const headerChildren = [
      createEl('h3', { className: 'project-card__title', text: proj.title })
    ];
    if (proj.featured) {
      headerChildren.push(
        createEl('span', { className: 'project-card__featured-tag', text: '★ FEATURED' })
      );
    }

    const topChildren = [
      createEl('div', { className: 'project-card__header', children: headerChildren })
    ];
    if (proj.description) {
      topChildren.push(createEl('p', { className: 'project-card__desc', text: proj.description }));
    }

    if (Array.isArray(proj.tags) && proj.tags.length > 0) {
      const tagRow = createEl('ul', {
        className: 'project-card__tags',
        attrs: { 'aria-label': `${proj.title} technologies` }
      });
      for (const tag of proj.tags) {
        tagRow.appendChild(createEl('li', { className: 'project-tag', text: tag }));
      }
      topChildren.push(tagRow);
    }

    const cardChildren = [
      createEl('div', { className: 'project-card__top', children: topChildren })
    ];

    // Resolve project links via LinkResolver
    if (Array.isArray(proj.links) && proj.links.length > 0) {
      const linksRow = createEl('div', { className: 'project-card__links' });
      for (const rawLink of proj.links) {
        const resolved = this.resolver.resolveLinkItem(rawLink);
        if (!resolved) continue;

        const linkEl = this.createAnchorFromResolved(resolved, 'project-link-btn');
        linkEl.appendChild(createPixelIcon(resolved.icon, 'project-link-btn__icon'));
        linkEl.appendChild(createEl('span', { text: resolved.label || resolved.title }));
        linksRow.appendChild(linkEl);
      }

      if (linksRow.childNodes.length > 0) {
        cardChildren.push(linksRow);
      }
    }

    return createEl('article', {
      className: ['project-card', proj.featured ? 'project-card--featured' : ''],
      children: cardChildren
    });
  }

  /**
   * Builds the #contact section from contact.socialIds.
   * @returns {HTMLElement}
   */
  buildContactSection() {
    const { contact } = this.data;
    const sectionId = contact.id || 'contact';

    const header = this.buildSectionHeader({
      eyebrow: 'SUBSPACE TRANSMISSIONS // CHANNELS',
      title: contact.title,
      subtitle: contact.description,
      headingId: `${sectionId}-heading`
    });

    const resolvedChannels = this.resolver.resolveSocialList(contact.socialIds);
    const channelsGrid = createEl('div', { className: 'channels-grid' });

    for (const soc of resolvedChannels) {
      channelsGrid.appendChild(this.buildChannelCard(soc));
    }

    const panel = createEl('div', {
      className: 'pixel-panel',
      children: [
        channelsGrid,
        this.buildBackToHomeNav()
      ]
    });

    return createEl('section', {
      className: 'game-section',
      attrs: {
        id: sectionId,
        'aria-labelledby': `${sectionId}-heading`
      },
      children: [header, panel]
    });
  }

  /**
   * Builds a communication channel card for a resolved social object.
   * @param {object} soc
   * @returns {HTMLElement}
   */
  buildChannelCard(soc) {
    const anchor = this.createAnchorFromResolved(soc, 'channel-card');
    if (soc.color) {
      anchor.style.setProperty('--channel-color', soc.color);
    }

    const icon = createPixelIcon(soc.icon, 'channel-card__icon');
    const info = createEl('div', {
      className: 'channel-card__info',
      children: [
        createEl('span', { className: 'channel-card__name', text: soc.title }),
        createEl('span', {
          className: 'channel-card__handle',
          text: soc.username || soc.description || soc.title
        })
      ]
    });

    anchor.appendChild(icon);
    anchor.appendChild(info);
    return anchor;
  }

  /**
   * Builds a compact 44x44 social icon button used in Profile and Footer.
   * @param {object} soc
   * @returns {HTMLElement}
   */
  buildCompactSocialButton(soc) {
    const anchor = this.createAnchorFromResolved(soc, 'social-icon-btn');
    anchor.setAttribute('aria-label', `${soc.title}${soc.username ? ` (${soc.username})` : ''}`);
    anchor.setAttribute('title', `${soc.title}: ${soc.description || soc.username}`);
    if (soc.color) {
      anchor.style.setProperty('--social-brand-color', soc.color);
    }
    anchor.appendChild(createPixelIcon(soc.icon, 'social-icon-btn__img'));
    return anchor;
  }

  /**
   * Renders the interactive Pixel-Art Spaceship companion widget in the bottom-right dock.
   */
  renderSpaceshipDock() {
    const dockMount = document.getElementById('spaceship-dock');
    if (!dockMount) return;
    dockMount.replaceChildren();

    if (this.data.animation?.spaceship === false) {
      dockMount.hidden = true;
      return;
    }

    dockMount.hidden = false;
    const shipSprite = createEl('img', {
      className: 'spaceship-btn__sprite pixel-art',
      attrs: {
        src: './assets/sprites/spaceship.svg',
        alt: '',
        width: '44',
        height: '44',
        'aria-hidden': 'true'
      }
    });

    const shipBtn = createEl('button', {
      className: 'spaceship-btn',
      attrs: {
        type: 'button',
        id: 'spaceship-companion-btn',
        'aria-pressed': 'false',
        'aria-label': 'Interactive spacecraft: Click to engage Warp Speed'
      },
      children: [shipSprite]
    });

    const label = createEl('span', {
      className: 'spaceship-dock__label',
      attrs: { id: 'spaceship-dock-label' },
      text: 'ENGAGE WARP'
    });

    dockMount.appendChild(shipBtn);
    dockMount.appendChild(label);
  }

  /**
   * Renders the site footer with resolved social icons and copyright info.
   */
  renderFooter() {
    const footerMount = document.getElementById('site-footer');
    if (!footerMount) return;
    footerMount.replaceChildren();

    const { footer, profile } = this.data;
    const innerChildren = [];

    if (footer.showSocialIcons) {
      const footerSocials = this.resolver.resolveSocialList(footer.socialIds);
      if (footerSocials.length > 0) {
        const socialsWrap = createEl('div', {
          className: 'site-footer__socials',
          attrs: { role: 'list', 'aria-label': 'Footer social links' }
        });
        for (const soc of footerSocials) {
          socialsWrap.appendChild(
            createEl('div', {
              attrs: { role: 'listitem' },
              children: [this.buildCompactSocialButton(soc)]
            })
          );
        }
        innerChildren.push(socialsWrap);
      }
    }

    if (footer.text) {
      innerChildren.push(createEl('p', { className: 'site-footer__text', text: footer.text }));
    }

    const metaParts = [];
    if (footer.showCopyright) {
      metaParts.push(`© ${footer.showYear ? new Date().getFullYear() : ''} ${profile.name}`.trim());
    } else if (footer.showYear) {
      metaParts.push(String(new Date().getFullYear()));
    }
    metaParts.push(this.data.site.name.toUpperCase());

    innerChildren.push(
      createEl('p', {
        className: 'site-footer__meta',
        text: metaParts.join(' • ')
      })
    );

    footerMount.appendChild(
      createEl('div', { className: 'site-footer__inner', children: innerChildren })
    );
  }

  /**
   * Helper to build consistent retro section headings.
   */
  buildSectionHeader({ eyebrow, title, subtitle, headingId }) {
    const id = headingId || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;
    const children = [
      createEl('span', { className: 'section-header__eyebrow', text: eyebrow }),
      createEl('div', {
        className: 'section-header__title-row',
        children: [
          createEl('h2', {
            className: 'section-header__title',
            attrs: { id },
            text: title
          })
        ]
      })
    ];

    if (subtitle) {
      children.push(createEl('p', { className: 'section-header__subtitle', text: subtitle }));
    }

    return createEl('header', { className: 'section-header', children });
  }

  /**
   * Helper to build "RETURN TO HOME" anchor at the bottom of deep sections.
   */
  buildBackToHomeNav() {
    const link = createEl('a', {
      className: 'back-home-link',
      attrs: {
        href: '#home',
        'data-section-link': 'home',
        'aria-label': 'Return to top home section'
      },
      children: [
        createEl('span', { text: '▲', attrs: { 'aria-hidden': 'true' } }),
        createEl('span', { text: 'RETURN TO HOME' })
      ]
    });

    return createEl('div', {
      className: 'section-footer-nav',
      children: [link]
    });
  }

  /**
   * Creates a properly configured `<a>` element from a LinkResolver descriptor.
   * @param {object} resolved
   * @param {string} className
   * @returns {HTMLAnchorElement}
   */
  createAnchorFromResolved(resolved, className) {
    const attrs = { href: resolved.href };
    if (resolved.target) attrs.target = resolved.target;
    if (resolved.rel) attrs.rel = resolved.rel;
    if (resolved.type === 'section' && resolved.sectionId) {
      attrs['data-section-link'] = resolved.sectionId;
    }

    return /** @type {HTMLAnchorElement} */ (createEl('a', { className, attrs }));
  }

  /**
   * Renders an accessible, polished error state when site.json fails to load,
   * including a functional Retry button. Never fabricates profile data.
   * @param {string} errorMessage
   * @param {() => void} onRetry
   */
  static renderErrorState(errorMessage, onRetry) {
    const mainMount = document.getElementById('main-content');
    if (!mainMount) return;
    mainMount.replaceChildren();

    const retryBtn = createEl('button', {
      className: 'pixel-btn pixel-btn--warp',
      attrs: { type: 'button' },
      text: 'RETRY TELEMETRY LOAD'
    });
    retryBtn.addEventListener('click', () => {
      if (typeof onRetry === 'function') onRetry();
    });

    const panel = createEl('section', {
      className: 'pixel-panel error-console',
      attrs: { role: 'alert', 'aria-live': 'assertive' },
      children: [
        createEl('span', { className: 'error-console__code', text: 'ERR // DATA_STREAM_INTERRUPTED' }),
        createEl('h1', { className: 'error-console__title', text: 'UNABLE TO LOAD PIXELVERSE CONFIGURATION' }),
        createEl('p', {
          className: 'error-console__msg',
          text: 'The centralized data/site.json configuration file could not be loaded or validated. Please check the JSON syntax and ensure the site is served over HTTP/HTTPS.'
        }),
        createEl('p', {
          className: 'site-footer__text',
          text: `Diagnostic: ${errorMessage}`
        }),
        retryBtn
      ]
    });

    mainMount.appendChild(panel);
  }
}
