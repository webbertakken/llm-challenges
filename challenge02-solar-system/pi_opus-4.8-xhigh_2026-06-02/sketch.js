/**
 * Solar System — p5.js
 * ====================
 * A stylised but roughly proportional model of the Solar System.
 *
 * Sizes, orbital radii and orbital speeds are derived from real data
 * (planet radius in km, semi-major axis in AU, orbital period in days) and
 * then compressed with gentle power curves so the whole system is legible on
 * one screen while keeping the correct ordering and rough proportions.
 *
 * Features
 *   - Glowing sun with a soft, animated corona
 *   - The eight planets with moons on Earth, Mars, Jupiter, Saturn, Neptune
 *   - Saturn's tilted ring system (with a Cassini gap) and faint Uranian rings
 *   - Main asteroid belt and an outer Kuiper belt
 *   - Parallax twinkling starfield
 *   - Faint orbit guides
 *   - Interactive camera: scroll to zoom (towards the cursor), drag to pan
 *   - Keyboard: space = pause, +/- = speed, o = orbits, l = labels,
 *               b = belts, r = reset view
 *
 * Pure global-mode p5.js so it can be dropped straight into a browser.
 */

"use strict";

/* --------------------------- scaling parameters --------------------------- */

const SIZE_SCALE = 0.18; // visual px per km^SIZE_EXP
const SIZE_EXP = 0.4;
const ORBIT_BASE = 64; // px offset from sun centre
const ORBIT_SCALE = 88; // px per AU^ORBIT_EXP
const ORBIT_EXP = 0.6;
const SPEED_BASE = 0.3056; // tuned so Earth ~ 0.016 rad/frame
const SPEED_EXP = 0.5;

const sizeFromKm = (km) => SIZE_SCALE * Math.pow(km, SIZE_EXP);
const orbitFromAu = (au) => ORBIT_BASE + ORBIT_SCALE * Math.pow(au, ORBIT_EXP);
const speedFromDays = (d) => SPEED_BASE / Math.pow(d, SPEED_EXP);

/* ------------------------------ planet data ------------------------------- */
/**
 * radiusKm   — mean equatorial radius (km)
 * au         — semi-major axis (AU)
 * periodDays — sidereal orbital period (days)
 * colors     — [core highlight, edge shade] for a simple two-tone sphere
 * moons      — { name, r, dist, speed, color }  (dist/speed are stylised)
 * rings      — optional ring-system descriptor
 */
const PLANET_DATA = [
  {
    name: "Mercury",
    radiusKm: 2440,
    au: 0.39,
    periodDays: 88,
    colors: ["#b9b4ad", "#6e6a64"],
    moons: [],
  },
  {
    name: "Venus",
    radiusKm: 6052,
    au: 0.72,
    periodDays: 225,
    colors: ["#f0d9a3", "#b07f3c"],
    moons: [],
  },
  {
    name: "Earth",
    radiusKm: 6371,
    au: 1.0,
    periodDays: 365,
    colors: ["#6fb1e8", "#1f4f8b"],
    moons: [{ name: "Moon", r: 1.9, dist: 14, speed: 0.05, color: "#cdc9c0" }],
  },
  {
    name: "Mars",
    radiusKm: 3390,
    au: 1.52,
    periodDays: 687,
    colors: ["#e07b4a", "#9c3a1c"],
    moons: [
      { name: "Phobos", r: 0.9, dist: 9, speed: 0.09, color: "#9b8c7e" },
      { name: "Deimos", r: 0.8, dist: 12.5, speed: 0.062, color: "#8d8175" },
    ],
  },
  {
    name: "Jupiter",
    radiusKm: 69911,
    au: 5.2,
    periodDays: 4333,
    colors: ["#e6c9a3", "#a9794d"],
    moons: [
      { name: "Io", r: 1.5, dist: 23, speed: 0.07, color: "#e7d77a" },
      { name: "Europa", r: 1.4, dist: 29, speed: 0.052, color: "#cdb79a" },
      { name: "Ganymede", r: 2.2, dist: 36, speed: 0.04, color: "#9a8c7c" },
      { name: "Callisto", r: 2.0, dist: 44, speed: 0.03, color: "#6f655a" },
    ],
  },
  {
    name: "Saturn",
    radiusKm: 58232,
    au: 9.58,
    periodDays: 10759,
    colors: ["#ead9a8", "#b59b63"],
    rings: { inner: 18, outer: 32, gap: 25, tilt: -0.42, color: [225, 205, 160] },
    moons: [
      { name: "Rhea", r: 1.2, dist: 38, speed: 0.05, color: "#b9b2a6" },
      { name: "Titan", r: 2.1, dist: 46, speed: 0.034, color: "#d9a86a" },
    ],
  },
  {
    name: "Uranus",
    radiusKm: 25362,
    au: 19.2,
    periodDays: 30687,
    colors: ["#bdeef0", "#5aa9b5"],
    rings: { inner: 13, outer: 17, tilt: 1.35, color: [150, 200, 205], faint: true },
    moons: [],
  },
  {
    name: "Neptune",
    radiusKm: 24622,
    au: 30.05,
    periodDays: 60190,
    colors: ["#6f86f0", "#2c3aa0"],
    moons: [
      // Triton orbits retrograde — hence the negative speed.
      { name: "Triton", r: 1.6, dist: 19, speed: -0.058, color: "#cdd6e8" },
    ],
  },
];

