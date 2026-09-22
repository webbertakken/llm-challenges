// Solar system in p5.js (global mode).
//
// Scale notes: orbital distances are log-compressed so Neptune fits on screen,
// planet sizes grow with radius^0.7 so Jupiter does not swallow Earth, and moon
// orbits run at 1/50 of their true angular speed so they read as orbits rather
// than blurs. Orbital periods of the planets are true to life relative to each
// other; one Earth year takes SECONDS_PER_YEAR real seconds at speed x1.

"use strict";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SECONDS_PER_YEAR = 6;
const MOON_TIME_DILATION = 1 / 50;
const DAYS_PER_YEAR = 365.25;
const SUN_RADIUS = 30;
const SUN_CLEARANCE = 50;
const REFERENCE_ORBIT_SCALE = 73;
const ASTEROID_COUNT = 700;
const KUIPER_COUNT = 350;

/** Sizes in Earth radii, distances in AU, periods in years, moons in days. */
const PLANETS = [
  {
    name: "Mercury",
    au: 0.39,
    period: 0.241,
    earthRadii: 0.38,
    colors: { light: "#d9d4cc", base: "#9a948c", dark: "#3b3733" },
    moons: [],
  },
  {
    name: "Venus",
    au: 0.72,
    period: 0.615,
    earthRadii: 0.95,
    colors: { light: "#fff1c9", base: "#e2c07a", dark: "#6e4f1f" },
    atmosphere: "rgba(255, 220, 150, 0.35)",
    moons: [],
  },
  {
    name: "Earth",
    au: 1,
    period: 1,
    earthRadii: 1,
    colors: { light: "#9fd0ff", base: "#3b7fd4", dark: "#0a2a5c" },
    atmosphere: "rgba(120, 190, 255, 0.45)",
    continents: "rgba(80, 160, 90, 0.85)",
    moons: [{ name: "Moon", days: 27.3, distance: 11, radius: 1.6, color: "#c9c9c9" }],
  },
  {
    name: "Mars",
    au: 1.52,
    period: 1.881,
    earthRadii: 0.53,
    colors: { light: "#ffb08a", base: "#d1603d", dark: "#4a1c0c" },
    moons: [
      { name: "Phobos", days: 0.32, distance: 6, radius: 0.9, color: "#a89f97" },
      { name: "Deimos", days: 1.26, distance: 10, radius: 0.8, color: "#b8b0a8" },
    ],
  },
  {
    name: "Jupiter",
    au: 5.2,
    period: 11.86,
    earthRadii: 11.2,
    colors: { light: "#f6e3c4", base: "#d8b58a", dark: "#5b3d22" },
    bands: ["rgba(160, 100, 60, 0.35)", "rgba(255, 240, 220, 0.25)", "rgba(150, 90, 50, 0.3)"],
    spot: "rgba(200, 80, 50, 0.7)",
    atmosphere: "rgba(255, 220, 180, 0.25)",
    moons: [
      { name: "Io", days: 1.77, distance: 9, radius: 1.6, color: "#e8d36a" },
      { name: "Europa", days: 3.55, distance: 14, radius: 1.4, color: "#d8d2c4" },
      { name: "Ganymede", days: 7.15, distance: 20, radius: 2.1, color: "#a89e8c" },
      { name: "Callisto", days: 16.69, distance: 27, radius: 1.9, color: "#7e746a" },
    ],
  },
  {
    name: "Saturn",
    au: 9.58,
    period: 29.46,
    earthRadii: 9.45,
    colors: { light: "#fff2cf", base: "#e8d5a3", dark: "#6b5a30" },
    bands: ["rgba(190, 150, 90, 0.25)", "rgba(255, 245, 220, 0.2)"],
    rings: { inner: 1.3, outer: 2.3, tilt: 0.38, color: [232, 213, 163] },
    atmosphere: "rgba(255, 235, 190, 0.2)",
    moons: [
      { name: "Titan", days: 15.95, distance: 34, radius: 2, color: "#e0b45a" },
      { name: "Rhea", days: 4.52, distance: 28, radius: 1.1, color: "#d0ccc4" },
    ],
  },
  {
    name: "Uranus",
    au: 19.2,
    period: 84.01,
    earthRadii: 4.0,
    colors: { light: "#e0fbff", base: "#9fd8e2", dark: "#2a6f80" },
    rings: { inner: 1.6, outer: 1.9, tilt: 0.92, color: [200, 230, 240] },
    atmosphere: "rgba(160, 230, 240, 0.25)",
    moons: [{ name: "Titania", days: 8.71, distance: 16, radius: 1.3, color: "#c8c4bc" }],
  },
  {
    name: "Neptune",
    au: 30.05,
    period: 164.8,
    earthRadii: 3.88,
    colors: { light: "#9db8ff", base: "#4b6fe0", dark: "#141f66" },
    atmosphere: "rgba(120, 150, 255, 0.3)",
    moons: [{ name: "Triton", days: 5.88, distance: 14, radius: 1.5, color: "#e6dcd0", retrograde: true }],
  },
];

