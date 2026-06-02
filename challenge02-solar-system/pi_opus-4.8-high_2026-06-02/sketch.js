/**
 * Solar System simulation in p5.js
 *
 * Features:
 *  - The Sun at the centre with a layered, additive glow corona.
 *  - All 8 planets with roughly proportional (compressed) sizes, distances
 *    and orbital speeds derived from real astronomical periods.
 *  - Moons: Earth (1), Mars (2), Jupiter (4 Galilean), Saturn (3).
 *  - Saturn's ring system and a faint Uranus ring.
 *  - An asteroid belt between Mars and Jupiter.
 *  - A twinkling, parallax-free starfield background.
 *  - Interaction: scroll to zoom, drag to pan, Space to pause, arrows to
 *    change speed, L to toggle labels, O to toggle orbit paths, R to reset.
 *
 * Scaling philosophy: true solar-system ratios span several orders of
 * magnitude and will not fit on screen. Distances and radii are therefore
 * compressed with gentle power curves that preserve ordering and relative
 * feel while keeping everything visible. Orbital angular speeds are kept
 * accurate relative to one another (inverse of the orbital period).
 */

"use strict";

// ----------------------------- configuration -----------------------------

const SUN_RADIUS = 46;

// Planet definitions. `dist`/`size` are real ratios (Earth = 1 for size,
// AU for distance, years for period); they are compressed at build time.
const PLANET_DATA = [
  { name: "Mercury", dist: 0.39, size: 0.38, period: 0.24, colour: [176, 168, 158] },
  { name: "Venus",   dist: 0.72, size: 0.95, period: 0.62, colour: [222, 184, 120] },
  { name: "Earth",   dist: 1.0,  size: 1.0,  period: 1.0,  colour: [96, 156, 224] },
  { name: "Mars",    dist: 1.52, size: 0.53, period: 1.88, colour: [206, 110, 74] },
  { name: "Jupiter", dist: 5.2,  size: 11.2, period: 11.86, colour: [206, 170, 132] },
  { name: "Saturn",  dist: 9.58, size: 9.45, period: 29.4, colour: [222, 200, 150], ring: true },
  { name: "Uranus",  dist: 19.2, size: 4.0,  period: 84.0, colour: [150, 214, 222], ring: "faint" },
  { name: "Neptune", dist: 30.0, size: 3.88, period: 164.8, colour: [78, 120, 224] },
];

// Moons: parent name -> [{ name, dist(px), size(px), period(rel) }]
const MOON_DATA = {
  Earth: [{ name: "Moon", dist: 16, size: 3, period: 0.6, colour: [200, 200, 205] }],
  Mars: [
    { name: "Phobos", dist: 9, size: 1.6, period: 0.25, colour: [170, 150, 140] },
    { name: "Deimos", dist: 14, size: 1.3, period: 0.5, colour: [160, 140, 130] },
  ],
  Jupiter: [
    { name: "Io", dist: 30, size: 3, period: 0.4, colour: [228, 214, 150] },
    { name: "Europa", dist: 40, size: 2.6, period: 0.7, colour: [210, 200, 188] },
    { name: "Ganymede", dist: 52, size: 3.6, period: 1.1, colour: [176, 160, 148] },
    { name: "Callisto", dist: 66, size: 3.3, period: 1.7, colour: [120, 110, 104] },
  ],
  Saturn: [
    { name: "Titan", dist: 44, size: 3.2, period: 1.2, colour: [216, 178, 110] },
    { name: "Rhea", dist: 56, size: 1.8, period: 1.9, colour: [190, 188, 184] },
    { name: "Iapetus", dist: 70, size: 1.7, period: 3.2, colour: [150, 140, 132] },
  ],
};

// ------------------------------- state -----------------------------------

let planets = [];
let stars = [];
let asteroids = [];

let zoom = 1;
let panX = 0;
let panY = 0;
let dragging = false;
let dragStart = null;

let paused = false;
let speed = 1;
let showLabels = false;
let showOrbits = true;

let simTime = 0; // accumulated simulated time (drives all angles)

// --------------------------- distance scaling ----------------------------

