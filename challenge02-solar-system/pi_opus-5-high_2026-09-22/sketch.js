/**
 * Solar System — p5.js
 *
 * A 2D, top-down orrery: elliptical orbits (sun at a focus), roughly
 * proportional body sizes and distances, moons, rings, an asteroid belt,
 * a Kuiper belt, a parallax starfield and a pan/zoom camera.
 *
 * Scaling is deliberately non-linear: true distances and radii differ by
 * five orders of magnitude, so distances use d^0.62 and radii use r^0.40.
 * Ordering and relative proportions survive; the whole system stays on screen.
 */

/* ------------------------------------------------------------------ */
/* Scaling                                                             */
/* ------------------------------------------------------------------ */

const DISTANCE_UNIT = 115; // px for 1 AU after compression
const DISTANCE_EXP = 0.5;
const RADIUS_UNIT = 0.22;
const RADIUS_EXP = 0.4;
const MOON_DISTANCE_UNIT = 1.5;
const MOON_DISTANCE_EXP = 0.38;
const SUN_RADIUS_PX = 30; // the real sun would swallow Mercury's orbit at this scale

const auToPx = (au) => DISTANCE_UNIT * Math.pow(au, DISTANCE_EXP);
const kmToPx = (km) => RADIUS_UNIT * Math.pow(km, RADIUS_EXP);
const moonOrbitToPx = (planetRadiusPx, thousandKm) =>
  planetRadiusPx * 1.5 + MOON_DISTANCE_UNIT * Math.pow(thousandKm, MOON_DISTANCE_EXP);

const DAYS_PER_YEAR = 365.25;

/* ------------------------------------------------------------------ */
/* Solar system data (semiMajor in AU, radius in km, period in years)  */
/* ------------------------------------------------------------------ */

const SUN = { name: "Sun", radiusKm: 696340, colour: [255, 214, 120] };