/** A fictional periodic comet: semi-major axis in AU, eccentricity, argument of perihelion. */
const COMET = { name: "Comet", a: 6, e: 0.85, omega: 2.4, phase: 0.35 };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let orbitScale = REFERENCE_ORBIT_SCALE;
let simYears = 0;
let speed = 1;
let paused = false;
let showOrbits = true;
let showLabels = false;
let showHud = true;

const camera = { x: 0, y: 0, zoom: 1 };
let followTarget = null;
let dragStart = null;

let starfield = null;
let twinklers = [];
let asteroids = [];
let kuiper = [];
let cometPath = [];

// ---------------------------------------------------------------------------
// p5 lifecycle
// ---------------------------------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  layout();
  PLANETS.forEach((planet) => {
    planet.phase = random(TWO_PI);
    planet.moons.forEach((moon) => {
      moon.phase = random(TWO_PI);
    });
  });
  asteroids = makeBelt(ASTEROID_COUNT, 2.1, 3.3, 0.9, 2.2);
  kuiper = makeBelt(KUIPER_COUNT, 33, 48, 0.6, 1.6);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layout();
}

function draw() {
  if (!paused) {
    const dt = min(deltaTime, 100) / 1000;
    simYears += (dt * speed) / SECONDS_PER_YEAR;
  }
  if (followTarget) {
    const target = followTarget === "sun" ? { x: 0, y: 0 } : planetPosition(followTarget);
    camera.x = target.x;
    camera.y = target.y;
  }

  drawBackground();

  push();
  translate(width / 2, height / 2);
  scale(camera.zoom);
  translate(-camera.x, -camera.y);

  if (showOrbits) drawOrbits();
  drawBelt(kuiper, [150, 170, 210]);
  drawBelt(asteroids, [190, 180, 160]);
  drawSun();
  PLANETS.forEach(drawPlanet);
  drawComet();
  pop();

  drawLabels();
  if (showHud) drawHud();
}

// ---------------------------------------------------------------------------
// Layout and scale
// ---------------------------------------------------------------------------

function layout() {
  const outermost = PLANETS[PLANETS.length - 1].au;
  const usable = min(width, height) / 2 - 40 - SUN_CLEARANCE;
  orbitScale = max(usable, 120) / Math.log2(1 + outermost);
  PLANETS.forEach((planet) => {
    planet.orbitRadius = orbitRadius(planet.au);
    planet.radius = planetRadius(planet.earthRadii);
  });
  buildStarfield();
  cometPath = buildCometPath();
}

/** Log-compressed distance so the whole system fits on one screen. */
function orbitRadius(au) {
  return SUN_CLEARANCE + orbitScale * Math.log2(1 + au);
}

function planetRadius(earthRadii) {
  return (2.2 + 2.2 * Math.pow(earthRadii, 0.7)) * sizeFactor();
}

function sizeFactor() {
  return orbitScale / REFERENCE_ORBIT_SCALE;
}

function planetAngle(planet) {
  return planet.phase + (TWO_PI * simYears) / planet.period;
}

/** Counter-clockwise on screen, like the view from above the Sun's north pole. */
function planetPosition(planet) {
  const angle = planetAngle(planet);
  return { x: planet.orbitRadius * cos(angle), y: -planet.orbitRadius * sin(angle) };
}

