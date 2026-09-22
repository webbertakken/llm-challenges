/*
 * Solar system in p5.js
 *
 * Scale: true distances and sizes cannot share one screen, so both are compressed with power
 * laws that keep the ordering and the relative proportions recognisable:
 *   orbit radius  = ORBIT_BASE + ORBIT_SCALE * sqrt(distance in AU)
 *   planet radius = SIZE_SCALE * (radius in 1000 km) ^ SIZE_EXPONENT
 * Orbital periods are real (Kepler), so inner planets race while Neptune crawls.
 * Moon periods are compressed (sqrt of the real period) so fast moons stay visible.
 *
 * Controls: drag = pan, wheel = zoom (towards cursor), click a body = follow it,
 * space = pause, + / - = speed, L = labels, O = orbits, R = reset view.
 */

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ORBIT_BASE = 62;
const ORBIT_SCALE = 90;
const SIZE_SCALE = 1.9;
const SIZE_EXPONENT = 0.55;
const SUN_RADIUS = 34;
const DEFAULT_DAYS_PER_SECOND = 20;

const PLANETS = [
  { name: "Mercury", au: 0.387, radiusKm: 2440, periodDays: 87.97, colors: ["#d9d4cf", "#9a918a", "#3b3632"], moons: [] },
  { name: "Venus", au: 0.723, radiusKm: 6052, periodDays: 224.7, colors: ["#fff1c9", "#e3b964", "#5a3f16"], moons: [] },
  {
    name: "Earth",
    au: 1.0,
    radiusKm: 6371,
    periodDays: 365.26,
    colors: ["#bfe6ff", "#2f7fd6", "#0a1f45"],
    atmosphere: "rgba(120, 190, 255, 0.35)",
    moons: [{ name: "Moon", distance: 9, radius: 1.4, periodDays: 27.3, color: "#cfcfcf" }],
  },
  {
    name: "Mars",
    au: 1.524,
    radiusKm: 3390,
    periodDays: 686.98,
    colors: ["#ffb28a", "#c1440e", "#3d1204"],
    moons: [
      { name: "Phobos", distance: 5, radius: 0.7, periodDays: 0.32, color: "#b9a38f" },
      { name: "Deimos", distance: 7.5, radius: 0.55, periodDays: 1.26, color: "#c9b8a6" },
    ],
  },
  {
    name: "Jupiter",
    au: 5.203,
    radiusKm: 69911,
    periodDays: 4332.6,
    colors: ["#f6e2c3", "#c99b6d", "#4a3020"],
    bands: ["#e8c9a0", "#b27c52", "#f0dcc0", "#a5693f", "#dcb48a"],
    moons: [
      { name: "Io", distance: 22, radius: 1.3, periodDays: 1.77, color: "#f2d65c" },
      { name: "Europa", distance: 27, radius: 1.15, periodDays: 3.55, color: "#d8cbb4" },
      { name: "Ganymede", distance: 33, radius: 1.8, periodDays: 7.15, color: "#a89f93" },
      { name: "Callisto", distance: 40, radius: 1.65, periodDays: 16.69, color: "#6f665c" },
    ],
  },
  {
    name: "Saturn",
    au: 9.537,
    radiusKm: 58232,
    periodDays: 10759.2,
    colors: ["#fff3d1", "#dcc08a", "#5b4526"],
    bands: ["#eed9a8", "#d2b47a", "#f3e2b8", "#c9a86c"],
    rings: { inner: 1.3, outer: 2.3, tilt: 0.38, colors: ["rgba(214, 196, 150, 0.55)", "rgba(180, 160, 120, 0.25)", "rgba(230, 214, 170, 0.7)"] },
    moons: [
      { name: "Rhea", distance: 36, radius: 0.9, periodDays: 4.52, color: "#d4d0c8" },
      { name: "Titan", distance: 46, radius: 1.7, periodDays: 15.95, color: "#e0a64a" },
    ],
  },
  {
    name: "Uranus",
    au: 19.19,
    radiusKm: 25362,
    periodDays: 30688.5,
    colors: ["#e4ffff", "#7fd6e0", "#1d4f5c"],
    rings: { inner: 1.5, outer: 1.8, tilt: 0.95, colors: ["rgba(190, 230, 240, 0.25)", "rgba(190, 230, 240, 0.1)", "rgba(210, 240, 250, 0.35)"] },
    moons: [{ name: "Titania", distance: 17, radius: 1.0, periodDays: 8.71, color: "#c7c2bb" }],
  },
  {
    name: "Neptune",
    au: 30.07,
    radiusKm: 24622,
    periodDays: 60182,
    colors: ["#b5ccff", "#3f63d9", "#0c1a52"],
    // Triton orbits retrograde.
    moons: [{ name: "Triton", distance: 16, radius: 1.1, periodDays: -5.88, color: "#d9c9c0" }],
  },
];

