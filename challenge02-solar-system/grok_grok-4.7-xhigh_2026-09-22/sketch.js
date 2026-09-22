"use strict";

// Orrery with a logarithmic distance scale: pixels = 150 + 420·ln(1+AU).
// That keeps Venus–Earth far enough apart for a moon, and still fits Neptune
// on screen. Planet radii use 5 + 6.2·√(R/R⊕), so order matches the real
// system while Jupiter stays drawable. Speeds follow Kepler (P² ∝ a³), with
// a separate, faster clock for moons so their days are visible.

const TAU = Math.PI * 2;
const EARTH_YEAR = 16;
const SUN_RADIUS = 46;

const CATALOG = [
  {
    name: "Mercury",
    au: 0.387,
    years: 0.2408,
    earthRadii: 0.383,
    e: 0.2056,
    peri: 1.352,
    phase: 0.7,
    color: [168, 160, 150],
    atmosphere: [180, 170, 160],
    spinHours: 1407.6,
    moons: [],
  },
  {
    name: "Venus",
    au: 0.723,
    years: 0.6152,
    earthRadii: 0.949,
    e: 0.0068,
    peri: 2.297,
    phase: 2.4,
    color: [236, 214, 164],
    atmosphere: [255, 214, 150],
    spinHours: 5832,
    moons: [],
  },
  {
    name: "Earth",
    au: 1,
    years: 1,
    earthRadii: 1,
    e: 0.0167,
    peri: 1.796,
    phase: 4.2,
    color: [47, 114, 196],
    atmosphere: [120, 186, 255],
    spinHours: 24,
    moons: [
      { name: "Moon", days: 27.32, radius: 3.5, orbit: 22, color: [186, 186, 190], phase: 0.4 },
    ],
  },
  {
    name: "Mars",
    au: 1.524,
    years: 1.8808,
    earthRadii: 0.532,
    e: 0.0934,
    peri: 5.864,
    phase: 1.1,
    color: [196, 92, 52],
    atmosphere: [255, 150, 110],
    spinHours: 24.6,
    moons: [
      { name: "Phobos", days: 0.319, radius: 1.7, orbit: 16, color: [120, 112, 104], phase: 0.2 },
      { name: "Deimos", days: 1.263, radius: 1.5, orbit: 24, color: [150, 140, 132], phase: 2.2 },
    ],
  },
  {
    name: "Jupiter",
    au: 5.203,
    years: 11.862,
    earthRadii: 11.21,
    e: 0.0484,
    peri: 0.25,
    phase: 5.2,
    color: [214, 178, 132],
    atmosphere: [255, 206, 160],
    spinHours: 9.9,
    moons: [
      { name: "Io", days: 1.769, radius: 4.1, orbit: 42, color: [214, 196, 92], phase: 0.5 },
      { name: "Europa", days: 3.551, radius: 3.5, orbit: 54, color: [226, 216, 196], phase: 1.6 },
      { name: "Ganymede", days: 7.155, radius: 4.8, orbit: 70, color: [168, 156, 140], phase: 3.1 },
      { name: "Callisto", days: 16.69, radius: 4.2, orbit: 90, color: [110, 104, 96], phase: 4.4 },
    ],
  },
  {
    name: "Saturn",
    au: 9.537,
    years: 29.457,
    earthRadii: 9.45,
    e: 0.0542,
    peri: 1.613,
    phase: 2.6,
    color: [232, 214, 176],
    atmosphere: [240, 220, 180],
    spinHours: 10.7,
    rings: {
      inner: 1.42,
      outer: 2.32,
      aspect: 0.34,
      tilt: 0,
      color: [214, 196, 154],
      division: true,
    },
    moons: [
      { name: "Enceladus", days: 1.37, radius: 2.2, orbit: 68, color: [236, 240, 246], phase: 1.1 },
      { name: "Rhea", days: 4.518, radius: 2.9, orbit: 84, color: [196, 194, 188], phase: 2.7 },
      { name: "Titan", days: 15.95, radius: 4.6, orbit: 108, color: [214, 164, 78], phase: 4.8 },
    ],
  },
  {
    name: "Uranus",
    au: 19.19,
    years: 84.011,
    earthRadii: 4.01,
    e: 0.0472,
    peri: 2.98,
    phase: 3.6,
    color: [146, 214, 210],
    atmosphere: [190, 255, 246],
    spinHours: 17.2,
    rings: {
      inner: 1.55,
      outer: 1.92,
      aspect: 0.1,
      tilt: Math.PI / 2,
      color: [186, 220, 220],
      division: false,
      behindOnly: true,
    },
    moons: [
      { name: "Titania", days: 8.706, radius: 2.6, orbit: 32, color: [196, 206, 204], phase: 0.8 },
    ],
  },
  {
    name: "Neptune",
    au: 30.07,
    years: 164.8,
    earthRadii: 3.88,
    e: 0.0086,
    peri: 0.773,
    phase: 0.35,
    color: [62, 98, 214],
    atmosphere: [130, 160, 255],
    spinHours: 16.1,
    moons: [
      {
        name: "Triton",
        days: 5.877,
        radius: 3.5,
        orbit: 30,
        color: [196, 186, 196],
        phase: 2.4,
        retrograde: true,
      },
    ],
  },
];