function moonPosition(planet, moon, centre) {
  const direction = moon.retrograde ? -1 : 1;
  const angle = moon.phase + direction * (TWO_PI * simYears * MOON_TIME_DILATION * DAYS_PER_YEAR) / moon.days;
  const distance = (planet.radius + moon.distance * sizeFactor());
  return { x: centre.x + distance * cos(angle), y: centre.y - distance * sin(angle) };
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function buildStarfield() {
  starfield = createGraphics(width, height);
  starfield.noStroke();
  starfield.background(2, 4, 12);

  // A soft band of haze standing in for the Milky Way.
  const haze = starfield.drawingContext;
  for (let i = 0; i < 420; i++) {
    const t = random(-0.2, 1.2);
    const along = { x: t * width, y: height * (0.15 + 0.7 * t) };
    const spread = randomGaussian(0, height * 0.09);
    const x = along.x + spread * 0.4;
    const y = along.y + spread;
    const r = random(50, 180);
    const gradient = haze.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(130, 140, 190, 0.022)");
    gradient.addColorStop(1, "rgba(130, 140, 190, 0)");
    haze.fillStyle = gradient;
    haze.beginPath();
    haze.arc(x, y, r, 0, TWO_PI);
    haze.fill();
  }

  for (let i = 0; i < 1100; i++) {
    const brightness = random(60, 220);
    const tint = random([
      [255, 255, 255],
      [200, 220, 255],
      [255, 230, 200],
    ]);
    starfield.fill(tint[0], tint[1], tint[2], brightness);
    starfield.circle(random(width), random(height), random(0.4, 1.8));
  }

  twinklers = Array.from({ length: 140 }, () => ({
    x: random(width),
    y: random(height),
    r: random(1.2, 2.6),
    phase: random(TWO_PI),
    rate: random(0.6, 2.4),
  }));
}

function drawBackground() {
  image(starfield, 0, 0);
  noStroke();
  const t = millis() / 1000;
  twinklers.forEach((star) => {
    const glow = 0.55 + 0.45 * sin(t * star.rate + star.phase);
    fill(255, 255, 255, 200 * glow);
    circle(star.x, star.y, star.r * (0.7 + 0.5 * glow));
  });
}

// ---------------------------------------------------------------------------
// Belts
// ---------------------------------------------------------------------------

/** Rocks between two AU radii, each on its own Keplerian period (T = a^1.5). */
function makeBelt(count, innerAu, outerAu, minSize, maxSize) {
  return Array.from({ length: count }, () => {
    const au = random(innerAu, outerAu) + randomGaussian(0, 0.05);
    return {
      au,
      period: Math.pow(au, 1.5),
      phase: random(TWO_PI),
      size: random(minSize, maxSize),
      shade: random(0.5, 1),
    };
  });
}

function drawBelt(belt, tint) {
  noFill();
  strokeCap(ROUND);
  belt.forEach((rock) => {
    const angle = rock.phase + (TWO_PI * simYears) / rock.period;
    const r = orbitRadius(rock.au);
    stroke(tint[0] * rock.shade, tint[1] * rock.shade, tint[2] * rock.shade, 170);
    strokeWeight((rock.size * sizeFactor()) / max(camera.zoom, 1));
    point(r * cos(angle), -r * sin(angle));
  });
}

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------

function drawSun() {
  const ctx = drawingContext;
  const t = millis() / 1000;
  const pulse = 1 + 0.04 * sin(t * 1.3) + 0.02 * sin(t * 3.7);
  const radius = SUN_RADIUS * sizeFactor();

  blendMode(ADD);
  fillRadial(0, 0, radius * 0.7, 0, 0, radius * 4.2 * pulse, [
    [0, "rgba(255, 170, 60, 0.55)"],
    [0.25, "rgba(255, 120, 30, 0.2)"],
    [0.6, "rgba(255, 80, 10, 0.06)"],
    [1, "rgba(255, 60, 0, 0)"],
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 4.2 * pulse, 0, TWO_PI);
  ctx.fill();

  // Slowly turning, breathing rays.
  push();
  rotate(t * 0.04);
  noStroke();
  const rayCount = 22;
  for (let i = 0; i < rayCount; i++) {
    const wobble = noise(i * 3.1, t * 0.25);
    const length = radius * (1.6 + 3.2 * wobble) * pulse;
    fill(255, 160, 70, 7 + 6 * wobble);
    triangle(0, -radius * 0.3, 0, radius * 0.3, length, 0);
    rotate(TWO_PI / rayCount);
  }
  pop();
  blendMode(BLEND);

  fillRadial(-radius * 0.35, -radius * 0.35, 1, 0, 0, radius, [
    [0, "#fffdf0"],
    [0.4, "#ffe25a"],
    [0.85, "#ff9a1f"],
    [1, "#f06a10"],
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TWO_PI);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------

function drawOrbits() {
  noFill();
  strokeWeight(1 / camera.zoom);
  PLANETS.forEach((planet) => {
    stroke(255, 255, 255, 28);
    circle(0, 0, planet.orbitRadius * 2);
  });
  stroke(150, 200, 255, 30);
  beginShape();
  cometPath.forEach((p) => vertex(p.x, p.y));
  endShape(CLOSE);
}

function drawPlanet(planet) {
  const position = planetPosition(planet);
  const toSun = normalise(-position.x, -position.y);
  planet.screen = worldToScreen(position.x, position.y);

  if (planet.rings) drawRings(planet, position, true);
  if (planet.atmosphere) drawAtmosphere(position, planet.radius, planet.atmosphere);
  drawSphere(position, planet.radius, planet.colors, toSun);
  if (planet.bands) drawBands(planet, position);
  if (planet.continents) drawContinents(planet, position);
  if (planet.rings) drawRings(planet, position, false);
  drawShadow(position, planet.radius, toSun);

  planet.moons.forEach((moon) => {
    const at = moonPosition(planet, moon, position);
    const moonRadius = moon.radius * sizeFactor();
    drawDisc(at, moonRadius, moon.color);
    drawShadow(at, moonRadius, toSun);
  });
}

/** Solid disc through the raw context, so gradient fills never leak into it. */
function drawDisc(at, radius, colour) {
  const ctx = drawingContext;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TWO_PI);
  ctx.fill();
}

function drawSphere(at, radius, colors, lightDirection) {
  const ctx = drawingContext;
  fillRadial(
    at.x + lightDirection.x * radius * 0.5,
    at.y + lightDirection.y * radius * 0.5,
    radius * 0.05,
    at.x,
    at.y,
    radius * 1.05,
    [
      [0, colors.light],
      [0.5, colors.base],
      [1, colors.dark],
    ],
  );
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TWO_PI);
  ctx.fill();
}

/** Night side: darkness radiating from the point facing away from the Sun. */
function drawShadow(at, radius, toSun) {
  const ctx = drawingContext;
  const cx = at.x - toSun.x * radius * 0.8;
  const cy = at.y - toSun.y * radius * 0.8;
  fillRadial(cx, cy, 0, cx, cy, radius * 2, [
    [0, "rgba(0, 0, 10, 0.65)"],
    [0.5, "rgba(0, 0, 10, 0.2)"],
    [0.8, "rgba(0, 0, 10, 0)"],
  ]);
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, TWO_PI);
  ctx.fill();
}

function drawAtmosphere(at, radius, color) {
  const ctx = drawingContext;
  fillRadial(at.x, at.y, radius * 0.9, at.x, at.y, radius * 1.6, [
    [0, color],
    [1, "rgba(0, 0, 0, 0)"],
  ]);
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius * 1.6, 0, TWO_PI);
  ctx.fill();
}

