/**
 * Solar system simulation.
 *
 * Distances are compressed (true AU ratios, shrunken outer gaps) so all eight
 * planets fit on screen. Radii are relative but not to-scale with distance —
 * a to-scale sun would swallow the inner planets.
 */

const PLANETS = [
  {
    name: "Mercury",
    au: 0.39,
    radius: 3.2,
    period: 0.241,
    color: [180, 176, 168],
    tilt: 0.02,
    moons: [],
  },
  {
    name: "Venus",
    au: 0.72,
    radius: 5.6,
    period: 0.615,
    color: [232, 189, 108],
    tilt: 0.04,
    moons: [],
  },
  {
    name: "Earth",
    au: 1.0,
    radius: 5.8,
    period: 1.0,
    color: [70, 130, 210],
    tilt: 0.03,
    moons: [{ name: "Moon", radius: 1.6, dist: 12, period: 0.075, color: [200, 200, 205] }],
  },
  {
    name: "Mars",
    au: 1.52,
    radius: 4.2,
    period: 1.881,
    color: [196, 92, 54],
    tilt: 0.05,
    moons: [
      { name: "Phobos", radius: 1.1, dist: 8, period: 0.03, color: [160, 140, 130] },
      { name: "Deimos", radius: 0.9, dist: 12, period: 0.055, color: [150, 130, 120] },
    ],
  },
  {
    name: "Jupiter",
    au: 5.2,
    radius: 14.5,
    period: 11.86,
    color: [214, 166, 112],
    tilt: 0.02,
    bands: true,
    moons: [
      { name: "Io", radius: 2.0, dist: 22, period: 0.05, color: [240, 190, 80] },
      { name: "Europa", radius: 1.8, dist: 28, period: 0.08, color: [210, 220, 230] },
      { name: "Ganymede", radius: 2.4, dist: 35, period: 0.14, color: [170, 160, 145] },
      { name: "Callisto", radius: 2.2, dist: 44, period: 0.22, color: [120, 115, 110] },
    ],
  },
  {
    name: "Saturn",
    au: 9.58,
    radius: 12.2,
    period: 29.46,
    color: [226, 197, 132],
    tilt: 0.06,
    rings: { inner: 1.4, outer: 2.35 },
    moons: [{ name: "Titan", radius: 2.1, dist: 38, period: 0.16, color: [210, 160, 90] }],
  },
  {
    name: "Uranus",
    au: 19.2,
    radius: 8.4,
    period: 84.01,
    color: [122, 200, 210],
    tilt: 0.03,
    moons: [{ name: "Titania", radius: 1.5, dist: 18, period: 0.12, color: [190, 200, 205] }],
  },
  {
    name: "Neptune",
    au: 30.05,
    radius: 8.1,
    period: 164.8,
    color: [62, 102, 214],
    tilt: 0.025,
    moons: [{ name: "Triton", radius: 1.6, dist: 18, period: 0.11, color: [180, 190, 200] }],
  },
];

/** Compress outer orbits so Neptune still reads as far without emptying the view. */
function displayAU(au) {
  return Math.pow(au, 0.72);
}

let cam = { x: 0, y: 0, zoom: 1 };
let dragging = false;
let dragOrigin = { x: 0, y: 0, camX: 0, camY: 0 };
let yearsPerSecond = 0.18;
let paused = false;
let showLabels = true;
let simYears = 0;
let stars = [];
let asteroids = [];
let distScale = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  seedSky();
  seedAsteroids();
  fitScale();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fitScale();
}

function fitScale() {
  const neptune = displayAU(30.05);
  distScale = (Math.min(width, height) * 0.42) / neptune;
}

function seedSky() {
  stars = [];
  for (let i = 0; i < 280; i += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.2,
      a: Math.random() * 140 + 40,
      tw: Math.random() * Math.PI * 2,
    });
  }
}

function seedAsteroids() {
  asteroids = [];
  for (let i = 0; i < 220; i += 1) {
    const au = 2.2 + Math.random() * 1.15;
    asteroids.push({
      au,
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 1.2 + 0.4,
      period: Math.pow(au, 1.5) * (0.9 + Math.random() * 0.2),
      shade: 110 + Math.floor(Math.random() * 70),
    });
  }
}

function draw() {
  background(2, 3, 12);
  drawStars();

  if (!paused) {
    simYears += yearsPerSecond * (deltaTime / 1000);
  }

  push();
  translate(width / 2 + cam.x, height / 2 + cam.y);
  scale(cam.zoom);

  drawOrbits();
  drawAsteroidBelt();
  drawSun();

  for (const planet of PLANETS) {
    drawPlanet(planet);
  }

  pop();
  drawTitle();
}

function drawStars() {
  noStroke();
  for (const star of stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(frameCount * 0.03 + star.tw);
    fill(230, 235, 255, star.a * twinkle);
    circle(star.x * width, star.y * height, star.r);
  }
}

function drawOrbits() {
  noFill();
  stroke(90, 120, 180, 45);
  strokeWeight(1 / cam.zoom);
  for (const planet of PLANETS) {
    circle(0, 0, 2 * orbitRadius(planet.au));
  }
}

function orbitRadius(au) {
  return displayAU(au) * distScale;
}

function planetAngle(planet) {
  return (simYears / planet.period) * Math.PI * 2 + planet.tilt * 10;
}