// A fictional short-period comet (keeps the tail on screen often enough to enjoy it).
const COMET = { name: "Comet", semiMajorAu: 6, eccentricity: 0.9, periodDays: 365.26 * Math.pow(6, 1.5), perihelionAngle: -0.9 };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const view = { zoom: 1, panX: 0, panY: 0, targetZoom: 1 };
const settings = { paused: false, daysPerSecond: DEFAULT_DAYS_PER_SECOND, labels: true, orbits: true };
let simDays = 0;
let followed = null;
let hovered = null;
let dragging = null;
let starLayer;
let twinklers = [];
let asteroids = [];
let kuiper = [];
let bodies = [];

// ---------------------------------------------------------------------------
// Scaling helpers
// ---------------------------------------------------------------------------

function orbitRadius(au) {
  return ORBIT_BASE + ORBIT_SCALE * Math.sqrt(au);
}

function planetRadius(radiusKm) {
  return SIZE_SCALE * Math.pow(radiusKm / 1000, SIZE_EXPONENT);
}

function fitZoom() {
  return (Math.min(width, height) / 2 - 20) / orbitRadius(33);
}

function screenToWorld(sx, sy) {
  return { x: (sx - width / 2 - view.panX) / view.zoom, y: (sy - height / 2 - view.panY) / view.zoom };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  textFont("sans-serif");

  PLANETS.forEach((planet, index) => {
    planet.orbit = orbitRadius(planet.au);
    planet.radius = planetRadius(planet.radiusKm);
    planet.phase = (index * 2.39996) % TWO_PI; // golden angle spread for a pleasant start
    planet.moons.forEach((moon, moonIndex) => (moon.phase = moonIndex * 1.7));
  });

  randomSeed(7);
  asteroids = makeBelt(2.1, 3.3, 1400, 0.4, 1.3);
  kuiper = makeBelt(31, 48, 1100, 0.3, 1.1);

  buildStarLayer();
  resetView();
  applyUrlOptions();
}

/** Deep links, e.g. index.html?follow=Saturn&zoom=6 */
function applyUrlOptions() {
  const params = new URLSearchParams(window.location.search);
  const zoom = Number(params.get("zoom"));
  if (zoom > 0) view.zoom = view.targetZoom = constrain(zoom, 0.2, 40);
  const name = (params.get("follow") || "").toLowerCase();
  followed = PLANETS.find((planet) => planet.name.toLowerCase() === name) || null;
  if (followed) {
    updateBodies();
    view.panX = -followed.x * view.zoom;
    view.panY = -followed.y * view.zoom;
  }
}

function makeBelt(minAu, maxAu, count, minSize, maxSize) {
  const belt = [];
  for (let i = 0; i < count; i++) {
    const au = random(minAu, maxAu);
    belt.push({
      au,
      radius: orbitRadius(au) + randomGaussian(0, 2),
      angle: random(TWO_PI),
      size: random(minSize, maxSize),
      periodDays: 365.26 * Math.pow(au, 1.5),
      shade: random(110, 200),
    });
  }
  return belt;
}

