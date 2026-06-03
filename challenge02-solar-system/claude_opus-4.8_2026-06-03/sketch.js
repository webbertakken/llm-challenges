'use strict';

/*
 * Solar System — p5.js
 * --------------------------------------------------------------------------
 * A top-down, stylised but proportionally-faithful model of the Solar System.
 *
 * Scales are deliberately compressed so the whole system is visible on one
 * screen: orbital distances follow AU^0.6, body sizes follow (size/Earth)^0.45,
 * and orbital periods follow Kepler's third law (period ∝ AU^1.5) compressed so
 * the outer planets still move perceptibly. Relative ordering — who is bigger,
 * who is farther, who is faster — is preserved throughout.
 *
 * Features: glowing Sun, eight planets with shaded spheres and banded gas
 * giants, moons around four planets, Saturn's and Uranus' rings, an asteroid
 * belt, a Kuiper belt, a starfield with parallax and twinkle, a comet on an
 * eccentric Keplerian orbit, and zoom / pan / speed controls.
 *
 * Controls
 *   • Drag .................. pan
 *   • Scroll / pinch ........ zoom (towards the cursor)
 *   • Space ................. pause / resume
 *   • + / - ................. faster / slower
 *   • L ..................... toggle labels
 *   • O ..................... toggle orbit paths
 *   • H ..................... toggle the help overlay
 *   • R ..................... reset the view
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  sunRadius: 34, // px
  orbitScale: 92, // px per AU^orbitExponent
  orbitExponent: 0.6,
  sizeBase: 6, // px radius for an Earth-sized body
  sizeExponent: 0.45,
  periodScale: 8, // seconds for one Earth orbit at speed = 1
  periodExponent: 0.93, // = 1.5 (Kepler) × 0.62 (visual compression)
  starCount: 540,
  asteroidCount: 440,
  kuiperCount: 240,
  minZoom: 0.12,
  maxZoom: 6,
};

// Planet data. Sizes are radii relative to Earth (= 1); distances are the
// semi-major axis in astronomical units; colours are the base body tint.
// `bands` (gas giants) are translucent latitude stripes painted over the body.
const PLANETS = [
  {
    name: 'Mercury',
    au: 0.39,
    size: 0.383,
    col: [168, 158, 148],
    moons: [],
  },
  {
    name: 'Venus',
    au: 0.72,
    size: 0.949,
    col: [224, 186, 132],
    moons: [],
  },
  {
    name: 'Earth',
    au: 1.0,
    size: 1.0,
    col: [76, 130, 205],
    atmosphere: [120, 180, 255],
    moons: [{ name: 'Moon', dist: 15, size: 1.7, period: 2.0, col: [200, 200, 205] }],
  },
  {
    name: 'Mars',
    au: 1.52,
    size: 0.532,
    col: [198, 96, 60],
    moons: [
      { name: 'Phobos', dist: 9, size: 0.8, period: 0.8, col: [150, 130, 120] },
      { name: 'Deimos', dist: 13, size: 0.6, period: 1.4, col: [160, 140, 128] },
    ],
  },
  {
    name: 'Jupiter',
    au: 5.2,
    size: 11.21,
    col: [206, 162, 116],
    bands: [
      [150, 110, 80, 90],
      [225, 200, 165, 70],
      [170, 120, 90, 80],
      [210, 180, 150, 60],
    ],
    spot: [200, 90, 70], // the Great Red Spot
    moons: [
      { name: 'Io', dist: 27, size: 1.4, period: 1.2, col: [225, 210, 130] },
      { name: 'Europa', dist: 33, size: 1.2, period: 1.8, col: [210, 200, 185] },
      { name: 'Ganymede', dist: 41, size: 1.9, period: 2.6, col: [170, 160, 150] },
      { name: 'Callisto', dist: 51, size: 1.7, period: 3.6, col: [120, 110, 105] },
    ],
  },
  {
    name: 'Saturn',
    au: 9.58,
    size: 9.45,
    col: [222, 196, 148],
    bands: [
      [190, 165, 120, 70],
      [235, 215, 175, 60],
      [200, 175, 130, 70],
    ],
    rings: { inner: 1.45, outer: 2.35, tilt: -0.42, col: [225, 210, 180] },
    moons: [
      { name: 'Titan', dist: 36, size: 1.7, period: 2.6, col: [210, 170, 110] },
      { name: 'Rhea', dist: 27, size: 1.0, period: 1.6, col: [180, 180, 185] },
    ],
  },
  {
    name: 'Uranus',
    au: 19.2,
    size: 4.01,
    col: [156, 214, 222],
    bands: [
      [140, 200, 210, 50],
      [175, 225, 230, 40],
    ],
    rings: { inner: 1.6, outer: 1.95, tilt: 1.3, col: [150, 175, 185] },
    moons: [{ name: 'Titania', dist: 22, size: 0.9, period: 2.2, col: [185, 180, 178] }],
  },
  {
    name: 'Neptune',
    au: 30.05,
    size: 3.88,
    col: [70, 110, 220],
    bands: [
      [50, 85, 190, 70],
      [95, 135, 235, 50],
    ],
    spot: [40, 60, 150], // the Great Dark Spot
    moons: [
      // Triton orbits retrograde — encoded with a negative period.
      { name: 'Triton', dist: 22, size: 1.3, period: -2.2, col: [205, 200, 195] },
    ],
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let simTime = 0; // accumulated simulation time (seconds)
let speed = 3; // simulation speed multiplier
let paused = false;
let showLabels = true;
let showOrbits = true;
let showHelp = true;

const cam = { zoom: 1, panX: 0, panY: 0 };

let stars = [];
let asteroids = [];
let kuiper = [];
let comet = null;

// Per-planet derived display values, filled in setup().
const bodies = [];

// ---------------------------------------------------------------------------
// Derived-value helpers
// ---------------------------------------------------------------------------

const orbitRadius = (au) => Math.pow(au, CONFIG.orbitExponent) * CONFIG.orbitScale;
const bodyRadius = (size) => Math.pow(size, CONFIG.sizeExponent) * CONFIG.sizeBase;
// Angular velocity (radians/second) from the (compressed) orbital period.
const angularSpeed = (au) =>
  (TWO_PI / (Math.pow(au, CONFIG.periodExponent) * CONFIG.periodScale));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.parent('app');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // Screen-reader description (p5 accessibility helper).
  describe(
    'An animated, top-down solar system: a glowing sun at the centre with the ' +
      'eight planets orbiting at proportional distances and speeds, several moons, ' +
      'planetary rings, an asteroid belt, a starfield and a comet.'
  );

  buildBodies();
  buildStarfield();
  buildAsteroidBelt();
  buildKuiperBelt();
  buildComet();
  resetView();

  // Dismiss the HTML loading overlay now that the first frame is about to draw.
  const boot = document.getElementById('boot');
  if (boot) {
    boot.style.opacity = '0';
    setTimeout(() => boot.remove(), 600);
  }
}

function buildBodies() {
  bodies.length = 0;
  for (const p of PLANETS) {
    bodies.push({
      ...p,
      r: bodyRadius(p.size),
      orbit: orbitRadius(p.au),
      omega: angularSpeed(p.au),
      angle: random(TWO_PI),
      spin: random(TWO_PI),
      moons: p.moons.map((m) => ({ ...m, angle: random(TWO_PI) })),
    });
  }
}

function buildStarfield() {
  stars = [];
  for (let i = 0; i < CONFIG.starCount; i++) {
    // A handful of stars are brighter and tinted; most are faint white points.
    const bright = random() < 0.12;
    stars.push({
      x: random(width),
      y: random(height),
      size: bright ? random(1.6, 2.8) : random(0.5, 1.4),
      base: bright ? random(180, 255) : random(90, 180),
      twinkle: random(TWO_PI),
      speed: random(0.6, 2.2),
      depth: random(0.02, 0.18), // parallax factor
      tint: bright ? random([[255, 240, 220], [210, 225, 255], [255, 255, 255]]) : [255, 255, 255],
    });
  }
}

function buildAsteroidBelt() {
  asteroids = [];
  for (let i = 0; i < CONFIG.asteroidCount; i++) {
    const au = random(2.05, 3.35);
    asteroids.push({
      orbit: orbitRadius(au) + random(-7, 7),
      angle: random(TWO_PI),
      omega: angularSpeed(au) * random(0.92, 1.08),
      size: random(0.5, 1.7),
      shade: random(90, 190),
    });
  }
}

function buildKuiperBelt() {
  kuiper = [];
  for (let i = 0; i < CONFIG.kuiperCount; i++) {
    const au = random(33, 48);
    kuiper.push({
      orbit: orbitRadius(au) + random(-12, 12),
      angle: random(TWO_PI),
      omega: angularSpeed(au) * random(0.9, 1.1),
      size: random(0.5, 1.5),
      shade: random(70, 150),
    });
  }
}

function buildComet() {
  comet = {
    a: 560, // semi-major axis (px)
    e: 0.78, // eccentricity
    arg: random(TWO_PI), // orientation of the orbit
    omega: TWO_PI / 70, // mean motion (rad/s at speed 1)
    M: random(TWO_PI), // current mean anomaly
  };
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

function draw() {
  if (!paused) simTime += (deltaTime / 1000) * speed;

  drawSpace();
  drawStarfield();

  push();
  // Camera: centre the origin, then apply pan and zoom.
  translate(width / 2 + cam.panX, height / 2 + cam.panY);
  scale(cam.zoom);

  if (showOrbits) drawOrbitPaths();
  drawBelt(kuiper, 200);
  drawBelt(asteroids, 235);
  drawSun();

  const labels = [];
  for (const b of bodies) drawPlanet(b, labels);
  drawComet();

  pop();

  if (showLabels) drawLabels(labels);
  drawHud();
}

// ---------------------------------------------------------------------------
// Background & stars
// ---------------------------------------------------------------------------

function drawSpace() {
  // A subtle vertical gradient gives the void a touch of depth.
  const ctx = drawingContext;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#070912');
  g.addColorStop(0.6, '#05060c');
  g.addColorStop(1, '#03040a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawStarfield() {
  noStroke();
  const t = simTime;
  for (const s of stars) {
    // Parallax: stars drift opposite to the pan, scaled by their depth.
    let x = (s.x + cam.panX * s.depth) % width;
    let y = (s.y + cam.panY * s.depth) % height;
    if (x < 0) x += width;
    if (y < 0) y += height;

    const tw = 0.6 + 0.4 * sin(t * s.speed + s.twinkle);
    const a = s.base * tw;
    fill(s.tint[0], s.tint[1], s.tint[2], a);
    circle(x, y, s.size);

    // Bright stars get a soft cross glint.
    if (s.size > 1.8) {
      fill(s.tint[0], s.tint[1], s.tint[2], a * 0.4);
      rect(x - s.size * 2, y - 0.25, s.size * 4, 0.5);
      rect(x - 0.25, y - s.size * 2, 0.5, s.size * 4);
    }
  }
}

// ---------------------------------------------------------------------------
// The Sun
// ---------------------------------------------------------------------------

function drawSun() {
  const ctx = drawingContext;
  const r = CONFIG.sunRadius;
  const pulse = 1 + 0.03 * sin(simTime * 1.5);

  // Outer corona — a wide, soft radial glow.
  let g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 6.5 * pulse);
  g.addColorStop(0, 'rgba(255, 226, 150, 0.55)');
  g.addColorStop(0.25, 'rgba(255, 174, 70, 0.32)');
  g.addColorStop(0.6, 'rgba(255, 120, 40, 0.10)');
  g.addColorStop(1, 'rgba(255, 90, 30, 0)');
  ctx.fillStyle = g;
  noStroke();
  circle(0, 0, r * 13 * pulse);

  // The photosphere — white-hot core fading to deep orange at the limb.
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.05);
  g.addColorStop(0, '#fffdf2');
  g.addColorStop(0.45, '#ffe27a');
  g.addColorStop(0.8, '#ffb13b');
  g.addColorStop(1, '#ff7e1f');
  ctx.fillStyle = g;
  circle(0, 0, r * 2.1 * pulse);
}

// ---------------------------------------------------------------------------
// Planets, moons and rings
// ---------------------------------------------------------------------------

function drawOrbitPaths() {
  noFill();
  for (const b of bodies) {
    stroke(255, 255, 255, 22);
    strokeWeight(1 / cam.zoom);
    circle(0, 0, b.orbit * 2);
  }
}

function drawPlanet(b, labels) {
  const x = cos(b.angle + simTime * b.omega) * b.orbit;
  const y = sin(b.angle + simTime * b.omega) * b.orbit;

  push();
  translate(x, y);

  // Rings behind the planet (the far arc).
  if (b.rings) drawRings(b, false);

  // A faint atmospheric halo for bodies that have one.
  if (b.atmosphere || b.size > 3) drawHalo(b);

  // The shaded sphere, lit from the Sun (at the origin in world space).
  const sunDir = atan2(-y, -x);
  drawSphere(0, 0, b.r, b.col, sunDir, b);

  // Rings in front of the planet (the near arc).
  if (b.rings) drawRings(b, true);

  // Moons, lit from the same direction as their planet.
  for (const m of b.moons) drawMoon(m, sunDir);

  pop();

  labels.push({ name: b.name, x, y, r: b.r });
}

function drawHalo(b) {
  const ctx = drawingContext;
  const tint = b.atmosphere || b.col;
  const g = ctx.createRadialGradient(0, 0, b.r * 0.7, 0, 0, b.r * 1.7);
  g.addColorStop(0, `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0.28)`);
  g.addColorStop(1, `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0)`);
  ctx.fillStyle = g;
  noStroke();
  circle(0, 0, b.r * 3.4);
}

// Draws a lit sphere with a terminator. `light` is the angle toward the Sun.
function drawSphere(cx, cy, r, col, light, b) {
  const ctx = drawingContext;
  const lx = cx + cos(light) * r * 0.42;
  const ly = cy + sin(light) * r * 0.42;

  const g = ctx.createRadialGradient(lx, ly, r * 0.08, cx, cy, r * 1.12);
  g.addColorStop(0, rgb(shade(col, 0.45)));
  g.addColorStop(0.55, rgb(col));
  g.addColorStop(1, rgb(shade(col, -0.6)));
  ctx.fillStyle = g;
  noStroke();
  circle(cx, cy, r * 2);

  // Gas-giant latitude bands and storms, clipped to the disc.
  if (b && (b.bands || b.spot)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.clip();
    if (b.bands) drawBands(cx, cy, r, b.bands, b.spin);
    if (b.spot) {
      const sx = cx + cos(b.spin) * r * 0.4;
      const sy = cy + r * 0.28;
      fill(b.spot[0], b.spot[1], b.spot[2], 150);
      ellipse(sx, sy, r * 0.5, r * 0.3);
    }
    ctx.restore();
  }
}

function drawBands(cx, cy, r, bands, spin) {
  noStroke();
  const n = bands.length;
  // Slight vertical wobble animates the cloud belts over time.
  for (let i = 0; i < n; i++) {
    const c = bands[i];
    const t0 = -r + (i / n) * 2 * r;
    const h = (2 * r) / n + 1;
    const wobble = sin(spin * 0.5 + i) * r * 0.04;
    fill(c[0], c[1], c[2], c[3]);
    rect(cx - r, cy + t0 + wobble, r * 2, h);
  }
}

// Saturn / Uranus rings, drawn as squashed concentric arcs. `front` selects
// the near half (painted over the planet) versus the far half (behind it).
function drawRings(b, front) {
  const ctx = drawingContext;
  const ring = b.rings;
  ctx.save();
  rotate(ring.tilt);
  ctx.scale(1, 0.34); // squash to fake a viewing tilt

  // Clip to either the lower (near) or upper (far) half-plane.
  ctx.beginPath();
  const big = b.r * 6;
  if (front) ctx.rect(-big, 0, big * 2, big);
  else ctx.rect(-big, -big, big * 2, big);
  ctx.clip();

  noFill();
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const rr = lerp(b.r * ring.inner, b.r * ring.outer, f);
    // A darker dip near the middle hints at the Cassini division.
    const gap = 1 - 0.7 * Math.exp(-Math.pow((f - 0.5) / 0.06, 2));
    const a = (60 + 90 * Math.sin(f * PI)) * gap;
    stroke(ring.col[0], ring.col[1], ring.col[2], a);
    strokeWeight(b.r * (ring.outer - ring.inner) * (1.4 / steps));
    circle(0, 0, rr * 2);
  }
  ctx.restore();
}

function drawMoon(m, sunDir) {
  const period = abs(m.period);
  const dir = Math.sign(m.period) || 1;
  const a = m.angle + dir * simTime * (TWO_PI / period);
  const mx = cos(a) * m.dist;
  const my = sin(a) * m.dist * 0.92; // a touch of orbital tilt
  drawSphere(mx, my, m.size, m.col, sunDir);
}

// ---------------------------------------------------------------------------
// Belts (asteroids, Kuiper)
// ---------------------------------------------------------------------------

function drawBelt(belt, alpha) {
  noStroke();
  for (const a of belt) {
    const ang = a.angle + simTime * a.omega;
    const x = cos(ang) * a.orbit;
    const y = sin(ang) * a.orbit;
    fill(a.shade, a.shade * 0.92, a.shade * 0.82, alpha);
    circle(x, y, a.size);
  }
}

// ---------------------------------------------------------------------------
// Comet
// ---------------------------------------------------------------------------

function drawComet() {
  const M = comet.M + simTime * comet.omega;
  const E = solveKepler(M, comet.e);
  const a = comet.a;
  const b = a * Math.sqrt(1 - comet.e * comet.e);

  // Position relative to the focus (the Sun).
  const px = a * (cos(E) - comet.e);
  const py = b * sin(E);
  const ca = cos(comet.arg);
  const sa = sin(comet.arg);
  const x = px * ca - py * sa;
  const y = px * sa + py * ca;

  const dist = Math.hypot(x, y);
  const tailLen = constrain(9000 / dist, 12, 150);
  const ux = x / dist; // unit vector pointing away from the Sun
  const uy = y / dist;

  // Ion/dust tail — a soft gradient streak pointing away from the Sun.
  const ctx = drawingContext;
  const tx = x + ux * tailLen;
  const ty = y + uy * tailLen;
  const g = ctx.createLinearGradient(x, y, tx, ty);
  g.addColorStop(0, 'rgba(170, 220, 255, 0.55)');
  g.addColorStop(1, 'rgba(120, 180, 255, 0)');
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // Nucleus with a tiny coma.
  const ng = ctx.createRadialGradient(x, y, 0, x, y, 5);
  ng.addColorStop(0, 'rgba(235, 245, 255, 0.95)');
  ng.addColorStop(1, 'rgba(180, 215, 255, 0)');
  ctx.fillStyle = ng;
  noStroke();
  circle(x, y, 10);
}

// Newton-Raphson solution of Kepler's equation M = E − e·sin E.
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 6; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// ---------------------------------------------------------------------------
// Labels & HUD (screen space)
// ---------------------------------------------------------------------------

function drawLabels(labels) {
  textFont('system-ui, sans-serif');
  textSize(12);
  textAlign(LEFT, CENTER);
  for (const l of labels) {
    const sx = width / 2 + cam.panX + l.x * cam.zoom;
    const sy = height / 2 + cam.panY + l.y * cam.zoom;
    const off = l.r * cam.zoom + 6;
    noStroke();
    fill(0, 0, 0, 150);
    text(l.name, sx + off + 1, sy + 1);
    fill(225, 232, 255, 230);
    text(l.name, sx + off, sy);
  }
}

function drawHud() {
  textFont('system-ui, sans-serif');

  // Status line, bottom-left.
  const status = `${paused ? 'PAUSED' : 'RUNNING'}   speed ×${speed
    .toFixed(2)
    .replace(/\.00$/, '')}   zoom ×${cam.zoom.toFixed(2)}`;
  textSize(13);
  textAlign(LEFT, BOTTOM);
  noStroke();
  fill(0, 0, 0, 150);
  text(status, 17, height - 15);
  fill(200, 212, 245, 235);
  text(status, 16, height - 16);

  if (!showHelp) return;

  // Help panel, top-left.
  const lines = [
    'Solar System — p5.js',
    '',
    'drag — pan      scroll — zoom',
    'space — pause   + / − — speed',
    'L — labels      O — orbits',
    'R — reset view  H — hide this',
  ];
  textSize(13);
  textAlign(LEFT, TOP);
  let w = 0;
  for (const ln of lines) w = Math.max(w, textWidth(ln));
  const pad = 14;
  const lh = 19;
  const boxW = w + pad * 2;
  const boxH = lines.length * lh + pad * 2 - 4;

  fill(10, 14, 28, 170);
  stroke(255, 255, 255, 30);
  strokeWeight(1);
  rect(14, 14, boxW, boxH, 10);

  noStroke();
  for (let i = 0; i < lines.length; i++) {
    const y = 14 + pad + i * lh;
    if (i === 0) {
      fill(255, 207, 107, 245);
      textStyle(BOLD);
    } else {
      fill(205, 214, 240, 220);
      textStyle(NORMAL);
    }
    text(lines[i], 14 + pad, y);
  }
  textStyle(NORMAL);
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

// Lighten (f > 0, towards white) or darken (f < 0) an [r,g,b] colour.
function shade(c, f) {
  if (f >= 0) {
    return [lerp(c[0], 255, f), lerp(c[1], 255, f), lerp(c[2], 255, f)];
  }
  const k = 1 + f;
  return [c[0] * k, c[1] * k, c[2] * k];
}

const rgb = (c) => `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function resetView() {
  // Fit the whole system (out to Neptune) within the viewport.
  const extent = orbitRadius(PLANETS[PLANETS.length - 1].au) + 60;
  cam.zoom = constrain(
    (Math.min(width, height) * 0.5) / extent,
    CONFIG.minZoom,
    CONFIG.maxZoom
  );
  cam.panX = 0;
  cam.panY = 0;
}

function mouseWheel(event) {
  // Zoom towards the cursor so the point under it stays put.
  const factor = Math.exp(-event.delta * 0.0012);
  const newZoom = constrain(cam.zoom * factor, CONFIG.minZoom, CONFIG.maxZoom);

  const wx = (mouseX - width / 2 - cam.panX) / cam.zoom;
  const wy = (mouseY - height / 2 - cam.panY) / cam.zoom;
  cam.panX = mouseX - width / 2 - wx * newZoom;
  cam.panY = mouseY - height / 2 - wy * newZoom;
  cam.zoom = newZoom;
  return false; // prevent the page from scrolling
}

function mouseDragged() {
  if (mouseY > height - 40 && mouseX < 320) return; // don't fight the HUD
  cam.panX += mouseX - pmouseX;
  cam.panY += mouseY - pmouseY;
}

function keyPressed() {
  switch (key) {
    case ' ':
      paused = !paused;
      break;
    case '+':
    case '=':
      speed = constrain(speed * 1.4, 0.1, 60);
      break;
    case '-':
    case '_':
      speed = constrain(speed / 1.4, 0.1, 60);
      break;
    case 'l':
    case 'L':
      showLabels = !showLabels;
      break;
    case 'o':
    case 'O':
      showOrbits = !showOrbits;
      break;
    case 'h':
    case 'H':
      showHelp = !showHelp;
      break;
    case 'r':
    case 'R':
      resetView();
      break;
    default:
      return; // let other keys through
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
