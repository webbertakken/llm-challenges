/**
 * Solar system — a p5.js sketch.
 *
 * Everything is drawn in a single orbital plane that is squashed vertically to
 * give the scene a tilted, three-quarter view. Distances and sizes are
 * art-directed rather than strictly to scale (Neptune would be ~30 screen-widths
 * out otherwise), but the ordering, relative sizes and relative periods follow
 * the real planets.
 */

"use strict";

/* ------------------------------------------------------------------ *
 * Configuration                                                       *
 * ------------------------------------------------------------------ */

const ORBIT_TILT = 0.62; // vertical squash applied to the orbital plane
const SUN_RADIUS = 26;

// Planets orbit at YEAR_SPEED / sqrt(period), which keeps Mercury lively while
// Neptune still visibly moves.
const YEAR_SPEED = 0.62;

const PLANETS = [
  {
    name: "Mercury",
    radius: 4,
    distance: 52,
    period: 0.241,
    startAngle: 0.8,
    color: [176, 168, 158],
    moons: [],
  },
  {
    name: "Venus",
    radius: 7,
    distance: 74,
    period: 0.615,
    startAngle: 2.1,
    color: [226, 190, 128],
    moons: [],
  },
  {
    name: "Earth",
    radius: 7.5,
    distance: 100,
    period: 1,
    startAngle: 4.2,
    color: [86, 150, 232],
    moons: [
      { name: "Moon", distance: 17, radius: 2.3, speed: 0.95, phase: 0.4, color: [196, 196, 204] },
    ],
  },
  {
    name: "Mars",
    radius: 5.5,
    distance: 132,
    period: 1.881,
    startAngle: 1.2,
    color: [214, 106, 72],
    moons: [
      { name: "Phobos", distance: 10, radius: 1.2, speed: 2.4, phase: 1.1, color: [170, 160, 152] },
      { name: "Deimos", distance: 14, radius: 1.0, speed: 1.5, phase: 3.0, color: [184, 176, 168] },
    ],
  },
  {
    name: "Jupiter",
    radius: 22,
    distance: 240,
    period: 11.86,
    startAngle: 5.1,
    color: [214, 176, 132],
    bands: true,
    moons: [
      { name: "Io", distance: 31, radius: 2.2, speed: 1.6, phase: 0.2, color: [232, 212, 140] },
      { name: "Europa", distance: 38, radius: 1.9, speed: 1.25, phase: 2.4, color: [222, 214, 196] },
      { name: "Ganymede", distance: 46, radius: 3.0, speed: 0.95, phase: 4.1, color: [186, 172, 152] },
      { name: "Callisto", distance: 55, radius: 2.7, speed: 0.72, phase: 5.6, color: [148, 138, 128] },
    ],
  },
  {
    name: "Saturn",
    radius: 19,
    distance: 320,
    period: 29.46,
    startAngle: 3.4,
    color: [224, 200, 140],
    ring: true,
    moons: [
      { name: "Rhea", distance: 27, radius: 1.5, speed: 1.0, phase: 0.9, color: [200, 196, 190] },
      { name: "Titan", distance: 36, radius: 2.6, speed: 0.68, phase: 3.7, color: [226, 178, 110] },
    ],
  },
  {
    name: "Uranus",
    radius: 12,
    distance: 410,
    period: 84.01,
    startAngle: 0.4,
    color: [148, 216, 224],
    moons: [
      { name: "Titania", distance: 19, radius: 1.6, speed: 0.85, phase: 2.0, color: [190, 196, 200] },
      { name: "Oberon", distance: 25, radius: 1.4, speed: 0.62, phase: 4.6, color: [176, 180, 186] },
    ],
  },
  {
    name: "Neptune",
    radius: 11.5,
    distance: 490,
    period: 164.8,
    startAngle: 2.6,
    color: [74, 108, 220],
    moons: [
      { name: "Triton", distance: 20, radius: 1.8, speed: -0.6, phase: 1.5, color: [208, 210, 218] },
    ],
  },
];

const ASTEROID_MIN = 158;
const ASTEROID_MAX = 202;

const COMET = { a: 545, b: 250, period: 71, phase: 1.1 };

/* ------------------------------------------------------------------ *
 * State                                                               *
 * ------------------------------------------------------------------ */