/* ------------------------------ runtime state ----------------------------- */

let bodies = []; // built planets (each holds its moons as children)
let stars = []; // background starfield
let asteroids = []; // main belt
let kuiper = []; // outer belt
let sunRadius = 0;
let neptuneOrbit = 0;

let zoom = 1;
let panX = 0;
let panY = 0;
let dragging = false;
let lastMX = 0;
let lastMY = 0;

let paused = false;
let speedMul = 1;
let showOrbits = true;
let showLabels = true;
let showBelts = true;

/* --------------------------------- model ---------------------------------- */

class Body {
  constructor(cfg) {
    this.name = cfg.name;
    this.radius = cfg.radius;
    this.orbit = cfg.orbit;
    this.speed = cfg.speed;
    this.colors = cfg.colors || null; // [highlight, shade] for planets
    this.flatColor = cfg.flatColor || null; // single colour for moons
    this.rings = cfg.rings || null;
    this.parent = cfg.parent || null;
    this.angle = Math.random() * Math.PI * 2;
    this.x = 0;
    this.y = 0;
    this.children = [];
  }

  update(dt) {
    this.angle += this.speed * dt;
    const cx = this.parent ? this.parent.x : 0;
    const cy = this.parent ? this.parent.y : 0;
    this.x = cx + Math.cos(this.angle) * this.orbit;
    this.y = cy + Math.sin(this.angle) * this.orbit;
    for (const c of this.children) c.update(dt);
  }
}

/* --------------------------------- belts ---------------------------------- */

function makeBelt(count, innerR, outerR, shadeRange, sizeRange, speedScale) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = random(innerR, outerR);
    out.push({
      r,
      angle: random(TWO_PI),
      speed: (speedScale / Math.pow(r, 1.2)) * random(0.7, 1.3),
      size: random(sizeRange[0], sizeRange[1]),
      shade: random(shadeRange[0], shadeRange[1]),
      alpha: random(120, 220),
    });
  }
  return out;
}

/* ------------------------------- starfield -------------------------------- */

function makeStars() {
  stars = [];
  const n = Math.round((width * height) / 1400);
  for (let i = 0; i < n; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      depth: random(0.3, 1), // larger = nearer = more parallax
      base: random(40, 200),
      twPhase: random(TWO_PI),
      twSpeed: random(0.01, 0.05),
      size: random(0.6, 1.8),
      warm: random() < 0.15, // a few warm-tinted stars
    });
  }
}

/* --------------------------------- setup ---------------------------------- */

function setup() {
  const holder = document.getElementById("sketch-holder");
  const c = createCanvas(windowWidth, windowHeight);
  if (holder) c.parent(holder);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // The true Sun-to-Mercury ratio is huge; shrink the sun a touch so the
  // inner planets and the corona do not overlap once orbits are compressed.
  sunRadius = sizeFromKm(696340) * 0.7; // ~27 px

  for (const p of PLANET_DATA) {
    const planet = new Body({
      name: p.name,
      radius: sizeFromKm(p.radiusKm),
      orbit: orbitFromAu(p.au),
      speed: speedFromDays(p.periodDays),
      colors: p.colors,
      rings: p.rings,
    });
    for (const m of p.moons) {
      planet.children.push(
        new Body({
          name: m.name,
          radius: m.r,
          orbit: m.dist,
          speed: m.speed,
          flatColor: m.color,
          parent: planet,
        }),
      );
    }
    bodies.push(planet);
  }

  neptuneOrbit = bodies[bodies.length - 1].orbit;

  // Asteroid belt sits between Mars and Jupiter; Kuiper belt beyond Neptune.
  asteroids = makeBelt(620, orbitFromAu(2.1), orbitFromAu(3.3), [140, 220], [0.6, 1.8], 0.9);
  kuiper = makeBelt(420, orbitFromAu(31), orbitFromAu(48), [90, 170], [0.5, 1.4], 0.6);

  makeStars();
  resetZoomToFit();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeStars();
}