const PLANETS = [
  {
    name: "Mercury",
    semiMajor: 0.387,
    eccentricity: 0.206,
    radiusKm: 2440,
    periodYears: 0.241,
    colour: [168, 152, 138],
    surface: { blobs: 16, colour: [124, 112, 104], alpha: 130, scale: 0.16 },
    moons: [],
  },
  {
    name: "Venus",
    semiMajor: 0.723,
    eccentricity: 0.007,
    radiusKm: 6052,
    periodYears: 0.615,
    colour: [232, 196, 130],
    surface: { blobs: 9, colour: [252, 234, 196], alpha: 110, scale: 0.5 },
    moons: [],
  },
  {
    name: "Earth",
    semiMajor: 1.0,
    eccentricity: 0.017,
    radiusKm: 6371,
    periodYears: 1.0,
    colour: [86, 146, 214],
    surface: { blobs: 8, colour: [74, 138, 88], alpha: 205, scale: 0.42, poles: [236, 244, 255] },
    clouds: true,
    moons: [{ name: "Moon", distanceKkm: 384, radiusKm: 1737, periodDays: 27.3, colour: [198, 198, 198] }],
  },
  {
    name: "Mars",
    semiMajor: 1.524,
    eccentricity: 0.093,
    radiusKm: 3390,
    periodYears: 1.881,
    colour: [204, 106, 66],
    surface: { blobs: 10, colour: [152, 72, 44], alpha: 150, scale: 0.34, poles: [244, 240, 236] },
    moons: [
      { name: "Phobos", distanceKkm: 9.4, radiusKm: 11, periodDays: 0.319, colour: [170, 160, 150] },
      { name: "Deimos", distanceKkm: 23.5, radiusKm: 6, periodDays: 1.263, colour: [150, 142, 134] },
    ],
  },
  {
    name: "Jupiter",
    semiMajor: 5.203,
    eccentricity: 0.049,
    radiusKm: 69911,
    periodYears: 11.86,
    colour: [212, 172, 126],
    bands: [
      [176, 132, 96],
      [236, 214, 182],
      [198, 150, 112],
    ],
    greatRedSpot: true,
    rings: { inner: 1.45, outer: 1.75, alpha: 22, colour: [180, 160, 140] },
    moons: [
      { name: "Io", distanceKkm: 422, radiusKm: 1822, periodDays: 1.77, colour: [232, 214, 130] },
      { name: "Europa", distanceKkm: 671, radiusKm: 1561, periodDays: 3.55, colour: [222, 214, 200] },
      { name: "Ganymede", distanceKkm: 1070, radiusKm: 2634, periodDays: 7.15, colour: [186, 172, 152] },
      { name: "Callisto", distanceKkm: 1883, radiusKm: 2410, periodDays: 16.69, colour: [140, 130, 122] },
    ],
  },
  {
    name: "Saturn",
    semiMajor: 9.537,
    eccentricity: 0.052,
    radiusKm: 58232,
    periodYears: 29.45,
    colour: [226, 202, 148],
    bands: [
      [206, 180, 130],
      [240, 224, 180],
    ],
    rings: { inner: 1.3, outer: 2.35, alpha: 120, colour: [226, 208, 168] },
    moons: [
      { name: "Titan", distanceKkm: 1222, radiusKm: 2575, periodDays: 15.95, colour: [214, 168, 96] },
      { name: "Rhea", distanceKkm: 527, radiusKm: 764, periodDays: 4.52, colour: [198, 198, 196] },
      { name: "Iapetus", distanceKkm: 3561, radiusKm: 735, periodDays: 79.3, colour: [166, 158, 150] },
    ],
  },
  {
    name: "Uranus",
    semiMajor: 19.19,
    eccentricity: 0.047,
    radiusKm: 25362,
    periodYears: 84.02,
    colour: [152, 220, 226],
    rings: { inner: 1.6, outer: 1.95, alpha: 50, colour: [170, 210, 220], vertical: true },
    moons: [
      { name: "Titania", distanceKkm: 436, radiusKm: 789, periodDays: 8.71, colour: [190, 190, 190] },
      { name: "Oberon", distanceKkm: 584, radiusKm: 761, periodDays: 13.46, colour: [172, 168, 164] },
    ],
  },
  {
    name: "Neptune",
    semiMajor: 30.07,
    eccentricity: 0.009,
    radiusKm: 24622,
    periodYears: 164.79,
    colour: [74, 116, 220],
    moons: [{ name: "Triton", distanceKkm: 355, radiusKm: 1353, periodDays: -5.88, colour: [206, 206, 210] }],
  },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const bodies = [];
let stars = [];
let asteroids = [];
let kuiper = [];

let simYears = 0;
let yearsPerSecond = 0.08;
let paused = false;

let showOrbits = true;
let showLabels = true;
let showTrails = true;

const camera = { x: 0, y: 0, zoom: 1, targetZoom: 1, follow: 0 };
let dragging = false;

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  const host = document.getElementById("sketch-host");
  if (host) canvas.parent(host);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  buildBodies();
  buildStars();
  buildBelts();
  fitToScreen();
  applyUrlOptions();
}

/** `?follow=saturn&zoom=6&rate=0.4` — handy for deep links and screenshots. */
function applyUrlOptions() {
  const params = new URLSearchParams(window.location.search);
  const follow = params.get("follow");
  if (follow) {
    const index = bodies.findIndex((b) => b.name.toLowerCase() === follow.toLowerCase());
    if (index >= 0) {
      updatePositions();
      camera.follow = index;
      camera.x = bodies[index].x;
      camera.y = bodies[index].y;
    }
  }
  const zoom = Number(params.get("zoom"));
  if (Number.isFinite(zoom) && zoom > 0) camera.zoom = camera.targetZoom = constrain(zoom, 0.02, 220);
  const rate = Number(params.get("rate"));
  if (Number.isFinite(rate) && rate > 0) yearsPerSecond = rate;
}

