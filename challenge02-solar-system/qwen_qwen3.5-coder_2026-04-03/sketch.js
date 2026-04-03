/**
 * Solar System Simulation — p5.js
 *
 * Features:
 *  - Central sun with glow effect
 *  - 8 planets with proportional sizes/distances (logarithmic scale for visibility)
 *  - Moons for Earth and Jupiter
 *  - Saturn's rings
 *  - Starfield background
 *  - Zoom with mouse wheel, pan with drag
 */

// ── Configuration ──────────────────────────────────────────────

const AU = 60; // pixels per astronomical unit (scaled for visibility)

const planetData = [
  {
    name: "Mercury",
    orbitRadius: 0.39 * AU,
    size: 3,
    speed: 4.15,
    color: [169, 169, 169],
    angle: random(TWO_PI),
  },
  {
    name: "Venus",
    orbitRadius: 0.72 * AU,
    size: 5,
    speed: 1.62,
    color: [230, 180, 100],
    angle: random(TWO_PI),
  },
  {
    name: "Earth",
    orbitRadius: 1.0 * AU,
    size: 5.5,
    speed: 1.0,
    color: [70, 130, 220],
    angle: random(TWO_PI),
    moons: [
      { name: "Moon", orbitRadius: 14, size: 1.8, speed: 13.0, color: [200, 200, 200], angle: random(TWO_PI) },
    ],
  },
  {
    name: "Mars",
    orbitRadius: 1.52 * AU,
    size: 4,
    speed: 0.53,
    color: [200, 80, 50],
    angle: random(TWO_PI),
  },
  {
    name: "Jupiter",
    orbitRadius: 2.8 * AU, // compressed for visibility
    size: 16,
    speed: 0.084,
    color: [210, 170, 130],
    angle: random(TWO_PI),
    moons: [
      { name: "Io", orbitRadius: 24, size: 2, speed: 8.0, color: [230, 210, 80], angle: random(TWO_PI) },
      { name: "Europa", orbitRadius: 30, size: 1.8, speed: 5.5, color: [190, 190, 200], angle: random(TWO_PI) },
      { name: "Ganymede", orbitRadius: 36, size: 2.5, speed: 3.5, color: [170, 160, 150], angle: random(TWO_PI) },
      { name: "Callisto", orbitRadius: 42, size: 2.2, speed: 2.0, color: [130, 120, 110], angle: random(TWO_PI) },
    ],
  },
  {
    name: "Saturn",
    orbitRadius: 4.0 * AU, // compressed
    size: 13,
    speed: 0.034,
    color: [220, 190, 140],
    angle: random(TWO_PI),
    hasRings: true,
  },
  {
    name: "Uranus",
    orbitRadius: 5.2 * AU, // compressed
    size: 9,
    speed: 0.012,
    color: [170, 220, 230],
    angle: random(TWO_PI),
  },
  {
    name: "Neptune",
    orbitRadius: 6.2 * AU, // compressed
    size: 8.5,
    speed: 0.006,
    color: [60, 80, 200],
    angle: random(TWO_PI),
  },
];

// ── Camera state ───────────────────────────────────────────────

let camX = 0;
let camY = 0;
let zoom = 1.0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// ── Stars ──────────────────────────────────────────────────────

let stars = [];

function generateStars(count) {
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random(-2000, 2000),
      y: random(-2000, 2000),
      brightness: random(100, 255),
      size: random(0.5, 2),
    });
  }
}

// ── p5.js lifecycle ────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateStars(500);
  frameRate(60);
}

function draw() {
  background(5, 5, 15);

  // Draw stars
  drawStars();

  // Apply camera transform
  push();
  translate(width / 2 + camX, height / 2 + camY);
  scale(zoom);

  // Draw orbit paths
  drawOrbits();

  // Draw sun
  drawSun();

  // Draw planets and moons
  for (const planet of planetData) {
    drawPlanet(planet);
  }

  pop();

  // HUD
  drawHUD();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ── Drawing helpers ────────────────────────────────────────────

function drawStars() {
  noStroke();
  for (const s of stars) {
    const parallax = 0.1;
    const sx = s.x + camX * parallax;
    const sy = s.y + camY * parallax;
    // Wrap around screen
    const wx = ((sx % width) + width) % width;
    const wy = ((sy % height) + height) % height;
    fill(s.brightness, s.brightness, s.brightness + 20);
    circle(wx, wy, s.size);
  }
}

function drawSun() {
  // Outer glow layers
  for (let i = 5; i >= 1; i--) {
    const glowSize = 30 + i * 12;
    const alpha = map(i, 5, 1, 10, 60);
    noStroke();
    fill(255, 200, 50, alpha);
    circle(0, 0, glowSize);
  }

  // Sun body
  noStroke();
  fill(255, 230, 100);
  circle(0, 0, 28);

  // Inner bright core
  fill(255, 255, 220);
  circle(0, 0, 14);
}

function drawOrbits() {
  noFill();
  stroke(255, 255, 255, 25);
  strokeWeight(0.5);
  for (const p of planetData) {
    ellipse(0, 0, p.orbitRadius * 2, p.orbitRadius * 2);
  }
}

function drawPlanet(planet) {
  // Update angle
  planet.angle += planet.speed * 0.005;

  const x = cos(planet.angle) * planet.orbitRadius;
  const y = sin(planet.angle) * planet.orbitRadius;

  // Planet body
  noStroke();
  fill(planet.color[0], planet.color[1], planet.color[2]);
  circle(x, y, planet.size * 2);

  // Subtle highlight
  fill(255, 255, 255, 40);
  circle(x - planet.size * 0.25, y - planet.size * 0.25, planet.size * 0.8);

  // Saturn's rings
  if (planet.hasRings) {
    drawRings(x, y, planet.size);
  }

  // Moons
  if (planet.moons) {
    for (const moon of planet.moons) {
      moon.angle += moon.speed * 0.005;
      const mx = x + cos(moon.angle) * moon.orbitRadius;
      const my = y + sin(moon.angle) * moon.orbitRadius;

      // Moon orbit path
      noFill();
      stroke(255, 255, 255, 12);
      strokeWeight(0.3);
      ellipse(x, y, moon.orbitRadius * 2, moon.orbitRadius * 2);

      // Moon body
      noStroke();
      fill(moon.color[0], moon.color[1], moon.color[2]);
      circle(mx, my, moon.size * 2);
    }
  }
}

function drawRings(px, py, planetSize) {
  push();
  translate(px, py);
  rotate(PI * 0.12); // slight tilt

  noFill();
  // Outer ring
  stroke(200, 180, 140, 100);
  strokeWeight(3);
  ellipse(0, 0, planetSize * 3.2, planetSize * 1.0);

  // Inner ring
  stroke(180, 160, 120, 70);
  strokeWeight(2);
  ellipse(0, 0, planetSize * 2.6, planetSize * 0.8);

  pop();
}

function drawHUD() {
  fill(255, 255, 255, 150);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text("Scroll to zoom • Drag to pan", 12, 12);
  text(`Zoom: ${zoom.toFixed(2)}x`, 12, 30);
}

// ── Interaction ────────────────────────────────────────────────

function mouseWheel(event) {
  const zoomFactor = event.delta > 0 ? 0.9 : 1.1;
  zoom = constrain(zoom * zoomFactor, 0.2, 5.0);
  return false; // prevent page scroll
}

function mousePressed() {
  // Only drag with left mouse button
  if (mouseButton === LEFT) {
    isDragging = true;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

function mouseDragged() {
  if (isDragging) {
    camX += mouseX - lastMouseX;
    camY += mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

function mouseReleased() {
  isDragging = false;
}
