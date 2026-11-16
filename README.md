# PIXELVERSE — Retro Pixel-Art Personal Link Hub & Space Adventure

**Pixelverse** is a lightweight, handcrafted **8-bit / 16-bit retro pixel-art space adventure** personal link hub, portfolio, and character-profile page built exclusively with **HTML5, CSS3, Vanilla JavaScript (ES6+), HTML5 2D Canvas, and JSON**.

Every profile detail, social network, link card, About Me section, skill badge, project mission, contact channel, color palette, and animation setting is dynamically controlled from a single centralized configuration file: [`data/site.json`](./data/site.json).

---

## Key Features

- **Single Source of Truth (`data/site.json`)**: Update a social URL once in `socials`, and every Link Card, Profile Icon, About Me reference, Project link, Contact card, and Footer icon updates automatically.
- **Procedural 2D Canvas Spaceflight**: Perspective-projected 3D starfield with 4 depth layers, pixel nebulas, ringed planets, drifting asteroids, and shooting stars.
- **Interactive Warp Speed**: Trigger a hyperspace acceleration sequence from the top HUD button or by clicking the bottom-right pixel-art spacecraft companion.
- **Character-Sheet About Me Section**: RPG-inspired character profile (`CHARACTER PROFILE`, `ABOUT THE EXPLORER`, `SKILL INVENTORY`, `CURRENT MISSIONS`, `COMMUNICATION CHANNELS`).
- **Zero Dependencies & Zero Build Step**: Pure static files ready for any web server or static host.
- **Accessible & Reduced-Motion Safe**: Semantic landmarks, keyboard navigation, 44×44px minimum touch targets, `prefers-reduced-motion` support, and a persistent `MOTION: ON/OFF` toggle.

---

## Project Structure

```text
pixelverse/
├── index.html
├── README.md
├── .gitignore
├── favicon.svg
├── data/
│   └── site.json
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── main.css
│   ├── components.css
│   ├── animations.css
│   └── responsive.css
├── js/
│   ├── main.js
│   ├── data-loader.js
│   ├── content-renderer.js
│   ├── link-resolver.js
│   ├── spaceflight.js
│   ├── interactions.js
│   ├── settings.js
│   └── utils.js
└── assets/
    ├── avatar/
    │   └── profile.svg
    ├── icons/
    │   ├── github.svg
    │   ├── discord.svg
    │   ├── instagram.svg
    │   ├── youtube.svg
    │   ├── linkedin.svg
    │   ├── email.svg
    │   ├── portfolio.svg
    │   └── external.svg
    ├── sprites/
    │   ├── spaceship.svg
    │   ├── planet.svg
    │   ├── asteroid.svg
    │   └── stars.svg
    └── fonts/
        └── README.md
```

---

## Running Locally (Development)

Because Pixelverse loads [`data/site.json`](./data/site.json) using `fetch()` and native ES6 modules (`<script type="module">`), open it through a local static HTTP server rather than `file://`.

### Option 1: Python (Built-in)

```bash
python3 -m http.server 8000
```

### Option 2: Node.js `npx serve` (Optional)

```bash
npx serve -l 8000 .
```

Then open **`http://localhost:8000`** in your browser. No package installation or build command is required.

---

## Complete Content Editing Guide (`data/site.json`)

All personal content is edited in **`data/site.json`**. You never need to edit HTML or JavaScript files to update your links or profile.

### 1. How to Change the Profile

Edit the `"profile"` object in `data/site.json`:

```json
"profile": {
  "name": "ALEX NOVA",
  "username": "@alexnova",
  "headline": "Developer • Creator • Space Explorer",
  "avatar": "./assets/avatar/profile.svg",
  "status": {
    "label": "ONLINE",
    "color": "green",
    "visible": true
  },
  "location": "Earth",
  "shortBio": "Building cool things across the digital universe.",
  "primaryAction": {
    "label": "ABOUT ME",
    "type": "section",
    "sectionId": "about"
  }
}
```

- Supported `status.color` values: `"green"`, `"yellow"`, `"red"`, `"cyan"`, or any hex color.
- Set `"visible": false` inside `status` to hide the status badge.

### 2. How to Add or Edit Social Links

All social networks live in the centralized `"socials"` array. Each entry has a unique `"id"`:

```json
{
  "id": "github",
  "name": "GitHub",
  "username": "your-github-handle",
  "description": "Explore my open-source projects",
  "url": "https://github.com/your-github-handle",
  "icon": "github",
  "color": "#F4F6FF",
  "enabled": true,
  "featured": true
}
```

- **`featured: true`**: Displays a compact pixel icon button directly inside the top profile card.
- **`enabled: false`**: Automatically hides this social network everywhere it is referenced across the entire website (Link Cards, About Me, Projects, Contact, and Footer).