function buildBodies() {
  bodies.length = 0;
  bodies.push({
    kind: "sun",
    name: SUN.name,
    radius: SUN_RADIUS_PX,
    colour: SUN.colour,
    x: 0,
    y: 0,
    trail: [],
  });

  for (const data of PLANETS) {
    const a = auToPx(data.semiMajor);
    const e = data.eccentricity;
    const planet = {
      kind: "planet",
      name: data.name,
      semiMajor: a,
      semiMinor: a * Math.sqrt(1 - e * e),
      focus: a * e,
      argument: random(TWO_PI),
      phase: random(TWO_PI),
      periodYears: data.periodYears,
      radius: Math.max(2.2, kmToPx(data.radiusKm)),
      colour: data.colour,
      bands: data.bands || null,
      greatRedSpot: !!data.greatRedSpot,
      surface: data.surface ? { ...data.surface, blobs: makeBlobs(data.surface) } : null,
      clouds: data.clouds ? makeBlobs({ blobs: 7, scale: 0.34 }) : null,
      rings: data.rings || null,
      spin: random(TWO_PI),
      x: 0,
      y: 0,
      trail: [],
      moons: (data.moons || []).map((m) => ({
        kind: "moon",
        name: m.name,
        orbit: moonOrbitToPx(Math.max(2.2, kmToPx(data.radiusKm)), m.distanceKkm),
        radius: Math.max(1.1, kmToPx(m.radiusKm) * 0.85),
        periodYears: m.periodDays / DAYS_PER_YEAR,
        colour: m.colour,
        phase: random(TWO_PI),
        x: 0,
        y: 0,
      })),
    };
    bodies.push(planet);
  }
}

/** Deterministic-per-session surface speckles, in unit-circle coordinates. */
function makeBlobs(spec) {
  const blobs = [];
  for (let i = 0; i < spec.blobs; i++) {
    const angle = random(TWO_PI);
    const radius = Math.sqrt(random()) * 0.78;
    blobs.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.9,
      rx: spec.scale * random(0.6, 1.5),
      ry: spec.scale * random(0.45, 1.1),
      rot: random(TWO_PI),
    });
  }
  return blobs;
}

function buildStars() {
  stars = [];
  const count = Math.round((windowWidth * windowHeight) / 1600);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random(-0.1, 1.1),
      y: random(-0.1, 1.1),
      depth: random(0.02, 0.16),
      size: random(0.6, 2.1),
      brightness: random(70, 235),
      twinkle: random(TWO_PI),
      hue: random() < 0.15 ? random([[180, 205, 255], [255, 215, 190], [255, 245, 220]]) : [255, 255, 255],
    });
  }
}

function buildBelts() {
  asteroids = [];
  for (let i = 0; i < 1100; i++) {
    const au = random(2.06, 3.34);
    asteroids.push({
      a: auToPx(au),
      squash: random(0.986, 1.014),
      phase: random(TWO_PI),
      periodYears: Math.pow(au, 1.5),
      size: random(0.7, 1.8),
      alpha: random(60, 170),
      tint: random(0.6, 1),
    });
  }
  kuiper = [];
  for (let i = 0; i < 900; i++) {
    const au = random(31, 49);
    kuiper.push({
      a: auToPx(au),
      squash: random(0.95, 1.05),
      phase: random(TWO_PI),
      periodYears: Math.pow(au, 1.5),
      size: random(0.6, 1.5),
      alpha: random(25, 90),
      tint: random(0.7, 1),
    });
  }
}

function fitToScreen() {
  const span = auToPx(30.07) * 2 * 1.18; // Neptune's orbit, with a margin
  camera.zoom = camera.targetZoom = Math.min(width, height) / span;
  camera.x = 0;
  camera.y = 0;
  camera.follow = 0;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildStars();
}