/* ---------------------------------- draw ---------------------------------- */

function draw() {
  background(4, 6, 15);

  drawStarfield();

  const dt = paused ? 0 : speedMul;
  for (const b of bodies) b.update(dt);

  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  if (showBelts) drawBelt(kuiper, dt, [205, 218, 240]);
  if (showOrbits) drawOrbits();
  if (showBelts) drawBelt(asteroids, dt, [185, 172, 150]);

  drawSun();
  for (const b of bodies) drawBody(b);

  pop();

  if (showLabels) drawLabels();
  drawHud();
}

/* ------------------------------- rendering -------------------------------- */

function drawStarfield() {
  noStroke();
  for (const s of stars) {
    // Gentle parallax: nearer stars shift more as the camera pans.
    const px = wrap(s.x + panX * s.depth * 0.15, width);
    const py = wrap(s.y + panY * s.depth * 0.15, height);
    const tw = 0.6 + 0.4 * Math.sin(frameCount * s.twSpeed + s.twPhase);
    const b = s.base * tw;
    if (s.warm) fill(255, 225, 200, b);
    else fill(210, 225, 255, b);
    circle(px, py, s.size);
  }
}

function drawOrbits() {
  noFill();
  strokeWeight(1 / zoom);
  for (const b of bodies) {
    stroke(120, 150, 210, 38);
    circle(0, 0, b.orbit * 2);
  }
}

function drawBelt(belt, dt, rgb) {
  noStroke();
  for (const a of belt) {
    a.angle += a.speed * dt;
    const x = Math.cos(a.angle) * a.r;
    const y = Math.sin(a.angle) * a.r;
    const k = a.shade / 255;
    fill(rgb[0] * k, rgb[1] * k, rgb[2] * k, a.alpha);
    circle(x, y, a.size);
  }
}

function drawSun() {
  const ctx = drawingContext;
  const pulse = 1 + 0.04 * Math.sin(frameCount * 0.05);

  // Soft layered corona (kept tight so it never reaches Mercury's orbit).
  noStroke();
  for (let i = 5; i >= 1; i--) {
    const r = sunRadius * (1 + i * 0.35) * pulse;
    fill(255, 170 + i * 8, 60, 16 - i * 1.8);
    circle(0, 0, r * 2);
  }

  // Bright core with a glow shadow.
  ctx.save();
  ctx.shadowBlur = 60;
  ctx.shadowColor = "rgba(255,180,60,0.9)";
  fill(255, 214, 120);
  circle(0, 0, sunRadius * 2 * pulse);
  ctx.restore();

  fill(255, 248, 224);
  circle(0, 0, sunRadius * 1.3 * pulse);
}

function drawBody(b) {
  // Ring back half is drawn behind the planet body.
  if (b.rings) drawRings(b, true);

  const ctx = drawingContext;
  ctx.save();
  ctx.shadowBlur = Math.max(b.radius * 1.6, 4);
  ctx.shadowColor = colorWithAlpha(b.flatColor || b.colors[1], 0.6);
  noStroke();
  fill(b.flatColor || b.colors[1]);
  circle(b.x, b.y, b.radius * 2);
  ctx.restore();

  // Simple lit highlight for planets (skipped for tiny moons).
  if (b.colors) {
    noStroke();
    fill(b.colors[0]);
    circle(b.x - b.radius * 0.28, b.y - b.radius * 0.28, b.radius * 1.4);
  }

  // Ring front half drapes over the body.
  if (b.rings) drawRings(b, false);

  for (const m of b.children) drawBody(m);
}