### 3. How to Connect a Social Link to a Link Card

Inside `"linkCards"`, reference any social entry by its `"socialId"` without repeating its URL, title, or description:

```json
{
  "id": "card-github",
  "type": "social",
  "socialId": "github",
  "style": "primary",
  "enabled": true
}
```

- Card `"style"` options: `"primary"`, `"accent"`, or `"default"`.
- You can also create internal section cards (`"type": "section"`, `"sectionId": "about"`) or direct external URL cards (`"type": "external"`, `"url": "https://example.com/"`).

### 4. How to Edit About Me Content

Edit the `"about"` object to update your biography paragraphs and highlight cards:

```json
"about": {
  "id": "about",
  "enabled": true,
  "title": "ABOUT ME",
  "subtitle": "The person behind the pixels",
  "intro": "Hello! I'm a developer and creative explorer.",
  "paragraphs": [
    "I enjoy building interactive websites, applications, and unique digital experiences.",
    "My interests include software development, creative technology, and exploring new ideas."
  ],
  "highlights": [
    {
      "id": "highlight-development",
      "icon": "code",
      "title": "DEVELOPMENT",
      "description": "Building websites, applications, and useful tools."
    }
  ],
  "socialIds": ["github", "linkedin", "discord"],
  "showSkills": true,
  "showProjects": true
}
```

### 5. How to Reference Social Links from About Me, Contact, and Footer

List the social IDs you want to display in each section's `"socialIds"` array:

```json
"about": {
  "socialIds": ["github", "linkedin", "discord"]
},
"contact": {
  "socialIds": ["email", "discord", "linkedin"]
},
"footer": {
  "socialIds": ["github", "discord", "instagram"]
}
```

### 6. How to Add Projects

Add items to `"projects.items"`:

```json
{
  "id": "project-one",
  "title": "PROJECT ALPHA",
  "description": "An interactive web experience.",
  "tags": ["HTML", "CSS", "JavaScript"],
  "featured": true,
  "links": [
    {
      "label": "SOURCE CODE",
      "type": "social",
      "socialId": "github"
    }
  ]
}
```

### 7. How to Add Project Links

Each project's `"links"` array supports both centralized `"social"` references and direct `"external"` links:

```json
"links": [
  {
    "label": "SOURCE CODE",
    "type": "social",
    "socialId": "github"
  },
  {
    "label": "LIVE DEMO",
    "type": "external",
    "url": "https://example.com/demo"
  }
]
```

### 8. How to Disable a Section

Set `"enabled": false` on `"about"`, `"projects"`, `"skills"`, or `"contact"`:

```json
"projects": {
  "id": "projects",
  "enabled": false
}
```

When a section is disabled, the Link Resolver automatically removes any navigation items and link cards pointing to that section so visitors never encounter broken anchors.

### 9. How to Change the Theme

Update hex colors in `"theme"` to customize the CSS custom properties at runtime:

```json
"theme": {
  "primary": "#9775FA",
  "secondary": "#64E9FF",
  "accent": "#FF77C8",
  "background": "#080B1A",
  "surface": "#151B35",
  "text": "#F4F6FF",
  "muted": "#99A6CC"
}
```

### 10. How to Adjust Animation Performance

Fine-tune the spaceflight canvas inside `"animation"`:

```json
"animation": {
  "enabled": true,
  "starCount": 180,
  "baseSpeed": 1,
  "warpMultiplier": 4,
  "parallax": true,
  "shootingStars": true,
  "planets": true,
  "spaceship": true,
  "particleEffects": true,
  "adaptiveQuality": true
}
```

---

## SEO & Social Crawler Metadata Synchronization

Because some search engine and social media link-preview crawlers (such as Open Graph / Twitter Card scrapers) do not execute client-side JavaScript `fetch()` requests, `index.html` includes static `<title>`, `<meta name="description">`, `og:*`, `twitter:*`, and `<link rel="canonical">` tags in `<head>`.

When deploying to production with your own name and domain, synchronize these static tags in `index.html` with your `site` and `profile` fields in `data/site.json`:

1. `<title>` and `og:title` / `twitter:title` → match `site.title`
2. `<meta name="description">`, `og:description`, `twitter:description` → match `site.description`
3. `<link rel="canonical">` and `og:url` → set to your live HTTPS URL
4. `og:image` and `twitter:image` → set to an absolute URL pointing to your avatar or preview banner

---

## Static Deployment Instructions

Pixelverse is a 100% static website with relative asset paths (`./assets/...`, `./data/site.json`) and zero build steps.

- **GitHub Pages**: Push the repository to GitHub, open **Settings → Pages**, and select your branch (`main` / root `/`).