/* ------------------------------------------------------------------ */
/* Orbital mechanics (visual approximation)                            */
/* ------------------------------------------------------------------ */

function orbitPoint(planet, param) {
  const ex = planet.semiMajor * Math.cos(param) - planet.focus;
  const ey = planet.semiMinor * Math.sin(param);
  const c = Math.cos(planet.argument);
  const s = Math.sin(planet.argument);
  return { x: ex * c - ey * s, y: ex * s + ey * c };
}

function updatePositions() {
  for (const body of bodies) {
    if (body.kind !== "planet") continue;
    const param = body.phase + (TWO_PI * simYears) / body.periodYears;
    const p = orbitPoint(body, param);
    body.x = p.x;
    body.y = p.y;
    body.spin = param * 4;

    for (const moon of body.moons) {
      const angle = moon.phase + (TWO_PI * simYears) / moon.periodYears;
      moon.x = body.x + Math.cos(angle) * moon.orbit;
      moon.y = body.y + Math.sin(angle) * moon.orbit;
    }

    if (showTrails) {
      body.trail.push({ x: body.x, y: body.y });
      const maxTrail = 180;
      if (body.trail.length > maxTrail) body.trail.splice(0, body.trail.length - maxTrail);
    } else if (body.trail.length) {
      body.trail.length = 0;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

function updateCamera() {
  camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.16);
  const target = bodies[camera.follow];
  if (target) {
    camera.x = lerp(camera.x, target.x, 0.12);
    camera.y = lerp(camera.y, target.y, 0.12);
  }
}

function applyCamera() {
  translate(width / 2, height / 2);
  scale(camera.zoom);
  translate(-camera.x, -camera.y);
}

function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom + width / 2,
    y: (y - camera.y) * camera.zoom + height / 2,
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - width / 2) / camera.zoom + camera.x,
    y: (y - height / 2) / camera.zoom + camera.y,
  };
}

/* ------------------------------------------------------------------ */
/* Draw                                                                */
/* ------------------------------------------------------------------ */

function draw() {
  if (!paused) simYears += (deltaTime / 1000) * yearsPerSecond;
  updatePositions();
  updateCamera();

  drawSpace();

  push();
  applyCamera();
  if (showOrbits) drawOrbits();
  drawBelt(kuiper, [150, 175, 210]);
  drawBelt(asteroids, [190, 170, 150]);
  if (showTrails) drawTrails();
  drawSun();
  for (const body of bodies) {
    if (body.kind === "planet") drawPlanet(body);
  }
  pop();

  if (showLabels) drawLabels();
  drawHud();
}