let t = 0; // simulated seconds
let paused = false;
let showLabels = true;
let showOrbits = true;

let zoom = 1;
let camX = 0;
let camY = 0;
let dragging = false;
let dragX = 0;
let dragY = 0;

let stars = [];
let asteroids = [];
let labels = [];

/* ------------------------------------------------------------------ *
 * p5 lifecycle                                                        *
 * ------------------------------------------------------------------ */

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  ellipseMode(CENTER);
  makeStars();
  makeAsteroids();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeStars();
}

function draw() {
  background(4, 6, 15);
  drawNebulae();
  drawStars();

  if (!paused) {
    t += Math.min(deltaTime, 50) / 1000;
  }

  labels = [];

  push();
  translate(width / 2 + camX, height / 2 + camY);
  scale(zoom);

  if (showOrbits) {
    drawOrbitRings();
  }
  drawAsteroidBelt();
  drawComet();
  drawSun();

  for (const planet of PLANETS) {
    drawPlanetSystem(planet);
  }

  pop();

  drawLabels();
  drawVignette();
}

/* ------------------------------------------------------------------ *
 * Input                                                               *
 * ------------------------------------------------------------------ */

function mouseWheel(event) {
  const factor = Math.exp(-event.delta * 0.0012);
  zoom = constrain(zoom * factor, 0.12, 8);
  return false;
}

function mousePressed() {
  dragging = true;
  dragX = mouseX;
  dragY = mouseY;
}

function mouseDragged() {
  if (!dragging) return;
  camX += mouseX - dragX;
  camY += mouseY - dragY;
  dragX = mouseX;
  dragY = mouseY;
}

function mouseReleased() {
  dragging = false;
}

function doubleClicked() {
  resetView();
}

function keyPressed() {
  if (key === " ") {
    paused = !paused;
  } else if (key === "l" || key === "L") {
    showLabels = !showLabels;
  } else if (key === "o" || key === "O") {
    showOrbits = !showOrbits;
  } else if (key === "r" || key === "R") {
    resetView();
  }
}

function resetView() {
  zoom = 1;
  camX = 0;
  camY = 0;
}

/* ------------------------------------------------------------------ *
 * Geometry helpers                                                    *
 * ------------------------------------------------------------------ */

function planetSpeed(planet) {
  return YEAR_SPEED / Math.sqrt(planet.period);
}

function planetWorld(planet) {
  const angle = planet.startAngle + t * planetSpeed(planet);
  return {
    x: Math.cos(angle) * planet.distance,
    y: Math.sin(angle) * planet.distance * ORBIT_TILT,
  };
}

function moonWorld(moon, planetX, planetY) {
  const angle = moon.phase + t * moon.speed;
  const x = planetX + Math.cos(angle) * moon.distance;
  const y = planetY + Math.sin(angle) * moon.distance * ORBIT_TILT;
  return { angle, x, y };
}

/** Screen position of a world point, used for the screen-space labels. */
function toScreen(x, y) {
  return { x: width / 2 + camX + x * zoom, y: height / 2 + camY + y * zoom };
}

/* ------------------------------------------------------------------ *
 * Background                                                          *
 * ------------------------------------------------------------------ */

function makeStars() {
  const count = Math.round((width * height) / 4200);
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() < 0.92 ? Math.random() * 1.5 + 0.4 : Math.random() * 2.4 + 1.6,
      alpha: Math.random() * 140 + 60,
      phase: Math.random() * Math.PI * 2,
      bright: Math.random() < 0.05,
    });
  }
}

function drawStars() {
  const twinkle = frameCount * 0.03;
  noStroke();
  for (const star of stars) {
    const flicker = 0.7 + 0.3 * Math.sin(twinkle + star.phase);
    fill(220, 228, 255, star.alpha * flicker);
    ellipse(star.x * width, star.y * height, star.size);
  }

  blendMode(ADD);
  for (const star of stars) {
    if (!star.bright) continue;
    const x = star.x * width;
    const y = star.y * height;
    const s = star.size * (3 + Math.sin(twinkle * 2 + star.phase) * 1.2);
    stroke(180, 210, 255, 46);
    strokeWeight(0.8);
    line(x - s, y, x + s, y);
    line(x, y - s, x, y + s);
  }
  blendMode(BLEND);
}