function drawRings(b, back) {
  const ctx = drawingContext;
  const r = b.rings;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(r.tilt);
  ctx.scale(1, 0.38); // perspective squash

  const bands = r.faint ? 6 : 26;
  const start = back ? Math.PI : 0; // far half vs near half
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const rad = lerp(r.inner, r.outer, t);
    if (r.gap && Math.abs(rad - r.gap) < 0.8) continue; // Cassini-style gap
    const a = r.faint ? 40 : 150 * (0.5 + 0.5 * Math.sin(t * Math.PI));
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${r.color[0]},${r.color[1]},${r.color[2]},${a / 255})`;
    ctx.lineWidth = r.faint ? 0.7 : (r.outer - r.inner) / bands + 0.4;
    ctx.ellipse(0, 0, rad, rad, 0, start, start + Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------- labels --------------------------------- */

function drawLabels() {
  textFont("monospace");
  textSize(12);
  textAlign(LEFT, CENTER);
  rectMode(CORNER);
  for (const b of bodies) {
    const sx = width / 2 + panX + b.x * zoom;
    const sy = height / 2 + panY + b.y * zoom;
    if (sx < -120 || sx > width + 120 || sy < -20 || sy > height + 20) continue;
    const off = b.radius * zoom + 6;
    noStroke();
    fill(0, 0, 0, 140);
    rect(sx + off - 2, sy - 8, textWidth(b.name) + 8, 16, 4);
    fill(222, 234, 255);
    text(b.name, sx + off + 2, sy);
  }
}

/* ---------------------------------- HUD ----------------------------------- */

function drawHud() {
  const lines = [
    "SOLAR SYSTEM",
    "",
    "scroll: zoom   drag: pan   r: reset view",
    `space: ${paused ? "play" : "pause"}   +/-: speed (${speedMul.toFixed(1)}x)`,
    `o: orbits[${onOff(showOrbits)}]  l: labels[${onOff(showLabels)}]  b: belts[${onOff(showBelts)}]`,
  ];
  textFont("monospace");
  textAlign(LEFT, TOP);
  rectMode(CORNER);

  const pad = 12;
  const lh = 16;
  const boxW = 360;
  const boxH = pad * 2 + lh * lines.length;

  noStroke();
  fill(8, 12, 26, 185);
  rect(10, 10, boxW, boxH, 8);

  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      textSize(15);
      fill(255, 214, 120);
    } else {
      textSize(12);
      fill(200, 216, 246);
    }
    text(lines[i], 10 + pad, 10 + pad + i * lh);
  }
}

const onOff = (v) => (v ? "on" : "off");

/* ------------------------------ small helpers ----------------------------- */

function wrap(v, max) {
  return ((v % max) + max) % max;
}

function colorWithAlpha(hex, alpha) {
  const c = color(hex);
  return `rgba(${red(c)},${green(c)},${blue(c)},${alpha})`;
}

function resetZoomToFit() {
  zoom = constrain(Math.min(width, height) / (2 * (neptuneOrbit + 60)), 0.2, 2);
}

/* ------------------------------ interaction ------------------------------- */

function mouseWheel(e) {
  const factor = e.delta > 0 ? 1 / 1.1 : 1.1;
  const wx = (mouseX - width / 2 - panX) / zoom;
  const wy = (mouseY - height / 2 - panY) / zoom;
  zoom = constrain(zoom * factor, 0.12, 10);
  panX = mouseX - width / 2 - wx * zoom;
  panY = mouseY - height / 2 - wy * zoom;
  return false; // stop the page from scrolling
}

function mousePressed() {
  dragging = true;
  lastMX = mouseX;
  lastMY = mouseY;
}

function mouseDragged() {
  if (!dragging) return;
  panX += mouseX - lastMX;
  panY += mouseY - lastMY;
  lastMX = mouseX;
  lastMY = mouseY;
}

function mouseReleased() {
  dragging = false;
}

function keyPressed() {
  if (key === " ") paused = !paused;
  else if (key === "r" || key === "R") resetView();
  else if (key === "o" || key === "O") showOrbits = !showOrbits;
  else if (key === "l" || key === "L") showLabels = !showLabels;
  else if (key === "b" || key === "B") showBelts = !showBelts;
  else if (key === "+" || key === "=") speedMul = Math.min(speedMul * 1.5, 24);
  else if (key === "-" || key === "_") speedMul = Math.max(speedMul / 1.5, 0.1);
}

function resetView() {
  panX = 0;
  panY = 0;
  resetZoomToFit();
  speedMul = 1;
  paused = false;
}