let simTime = 0;
let lastDt = 1 / 60;
let warp = 5;
let paused = false;
let reduceMotion = false;
let framed = true;
let followKey = null;
let followZoom = null;
let pointer = null;
let touchGesture = false;

const cam = { x: 0, y: 0, zoom: 1 };

let planets = [];
let asteroids = [];
let kuiper = [];
let stars = [];
let comet = null;

function setup() {
  const boot = document.getElementById("boot");
  if (boot) boot.remove();

  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  frameRate(60);
  angleMode(RADIANS);
  ellipseMode(CENTER);

  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) paused = true;

  const rand = makeRng(0x51a11);
  planets = CATALOG.map((def) => buildPlanet(def, rand));
  asteroids = Array.from({ length: 240 }, () => buildRock(rand, 2.15, 3.35, 1.4, 3.2));
  kuiper = Array.from({ length: 110 }, () => buildRock(rand, 32, 46, 1.1, 2.2));
  stars = buildStars(makeRng(0xc0ffee), 420);
  comet = {
    name: "Comet",
    au: 5.5,
    e: 0.91,
    peri: 0.55,
    phase: 1.15,
    years: Math.pow(5.5, 1.5),
    period: Math.pow(5.5, 1.5) * EARTH_YEAR,
    radius: 3.4,
    color: [186, 230, 255],
    kind: "comet",
    key: "Comet",
  };
  comet.orbit = sampleOrbit(comet);

  fitAll();
  describe(
    "Top-down solar system with the Sun, eight planets, moons around Earth, Mars, Jupiter, Saturn, Uranus, and Neptune, Saturn and Uranus rings, an asteroid belt, and a comet. Drag to pan, scroll to zoom, and click a planet to follow it.",
  );
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (framed) fitAll();
}

function draw() {
  stepTime();
  const scene = layoutScene(simTime);
  easeCamera(scene.flat);
  const hover = pickBody(scene.flat, mouseX, mouseY);

  background(3, 4, 12);
  drawNebula();
  drawStars();

  push();
  applyCamera();
  drawOrbits(scene.planets, hover);
  drawSun();
  for (const planet of scene.planets) drawPlanetSystem(planet);
  drawCometBody(scene.comet);
  pop();

  drawRocks(asteroids, simTime, [150, 140, 126], 150);
  drawRocks(kuiper, simTime, [130, 150, 176], 80);
  drawHalos(scene.flat);
  drawSunBloom();
  drawVignette();
  drawMarkers(scene.flat, hover);
  drawLabels(scene, hover);
  drawHud(scene, hover);
  cursor(hover || hitList(mouseX, mouseY) >= 0 ? "pointer" : "grab");
}

function stepTime() {
  lastDt = Math.min(deltaTime || 16.7, 50) / 1000;
  if (!paused) simTime += lastDt * warp;
}

function orbitRadius(au) {
  return 150 + 420 * Math.log(1 + au);
}

function planetRadius(earthRadii) {
  return 5 + Math.sqrt(earthRadii) * 6.2;
}

function moonPeriod(days) {
  return 2.4 * Math.pow(days / 1.769, 0.55);
}

function spinPeriod(hours) {
  return 6 * Math.sqrt(Math.max(hours, 1) / 10);
}

// Newton solve of Kepler's equation, then the true anomaly.
function trueAnomaly(meanAnomaly, eccentricity) {
  const M = ((meanAnomaly % TAU) + TAU) % TAU;
  let E = eccentricity < 0.8 ? M : Math.PI;
  for (let i = 0; i < 8; i += 1) {
    const f = E - eccentricity * Math.sin(E) - M;
    const slope = 1 - eccentricity * Math.cos(E);
    E -= f / slope;
  }
  return Math.atan2(
    Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E),
    Math.cos(E) - eccentricity,
  );
}

function polarPosition(el, meanAnomaly) {
  const nu = trueAnomaly(meanAnomaly, el.e);
  const rAu = (el.au * (1 - el.e * el.e)) / (1 + el.e * Math.cos(nu));
  const angle = nu + el.peri;
  const radius = orbitRadius(rAu);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rAu,
  };
}

function sampleOrbit(el) {
  const points = [];
  const steps = 180;
  for (let i = 0; i < steps; i += 1) {
    points.push(polarPosition(el, (i / steps) * TAU));
  }
  return points;
}

function buildPlanet(def, rand) {
  const radius = planetRadius(def.earthRadii);
  const moons = def.moons.map((moon) => ({
    ...moon,
    period: moonPeriod(moon.days),
    craters: makeCraters(rand, moon.name === "Europa" ? 0 : 4, 0.22),
    parent: def.name,
    kind: "moon",
    key: `${def.name}:${moon.name}`,
  }));
  return {
    ...def,
    radius,
    period: def.years * EARTH_YEAR,
    craters: def.name === "Mercury" ? makeCraters(rand, 9, 0.28) : [],
    moons,
    orbit: [],
    kind: "planet",
    key: def.name,
  };
}