const NEBULAE = [
  { x: 0.2, y: 0.3, r: 0.5, color: [46, 66, 160], alpha: 9 },
  { x: 0.82, y: 0.22, r: 0.42, color: [120, 52, 150], alpha: 8 },
  { x: 0.68, y: 0.82, r: 0.55, color: [30, 90, 140], alpha: 8 },
];

function drawNebulae() {
  blendMode(ADD);
  noStroke();
  const span = Math.max(width, height);
  for (const nebula of NEBULAE) {
    const r = nebula.r * span;
    for (let i = 5; i >= 1; i--) {
      const f = i / 5;
      fill(nebula.color[0], nebula.color[1], nebula.color[2], nebula.alpha * (1 - f * 0.6));
      ellipse(nebula.x * width, nebula.y * height, r * 2 * (1 + f));
    }
  }
  blendMode(BLEND);
}

function drawVignette() {
  const ctx = drawingContext;
  const g = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );
  g.addColorStop(0, "rgba(0, 0, 0, 0)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

/* ------------------------------------------------------------------ *
 * Bodies                                                              *
 * ------------------------------------------------------------------ */

function drawOrbitRings() {
  noFill();
  strokeWeight(1);
  for (const planet of PLANETS) {
    stroke(122, 168, 255, 26);
    ellipse(0, 0, planet.distance * 2, planet.distance * 2 * ORBIT_TILT);
  }
}

function makeAsteroids() {
  asteroids = [];
  for (let i = 0; i < 380; i++) {
    const distance = random(ASTEROID_MIN, ASTEROID_MAX);
    asteroids.push({
      distance,
      angle: random(TWO_PI),
      size: random(0.7, 2.1),
      alpha: random(70, 190),
      speed: 0.5 * Math.pow(100 / distance, 1.5),
    });
  }
}

function drawAsteroidBelt() {
  noStroke();
  for (const rock of asteroids) {
    const angle = rock.angle + t * rock.speed;
    fill(196, 186, 168, rock.alpha);
    ellipse(
      Math.cos(angle) * rock.distance,
      Math.sin(angle) * rock.distance * ORBIT_TILT,
      rock.size,
    );
  }
}

function drawComet() {
  const angle = COMET.phase + t * (TWO_PI / COMET.period);
  const x = Math.cos(angle) * COMET.a;
  const y = Math.sin(angle) * COMET.b * ORBIT_TILT;
  const d = Math.hypot(x, y) || 1;
  const ux = x / d;
  const uy = y / d;

  noStroke();
  const tail = 22;
  for (let i = tail; i >= 1; i--) {
    const f = i / tail;
    fill(150, 210, 255, 90 * (1 - f) * (1 - f));
    const spread = 1 + f * 6;
    ellipse(x + ux * f * 46, y + uy * f * 46, spread);
  }

  blendMode(ADD);
  for (let i = 6; i >= 1; i--) {
    fill(200, 230, 255, 12);
    ellipse(x, y, 6 * (1 + i * 0.9));
  }
  blendMode(BLEND);

  fill(240, 250, 255);
  ellipse(x, y, 4.2);
  labels.push({ text: "Comet", x, y, offset: 8 });
}

function drawSun() {
  const pulse = 1 + 0.035 * Math.sin(frameCount * 0.045);
  const r = SUN_RADIUS * pulse;

  drawGlow(0, 0, r, [255, 190, 80]);

  const ctx = drawingContext;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, "rgb(255, 255, 244)");
  g.addColorStop(0.42, "rgb(255, 228, 150)");
  g.addColorStop(1, "rgb(255, 158, 46)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TWO_PI);
  ctx.fill();

  labels.push({ text: "Sun", x: 0, y: 0, offset: r + 10 });
}

function drawGlow(x, y, radius, rgb) {
  blendMode(ADD);
  noStroke();
  const layers = 11;
  for (let i = layers; i >= 1; i--) {
    const f = i / layers;
    fill(rgb[0], rgb[1], rgb[2], 3 + 6 * (1 - f));
    ellipse(x, y, radius * 2 * (1 + f * 2));
  }
  blendMode(BLEND);
}

function drawPlanetSystem(planet) {
  const world = planetWorld(planet);
  const moons = planet.moons.map((moon) => ({ moon, pos: moonWorld(moon, world.x, world.y) }));

  if (showOrbits && moons.length > 0) {
    noFill();
    strokeWeight(0.8);
    stroke(150, 190, 255, 24);
    for (const { moon } of moons) {
      ellipse(world.x, world.y, moon.distance * 2, moon.distance * 2 * ORBIT_TILT);
    }
  }

  for (const { moon, pos } of moons) {
    if (pos.y - world.y <= 0) {
      drawMoon(moon, pos);
    }
  }

  if (planet.ring) {
    drawRingArc(world, planet.radius, Math.PI, TWO_PI, 150, 130, 92);
  }

  drawSphere(world.x, world.y, planet.radius, planet.color, planet.bands === true);

  if (planet.ring) {
    drawRingArc(world, planet.radius, 0, Math.PI, 226, 206, 150);
  }

  for (const { moon, pos } of moons) {
    if (pos.y - world.y > 0) {
      drawMoon(moon, pos);
    }
  }

  labels.push({ text: planet.name, x: world.x, y: world.y, offset: planet.radius + 8 });

  if (zoom > 1.6) {
    for (const { moon, pos } of moons) {
      labels.push({ text: moon.name, x: pos.x, y: pos.y, offset: moon.radius + 5, small: true });
    }
  }
}

function drawMoon(moon, pos) {
  const ctx = drawingContext;
  const r = moon.radius;
  const d = Math.hypot(pos.x, pos.y) || 1;
  const hx = pos.x - (pos.x / d) * r * 0.4;
  const hy = pos.y - (pos.y / d) * r * 0.4;
  const g = ctx.createRadialGradient(hx, hy, r * 0.1, pos.x, pos.y, r * 1.05);
  g.addColorStop(0, shade(moon.color, 1.3));
  g.addColorStop(0.55, shade(moon.color, 0.9));
  g.addColorStop(1, shade(moon.color, 0.24));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, TWO_PI);
  ctx.fill();
}