// Compress AU distances into pixels: a power curve keeps inner planets
// readable while pulling the outer giants inward enough to fit.
function scaleDistance(au) {
  return SUN_RADIUS + 34 + Math.pow(au, 0.62) * 92;
}

// Compress Earth-relative radii: square-root keeps the gas giants from
// dominating while keeping the rocky planets visible.
function scaleSize(rel) {
  return 3 + Math.sqrt(rel) * 7.5;
}

// -------------------------------- setup ----------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  buildStars();
  buildPlanets();
  buildAsteroidBelt();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildStars();
}

function buildStars() {
  stars = [];
  const count = Math.floor((width * height) / 1600);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      r: random(0.4, 1.6),
      base: random(120, 255),
      twinkle: random(0.002, 0.02),
      phase: random(TWO_PI),
    });
  }
}

function buildPlanets() {
  planets = PLANET_DATA.map((p) => {
    const orbit = scaleDistance(p.dist);
    const radius = scaleSize(p.size);
    const moons = (MOON_DATA[p.name] || []).map((m) => ({
      ...m,
      angle0: random(TWO_PI),
    }));
    return {
      ...p,
      orbit,
      radius,
      // Angular speed: accurate relative to other planets (inverse period).
      angSpeed: 0.6 / p.period,
      angle0: random(TWO_PI),
      moons,
    };
  });
}

function buildAsteroidBelt() {
  asteroids = [];
  const inner = scaleDistance(2.1);
  const outer = scaleDistance(3.3);
  for (let i = 0; i < 520; i++) {
    const r = random(inner, outer);
    asteroids.push({
      r,
      angle0: random(TWO_PI),
      // Roughly Keplerian: closer asteroids move faster.
      angSpeed: (0.5 / Math.pow(r / inner, 1.5)) * 0.4,
      size: random(0.6, 1.8),
      shade: random(90, 170),
    });
  }
}

// -------------------------------- draw -----------------------------------

function draw() {
  background(2, 3, 10);

  drawStars();

  if (!paused) {
    simTime += speed * 0.01;
  }

  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  if (showOrbits) drawOrbits();
  drawAsteroidBelt();
  drawSun();
  drawPlanets();

  pop();

  drawSpeedReadout();
}

function drawStars() {
  noStroke();
  for (const s of stars) {
    const tw = 0.6 + 0.4 * Math.sin(frameCount * s.twinkle * 10 + s.phase);
    fill(s.base * tw, s.base * tw, Math.min(255, s.base * tw + 20));
    circle(s.x, s.y, s.r * 2);
  }
}

function drawOrbits() {
  noFill();
  stroke(120, 150, 220, 38);
  strokeWeight(1 / zoom);
  for (const p of planets) {
    circle(0, 0, p.orbit * 2);
  }
}

function drawAsteroidBelt() {
  noStroke();
  for (const a of asteroids) {
    const ang = a.angle0 + simTime * a.angSpeed;
    const x = Math.cos(ang) * a.r;
    const y = Math.sin(ang) * a.r;
    fill(a.shade, a.shade * 0.92, a.shade * 0.8, 200);
    circle(x, y, a.size);
  }
}

function drawSun() {
  // Additive corona glow built from layered translucent discs.
  push();
  blendMode(ADD);
  noStroke();
  const layers = 7;
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const r = SUN_RADIUS * (1 + t * 3.2);
    fill(255 * (1 - t) * 0.5 + 40, 180 * (1 - t) + 30, 40 * (1 - t) + 8, 26);
    circle(0, 0, r * 2);
  }
  blendMode(BLEND);
  pop();

  // Sun body with a hot core gradient.
  noStroke();
  for (let i = 6; i >= 0; i--) {
    const t = i / 6;
    fill(255, 200 - t * 90, 70 - t * 40);
    circle(0, 0, SUN_RADIUS * 2 * (0.5 + t * 0.5));
  }
  fill(255, 244, 200);
  circle(0, 0, SUN_RADIUS * 1.04);
}