function buildRock(rand, auMin, auMax, sizeMin, sizeMax) {
  const au = auMin + rand() * (auMax - auMin);
  const rock = {
    au,
    e: rand() * 0.14,
    peri: rand() * TAU,
    phase: rand() * TAU,
    period: Math.pow(au, 1.5) * EARTH_YEAR,
    size: sizeMin + rand() * (sizeMax - sizeMin),
    tint: 90 + rand() * 80,
  };
  return rock;
}

function buildStars(rand, count) {
  const field = [];
  for (let i = 0; i < count; i += 1) {
    const roll = rand();
    field.push({
      u: rand(),
      v: rand(),
      r: roll > 0.97 ? 2.2 : roll > 0.85 ? 1.5 : 0.8,
      phase: rand() * TAU,
      speed: 0.4 + rand() * 1.6,
      tint: rand(),
      parallax: 0.15 + rand() * 0.85,
    });
  }
  return field;
}

function makeCraters(rand, count, scale) {
  const craters = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * TAU;
    const dist = Math.sqrt(rand()) * 0.7;
    craters.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      s: 0.08 + rand() * scale,
    });
  }
  return craters;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layoutScene(time) {
  // Orbits are sampled once; planets are built before the first draw.
  const laid = [];
  const flat = [];
  for (const planet of planets) {
    if (planet.orbit.length === 0) planet.orbit = sampleOrbit(planet);
    const pos = polarPosition(planet, planet.phase + (TAU * time) / planet.period);
    const moons = planet.moons.map((moon) => {
      const dir = moon.retrograde ? -1 : 1;
      const angle = moon.phase + dir * ((TAU * time) / moon.period);
      return {
        ...moon,
        x: pos.x + Math.cos(angle) * moon.orbit,
        y: pos.y + Math.sin(angle) * moon.orbit,
      };
    });
    const body = { ...planet, x: pos.x, y: pos.y, rAu: pos.rAu, moons };
    laid.push(body);
    flat.push(body);
    for (const moon of moons) flat.push(moon);
  }
  const cometPos = polarPosition(comet, comet.phase + (TAU * time) / comet.period);
  const cometBody = { ...comet, x: cometPos.x, y: cometPos.y, rAu: cometPos.rAu };
  flat.push(cometBody);
  return { planets: laid, comet: cometBody, flat };
}

function applyCamera() {
  translate(width / 2, height / 2);
  scale(cam.zoom);
  translate(-cam.x, -cam.y);
}

function worldToScreen(wx, wy) {
  return {
    x: (wx - cam.x) * cam.zoom + width / 2,
    y: (wy - cam.y) * cam.zoom + height / 2,
  };
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - width / 2) / cam.zoom + cam.x,
    y: (sy - height / 2) / cam.zoom + cam.y,
  };
}

function panelReserve() {
  return width >= 980 ? 230 : 0;
}

function minZoom() {
  return (Math.min(width, height) * 0.18) / orbitRadius(48);
}

function maxZoom() {
  return 18;
}

function fitAll() {
  const reach = orbitRadius(30.07) * 1.14;
  const left = panelReserve();
  const availW = Math.max(240, width - left - 48);
  const availH = Math.max(240, height - 72);
  cam.zoom = Math.min(availW, availH) * 0.5 / reach;
  const viewCenterX = left + (width - left) / 2;
  cam.x = (width / 2 - viewCenterX) / cam.zoom;
  cam.y = 0;
  followKey = null;
  followZoom = null;
  framed = true;
}

function easeCamera(flat) {
  if (!followKey) return;
  const target = flat.find((body) => body.key === followKey);
  if (!target) return;
  cam.x = target.x;
  cam.y = target.y;
  if (followZoom !== null) {
    const blend = 1 - Math.exp(-lastDt * 8);
    cam.zoom += (followZoom - cam.zoom) * blend;
  }
}