function drawBands(planet, at) {
  const ctx = drawingContext;
  const r = planet.radius;
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, TWO_PI);
  ctx.clip();
  const bandCount = planet.bands.length * 2 + 1;
  for (let i = 0; i < bandCount; i++) {
    const y = at.y - r + ((i + 0.5) * 2 * r) / bandCount;
    ctx.fillStyle = planet.bands[i % planet.bands.length];
    ctx.fillRect(at.x - r, y - r / bandCount / 2, 2 * r, r / bandCount);
  }
  if (planet.spot) {
    const spin = (simYears * 9) % TWO_PI;
    ctx.fillStyle = planet.spot;
    ctx.beginPath();
    ctx.ellipse(at.x + r * 0.9 * cos(spin), at.y + r * 0.35, r * 0.28, r * 0.16, 0, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawContinents(planet, at) {
  const ctx = drawingContext;
  const r = planet.radius;
  const spin = simYears * 40;
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, TWO_PI);
  ctx.clip();
  ctx.fillStyle = planet.continents;
  for (let i = 0; i < 5; i++) {
    const angle = spin + (i * TWO_PI) / 5;
    const facing = sin(angle);
    if (facing <= 0) continue;
    ctx.beginPath();
    ctx.ellipse(at.x + r * 0.9 * cos(angle), at.y + r * 0.45 * sin(i * 2.1), r * 0.36 * facing, r * 0.3, i, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

/** Rings are drawn twice: the far half behind the planet, the near half in front. */
function drawRings(planet, at, farHalf) {
  const { inner, outer, tilt, color } = planet.rings;
  const r = planet.radius;
  const start = farHalf ? PI : 0;
  const end = farHalf ? TWO_PI : PI;
  noFill();
  strokeCap(SQUARE);
  const ringCount = 9;
  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const radius = lerp(inner, outer, t) * r;
    const alpha = 150 * (0.45 + 0.55 * noise(i * 0.7 + planet.au)) * (t > 0.6 && t < 0.72 ? 0.35 : 1);
    stroke(color[0], color[1], color[2], alpha);
    strokeWeight(((outer - inner) * r) / ringCount);
    arc(at.x, at.y, radius * 2, radius * 2 * tilt, start, end);
  }
}

// ---------------------------------------------------------------------------
// Comet
// ---------------------------------------------------------------------------

/** Solve Kepler's equation for the comet at the given simulated time. */
function cometState(years) {
  const period = Math.pow(COMET.a, 1.5);
  const meanAnomaly = COMET.phase + (TWO_PI * years) / period;
  let eccentric = meanAnomaly;
  for (let i = 0; i < 8; i++) {
    eccentric -= (eccentric - COMET.e * sin(eccentric) - meanAnomaly) / (1 - COMET.e * cos(eccentric));
  }
  const trueAnomaly = 2 * atan2(sqrt(1 + COMET.e) * sin(eccentric / 2), sqrt(1 - COMET.e) * cos(eccentric / 2));
  const au = COMET.a * (1 - COMET.e * cos(eccentric));
  const angle = trueAnomaly + COMET.omega;
  const r = orbitRadius(au);
  return { au, x: r * cos(angle), y: -r * sin(angle) };
}

function buildCometPath() {
  const period = Math.pow(COMET.a, 1.5);
  return Array.from({ length: 240 }, (_, i) => cometState(((i / 240) * period) - (COMET.phase * period) / TWO_PI));
}

function drawComet() {
  const state = cometState(simYears);
  const away = normalise(state.x, state.y);
  const side = { x: -away.y, y: away.x };
  const tailLength = constrain((140 * sizeFactor()) / state.au, 6, 160 * sizeFactor());
  const steps = 26;

  blendMode(ADD);
  noStroke();
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const fade = 1 - t;
    const ion = {
      x: state.x + away.x * tailLength * t,
      y: state.y + away.y * tailLength * t,
    };
    fill(120, 180, 255, 110 * fade);
    circle(ion.x, ion.y, (2 + 8 * t) * sizeFactor() * fade + 1);
    const curl = tailLength * 0.35 * t * t;
    fill(255, 220, 160, 70 * fade);
    circle(ion.x + side.x * curl, ion.y + side.y * curl, (2 + 6 * t) * sizeFactor() * fade + 1);
  }
  fill(220, 240, 255, 180);
  circle(state.x, state.y, 7 * sizeFactor());
  blendMode(BLEND);
  fill(255);
  circle(state.x, state.y, 3 * sizeFactor());
  COMET.screen = worldToScreen(state.x, state.y);
}

// ---------------------------------------------------------------------------
// Labels and HUD
// ---------------------------------------------------------------------------

function drawLabels() {
  const hovered = nearestPlanet(mouseX, mouseY, 24);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  noStroke();
  PLANETS.forEach((planet) => {
    const highlight = planet === hovered || planet === followTarget;
    if (!showLabels && !highlight) return;
    const { x, y } = planet.screen;
    const offset = planet.radius * camera.zoom + 8;
    if (highlight) {
      textSize(10);
      fill(180, 200, 230, 220);
      const moons = `${planet.moons.length} moon${planet.moons.length === 1 ? "" : "s"}`;
      text(`${planet.au} AU  ·  ${planet.period} yr  ·  ${moons}`, x, y - offset - 14);
      textSize(12);
    }
    fill(255, 255, 255, highlight ? 240 : 150);
    text(planet.name, x, y - offset);
  });
  if (showLabels && COMET.screen) {
    fill(160, 200, 255, 170);
    text(COMET.name, COMET.screen.x, COMET.screen.y - 10);
  }
}

function drawHud() {
  const lines = [
    "SOLAR SYSTEM",
    "",
    `speed ×${speed.toFixed(2)}${paused ? "  (paused)" : ""}`,
    `elapsed ${simYears.toFixed(2)} Earth years`,
    `zoom ${camera.zoom.toFixed(2)}×${followTarget ? `  following ${followTarget === "sun" ? "the Sun" : followTarget.name}` : ""}`,
    "",
    "scroll  zoom      drag  pan      click  follow",
    "space  pause      + / -  speed      r  reset",
    "o  orbits      l  labels      h  hide this",
    "",
    "distances log-scaled · sizes ∝ R^0.7 · moons slowed 50×",
  ];
  textAlign(LEFT, TOP);
  textSize(12);
  const lineHeight = 16;
  const panelWidth = 330;
  const panelHeight = lines.length * lineHeight + 20;
  noStroke();
  fill(4, 8, 20, 170);
  rect(14, 14, panelWidth, panelHeight, 8);
  lines.forEach((line, i) => {
    fill(i === 0 ? color(255, 210, 120) : i >= 6 ? color(160, 175, 200) : color(220, 228, 240));
    text(line, 26, 24 + i * lineHeight);
  });
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function mouseWheel(event) {
  const factor = Math.exp(-event.deltaY * 0.0015);
  const before = screenToWorld(mouseX, mouseY);
  camera.zoom = constrain(camera.zoom * factor, 0.25, 14);
  if (!followTarget) {
    const after = screenToWorld(mouseX, mouseY);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }
  return false;
}

function mousePressed() {
  dragStart = { x: mouseX, y: mouseY, camX: camera.x, camY: camera.y };
}

function mouseDragged() {
  if (!dragStart) return;
  if (dist(mouseX, mouseY, dragStart.x, dragStart.y) > 3) followTarget = null;
  if (!followTarget) {
    camera.x = dragStart.camX - (mouseX - dragStart.x) / camera.zoom;
    camera.y = dragStart.camY - (mouseY - dragStart.y) / camera.zoom;
  }
}

function mouseReleased() {
  if (!dragStart) return;
  const moved = dist(mouseX, mouseY, dragStart.x, dragStart.y);
  dragStart = null;
  if (moved > 3) return;
  const planet = nearestPlanet(mouseX, mouseY, 18);
  const sun = worldToScreen(0, 0);
  if (planet) {
    followTarget = planet;
  } else if (dist(mouseX, mouseY, sun.x, sun.y) < SUN_RADIUS * sizeFactor() * camera.zoom + 10) {
    followTarget = "sun";
  }
}

const KEY_ACTIONS = {
  " ": () => (paused = !paused),
  "+": () => (speed = min(speed * 1.5, 200)),
  "=": () => (speed = min(speed * 1.5, 200)),
  "-": () => (speed = max(speed / 1.5, 0.02)),
  o: () => (showOrbits = !showOrbits),
  l: () => (showLabels = !showLabels),
  h: () => (showHud = !showHud),
  r: resetView,
  Escape: () => (followTarget = null),
};

function keyPressed() {
  const action = KEY_ACTIONS[key.length === 1 ? key.toLowerCase() : key];
  if (!action) return true;
  action();
  return false;
}

function resetView() {
  camera.x = 0;
  camera.y = 0;
  camera.zoom = 1;
  speed = 1;
  paused = false;
  followTarget = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function worldToScreen(x, y) {
  return { x: width / 2 + (x - camera.x) * camera.zoom, y: height / 2 + (y - camera.y) * camera.zoom };
}

function screenToWorld(x, y) {
  return { x: (x - width / 2) / camera.zoom + camera.x, y: (y - height / 2) / camera.zoom + camera.y };
}

function nearestPlanet(x, y, slack) {
  let best = null;
  let bestDistance = Infinity;
  PLANETS.forEach((planet) => {
    if (!planet.screen) return;
    const d = dist(x, y, planet.screen.x, planet.screen.y);
    const reach = planet.radius * camera.zoom + slack;
    if (d < reach && d < bestDistance) {
      best = planet;
      bestDistance = d;
    }
  });
  return best;
}

function normalise(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

/** Set the canvas fill to a radial gradient described by [offset, colour] stops. */
function fillRadial(x0, y0, r0, x1, y1, r1, stops) {
  const gradient = drawingContext.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([offset, colour]) => gradient.addColorStop(offset, colour));
  drawingContext.fillStyle = gradient;
}