function drawSpace() {
  background(4, 6, 15);

  // Faint galactic haze.
  noStroke();
  const ctx = drawingContext;
  const haze = ctx.createLinearGradient(0, height * 0.2, width, height * 0.85);
  haze.addColorStop(0, "rgba(24, 20, 60, 0)");
  haze.addColorStop(0.45, "rgba(46, 38, 96, 0.35)");
  haze.addColorStop(0.62, "rgba(30, 60, 110, 0.22)");
  haze.addColorStop(1, "rgba(12, 12, 34, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  const t = millis() / 1000;
  for (const star of stars) {
    const px = ((star.x - camera.x * star.depth * 0.0012) % 1.2 + 1.2) % 1.2;
    const py = ((star.y - camera.y * star.depth * 0.0012) % 1.2 + 1.2) % 1.2;
    const flicker = 0.72 + 0.28 * Math.sin(t * 1.7 + star.twinkle);
    fill(star.hue[0], star.hue[1], star.hue[2], star.brightness * flicker);
    circle((px - 0.1) * width, (py - 0.1) * height, star.size);
  }
}

function drawOrbits() {
  noFill();
  for (const body of bodies) {
    if (body.kind !== "planet") continue;
    stroke(120, 160, 220, 38);
    strokeWeight(1 / camera.zoom);
    push();
    rotate(body.argument);
    translate(-body.focus, 0);
    ellipse(0, 0, body.semiMajor * 2, body.semiMinor * 2);
    pop();
  }
}

function drawBelt(belt, colour) {
  noStroke();
  for (const rock of belt) {
    const angle = rock.phase + (TWO_PI * simYears) / rock.periodYears;
    const r = rock.a * rock.squash;
    fill(colour[0] * rock.tint, colour[1] * rock.tint, colour[2] * rock.tint, rock.alpha);
    circle(Math.cos(angle) * r, Math.sin(angle) * r * 0.998, rock.size / Math.max(camera.zoom, 0.35));
  }
}

function drawTrails() {
  noFill();
  for (const body of bodies) {
    if (body.kind !== "planet" || body.trail.length < 2) continue;
    const [r, g, b] = body.colour;
    for (let i = 1; i < body.trail.length; i++) {
      const alpha = (i / body.trail.length) * 90;
      stroke(r, g, b, alpha);
      strokeWeight((body.radius * 0.12 * i) / body.trail.length / camera.zoom + 0.3 / camera.zoom);
      line(body.trail[i - 1].x, body.trail[i - 1].y, body.trail[i].x, body.trail[i].y);
    }
  }
}

function drawSun() {
  const sun = bodies[0];
  const ctx = drawingContext;
  const r = sun.radius;

  noStroke();
  // Corona: layered gradient, cheap and smooth.
  const glow = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 5);
  glow.addColorStop(0, "rgba(255, 224, 150, 0.45)");
  glow.addColorStop(0.16, "rgba(255, 178, 74, 0.18)");
  glow.addColorStop(0.42, "rgba(255, 132, 40, 0.06)");
  glow.addColorStop(1, "rgba(255, 110, 20, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 5, 0, TWO_PI);
  ctx.fill();

  const pulse = 1 + 0.012 * Math.sin(millis() / 420);
  ctx.save();
  ctx.shadowColor = "rgba(255, 176, 64, 0.95)";
  ctx.shadowBlur = 48;
  const face = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  face.addColorStop(0, "rgb(255, 252, 226)");
  face.addColorStop(0.55, "rgb(255, 216, 118)");
  face.addColorStop(1, "rgb(248, 152, 48)");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

function drawPlanet(planet) {
  push();
  translate(planet.x, planet.y);

  if (planet.rings) drawRings(planet, "back");
  drawShadedSphere(planet, planet.x, planet.y);
  if (planet.rings) drawRings(planet, "front");

  pop();

  // Moons are drawn in world space so their shading also points back at the sun.
  for (const moon of planet.moons) {
    push();
    translate(moon.x, moon.y);
    drawShadedSphere(moon, moon.x, moon.y);
    pop();
  }
}

/** Draws a body lit from the sun at the world origin. */
function drawShadedSphere(body, worldX, worldY) {
  const ctx = drawingContext;
  const r = Math.max(body.radius, 0.9 / camera.zoom);
  const [cr, cg, cb] = body.colour;

  // Soft atmosphere halo that fades out instead of ending in a hard disc.
  noStroke();
  const halo = ctx.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 2.1);
  halo.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.24)`);
  halo.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, 0.07)`);
  halo.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.1, 0, TWO_PI);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.clip();

  fill(cr, cg, cb);
  circle(0, 0, r * 2);

  if (body.surface) {
    const s = body.surface;
    for (const blob of s.blobs) {
      push();
      translate(blob.x * r, blob.y * r);
      rotate(blob.rot);
      fill(s.colour[0], s.colour[1], s.colour[2], s.alpha);
      ellipse(0, 0, blob.rx * r * 2, blob.ry * r * 2);
      pop();
    }
    if (s.poles) {
      fill(s.poles[0], s.poles[1], s.poles[2], 185);
      ellipse(0, -r, r * 1.05, r * 0.42);
      ellipse(0, r, r * 0.9, r * 0.34);
    }
  }

  if (body.clouds) {
    for (const blob of body.clouds) {
      push();
      translate(blob.x * r, blob.y * r);
      rotate(blob.rot);
      fill(255, 255, 255, 95);
      ellipse(0, 0, blob.rx * r * 2.4, blob.ry * r * 1.2);
      pop();
    }
  }

  if (body.bands) {
    const rows = 9;
    for (let i = 0; i < rows; i++) {
      const band = body.bands[i % body.bands.length];
      const top = -r + (i * (2 * r)) / rows;
      fill(band[0], band[1], band[2], 105);
      rect(-r, top, r * 2, (2 * r) / rows);
    }
    if (body.greatRedSpot) {
      fill(206, 108, 78, 210);
      ellipse(r * 0.22, r * 0.26, r * 0.48, r * 0.26);
    }
  }

  // Sun-facing highlight and night-side terminator: the sun sits at the origin.
  const len = Math.max(Math.hypot(worldX, worldY), 1e-6);
  const lx = (-worldX / len) * r * 0.6;
  const ly = (-worldY / len) * r * 0.6;
  const lit = ctx.createRadialGradient(lx, ly, r * 0.05, 0, 0, r * 1.25);
  lit.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  lit.addColorStop(0.45, "rgba(255, 255, 255, 0.04)");
  lit.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.fill();

  ctx.restore();

  noFill();
  stroke(cr, cg, cb, 90);
  strokeWeight(Math.max(0.4, 0.6 / camera.zoom));
  circle(0, 0, r * 2);
  noStroke();
}