function drawRingArc(world, radius, from, to, r, g, b) {
  noFill();
  stroke(r, g, b, 150);
  strokeWeight(radius * 0.5);
  arc(world.x, world.y, radius * 3.2, radius * 3.2 * 0.34, from, to);
  strokeWeight(radius * 0.18);
  stroke(r + 20, g + 20, b + 30, 90);
  arc(world.x, world.y, radius * 3.9, radius * 3.9 * 0.34, from, to);
  noStroke();
}

function drawSphere(x, y, radius, color, bands) {
  const ctx = drawingContext;
  const d = Math.hypot(x, y) || 1;
  const hx = x - (x / d) * radius * 0.45;
  const hy = y - (y / d) * radius * 0.45;
  const g = ctx.createRadialGradient(hx, hy, radius * 0.08, x, y, radius * 1.02);
  g.addColorStop(0, shade(color, 1.38));
  g.addColorStop(0.45, shade(color, 1));
  g.addColorStop(0.82, shade(color, 0.52));
  g.addColorStop(1, shade(color, 0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
  ctx.fill();

  if (bands) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TWO_PI);
    ctx.clip();
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 244, 220, 0.1)" : "rgba(80, 48, 28, 0.14)";
      ctx.fillRect(x - radius, y + (i * radius) / 2.8 - radius / 9, radius * 2, radius / 4.5);
    }
    ctx.restore();
  }
}

function shade(rgb, factor) {
  const r = Math.min(255, Math.round(rgb[0] * factor));
  const g = Math.min(255, Math.round(rgb[1] * factor));
  const b = Math.min(255, Math.round(rgb[2] * factor));
  return `rgb(${r}, ${g}, ${b})`;
}

/* ------------------------------------------------------------------ *
 * Labels                                                              *
 * ------------------------------------------------------------------ */

function drawLabels() {
  if (!showLabels) return;
  noStroke();
  textAlign(LEFT, CENTER);
  textFont("ui-monospace, monospace");

  for (const label of labels) {
    const screen = toScreen(label.x, label.y);
    if (screen.x < -80 || screen.x > width + 80 || screen.y < -40 || screen.y > height + 40) {
      continue;
    }
    textSize(label.small ? 10 : 11.5);
    fill(8, 12, 24, 150);
    text(label.text, screen.x + label.offset * zoom + 1, screen.y + 1);
    fill(226, 234, 255, label.small ? 170 : 215);
    text(label.text, screen.x + label.offset * zoom, screen.y);
  }
}
