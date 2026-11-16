/**
 * PIXELVERSE — Procedural 2D Canvas Spaceflight Engine
 * Implements perspective 3D->2D star projection, 4 parallax depth layers,
 * pixel-art nebulas, ringed planets, occasional asteroids, shooting stars,
 * and interactive Warp Speed hyperspace acceleration.
 */

export class SpaceflightEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} animationConfig Normalized animation object from site.json
   * @param {object} themeConfig Normalized theme object from site.json
   * @param {boolean} initialMotionEnabled
   */
  constructor(canvas, animationConfig, themeConfig, initialMotionEnabled = true) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.config = animationConfig;
    this.theme = themeConfig;
    this.motionEnabled = initialMotionEnabled;

    // Dimensions & Perspective Projection Constants
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.focalLength = 340;
    this.maxDepth = 1000;

    // Parallax cursor & scroll offsets
    this.pointerOffsetX = 0;
    this.pointerOffsetY = 0;
    this.targetPointerX = 0;
    this.targetPointerY = 0;

    // Speed & Warp State
    this.baseSpeed = this.config.baseSpeed || 1;
    this.warpMultiplier = this.config.warpMultiplier || 4;
    this.currentSpeedMultiplier = 1;
    this.targetSpeedMultiplier = 1;
    this.isWarping = false;
    this.warpTimerId = null;
    this.onWarpStateChange = null;

    // Animation loop state
    this.rafId = null;
    this.lastTimestamp = 0;
    this.isPageHidden = document.hidden;

    // Palette for stars & cosmic elements
    this.starPalette = [
      this.theme.text || '#F4F6FF',
      this.theme.secondary || '#64E9FF',
      this.theme.primary || '#9775FA',
      this.theme.accent || '#FF77C8',
      '#FFE59A',
      this.theme.muted || '#99A6CC'
    ];

    // Object Pools
    this.stars = [];
    this.nebulas = [];
    this.planets = [];
    this.asteroids = [];
    this.shootingStar = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 0,
      life: 0,
      maxLife: 0,
      cooldown: 3.5
    };

    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);

    this.initScene();
    this.bindEvents();
  }

  /**
   * Initializes canvas dimensions and populates object pools.
   */
  initScene() {
    this.updateCanvasSize();
    this.populateNebulas();
    this.populatePlanets();
    this.populateStars();
    this.populateAsteroids();

    if (this.motionEnabled && !this.isPageHidden) {
      this.start();
    } else {
      this.renderStaticFrame();
    }
  }

  /**
   * Resizes the canvas while capping DPR to 2 for optimal high-DPI performance.
   */
  updateCanvasSize() {
    this.width = Math.max(320, window.innerWidth);
    this.height = Math.max(320, window.innerHeight);
    this.centerX = Math.floor(this.width / 2);
    this.centerY = Math.floor(this.height / 2);

    const dpr = this.config.adaptiveQuality
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Calculates adaptive star count based on viewport width.
   * @returns {number}
   */
  getEffectiveStarCount() {
    const base = this.config.starCount || 180;
    if (!this.config.adaptiveQuality) return base;
    if (this.width <= 480) return Math.max(70, Math.floor(base * 0.55));
    if (this.width <= 900) return Math.max(110, Math.floor(base * 0.78));
    return base;
  }

  /**
   * Layer 2: Distant pixel nebula clusters.
   */
  populateNebulas() {
    this.nebulas = [
      {
        rx: 0.2,
        ry: 0.25,
        color: this.theme.primary || '#9775FA',
        blocks: [
          [0, 0, 48, 16],
          [-16, 16, 64, 16],
          [8, 32, 40, 12]
        ]
      },
      {
        rx: 0.82,
        ry: 0.68,
        color: this.theme.accent || '#FF77C8',
        blocks: [
          [0, 0, 44, 14],
          [-12, 14, 56, 14],
          [10, 28, 32, 12]
        ]
      },
      {
        rx: 0.75,
        ry: 0.2,
        color: this.theme.secondary || '#64E9FF',
        blocks: [
          [0, 0, 36, 12],
          [12, 12, 40, 12]
        ]
      }
    ];
  }

  /**
   * Layer 2: Distant pixel-art planets.
   */
  populatePlanets() {
    if (!this.config.planets) {
      this.planets = [];
      return;
    }

    this.planets = [
      {
        rx: 0.14,
        ry: 0.72,
        pixelSize: 4,
        hasRing: true,
        primaryColor: this.theme.primary || '#9775FA',
        bandColor: this.theme.accent || '#FF77C8',
        ringColor: '#FFE59A',
        driftPhase: 0
      },
      {
        rx: 0.86,
        ry: 0.24,
        pixelSize: 3,
        hasRing: false,
        primaryColor: this.theme.secondary || '#64E9FF',
        bandColor: '#151B35',
        ringColor: '#F4F6FF',
        driftPhase: 2.1
      }
    ];
  }

  /**
   * Layers 2, 3, and 4: 3D perspective stars with depth scaling and speed layers.
   */
  populateStars() {
    const count = this.getEffectiveStarCount();
    this.stars = [];

    for (let i = 0; i < count; i++) {
      const star = {
        x: 0,
        y: 0,
        z: 0,
        prevX: 0,
        prevY: 0,
        color: '#F4F6FF',
        layerSpeed: 1
      };
      this.resetStar(star, true);
      this.stars.push(star);
    }
  }

  /**
   * Resets a single star in the 3D volume without allocating a new object.
   * @param {object} star
   * @param {boolean} [randomDepth=false]
   */
  resetStar(star, randomDepth = false) {
    const spread = Math.max(this.width, this.height) * 1.4;
    star.x = (Math.random() - 0.5) * spread;
    star.y = (Math.random() - 0.5) * spread;
    star.z = randomDepth ? 40 + Math.random() * (this.maxDepth - 40) : this.maxDepth;
    star.color = this.starPalette[Math.floor(Math.random() * this.starPalette.length)];
    // Assign speed layer (0.65 distant, 1.0 midground, 1.35 foreground)
    const r = Math.random();
    star.layerSpeed = r < 0.35 ? 0.65 : (r < 0.8 ? 1.0 : 1.35);

    const scale = this.focalLength / star.z;
    star.prevX = this.centerX + star.x * scale;
    star.prevY = this.centerY + star.y * scale;
  }

  /**
   * Layer 4: Occasional pixel-art asteroids drifting through midground/foreground.
   */
  populateAsteroids() {
    this.asteroids = [];
    for (let i = 0; i < 3; i++) {
      this.asteroids.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 18,
        vy: 10 + Math.random() * 14,
        size: 3 + (i % 2)
      });
    }
  }

  /**
   * Starts the requestAnimationFrame loop.
   */
  start() {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  /**
   * Stops the requestAnimationFrame loop.
   */
  stop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Enables or disables continuous animation (for reduced motion or user toggle).
   * @param {boolean} enabled
   */
  setMotionEnabled(enabled) {
    this.motionEnabled = Boolean(enabled);
    if (!this.motionEnabled) {
      if (this.isWarping) {
        this.endWarp();
      }
      this.stop();
      this.renderStaticFrame();
    } else if (!this.isPageHidden) {
      this.start();
    }
  }

  /**
   * Triggers a temporary hyperspace Warp Speed sequence (~3.2 seconds) or toggles it.
   * Respects reduced-motion settings safely.
   * @param {(warping: boolean) => void} [onStateChange]
   */
  triggerWarpSpeed(onStateChange) {
    if (onStateChange) {
      this.onWarpStateChange = onStateChange;
    }

    // If motion is disabled, automatically enable motion or provide gentle feedback
    if (!this.motionEnabled) {
      return false;
    }

    if (this.isWarping) {
      this.endWarp();
      return false;
    }

    this.isWarping = true;
    this.targetSpeedMultiplier = this.warpMultiplier;
    if (typeof this.onWarpStateChange === 'function') {
      this.onWarpStateChange(true);
    }

    if (this.warpTimerId) {
      window.clearTimeout(this.warpTimerId);
    }

    this.warpTimerId = window.setTimeout(() => {
      this.endWarp();
    }, 3200);

    return true;
  }

  /**
   * Smoothly exits Warp Speed back to standard cruise speed.
   */
  endWarp() {
    this.isWarping = false;
    this.targetSpeedMultiplier = 1;
    if (this.warpTimerId) {
      window.clearTimeout(this.warpTimerId);
      this.warpTimerId = null;
    }
    if (typeof this.onWarpStateChange === 'function') {
      this.onWarpStateChange(false);
    }
  }

  /**
   * Updates subtle environmental parallax target from cursor movement.
   * @param {number} clientX
   * @param {number} clientY
   */
  setPointerPosition(clientX, clientY) {
    if (!this.config.parallax || !this.motionEnabled) return;
    const normX = (clientX / this.width) - 0.5;
    const normY = (clientY / this.height) - 0.5;
    this.targetPointerX = normX * 28;
    this.targetPointerY = normY * 20;
  }

  /**
   * Main animation frame callback with capped delta-time.
   * @param {number} timestamp
   */
  tick(timestamp) {
    this.rafId = null;
    if (!this.motionEnabled || this.isPageHidden) return;

    // Calculate delta time in seconds and cap at 50ms to prevent jumps after tab switch
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw(false);

    this.rafId = window.requestAnimationFrame(this.tick);
  }

  /**
   * Updates all spaceflight entities using delta-time.
   * @param {number} dt
   */
  update(dt) {
    // Smoothly interpolate speed multiplier for Warp Speed transition
    const lerpRate = this.isWarping ? 5.5 : 3.0;
    this.currentSpeedMultiplier += (this.targetSpeedMultiplier - this.currentSpeedMultiplier) * Math.min(1, dt * lerpRate);

    // Smoothly interpolate parallax offset
    this.pointerOffsetX += (this.targetPointerX - this.pointerOffsetX) * Math.min(1, dt * 4);
    this.pointerOffsetY += (this.targetPointerY - this.pointerOffsetY) * Math.min(1, dt * 4);

    const effectiveSpeed = 165 * this.baseSpeed * this.currentSpeedMultiplier;
    const vanishX = this.centerX - this.pointerOffsetX * 0.6;
    const vanishY = this.centerY - this.pointerOffsetY * 0.6;

    // Update 3D stars
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const prevScale = this.focalLength / star.z;
      star.prevX = vanishX + star.x * prevScale;
      star.prevY = vanishY + star.y * prevScale;

      star.z -= effectiveSpeed * star.layerSpeed * dt;

      if (star.z <= 8) {
        this.resetStar(star, false);
        continue;
      }

      const scale = this.focalLength / star.z;
      const sx = vanishX + star.x * scale;
      const sy = vanishY + star.y * scale;

      if (sx < -60 || sx > this.width + 60 || sy < -60 || sy > this.height + 60) {
        this.resetStar(star, false);
      }
    }

    // Update planet gentle drift phase
    for (let i = 0; i < this.planets.length; i++) {
      this.planets[i].driftPhase += dt * 0.6;
    }

    // Update occasional pixel asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const ast = this.asteroids[i];
      ast.x += ast.vx * dt * (1 + (this.currentSpeedMultiplier - 1) * 0.35);
      ast.y += ast.vy * dt * (1 + (this.currentSpeedMultiplier - 1) * 0.35);

      if (ast.y > this.height + 40 || ast.x < -40 || ast.x > this.width + 40) {
        ast.x = Math.random() * this.width;
        ast.y = -30;
      }
    }

    // Update shooting stars
    if (this.config.shootingStars) {
      this.updateShootingStar(dt);
    }
  }

  /**
   * Manages pooled shooting star lifecycle.
   * @param {number} dt
   */
  updateShootingStar(dt) {
    const s = this.shootingStar;
    if (!s.active) {
      s.cooldown -= dt;
      if (s.cooldown <= 0) {
        s.active = true;
        s.x = Math.random() * (this.width * 0.75);
        s.y = Math.random() * (this.height * 0.35);
        s.vx = 420 + Math.random() * 180;
        s.vy = 180 + Math.random() * 110;
        s.length = 48;
        s.life = 0;
        s.maxLife = 0.65;
      }
      return;
    }

    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life += dt;

    if (s.life >= s.maxLife || s.x > this.width + 80 || s.y > this.height + 80) {
      s.active = false;
      s.cooldown = 3.5 + Math.random() * 5.0;
    }
  }

  /**
   * Renders a single crisp static pixel-art starfield frame when reduced motion is active.
   */
  renderStaticFrame() {
    this.currentSpeedMultiplier = 1;
    this.draw(true);
  }

  /**
   * Draws all 4 depth layers onto the 2D canvas using integer pixel coordinates.
   * @param {boolean} isStatic
   */
  draw(isStatic = false) {
    const ctx = this.ctx;

    // Layer 1: Deep-space background fill
    ctx.fillStyle = this.theme.background || '#080B1A';
    ctx.fillRect(0, 0, this.width, this.height);

    // Layer 2A: Distant pixel nebula clusters
    ctx.save();
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < this.nebulas.length; i++) {
      const neb = this.nebulas[i];
      const baseX = Math.floor(neb.rx * this.width - this.pointerOffsetX * 0.18);
      const baseY = Math.floor(neb.ry * this.height - this.pointerOffsetY * 0.18);
      ctx.fillStyle = neb.color;
      for (const [bx, by, bw, bh] of neb.blocks) {
        ctx.fillRect(baseX + bx, baseY + by, bw, bh);
      }
    }
    ctx.restore();

    // Layer 2B: Distant pixel-art planets
    if (this.config.planets) {
      for (let i = 0; i < this.planets.length; i++) {
        this.drawPixelPlanet(this.planets[i]);
      }
    }

    // Layers 2, 3, 4: Perspective 3D Stars & Warp Trails
    const vanishX = this.centerX - this.pointerOffsetX * 0.6;
    const vanishY = this.centerY - this.pointerOffsetY * 0.6;
    const showWarpTrails = !isStatic && this.currentSpeedMultiplier > 1.35;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const scale = this.focalLength / star.z;
      const sx = Math.floor(vanishX + star.x * scale);
      const sy = Math.floor(vanishY + star.y * scale);

      if (sx < 0 || sx >= this.width || sy < 0 || sy >= this.height) continue;

      // Apparent pixel size grows as depth z decreases (1px distant -> 4px foreground)
      const depthRatio = 1 - star.z / this.maxDepth;
      const pixelSize = depthRatio > 0.82 ? 4 : (depthRatio > 0.55 ? 3 : (depthRatio > 0.25 ? 2 : 1));

      ctx.fillStyle = star.color;

      if (showWarpTrails) {
        // Draw pixel-stepped hyperspace streak from previous projected position
        ctx.strokeStyle = star.color;
        ctx.lineWidth = Math.max(1, pixelSize - 1);
        ctx.beginPath();
        ctx.moveTo(Math.floor(star.prevX), Math.floor(star.prevY));
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      ctx.fillRect(sx, sy, pixelSize, pixelSize);
    }

    // Layer 3: Drifting Pixel Asteroids
    if (!isStatic) {
      for (let i = 0; i < this.asteroids.length; i++) {
        this.drawPixelAsteroid(this.asteroids[i]);
      }
    }

    // Layer 4: Shooting Star
    if (!isStatic && this.shootingStar.active) {
      const s = this.shootingStar;
      const px = Math.floor(s.x);
      const py = Math.floor(s.y);
      ctx.fillStyle = '#FFE59A';
      ctx.fillRect(px, py, 4, 4);
      ctx.fillStyle = '#64E9FF';
      ctx.fillRect(px - 10, py - 4, 6, 2);
      ctx.fillStyle = '#FF77C8';
      ctx.fillRect(px - 20, py - 8, 6, 2);
    }
  }

  /**
   * Renders a crisp stepped pixel-art planet on the canvas.
   * @param {object} planet
   */
  drawPixelPlanet(planet) {
    const ctx = this.ctx;
    const p = planet.pixelSize;
    const floatY = this.motionEnabled ? Math.floor(Math.sin(planet.driftPhase) * 3) : 0;
    const cx = Math.floor(planet.rx * this.width - this.pointerOffsetX * 0.28);
    const cy = Math.floor(planet.ry * this.height - this.pointerOffsetY * 0.28) + floatY;

    ctx.save();
    ctx.globalAlpha = 0.72;

    // Planet body (pixelated circle blocks)
    ctx.fillStyle = planet.primaryColor;
    ctx.fillRect(cx - 3 * p, cy - 5 * p, 6 * p, 10 * p);
    ctx.fillRect(cx - 5 * p, cy - 3 * p, 10 * p, 6 * p);
    ctx.fillRect(cx - 4 * p, cy - 4 * p, 8 * p, 8 * p);

    // Band stripe
    ctx.fillStyle = planet.bandColor;
    ctx.fillRect(cx - 5 * p, cy - 1 * p, 10 * p, 2 * p);

    // Shadow crescent at bottom
    ctx.fillStyle = '#080B1A';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(cx - 4 * p, cy + 2 * p, 8 * p, 2 * p);
    ctx.fillRect(cx - 3 * p, cy + 4 * p, 6 * p, 1 * p);

    // Optional Pixel Ring
    if (planet.hasRing) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = planet.ringColor;
      ctx.fillRect(cx - 8 * p, cy - 1 * p, 3 * p, p);
      ctx.fillRect(cx - 5 * p, cy, 4 * p, p);
      ctx.fillRect(cx - 1 * p, cy + p, 6 * p, p);
      ctx.fillRect(cx + 5 * p, cy + 2 * p, 3 * p, p);
    }

    ctx.restore();
  }

  /**
   * Renders a small pixel-art asteroid sprite on the canvas.
   * @param {object} ast
   */
  drawPixelAsteroid(ast) {
    const ctx = this.ctx;
    const x = Math.floor(ast.x);
    const y = Math.floor(ast.y);
    const s = ast.size;

    ctx.fillStyle = '#2E3B6E';
    ctx.fillRect(x, y, s * 3, s * 2);
    ctx.fillRect(x + s * 0.5, y - s * 0.5, s * 2, s * 3);
    ctx.fillStyle = '#99A6CC';
    ctx.fillRect(x + s * 0.5, y, s, s);
  }

  /**
   * Binds resize and visibility listeners once.
   */
  bindEvents() {
    window.addEventListener('resize', this.handleResize, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  handleResize() {
    this.updateCanvasSize();
    if (!this.motionEnabled || this.isPageHidden) {
      this.renderStaticFrame();
    }
  }

  handleVisibilityChange() {
    this.isPageHidden = document.hidden;
    if (this.isPageHidden) {
      this.stop();
    } else if (this.motionEnabled) {
      this.start();
    }
  }
}