function drawRings(planet, half) {
  const ring = planet.rings;
  const r = planet.radius;
  push();
  rotate(ring.vertical ? HALF_PI + 0.25 : -0.32);
  noFill();
  strokeCap(SQUARE);
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const f = i / (steps - 1);
    const rad = lerp(ring.inner, ring.outer, f) * r;
    const gap = f > 0.56 && f < 0.64 ? 0.2 : 1; // Cassini-ish division
    const grain = 0.75 + 0.25 * Math.sin(f * 47);
    stroke(
      ring.colour[0],
      ring.colour[1],
      ring.colour[2],
      ring.alpha * gap * grain * (1 - 0.3 * Math.abs(f - 0.5)),
    );
    strokeWeight(Math.max(0.5, (r * (ring.outer - ring.inner) * 1.8) / steps));
    if (half === "back") arc(0, 0, rad * 2, rad * 0.62, PI, TWO_PI);
    else arc(0, 0, rad * 2, rad * 0.62, 0, PI);
  }
  strokeCap(ROUND);
  pop();
}

/** Keeps labels from stacking on top of each other at low zoom. */
function placeLabel(x, y, w, taken) {
  for (const offset of [0, -13, 13, -26, 26, -39, 39]) {
    const box = { x, y: y + offset, w, h: 12 };
    const clash = taken.some(
      (b) => Math.abs(b.x - box.x) < (b.w + box.w) / 2 && Math.abs(b.y - box.y) < 12,
    );
    if (!clash) {
      taken.push(box);
      return box.y;
    }
  }
  return null;
}