function drawPlanets() {
  for (const p of planets) {
    const ang = p.angle0 + simTime * p.angSpeed;
    const x = Math.cos(ang) * p.orbit;
    const y = Math.sin(ang) * p.orbit;

    push();
    translate(x, y);

    if (p.ring) drawRing(p);

    // Soft glow halo around the planet.
    push();
    blendMode(ADD);
    noStroke();
    fill(p.colour[0], p.colour[1], p.colour[2], 28);
    circle(0, 0, p.radius * 3.4);
    blendMode(BLEND);
    pop();

    drawShadedBody(p.radius, p.colour, ang);

    // Moons orbit the planet.
    for (const m of p.moons) {
      const ma = m.angle0 + simTime * (p.angSpeed * 4 + 1) * m.period;
      const mx = Math.cos(ma) * m.dist;
      const my = Math.sin(ma) * m.dist;
      noStroke();
      fill(m.colour[0], m.colour[1], m.colour[2]);
      circle(mx, my, m.size * 2);
    }

    if (showLabels) drawLabel(p.name, p.radius);

    pop();
  }
}

// A lit sphere: bright on the side facing the Sun, dark on the far side.
function drawShadedBody(radius, colour, ang) {
  const [r, g, b] = colour;
  noStroke();
  // Base (shadowed) disc.
  fill(r * 0.35, g * 0.35, b * 0.35);
  circle(0, 0, radius * 2);
  // Lit crescent offset toward the Sun (Sun is at -ang direction).
  const lx = -Math.cos(ang) * radius * 0.42;
  const ly = -Math.sin(ang) * radius * 0.42;
  fill(r, g, b);
  circle(lx, ly, radius * 1.55);
  // Specular highlight.
  fill(Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60), 180);
  circle(lx * 1.25, ly * 1.25, radius * 0.7);
}

function drawRing(p) {
  const faint = p.ring === "faint";
  push();
  noFill();
  const inner = p.radius * 1.4;
  const outer = p.radius * (faint ? 1.8 : 2.5);
  const bands = faint ? 4 : 14;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const rr = lerp(inner, outer, t);
    const alpha = faint ? 40 : 150 - Math.abs(t - 0.5) * 120;
    stroke(p.colour[0], p.colour[1], p.colour[2], alpha);
    strokeWeight((outer - inner) / bands);
    // Slight perspective squash for the ring plane.
    ellipse(0, 0, rr * 2, rr * 0.7);
  }
  pop();
}

function drawLabel(name, radius) {
  push();
  const s = 1 / zoom;
  scale(s);
  noStroke();
  fill(232, 238, 252, 230);
  textSize(12);
  textAlign(LEFT, CENTER);
  text(name, (radius + 6) * zoom, -(radius + 6) * zoom);
  pop();
}

function drawSpeedReadout() {
  noStroke();
  fill(159, 176, 214, 220);
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  const status = paused ? "paused" : `${speed.toFixed(1)}x`;
  text(`zoom ${zoom.toFixed(2)}  ·  speed ${status}`, width - 14, height - 12);
}

// ------------------------------ interaction ------------------------------

function mouseWheel(event) {
  const factor = event.delta > 0 ? 0.9 : 1.1;
  const next = constrain(zoom * factor, 0.25, 6);
  // Zoom toward the cursor position.
  const cx = mouseX - width / 2 - panX;
  const cy = mouseY - height / 2 - panY;
  panX -= cx * (next / zoom - 1);
  panY -= cy * (next / zoom - 1);
  zoom = next;
  return false;
}

function mousePressed() {
  dragging = true;
  dragStart = { x: mouseX - panX, y: mouseY - panY };
}

function mouseDragged() {
  if (dragging && dragStart) {
    panX = mouseX - dragStart.x;
    panY = mouseY - dragStart.y;
  }
}

function mouseReleased() {
  dragging = false;
}

function keyPressed() {
  if (key === " ") paused = !paused;
  else if (keyCode === RIGHT_ARROW) speed = constrain(speed + 0.5, 0, 12);
  else if (keyCode === LEFT_ARROW) speed = constrain(speed - 0.5, 0, 12);
  else if (key === "l" || key === "L") showLabels = !showLabels;
  else if (key === "o" || key === "O") showOrbits = !showOrbits;
  else if (key === "r" || key === "R") {
    zoom = 1;
    panX = 0;
    panY = 0;
    speed = 1;
    paused = false;
  }
}