function buildStarLayer() {
  starLayer = createGraphics(width, height);
  starLayer.pixelDensity(1);
  const ctx = starLayer.drawingContext;

  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#03040d");
  sky.addColorStop(0.5, "#060818");
  sky.addColorStop(1, "#02030a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Faint nebula clouds along a diagonal "milky way" band.
  const nebulaColors = ["rgba(90, 60, 160, 0.10)", "rgba(40, 90, 170, 0.09)", "rgba(160, 60, 120, 0.07)"];
  for (let i = 0; i < 26; i++) {
    const t = random();
    const x = t * width + randomGaussian(0, width * 0.05);
    const y = (1 - t) * height * 0.9 + randomGaussian(0, height * 0.08);
    const r = random(80, 260);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, random(nebulaColors));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  starLayer.noStroke();
  const density = (width * height) / 1400;
  for (let i = 0; i < density; i++) {
    const tint = random([
      [255, 255, 255],
      [200, 220, 255],
      [255, 235, 200],
      [255, 210, 180],
    ]);
    starLayer.fill(tint[0], tint[1], tint[2], random(60, 200));
    starLayer.circle(random(width), random(height), random(0.5, 1.6));
  }

  twinklers = Array.from({ length: 90 }, () => ({
    x: random(width),
    y: random(height),
    size: random(1.2, 2.6),
    speed: random(0.5, 2),
    offset: random(TWO_PI),
  }));
}

function resetView() {
  followed = null;
  view.targetZoom = fitZoom();
  view.zoom = view.targetZoom;
  view.panX = 0;
  view.panY = 0;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildStarLayer();
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

function angleAt(periodDays, phase) {
  return phase + (TWO_PI * simDays) / periodDays;
}

function updateBodies() {
  bodies = [];
  for (const planet of PLANETS) {
    const angle = angleAt(planet.periodDays, planet.phase);
    planet.x = Math.cos(angle) * planet.orbit;
    planet.y = Math.sin(angle) * planet.orbit;
    bodies.push(planet);

    for (const moon of planet.moons) {
      const direction = Math.sign(moon.periodDays);
      const visualPeriod = Math.sqrt(Math.abs(moon.periodDays)) * 18;
      const moonAngle = moon.phase + (direction * TWO_PI * simDays) / visualPeriod;
      moon.orbit = planet.radius + moon.distance * 0.45;
      moon.x = planet.x + Math.cos(moonAngle) * moon.orbit;
      moon.y = planet.y + Math.sin(moonAngle) * moon.orbit;
      moon.parent = planet;
      bodies.push(moon);
    }
  }
  updateComet();
  bodies.push(COMET);
}

function solveKepler(meanAnomaly, e) {
  let E = meanAnomaly;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  return E;
}

function cometPositionAt(meanAnomaly) {
  const { semiMajorAu: a, eccentricity: e, perihelionAngle } = COMET;
  const E = solveKepler(meanAnomaly, e);
  const px = a * (Math.cos(E) - e);
  const py = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const au = Math.hypot(px, py);
  const angle = Math.atan2(py, px) + perihelionAngle;
  const r = orbitRadius(au);
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, au };
}

function updateComet() {
  const mean = ((TWO_PI * simDays) / COMET.periodDays + 2.6) % TWO_PI;
  Object.assign(COMET, cometPositionAt(mean), { radius: 1.6 });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function draw() {
  if (!settings.paused) simDays += (settings.daysPerSecond * deltaTime) / 1000;
  updateBodies();
  updateCamera();

  image(starLayer, 0, 0, width, height);
  drawTwinkles();

  push();
  translate(width / 2 + view.panX, height / 2 + view.panY);
  scale(view.zoom);

  if (settings.orbits) drawOrbits();
  drawBelt(asteroids, 1);
  drawBelt(kuiper, 1.1);
  drawComet();
  drawSun();
  for (const planet of PLANETS) drawPlanet(planet);
  if (settings.labels) drawLabels();
  drawHighlight();

  pop();
  drawHud();
}

function updateCamera() {
  const previous = view.zoom;
  view.zoom = lerp(view.zoom, view.targetZoom, 0.18);
  if (followed) {
    view.panX = lerp(view.panX, -followed.x * view.zoom, 0.12);
    view.panY = lerp(view.panY, -followed.y * view.zoom, 0.12);
  } else if (view.zoomAnchor) {
    // Keep the world point under the cursor fixed while zoom eases in.
    const { sx, sy, wx, wy } = view.zoomAnchor;
    view.panX = sx - width / 2 - wx * view.zoom;
    view.panY = sy - height / 2 - wy * view.zoom;
    if (Math.abs(view.zoom - view.targetZoom) < 1e-4 && previous === view.zoom) view.zoomAnchor = null;
  }
}

function drawTwinkles() {
  noStroke();
  const t = millis() / 1000;
  for (const star of twinklers) {
    const alpha = 120 + 120 * Math.sin(t * star.speed + star.offset);
    fill(255, 255, 255, alpha);
    circle(star.x, star.y, star.size);
    if (alpha > 200) {
      stroke(255, 255, 255, alpha - 200);
      strokeWeight(0.6);
      line(star.x - star.size * 2, star.y, star.x + star.size * 2, star.y);
      line(star.x, star.y - star.size * 2, star.x, star.y + star.size * 2);
      noStroke();
    }
  }
}

function drawOrbits() {
  noFill();
  strokeWeight(1 / view.zoom);
  for (const planet of PLANETS) {
    const emphasised = planet === followed || planet === hovered;
    stroke(150, 180, 255, emphasised ? 110 : 38);
    circle(0, 0, planet.orbit * 2);
  }
  stroke(255, 255, 255, 18);
  for (const planet of PLANETS) {
    for (const moon of planet.moons) circle(planet.x, planet.y, moon.orbit * 2);
  }

  // Comet orbit, sampled through the same distance mapping.
  stroke(160, 220, 255, 26);
  beginShape();
  for (let m = 0; m <= TWO_PI + 0.01; m += 0.02) {
    const p = cometPositionAt(m);
    vertex(p.x, p.y);
  }
  endShape(CLOSE);
}

function drawBelt(belt, alphaScale) {
  noStroke();
  for (const rock of belt) {
    const angle = rock.angle + (TWO_PI * simDays) / rock.periodDays;
    fill(rock.shade, rock.shade * 0.92, rock.shade * 0.85, 150 * alphaScale);
    circle(Math.cos(angle) * rock.radius, Math.sin(angle) * rock.radius, rock.size);
  }
}

function drawSun() {
  const ctx = drawingContext;
  const pulse = 1 + 0.04 * Math.sin(millis() / 700);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(0, 0, SUN_RADIUS * 0.6, 0, 0, SUN_RADIUS * 5 * pulse);
  halo.addColorStop(0, "rgba(255, 190, 80, 0.55)");
  halo.addColorStop(0.25, "rgba(255, 130, 40, 0.18)");
  halo.addColorStop(1, "rgba(255, 90, 20, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS * 5 * pulse, 0, TWO_PI);
  ctx.fill();

  // Soft corona rays that slowly breathe.
  const t = millis() / 4000;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TWO_PI + t * 0.3;
    const length = SUN_RADIUS * (1.9 + 0.6 * noise(i, t));
    const ray = ctx.createRadialGradient(0, 0, SUN_RADIUS, 0, 0, length);
    ray.addColorStop(0, "rgba(255, 200, 110, 0.18)");
    ray.addColorStop(1, "rgba(255, 150, 60, 0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, length, angle - 0.12, angle + 0.12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  const core = ctx.createRadialGradient(-SUN_RADIUS * 0.25, -SUN_RADIUS * 0.25, 0, 0, 0, SUN_RADIUS);
  core.addColorStop(0, "#fffbe8");
  core.addColorStop(0.35, "#ffe27a");
  core.addColorStop(0.8, "#ffab2e");
  core.addColorStop(1, "#ff7a14");
  ctx.shadowColor = "rgba(255, 170, 60, 0.9)";
  ctx.shadowBlur = 40 * view.zoom;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

/** Radial gradient lit from the Sun: highlight on the day side, dark on the night side. */
function litGradient(x, y, r, colors) {
  const lightAngle = Math.atan2(-y, -x);
  const hx = x + Math.cos(lightAngle) * r * 0.45;
  const hy = y + Math.sin(lightAngle) * r * 0.45;
  const gradient = drawingContext.createRadialGradient(hx, hy, r * 0.05, x, y, r * 1.05);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.45, colors[1]);
  gradient.addColorStop(1, colors[2]);
  return gradient;
}

function drawRings(planet, half) {
  const { rings, x, y, radius } = planet;
  const ctx = drawingContext;
  const bandWidth = (rings.outer - rings.inner) / rings.colors.length;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  // The far half of the rings is drawn before the planet, the near half after it.
  const outer = radius * rings.outer;
  ctx.beginPath();
  ctx.rect(-outer - 1, half === "back" ? -outer - 1 : 0, outer * 2 + 2, outer + 1);
  ctx.clip();
  rings.colors.forEach((color, band) => {
    const inner = radius * (rings.inner + band * bandWidth);
    const outerBand = inner + radius * bandWidth;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, outerBand, outerBand * rings.tilt, 0, 0, TWO_PI);
    ctx.ellipse(0, 0, inner, inner * rings.tilt, 0, 0, TWO_PI);
    ctx.fill("evenodd");
  });
  ctx.restore();
}

function drawBands(planet) {
  const { x, y, radius, bands } = planet;
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.clip();
  const stripe = (radius * 2) / (bands.length * 2 + 1);
  for (let i = 0; i < bands.length * 2 + 1; i++) {
    ctx.fillStyle = bands[i % bands.length];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x - radius, y - radius + i * stripe, radius * 2, stripe + 0.3);
  }
  if (planet.name === "Jupiter") {
    // The Great Red Spot.
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#b5533a";
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.35, y + radius * 0.3, radius * 0.22, radius * 0.12, 0, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawNightSide(planet) {
  const { x, y, radius } = planet;
  const ctx = drawingContext;
  const lightAngle = Math.atan2(-y, -x);
  const shadow = ctx.createLinearGradient(
    x + Math.cos(lightAngle) * radius,
    y + Math.sin(lightAngle) * radius,
    x - Math.cos(lightAngle) * radius,
    y - Math.sin(lightAngle) * radius,
  );
  shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(0.5, "rgba(0, 0, 10, 0.25)");
  shadow.addColorStop(1, "rgba(0, 0, 10, 0.8)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();
}

function drawPlanet(planet) {
  const { x, y, radius } = planet;
  const ctx = drawingContext;

  if (planet.rings) drawRings(planet, "back");

  if (planet.atmosphere) {
    const glow = ctx.createRadialGradient(x, y, radius * 0.9, x, y, radius * 1.6);
    glow.addColorStop(0, planet.atmosphere);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.6, 0, TWO_PI);
    ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = planet.colors[1];
  ctx.shadowBlur = 12 * view.zoom;
  ctx.fillStyle = litGradient(x, y, radius, planet.colors);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  if (planet.bands) drawBands(planet);
  drawNightSide(planet);
  if (planet.rings) drawRings(planet, "front");

  for (const moon of planet.moons) {
    ctx.fillStyle = litGradient(moon.x, moon.y, moon.radius, [moon.color, moon.color, "#1a1a1a"]);
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.radius, 0, TWO_PI);
    ctx.fill();
  }
}

function drawComet() {
  const { x, y, au } = COMET;
  const ctx = drawingContext;
  const away = Math.atan2(y, x);
  const tailLength = constrain(140 / (au + 0.4), 6, 150);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [spread, color] of [
    [0.12, "rgba(140, 200, 255, 0.35)"],
    [0.05, "rgba(230, 245, 255, 0.5)"],
  ]) {
    const tipX = x + Math.cos(away) * tailLength;
    const tipY = y + Math.sin(away) * tailLength;
    const tail = ctx.createLinearGradient(x, y, tipX, tipY);
    tail.addColorStop(0, color);
    tail.addColorStop(1, "rgba(140, 200, 255, 0)");
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(away + Math.PI / 2) * 1.5, y + Math.sin(away + Math.PI / 2) * 1.5);
    ctx.lineTo(x + Math.cos(away + spread) * tailLength, y + Math.sin(away + spread) * tailLength);
    ctx.lineTo(x + Math.cos(away - spread) * tailLength, y + Math.sin(away - spread) * tailLength);
    ctx.lineTo(x + Math.cos(away - Math.PI / 2) * 1.5, y + Math.sin(away - Math.PI / 2) * 1.5);
    ctx.closePath();
    ctx.fill();
  }
  const head = ctx.createRadialGradient(x, y, 0, x, y, 5);
  head.addColorStop(0, "rgba(255, 255, 255, 1)");
  head.addColorStop(1, "rgba(150, 210, 255, 0)");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

function drawLabels() {
  textAlign(CENTER, TOP);
  noStroke();
  const size = 12 / view.zoom;
  textSize(size);
  for (const planet of PLANETS) {
    const emphasised = planet === followed || planet === hovered;
    fill(230, 238, 255, emphasised ? 255 : 190);
    const offset = planet.rings ? planet.radius * planet.rings.outer * 0.75 : planet.radius;
    text(planet.name, planet.x, planet.y + offset + 5 / view.zoom);
  }
  // Moon names only once there is room for them.
  if (view.zoom > 3) {
    textSize(9 / view.zoom);
    fill(200, 210, 230, 170);
    for (const planet of PLANETS) {
      for (const moon of planet.moons) text(moon.name, moon.x, moon.y + moon.radius + 2 / view.zoom);
    }
  }
  fill(255, 220, 150, 210);
  textSize(size);
  text("Sun", 0, SUN_RADIUS + 8 / view.zoom);
}

function drawHighlight() {
  for (const body of [hovered, followed]) {
    if (!body) continue;
    noFill();
    stroke(255, 255, 255, 150);
    strokeWeight(1.2 / view.zoom);
    const r = (body.rings ? body.radius * body.rings.outer : body.radius) + 6 / view.zoom;
    circle(body.x, body.y, r * 2);
  }
}

function drawHud() {
  const years = simDays / 365.26;
  noStroke();
  fill(4, 8, 24, 170);
  rect(12, 12, 250, 74, 8);
  fill(240, 244, 255);
  textAlign(LEFT, TOP);
  textSize(15);
  text("Solar System", 24, 22);
  textSize(12);
  fill(200, 212, 240);
  text(`Elapsed: ${years.toFixed(2)} years`, 24, 44);
  text(settings.paused ? "Paused" : `Speed: ${settings.daysPerSecond.toFixed(1)} days / s`, 24, 62);

  const info = hovered || followed;
  if (info) drawInfo(info);

  textAlign(LEFT, BOTTOM);
  textSize(12);
  fill(190, 200, 230, 200);
  text("Drag: pan  -  Wheel: zoom  -  Click: follow  -  Space: pause  -  +/-: speed  -  L: labels  -  O: orbits  -  R: reset", 16, height - 14);
}

function drawInfo(body) {
  const lines = [body.name];
  if (body.au !== undefined && body.periodDays !== undefined && body !== COMET) {
    lines.push(`Distance: ${body.au.toFixed(2)} AU`);
    lines.push(`Year: ${(body.periodDays / 365.26).toFixed(2)} Earth years`);
    lines.push(`Radius: ${body.radiusKm.toLocaleString("en-GB")} km`);
    lines.push(`Moons shown: ${body.moons.length ? body.moons.map((m) => m.name).join(", ") : "none"}`);
  } else if (body.parent) {
    lines.push(`Moon of ${body.parent.name}`);
    lines.push(`Period: ${Math.abs(body.periodDays)} days${body.periodDays < 0 ? " (retrograde)" : ""}`);
  } else if (body === COMET) {
    lines.push(`Distance: ${COMET.au.toFixed(2)} AU`);
    lines.push(`Period: ${(COMET.periodDays / 365.26).toFixed(1)} years, e = ${COMET.eccentricity}`);
  }
  textSize(12);
  const w = Math.max(...lines.map((l) => textWidth(l))) + 28;
  const h = lines.length * 18 + 16;
  fill(4, 8, 24, 190);
  rect(width - w - 12, 12, w, h, 8);
  textAlign(LEFT, TOP);
  lines.forEach((line, i) => {
    fill(i === 0 ? color(255, 255, 255) : color(200, 212, 240));
    textSize(i === 0 ? 14 : 12);
    text(line, width - w + 2, 20 + i * 18);
  });
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function bodyAt(sx, sy) {
  const world = screenToWorld(sx, sy);
  const tolerance = 8 / view.zoom;
  let best = null;
  let bestDistance = Infinity;
  for (const body of bodies) {
    const d = Math.hypot(world.x - body.x, world.y - body.y) - body.radius;
    if (d < tolerance && d < bestDistance) {
      best = body;
      bestDistance = d;
    }
  }
  return best;
}

function mouseMoved() {
  hovered = bodyAt(mouseX, mouseY);
}

function mousePressed() {
  dragging = { x: mouseX, y: mouseY, panX: view.panX, panY: view.panY, moved: false };
}

function mouseDragged() {
  if (!dragging) return;
  const dx = mouseX - dragging.x;
  const dy = mouseY - dragging.y;
  if (Math.hypot(dx, dy) > 3) {
    dragging.moved = true;
    followed = null;
    view.zoomAnchor = null;
    view.panX = dragging.panX + dx;
    view.panY = dragging.panY + dy;
  }
}

function mouseReleased() {
  if (dragging && !dragging.moved) {
    followed = bodyAt(mouseX, mouseY);
    if (followed && view.targetZoom < 2.5) view.targetZoom = 2.5;
  }
  dragging = null;
}

function mouseWheel(event) {
  const factor = Math.exp(-event.delta * 0.0015);
  view.targetZoom = constrain(view.targetZoom * factor, 0.2, 40);
  if (!followed) {
    const world = screenToWorld(mouseX, mouseY);
    view.zoomAnchor = { sx: mouseX, sy: mouseY, wx: world.x, wy: world.y };
  }
  return false;
}

function keyPressed() {
  if (key === " ") settings.paused = !settings.paused;
  else if (key === "+" || key === "=") settings.daysPerSecond = Math.min(settings.daysPerSecond * 1.5, 2000);
  else if (key === "-" || key === "_") settings.daysPerSecond = Math.max(settings.daysPerSecond / 1.5, 0.5);
  else if (key === "l" || key === "L") settings.labels = !settings.labels;
  else if (key === "o" || key === "O") settings.orbits = !settings.orbits;
  else if (key === "r" || key === "R") resetView();
  else if (keyCode === ESCAPE) followed = null;
  else return true;
  return false;
}
