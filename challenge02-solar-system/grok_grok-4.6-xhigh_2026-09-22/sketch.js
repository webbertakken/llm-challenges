/**
 * Solar system simulation.
 * Distances and radii are compressed so all eight planets fit on screen
 * while keeping inner/outer size and period relationships recognizable.
 * Drag to pan, scroll to zoom, space to pause, L to toggle labels.
 */

const AU = 92;
const SUN_RADIUS = 28;
const TIME_SCALE = 0.018;

/** @type {Star[]} */
let stars = [];
/** @type {Planet[]} */
let planets = [];
/** @type {Asteroid[]} */
let asteroids = [];

let time = 0;
let paused = false;
let showLabels = true;
let zoom = 1;
let panX = 0;
let panY = 0;
let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

class Star {
  constructor() {
    this.x = Math.random();
    this.y = Math.random();
    this.r = Math.random() * 1.6 + 0.2;
    this.twinkle = Math.random() * Math.PI * 2;
    this.speed = 0.01 + Math.random() * 0.03;
  }

  draw(w, h, t) {
    const alpha = 80 + 175 * (0.5 + 0.5 * Math.sin(this.twinkle + t * this.speed));
    noStroke();
    fill(230, 235, 255, alpha);
    circle(this.x * w, this.y * h, this.r);
  }
}

class Moon {
  /**
   * @param {string} name
   * @param {number} orbit
   * @param {number} radius
   * @param {number} periodYears
   * @param {number[]} color
   */
  constructor(name, orbit, radius, periodYears, color) {
    this.name = name;
    this.orbit = orbit;
    this.radius = radius;
    this.periodYears = periodYears;
    this.color = color;
    this.phase = Math.random() * Math.PI * 2;
  }

  angle(t) {
    return this.phase + (t / this.periodYears) * Math.PI * 2;
  }
}

class Planet {
  /**
   * @param {object} spec
   */
  constructor(spec) {
    this.name = spec.name;
    this.au = spec.au;
    this.radius = spec.radius;
    this.periodYears = spec.periodYears;
    this.color = spec.color;
    this.ring = spec.ring ?? null;
    this.moons = spec.moons ?? [];
    this.phase = spec.phase ?? Math.random() * 0.4;
  }

  orbitRadius() {
    return this.au * AU;
  }

  angle(t) {
    return this.phase + (t / this.periodYears) * Math.PI * 2;
  }

  position(t) {
    const a = this.angle(t);
    const r = this.orbitRadius();
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }
}

class Asteroid {
  constructor() {
    const inner = 2.2 * AU;
    const outer = 3.2 * AU;
    this.orbit = inner + Math.random() * (outer - inner);
    this.phase = Math.random() * Math.PI * 2;
    this.periodYears = 3.5 + Math.random() * 2.5;
    this.radius = 0.4 + Math.random() * 1.1;
    this.tilt = (Math.random() - 0.5) * 16;
    const shade = 140 + Math.floor(Math.random() * 70);
    this.color = [shade, shade - 10, shade - 20];
  }

  position(t) {
    const a = this.phase + (t / this.periodYears) * Math.PI * 2;
    return {
      x: Math.cos(a) * this.orbit,
      y: Math.sin(a) * this.orbit + this.tilt,
    };
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));

  stars = Array.from({ length: 280 }, () => new Star());
  asteroids = Array.from({ length: 220 }, () => new Asteroid());

  planets = [
    new Planet({
      name: "Mercury",
      au: 0.55,
      radius: 3.6,
      periodYears: 0.24,
      color: [180, 170, 160],
    }),
    new Planet({
      name: "Venus",
      au: 0.82,
      radius: 6.4,
      periodYears: 0.62,
      color: [232, 196, 120],
    }),
    new Planet({
      name: "Earth",
      au: 1.12,
      radius: 6.8,
      periodYears: 1,
      color: [70, 140, 220],
      moons: [new Moon("Moon", 14, 1.8, 0.075, [200, 200, 205])],
    }),
    new Planet({
      name: "Mars",
      au: 1.52,
      radius: 4.6,
      periodYears: 1.88,
      color: [200, 90, 55],
    }),
    new Planet({
      name: "Jupiter",
      au: 3.85,
      radius: 18,
      periodYears: 11.86,
      color: [214, 166, 110],
      moons: [
        new Moon("Io", 26, 2.0, 0.05, [240, 200, 90]),
        new Moon("Europa", 32, 1.8, 0.08, [210, 220, 230]),
        new Moon("Ganymede", 40, 2.4, 0.14, [170, 160, 145]),
        new Moon("Callisto", 50, 2.2, 0.22, [120, 115, 110]),
      ],
    }),
    new Planet({
      name: "Saturn",
      au: 5.15,
      radius: 15.2,
      periodYears: 29.46,
      color: [226, 198, 130],
      ring: { inner: 20, outer: 32, color: [210, 190, 140, 150] },
      moons: [new Moon("Titan", 42, 2.3, 0.16, [210, 160, 90])],
    }),
    new Planet({
      name: "Uranus",
      au: 6.45,
      radius: 10.4,
      periodYears: 84.0,
      color: [120, 210, 220],
      ring: { inner: 13, outer: 17, color: [160, 200, 210, 80] },
    }),
    new Planet({
      name: "Neptune",
      au: 7.7,
      radius: 10,
      periodYears: 164.8,
      color: [60, 100, 220],
      moons: [new Moon("Triton", 22, 2.0, 0.18, [190, 200, 210])],
    }),
  ];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(6, 5, 16);
  if (!paused) time += TIME_SCALE;

  drawStars();

  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  drawOrbits();
  drawAsteroids();
  drawSun();
  for (const planet of planets) {
    drawPlanet(planet);
  }
  pop();

  drawHud();
}