function drawLabels() {
  textFont("Inter, Segoe UI, system-ui, sans-serif");
  textAlign(LEFT, CENTER);
  const taken = [];
  for (const body of bodies) {
    const isSun = body.kind === "sun";
    const screen = worldToScreen(body.x, body.y);
    const r = body.radius * camera.zoom;
    if (screen.x < -80 || screen.x > width + 80 || screen.y < -40 || screen.y > height + 40) continue;
    // Skip labels that would pile up on top of the sun at low zoom.
    if (!isSun) {
      const sunScreen = worldToScreen(0, 0);
      if (dist(screen.x, screen.y, sunScreen.x, sunScreen.y) < bodies[0].radius * camera.zoom + 16) continue;
    }

    noStroke();
    textSize(isSun ? 13 : 11.5);
    const labelX = screen.x + r + 7;
    const labelY = placeLabel(labelX + textWidth(body.name) / 2, screen.y - 1, textWidth(body.name), taken);
    if (labelY === null) continue;

    fill(210, 226, 255, isSun ? 210 : 175);
    text(body.name, labelX, labelY);

    stroke(140, 180, 240, 70);
    strokeWeight(1);
    line(screen.x + r + 1.5, screen.y, labelX - 2, labelY);
    noStroke();

    if (body.moons && camera.zoom > 1.6) {
      for (const moon of body.moons) {
        const ms = worldToScreen(moon.x, moon.y);
        fill(190, 206, 235, 130);
        textSize(9.5);
        text(moon.name, ms.x + moon.radius * camera.zoom + 4, ms.y);
      }
    }
  }
}

function drawHud() {
  const days = simYears * DAYS_PER_YEAR;
  const years = Math.floor(simYears);
  const remainder = Math.floor(days - years * DAYS_PER_YEAR);
  const followName = bodies[camera.follow] ? bodies[camera.follow].name : "free";

  push();
  noStroke();
  fill(8, 12, 26, 170);
  rect(16, 16, 226, 86, 10);
  fill(150, 176, 220);
  textAlign(LEFT, TOP);
  textSize(11);
  text("ELAPSED", 30, 28);
  text("RATE", 30, 50);
  text("CAMERA", 30, 72);
  fill(226, 238, 255);
  textSize(12.5);
  text(`${years} y ${remainder} d`, 104, 27);
  text(`${(yearsPerSecond * 12).toFixed(2)} mo/s${paused ? "  (paused)" : ""}`, 104, 49);
  text(`${followName} · ${camera.zoom.toFixed(2)}×`, 104, 71);
  pop();
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

function mousePressed() {
  dragging = true;
  // Click a body to follow it.
  for (let i = 0; i < bodies.length; i++) {
    const screen = worldToScreen(bodies[i].x, bodies[i].y);
    const hit = Math.max(14, bodies[i].radius * camera.zoom + 8);
    if (dist(mouseX, mouseY, screen.x, screen.y) < hit) {
      camera.follow = i;
      dragging = false;
      return false;
    }
  }
  return false;
}

function mouseReleased() {
  dragging = false;
}

function mouseDragged() {
  if (!dragging) return false;
  camera.follow = -1;
  camera.x -= movedX / camera.zoom;
  camera.y -= movedY / camera.zoom;
  return false;
}

function mouseWheel(event) {
  const before = screenToWorld(mouseX, mouseY);
  const factor = Math.exp(-event.delta * 0.0012);
  camera.targetZoom = constrain(camera.targetZoom * factor, 0.02, 220);
  camera.zoom = camera.targetZoom;
  if (camera.follow < 0) {
    const after = screenToWorld(mouseX, mouseY);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }
  return false;
}

function keyPressed() {
  if (key === " ") paused = !paused;
  if (keyCode === RIGHT_ARROW) yearsPerSecond = Math.min(yearsPerSecond * 1.5, 40);
  if (keyCode === LEFT_ARROW) yearsPerSecond = Math.max(yearsPerSecond / 1.5, 0.002);
  if (key === "o" || key === "O") showOrbits = !showOrbits;
  if (key === "l" || key === "L") showLabels = !showLabels;
  if (key === "t" || key === "T") showTrails = !showTrails;
  if (key === "r" || key === "R") fitToScreen();
  if (key >= "0" && key <= "8") {
    const index = Number(key);
    camera.follow = index;
    const body = bodies[index];
    if (body) camera.targetZoom = constrain(Math.min(width, height) / (body.radius * 34), 0.05, 200);
  }
  if (key === "9") {
    camera.follow = -1;
  }
  return false;
}