function planetPosition(planet) {
  const r = orbitRadius(planet.au);
  const a = planetAngle(planet);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function drawSun() {
  const r = 22;
  noStroke();
  for (let i = 7; i >= 1; i -= 1) {
    fill(255, 170, 40, 10 + i * 6);
    circle(0, 0, r * i * 1.35);
  }
  fill(255, 230, 140);
  circle(0, 0, r * 2);
  fill(255, 250, 210);
  circle(0, 0, r * 1.15);

  if (showLabels) {
    drawLabel("Sun", 0, r + 10, 11);
  }
}

function drawPlanet(planet) {
  const pos = planetPosition(planet);
  const px = pos.x;
  const py = pos.y;

  if (planet.rings) {
    drawRings(px, py, planet);
  }

  noStroke();
  fill(0, 0, 0, 50);
  circle(px + 1.5, py + 1.8, planet.radius * 2.1);

  fill(...planet.color);
  circle(px, py, planet.radius * 2);

  if (planet.bands) {
    push();
    translate(px, py);
    noFill();
    stroke(160, 90, 40, 90);
    strokeWeight(1.2);
    ellipse(0, -planet.radius * 0.25, planet.radius * 1.8, planet.radius * 0.45);
    ellipse(0, planet.radius * 0.2, planet.radius * 1.7, planet.radius * 0.4);
    pop();
  }

  const highlight = planet.color.map((c) => Math.min(255, c + 70));
  fill(...highlight, 90);
  circle(px - planet.radius * 0.3, py - planet.radius * 0.3, planet.radius * 0.7);

  for (const moon of planet.moons) {
    drawMoon(px, py, moon);
  }

  if (showLabels) {
    drawLabel(planet.name, px, py + planet.radius + 8, 10);
  }
}

function drawMoon(px, py, moon) {
  const a = (simYears / moon.period) * Math.PI * 2;
  const mx = px + Math.cos(a) * moon.dist;
  const my = py + Math.sin(a) * moon.dist;

  noFill();
  stroke(160, 170, 200, 40);
  strokeWeight(0.7 / cam.zoom);
  circle(px, py, moon.dist * 2);

  noStroke();
  fill(...moon.color);
  circle(mx, my, moon.radius * 2);
}

function drawRings(px, py, planet) {
  push();
  translate(px, py);
  rotate(-0.45);
  noFill();
  const inner = planet.radius * planet.rings.inner;
  const outer = planet.radius * planet.rings.outer;
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    const rr = inner + (outer - inner) * t;
    stroke(210, 190, 140, 35 + (i % 2) * 25);
    strokeWeight((0.7 + t) / Math.max(cam.zoom, 0.4));
    ellipse(0, 0, rr * 2.6, rr * 0.85);
  }
  pop();
}

function drawAsteroidBelt() {
  noStroke();
  for (const rock of asteroids) {
    const a = (simYears / rock.period) * Math.PI * 2 + rock.angle;
    const r = orbitRadius(rock.au);
    fill(rock.shade, rock.shade - 10, rock.shade - 20, 180);
    circle(Math.cos(a) * r, Math.sin(a) * r, rock.radius);
  }
}

function drawLabel(textValue, x, y, size) {
  push();
  translate(x, y);
  scale(1 / cam.zoom);
  textAlign(CENTER, TOP);
  textSize(size);
  fill(0, 0, 0, 140);
  text(textValue, 0.6, 0.6);
  fill(230, 236, 255, 220);
  noStroke();
  text(textValue, 0, 0);
  pop();
}

function drawTitle() {
  noStroke();
  fill(230, 236, 255, 220);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Inner & outer solar system", 16, 16);
  textSize(12);
  fill(170, 184, 230, 200);
  const speed = paused ? "paused" : `${yearsPerSecond.toFixed(2)} yr/s`;
  text(`t = ${simYears.toFixed(2)} years   ${speed}`, 16, 38);
}

function mousePressed() {
  dragging = true;
  dragOrigin = { x: mouseX, y: mouseY, camX: cam.x, camY: cam.y };
}

function mouseDragged() {
  if (!dragging) return;
  cam.x = dragOrigin.camX + (mouseX - dragOrigin.x);
  cam.y = dragOrigin.camY + (mouseY - dragOrigin.y);
}

function mouseReleased() {
  dragging = false;
}

function mouseWheel(event) {
  const factor = event.delta > 0 ? 0.92 : 1.08;
  const next = constrain(cam.zoom * factor, 0.25, 8);
  const wx = (mouseX - width / 2 - cam.x) / cam.zoom;
  const wy = (mouseY - height / 2 - cam.y) / cam.zoom;
  cam.zoom = next;
  cam.x = mouseX - width / 2 - wx * cam.zoom;
  cam.y = mouseY - height / 2 - wy * cam.zoom;
  return false;
}

function keyPressed() {
  if (key === " ") {
    paused = !paused;
  } else if (key === "l" || key === "L") {
    showLabels = !showLabels;
  } else if (key === "[") {
    yearsPerSecond = Math.max(0.02, yearsPerSecond * 0.7);
  } else if (key === "]") {
    yearsPerSecond = Math.min(4, yearsPerSecond * 1.4);
  } else if (key === "0") {
    cam = { x: 0, y: 0, zoom: 1 };
  }
}