function drawStars() {
  for (const star of stars) {
    star.draw(width, height, time);
  }
}

function drawOrbits() {
  noFill();
  for (const planet of planets) {
    stroke(255, 255, 255, 22);
    strokeWeight(1 / zoom);
    circle(0, 0, planet.orbitRadius() * 2);
  }
}

function drawAsteroids() {
  noStroke();
  for (const asteroid of asteroids) {
    const p = asteroid.position(time);
    fill(asteroid.color[0], asteroid.color[1], asteroid.color[2], 180);
    circle(p.x, p.y, asteroid.radius);
  }
}

function drawSun() {
  const ctx = drawingContext;
  ctx.save();
  ctx.shadowBlur = 40;
  ctx.shadowColor = "rgba(255, 180, 40, 0.95)";

  noStroke();
  for (let i = 6; i >= 1; i--) {
    fill(255, 170, 40, 10 + i * 6);
    circle(0, 0, SUN_RADIUS * 2 + i * 18);
  }

  const glow = ctx.createRadialGradient(0, 0, SUN_RADIUS * 0.15, 0, 0, SUN_RADIUS);
  glow.addColorStop(0, "#fff6c8");
  glow.addColorStop(0.45, "#ffcc4d");
  glow.addColorStop(1, "#ff8a1a");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (showLabels) {
    noStroke();
    fill(255, 220, 140);
    textAlign(CENTER, CENTER);
    textSize(11 / zoom);
    text("Sun", 0, SUN_RADIUS + 12 / zoom);
  }
}

function drawPlanet(planet) {
  const pos = planet.position(time);

  push();
  translate(pos.x, pos.y);

  if (planet.ring) {
    drawRings(planet, true);
  }

  const ctx = drawingContext;
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = `rgba(${planet.color[0]}, ${planet.color[1]}, ${planet.color[2]}, 0.55)`;

  noStroke();
  fill(planet.color[0], planet.color[1], planet.color[2]);
  circle(0, 0, planet.radius * 2);

  fill(255, 255, 255, 35);
  ellipse(-planet.radius * 0.25, -planet.radius * 0.25, planet.radius * 1.1, planet.radius * 0.7);
  ctx.restore();

  if (planet.name === "Jupiter") {
    stroke(180, 120, 70, 120);
    strokeWeight(1.2);
    noFill();
    arc(0, -2, planet.radius * 1.6, 6, 0, Math.PI);
    arc(0, 3, planet.radius * 1.7, 5, Math.PI, Math.PI * 2);
    noStroke();
    fill(180, 80, 60, 140);
    ellipse(planet.radius * 0.35, planet.radius * 0.25, 5, 3);
  }

  if (planet.ring) {
    drawRings(planet, false);
  }

  for (const moon of planet.moons) {
    const ma = moon.angle(time);
    const mx = Math.cos(ma) * moon.orbit;
    const my = Math.sin(ma) * moon.orbit;
    noFill();
    stroke(255, 255, 255, 28);
    strokeWeight(0.6 / zoom);
    circle(0, 0, moon.orbit * 2);
    noStroke();
    fill(moon.color[0], moon.color[1], moon.color[2]);
    circle(mx, my, moon.radius * 2);
  }

  if (showLabels) {
    noStroke();
    fill(240, 245, 255, 210);
    textAlign(CENTER, TOP);
    textSize(10 / zoom);
    text(planet.name, 0, planet.radius + 6 / zoom);
  }

  pop();
}

function drawRings(planet, backHalf) {
  const { inner, outer, color } = planet.ring;
  noFill();
  stroke(color[0], color[1], color[2], color[3]);
  strokeWeight((outer - inner) * 0.45);
  const start = backHalf ? Math.PI : 0;
  const stop = backHalf ? Math.PI * 2 : Math.PI;
  arc(0, 0, (inner + outer), (inner + outer) * 0.38, start, stop);
  stroke(color[0], color[1], color[2], color[3] * 0.45);
  strokeWeight((outer - inner) * 0.18);
  arc(0, 0, inner + outer + 6, (inner + outer) * 0.38 + 2, start, stop);
}

function drawHud() {
  const pad = 16;
  noStroke();
  fill(8, 10, 24, 170);
  rect(pad, pad, 250, 92, 8);
  fill(235, 240, 255);
  textAlign(LEFT, TOP);
  textSize(14);
  text("Solar System", pad + 12, pad + 10);
  textSize(11);
  fill(180, 190, 210);
  text("Drag to pan  ·  Scroll to zoom", pad + 12, pad + 34);
  text("Space pauses  ·  L toggles labels", pad + 12, pad + 52);
  fill(140, 160, 200);
  const years = time.toFixed(1);
  text(`t = ${years} years   zoom ${zoom.toFixed(2)}×`, pad + 12, pad + 70);
}

function mousePressed() {
  dragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseReleased() {
  dragging = false;
}

function mouseDragged() {
  if (!dragging) return;
  panX += mouseX - lastMouseX;
  panY += mouseY - lastMouseY;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseWheel(event) {
  const factor = event.delta > 0 ? 0.92 : 1.08;
  zoom = constrain(zoom * factor, 0.25, 4.5);
  return false;
}

function keyPressed() {
  if (key === " ") {
    paused = !paused;
    return false;
  }
  if (key === "l" || key === "L") {
    showLabels = !showLabels;
  }
  if (key === "0") {
    zoom = 1;
    panX = 0;
    panY = 0;
  }
}