function zoomAt(sx, sy, factor) {
  const before = screenToWorld(sx, sy);
  cam.zoom = Math.min(maxZoom(), Math.max(minZoom(), cam.zoom * factor));
  const after = screenToWorld(sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
}

function focusOn(key) {
  followKey = key;
  framed = false;
  const scene = layoutScene(simTime);
  const target = scene.flat.find((body) => body.key === key);
  if (!target) return;
  // Pin immediately so a zoom-in never flies off into empty space.
  cam.x = target.x;
  cam.y = target.y;
  const wanted = target.kind === "moon" ? 28 : target.radius > 18 ? 78 : 56;
  followZoom = Math.min(maxZoom(), Math.max(minZoom(), wanted / target.radius));
}

function decorClock() {
  return reduceMotion ? 0 : millis() / 1000;
}

function drawNebula() {
  noStroke();
  fill(36, 52, 112, 26);
  ellipse(width * 0.22, height * 0.32, width * 0.72, height * 0.48);
  fill(96, 42, 72, 16);
  ellipse(width * 0.78, height * 0.62, width * 0.55, height * 0.42);
  fill(24, 36, 74, 18);
  ellipse(width * 0.5, height * 0.48, width * 0.36, height * 0.28);
}

function drawStars() {
  const t = decorClock();
  const driftX = cam.x * 0.015;
  const driftY = cam.y * 0.015;
  noStroke();
  for (const star of stars) {
    const twinkle = reduceMotion ? 1 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
    let x = (star.u * width - driftX * star.parallax) % width;
    let y = (star.v * height - driftY * star.parallax) % height;
    if (x < 0) x += width;
    if (y < 0) y += height;
    const warm = star.tint > 0.82;
    const cool = star.tint < 0.12;
    fill(warm ? 255 : cool ? 196 : 236, warm ? 226 : cool ? 214 : 238, warm ? 200 : 255, 150 * twinkle);
    circle(x, y, star.r);
  }
}

function drawOrbits(planetBodies, hover) {
  noFill();
  for (const planet of planetBodies) {
    const hot = followKey === planet.key || (hover && hover.key === planet.key);
    stroke(planet.color[0], planet.color[1], planet.color[2], hot ? 150 : 46);
    strokeWeight((hot ? 1.6 : 1.05) / cam.zoom);
    beginShape();
    for (const point of planet.orbit) vertex(point.x, point.y);
    endShape(CLOSE);
  }
}

function drawSun() {
  const t = decorClock();
  const pulse = 1 + Math.sin(t * 1.2) * 0.012;
  const radius = SUN_RADIUS * pulse;

  push();
  blendMode(ADD);
  noStroke();
  fill(255, 160, 50, 16);
  circle(0, 0, radius * 5.4);
  fill(255, 190, 80, 28);
  circle(0, 0, radius * 3.1);
  blendMode(BLEND);

  stroke(255, 214, 150, 54);
  strokeWeight(1.6 / cam.zoom);
  for (let i = 0; i < 16; i += 1) {
    const angle = t * 0.12 + (i * TAU) / 16;
    const len = radius * (1.9 + Math.sin(t * 0.8 + i) * 0.38);
    line(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9, Math.cos(angle) * len, Math.sin(angle) * len);
  }

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();
  const glow = ctx.createRadialGradient(-radius * 0.28, -radius * 0.22, radius * 0.08, 0, 0, radius);
  glow.addColorStop(0, "#fff8e4");
  glow.addColorStop(0.42, "#ffc24d");
  glow.addColorStop(1, "#e15f16");
  ctx.fillStyle = glow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.rotate(t * 0.04);
  ctx.fillStyle = "rgba(255, 80, 20, 0.22)";
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(Math.cos(i * 1.3) * radius * 0.28, Math.sin(i * 1.7) * radius * 0.28, radius * 0.42, radius * 0.16, i, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  pop();
}

function drawSunBloom() {
  const screen = worldToScreen(0, 0);
  const bloom = Math.max(58, SUN_RADIUS * cam.zoom * 1.55);
  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(screen.x, screen.y, SUN_RADIUS * cam.zoom * 0.4, screen.x, screen.y, bloom);
  glow.addColorStop(0, "rgba(255, 226, 170, 0.45)");
  glow.addColorStop(0.4, "rgba(255, 150, 40, 0.1)");
  glow.addColorStop(1, "rgba(255, 120, 20, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, bloom, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPlanetSystem(planet) {
  const far = planet.moons.filter((moon) => moon.y < planet.y);
  const near = planet.moons.filter((moon) => moon.y >= planet.y);
  drawMoonOrbits(planet);
  for (const moon of far) drawGlobe(moon, planet.name === "Earth" ? "Moon" : moon.name);
  if (planet.rings) drawRings(planet, planet.rings.behindOnly ? "all" : "back");
  drawGlobe(planet, planet.name);
  if (planet.rings && !planet.rings.behindOnly) drawRings(planet, "front");
  for (const moon of near) drawGlobe(moon, planet.name === "Earth" ? "Moon" : moon.name);
}

function drawMoonOrbits(planet) {
  const visible = planet.moons.some((moon) => moon.orbit * cam.zoom > 14);
  if (!visible && followKey !== planet.key) return;
  noFill();
  stroke(255, 46);
  strokeWeight(1 / cam.zoom);
  for (const moon of planet.moons) circle(planet.x, planet.y, moon.orbit * 2);
}

function drawRings(planet, which) {
  const rings = planet.rings;
  push();
  translate(planet.x, planet.y);
  if (rings.tilt) rotate(rings.tilt);
  scale(1, rings.aspect);
  noFill();
  strokeCap(SQUARE);
  const mid = ((rings.inner + rings.outer) / 2) * planet.radius;
  const weight = (rings.outer - rings.inner) * planet.radius;
  const alpha = which === "front" ? 210 : 150;
  stroke(rings.color[0], rings.color[1], rings.color[2], alpha);
  strokeWeight(weight);
  if (which === "all") circle(0, 0, mid * 2);
  else if (which === "back") arc(0, 0, mid * 2, mid * 2, PI, TAU);
  else arc(0, 0, mid * 2, mid * 2, 0, PI);
  if (rings.division && which !== "all") {
    const gap = (rings.inner + (rings.outer - rings.inner) * 0.64) * planet.radius;
    stroke(28, 22, 16, 170);
    strokeWeight(weight * 0.16);
    const start = which === "back" ? PI : 0;
    const stop = which === "back" ? TAU : PI;
    arc(0, 0, gap * 2, gap * 2, start, stop);
  }
  pop();
}

function drawGlobe(body, surfaceName) {
  const light = lightVector(body.x, body.y);
  const spin = ((simTime / spinPeriod(body.spinHours || 48)) * TAU) % TAU;
  push();
  translate(body.x, body.y);
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, body.radius, 0, TAU);
  ctx.clip();
  noStroke();
  fill(body.color[0], body.color[1], body.color[2]);
  circle(0, 0, body.radius * 2);
  drawSurface(surfaceName, body, spin);
  const gx = light.x * body.radius * 0.48;
  const gy = light.y * body.radius * 0.48;
  const shade = ctx.createRadialGradient(gx, gy, body.radius * 0.08, 0, 0, body.radius * 1.08);
  shade.addColorStop(0, "rgba(255,255,255,0.4)");
  shade.addColorStop(0.32, "rgba(255,255,255,0.05)");
  shade.addColorStop(0.58, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(-body.radius, -body.radius, body.radius * 2, body.radius * 2);
  ctx.restore();
  if (body.atmosphere && body.kind === "planet") {
    noFill();
    stroke(body.atmosphere[0], body.atmosphere[1], body.atmosphere[2], 80);
    strokeWeight(Math.max(body.radius * 0.1, 0.8));
    circle(0, 0, body.radius * 2.28);
  } else if (surfaceName === "Titan") {
    noFill();
    stroke(232, 164, 70, 90);
    strokeWeight(body.radius * 0.28);
    circle(0, 0, body.radius * 2.35);
  }
  pop();
}

function lightVector(x, y) {
  const dist = Math.hypot(x, y) || 1;
  return { x: -x / dist, y: -y / dist };
}

function drawSurface(name, body, spin) {
  const radius = body.radius;
  if (name === "Mercury") drawCraters(body.craters, radius, [90, 86, 80]);
  else if (name === "Venus") drawVenus(radius);
  else if (name === "Earth") drawEarth(radius, spin);
  else if (name === "Mars") drawMars(radius, spin);
  else if (name === "Jupiter") drawJupiter(radius, spin);
  else if (name === "Saturn") drawBands(radius, SATURN_BANDS, spin, null);
  else if (name === "Uranus") drawUranus(radius);
  else if (name === "Neptune") drawNeptune(radius, spin);
  else if (name === "Moon") drawCraters(body.craters, radius, [120, 120, 124]);
  else if (name === "Io") drawIo(radius);
  else if (name === "Europa") drawEuropa(radius);
  else if (name === "Ganymede" || name === "Callisto" || name === "Rhea" || name === "Phobos" || name === "Deimos") {
    drawCraters(body.craters, radius, [70, 66, 62]);
  }
}

const JUPITER_BANDS = [
  [186, 154, 112],
  [214, 176, 132],
  [148, 104, 72],
  [206, 168, 124],
  [168, 92, 64],
  [196, 150, 108],
  [150, 112, 78],
  [210, 180, 140],
];

const SATURN_BANDS = [
  [226, 206, 164],
  [206, 184, 142],
  [232, 214, 176],
  [196, 170, 128],
  [224, 202, 160],
  [210, 188, 146],
];

function drawCraters(craters, radius, color) {
  noStroke();
  fill(color[0], color[1], color[2], 150);
  for (const crater of craters) {
    ellipse(crater.x * radius, crater.y * radius, crater.s * radius, crater.s * radius * 0.92);
  }
}

function drawVenus(radius) {
  noStroke();
  fill(255, 244, 214, 90);
  ellipse(-radius * 0.1, -radius * 0.2, radius * 1.3, radius * 0.28);
  ellipse(radius * 0.15, radius * 0.18, radius * 1.2, radius * 0.22);
  ellipse(0, radius * 0.48, radius * 1.1, radius * 0.16);
}

function drawEarth(radius, spin) {
  push();
  rotate(spin);
  noStroke();
  fill(58, 140, 78);
  ellipse(-radius * 0.15, -radius * 0.05, radius * 1.05, radius * 0.7);
  fill(86, 158, 92);
  ellipse(radius * 0.48, radius * 0.2, radius * 0.62, radius * 0.4);
  fill(168, 146, 96);
  ellipse(-radius * 0.5, radius * 0.38, radius * 0.4, radius * 0.26);
  fill(255, 255, 255, 80);
  ellipse(radius * 0.05, -radius * 0.42, radius * 0.85, radius * 0.26);
  ellipse(-radius * 0.25, radius * 0.5, radius * 0.55, radius * 0.18);
  pop();
}

function drawMars(radius, spin) {
  noStroke();
  fill(255, 236, 220, 200);
  ellipse(0, -radius * 0.72, radius * 0.7, radius * 0.28);
  push();
  rotate(spin);
  fill(120, 42, 28, 180);
  ellipse(radius * 0.2, radius * 0.05, radius * 0.7, radius * 0.38);
  pop();
}

function drawBands(radius, bands, spin, spotColor) {
  noStroke();
  const bandH = (radius * 2) / bands.length;
  for (let i = 0; i < bands.length; i += 1) {
    fill(bands[i][0], bands[i][1], bands[i][2]);
    rect(-radius, -radius + i * bandH, radius * 2, bandH + 0.8);
  }
  if (spotColor) {
    push();
    rotate(spin);
    fill(spotColor[0], spotColor[1], spotColor[2]);
    ellipse(radius * 0.38, radius * 0.22, radius * 0.52, radius * 0.3);
    pop();
  }
}

function drawJupiter(radius, spin) {
  drawBands(radius, JUPITER_BANDS, spin, [176, 64, 42]);
}

function drawUranus(radius) {
  noStroke();
  fill(210, 255, 250, 70);
  rect(-radius, -radius * 0.06, radius * 2, radius * 0.12);
}

function drawNeptune(radius, spin) {
  push();
  rotate(spin);
  noStroke();
  fill(20, 40, 110, 160);
  ellipse(radius * 0.25, radius * 0.1, radius * 0.46, radius * 0.28);
  pop();
}

function drawIo(radius) {
  noStroke();
  fill(196, 96, 36, 180);
  ellipse(-radius * 0.2, -radius * 0.1, radius * 0.45, radius * 0.36);
  fill(230, 170, 50, 160);
  ellipse(radius * 0.28, radius * 0.22, radius * 0.32, radius * 0.26);
}

function drawEuropa(radius) {
  stroke(176, 92, 72, 170);
  strokeWeight(Math.max(0.6, radius * 0.06));
  line(-radius, -radius * 0.15, radius * 0.8, -radius * 0.05);
  line(-radius * 0.7, radius * 0.3, radius, radius * 0.16);
  line(-radius * 0.2, -radius, radius * 0.1, radius);
}

function drawCometBody(body) {
  const away = Math.hypot(body.x, body.y) || 1;
  const ux = body.x / away;
  const uy = body.y / away;
  const tail = 70 + 220 / Math.max(body.rAu, 0.35);
  noStroke();
  for (let i = 8; i >= 1; i -= 1) {
    const t = i / 8;
    fill(255, 186, 130, 18 * (1 - t));
    circle(body.x + ux * tail * t, body.y + uy * tail * t, body.radius * (3.2 - t * 2));
    fill(170, 220, 255, 28 * (1 - t));
    circle(body.x + ux * tail * t * 1.15, body.y + uy * tail * t * 1.15, body.radius * (2.1 - t));
  }
  fill(236, 248, 255);
  circle(body.x, body.y, body.radius * 1.4);
}

function drawRocks(rocks, time, tint, alpha) {
  noStroke();
  for (const rock of rocks) {
    const pos = polarPosition(rock, rock.phase + (TAU * time) / rock.period);
    const screen = worldToScreen(pos.x, pos.y);
    if (screen.x < -8 || screen.y < -8 || screen.x > width + 8 || screen.y > height + 8) continue;
    const diameter = Math.max(1.05, rock.size * cam.zoom);
    fill(tint[0] * (rock.tint / 160), tint[1] * (rock.tint / 170), tint[2] * (rock.tint / 170), alpha);
    circle(screen.x, screen.y, diameter);
  }
}

function drawHalos(flat) {
  noStroke();
  for (const body of flat) {
    if (body.kind !== "planet" && body.kind !== "comet") continue;
    const screenRadius = body.radius * cam.zoom;
    if (screenRadius >= 8) continue;
    const screen = worldToScreen(body.x, body.y);
    const halo = Math.max(7, screenRadius * 3.6);
    fill(body.color[0], body.color[1], body.color[2], body.kind === "comet" ? 50 : 70);
    circle(screen.x, screen.y, halo);
    fill(body.color[0], body.color[1], body.color[2], 235);
    circle(screen.x, screen.y, Math.max(3.6, screenRadius * 1.5));
  }
}

function drawVignette() {
  const ctx = drawingContext;
  const inner = Math.min(width, height) * 0.45;
  const outer = Math.max(width, height) * 0.72;
  const fade = ctx.createRadialGradient(width / 2, height / 2, inner, width / 2, height / 2, outer);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.48)");
  ctx.save();
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawMarkers(flat, hover) {
  const active = new Set([followKey, hover ? hover.key : null]);
  noFill();
  stroke(255, 210);
  strokeWeight(1.25);
  for (const body of flat) {
    if (!active.has(body.key)) continue;
    const screen = worldToScreen(body.x, body.y);
    const screenRadius = Math.max(7, body.radius * cam.zoom);
    circle(screen.x, screen.y, screenRadius * 2 + 14);
  }
}

function drawLabels(scene, hover) {
  textFont("sans-serif");
  textSize(12);
  textAlign(CENTER, CENTER);
  for (const planet of scene.planets) {
    if (showLabel(planet, hover)) {
      paintLabel(planet.name, planet.x, planet.y, planet.radius);
    }
    for (const moon of planet.moons) {
      const zoomed = moon.orbit * cam.zoom > 18;
      if ((zoomed && planet.radius * cam.zoom > 16) || isActive(moon, hover)) {
        paintLabel(moon.name, moon.x, moon.y, moon.radius);
      }
    }
  }
  if (scene.comet.rAu < 3.2 || isActive(scene.comet, hover)) {
    paintLabel("Comet", scene.comet.x, scene.comet.y, scene.comet.radius);
  }
}

function showLabel(planet, hover) {
  if (isActive(planet, hover)) return true;
  const screenRadius = planet.radius * cam.zoom;
  if (screenRadius > 10) return true;
  return planet.au >= 5 && screenRadius > 1.4;
}

function isActive(body, hover) {
  return followKey === body.key || (hover && hover.key === body.key);
}

function paintLabel(label, wx, wy, radius) {
  const screen = worldToScreen(wx, wy);
  if (screen.x < -30 || screen.y < -20 || screen.x > width + 30 || screen.y > height + 20) return;
  const pad = Math.max(12, radius * cam.zoom + 14);
  let x = screen.x;
  let y = screen.y - pad;
  if (radius * cam.zoom < 16) {
    const angle = Math.atan2(wy, wx);
    x = screen.x + Math.cos(angle) * pad;
    y = screen.y + Math.sin(angle) * pad;
  }
  fill(0, 160);
  text(label, x + 1, y + 1);
  fill(244, 238, 226);
  text(label, x, y);
}

function hudMetrics() {
  const narrow = width < 980;
  const rowH = height < 740 ? 20 : 24;
  const headerH = narrow ? 54 : 62;
  const h = headerH + CATALOG.length * rowH + 12;
  return { narrow, rowH, headerH, x: 14, y: 14, w: narrow ? 176 : 206, h };
}

function hitList(x, y) {
  const metrics = hudMetrics();
  const top = metrics.y + metrics.headerH;
  if (x < metrics.x || x > metrics.x + metrics.w || y < top || y > metrics.y + metrics.h) return -1;
  const index = Math.floor((y - top) / metrics.rowH);
  return index >= 0 && index < planets.length ? index : -1;
}

function infoRect() {
  const cardW = Math.min(360, width - 24);
  const cardH = 96;
  return { x: width - cardW - 14, y: height - cardH - 34, w: cardW, h: cardH };
}

function insidePanel(x, y) {
  const metrics = hudMetrics();
  return x >= metrics.x && x <= metrics.x + metrics.w && y >= metrics.y && y <= metrics.y + metrics.h;
}

function insideInfo(x, y) {
  const card = infoRect();
  return x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h;
}

function drawHud(scene, hover) {
  const metrics = hudMetrics();
  noStroke();
  fill(6, 8, 16, 190);
  rect(metrics.x, metrics.y, metrics.w, metrics.h, 12);
  fill(244, 236, 220);
  textFont("serif");
  textAlign(LEFT, TOP);
  textSize(metrics.narrow ? 18 : 22);
  text("Solar System", metrics.x + 14, metrics.y + 10);
  textFont("sans-serif");
  textSize(11);
  fill(196, 190, 178);
  text("Kepler speeds · ln(1+AU)", metrics.x + 14, metrics.y + (metrics.narrow ? 34 : 38));

  textSize(13);
  scene.planets.forEach((planet, index) => {
    const y = metrics.y + metrics.headerH + index * metrics.rowH;
    if (followKey === planet.key || (hover && hover.key === planet.key)) {
      fill(255, 255, 255, 24);
      rect(metrics.x + 8, y, metrics.w - 16, metrics.rowH - 3, 6);
    }
    fill(planet.color[0], planet.color[1], planet.color[2]);
    circle(metrics.x + 22, y + metrics.rowH / 2 - 1, 8);
    fill(240, 236, 228);
    textAlign(LEFT, CENTER);
    text(planet.name, metrics.x + 34, y + metrics.rowH / 2 - 1);
  });

  const active = hover || scene.flat.find((body) => body.key === followKey) || null;
  if (active) drawInfoCard(active);
  drawControls();
}

function drawInfoCard(body) {
  const card = infoRect();
  noStroke();
  fill(6, 8, 16, 190);
  rect(card.x, card.y, card.w, card.h, 12);
  fill(body.color[0], body.color[1], body.color[2]);
  textFont("serif");
  textAlign(LEFT, TOP);
  textSize(20);
  text(body.name, card.x + 14, card.y + 12);
  textFont("sans-serif");
  textSize(12);
  fill(214, 208, 196);
  if (body.kind === "planet") {
    const moonNames = body.moons.map((moon) => moon.name).join(", ");
    text(`distance ${body.rAu.toFixed(2)} AU · ${body.years.toFixed(body.years >= 10 ? 1 : 2)} yr orbit`, card.x + 14, card.y + 40);
    text(`${body.earthRadii.toFixed(2)} Earth radii`, card.x + 14, card.y + 56);
    text(moonNames ? `Moons: ${moonNames}` : "No major moons", card.x + 14, card.y + 72);
  } else if (body.kind === "moon") {
    text(`Moon of ${body.parent}`, card.x + 14, card.y + 42);
    text(`${body.days.toFixed(2)} days${body.retrograde ? " · retrograde" : ""}`, card.x + 14, card.y + 60);
  } else {
    text("Halley-like orbit", card.x + 14, card.y + 42);
    text(`${body.rAu.toFixed(2)} AU · e = ${body.e.toFixed(2)}`, card.x + 14, card.y + 60);
  }
}

function drawControls() {
  const warpLabel = warp >= 10 ? `${Math.round(warp)}×` : `${warp.toFixed(warp < 2 ? 2 : 1)}×`;
  const caption = paused
    ? "Paused · space plays · drag pan · scroll zoom · [ ] warp · R reset"
    : `Warp ${warpLabel} · drag pan · scroll zoom · click to follow · [ ] speed · space pause · R reset`;
  textFont("sans-serif");
  textAlign(CENTER, CENTER);
  textSize(width < 760 ? 11 : 12);
  fill(0, 140);
  text(caption, width / 2 + 1, height - 16);
  fill(232, 226, 214, 220);
  text(caption, width / 2, height - 17);
}

function pickBody(flat, x, y) {
  let chosen = null;
  for (const body of flat) {
    const screen = worldToScreen(body.x, body.y);
    const reach = Math.max(body.kind === "planet" ? 8 : 6, body.radius * cam.zoom + 4);
    if (Math.hypot(screen.x - x, screen.y - y) <= reach) chosen = body;
  }
  return chosen;
}

function onClick(x, y) {
  if (insidePanel(x, y)) {
    const index = hitList(x, y);
    if (index >= 0) focusOn(planets[index].name);
    return;
  }
  if (insideInfo(x, y) && followKey) return;
  const hit = pickBody(layoutScene(simTime).flat, x, y);
  if (hit) focusOn(hit.key);
  else {
    followKey = null;
    followZoom = null;
  }
}

function pointerDown(x, y) {
  pointer = { x, y, dragged: false, ui: insidePanel(x, y) || (insideInfo(x, y) && followKey) };
}

function pointerDrag(x, y) {
  if (!pointer || pointer.ui) return;
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  if (!pointer.dragged && Math.hypot(dx, dy) < 4) return;
  pointer.dragged = true;
  cam.x -= dx / cam.zoom;
  cam.y -= dy / cam.zoom;
  pointer.x = x;
  pointer.y = y;
  followKey = null;
  followZoom = null;
  framed = false;
}

function pointerUp(x, y) {
  if (!pointer) return;
  const wasDrag = pointer.dragged;
  pointer = null;
  if (!wasDrag) onClick(x, y);
}

function mousePressed() {
  if (touchGesture) return;
  pointerDown(mouseX, mouseY);
}

function mouseDragged() {
  if (touchGesture) return;
  pointerDrag(mouseX, mouseY);
}

function mouseReleased() {
  if (touchGesture) return;
  pointerUp(mouseX, mouseY);
}

function mouseWheel(event) {
  zoomAt(mouseX, mouseY, event.delta > 0 ? 0.9 : 1.12);
  followKey = null;
  followZoom = null;
  framed = false;
  return false;
}

function touchStarted() {
  touchGesture = true;
  if (touches.length) pointerDown(touches[0].x, touches[0].y);
  return false;
}

function touchMoved() {
  if (touches.length) pointerDrag(touches[0].x, touches[0].y);
  return false;
}

function touchEnded() {
  pointerUp(mouseX, mouseY);
  touchGesture = false;
  return false;
}

function keyPressed() {
  if (key === "r" || key === "R" || key === "0") {
    fitAll();
    return false;
  }
  if (key === " " || keyCode === 32) {
    paused = !paused;
    return false;
  }
  if (key === "[") warp = Math.min(800, Math.max(0.25, warp * 0.5));
  if (key === "]") warp = Math.min(800, Math.max(0.25, warp * 2));
  if (key === "1") warp = 1;
  if (key === "2") warp = 5;
  if (key === "3") warp = 20;
  if (key === "4") warp = 80;
  if (key === "5") warp = 300;
  if (key === "+" || key === "=") {
    zoomAt(width / 2, height / 2, 1.15);
    followKey = null;
    followZoom = null;
    framed = false;
  }
  if (key === "-" || key === "_") {
    zoomAt(width / 2, height / 2, 1 / 1.15);
    followKey = null;
    followZoom = null;
    framed = false;
  }
  if (keyCode === ESCAPE) {
    followKey = null;
    followZoom = null;
    return false;
  }
  return false;
}
