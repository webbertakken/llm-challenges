// Solar System Simulation — p5.js
// Features: 8 planets, moons for Earth/Jupiter/Saturn, rings for Saturn,
//           asteroid belt, starfield, glow effects, zoom/pan controls

let sun;
let planets = [];
let asteroids = [];
let stars = [];

// Camera
let zoom = 1;
let targetZoom = 1;
let panX = 0, panY = 0;
let dragging = false;
let dragStartX, dragStartY;
let panStartX, panStartY;

// Time
let timeScale = 1;
let paused = false;

// ─── Data ──────────────────────────────────────────────────────────────────────

const PLANET_DATA = [
  { name: "Mercury", distance: 58,  radius: 3.8,  period: 88,     color: [180, 160, 140], moons: [] },
  { name: "Venus",   distance: 85,  radius: 6.0,  period: 225,    color: [230, 200, 140], moons: [] },
  { name: "Earth",   distance: 115, radius: 6.4,  period: 365,    color: [70, 130, 200],  moons: [
    { name: "Moon", distance: 14, radius: 1.7, period: 27, color: [200, 200, 200] }
  ]},
  { name: "Mars",    distance: 150, radius: 5.0,  period: 687,    color: [200, 100, 60],  moons: [] },
  { name: "Jupiter", distance: 210, radius: 14.0, period: 4333,   color: [210, 180, 140], moons: [
    { name: "Io",       distance: 22, radius: 1.8, period: 1.8,  color: [230, 210, 120] },
    { name: "Europa",   distance: 28, radius: 1.6, period: 3.6,  color: [180, 180, 210] },
    { name: "Ganymede", distance: 35, radius: 2.6, period: 7.2,  color: [170, 160, 150] },
    { name: "Callisto", distance: 42, radius: 2.4, period: 16.7, color: [130, 120, 110] },
  ]},
  { name: "Saturn",  distance: 280, radius: 12.0, period: 10759,  color: [220, 200, 150], rings: true, moons: [
    { name: "Titan",  distance: 30, radius: 2.5, period: 16, color: [210, 180, 100] },
    { name: "Enceladus", distance: 20, radius: 1.2, period: 1.4, color: [220, 230, 240] },
  ]},
  { name: "Uranus",  distance: 350, radius: 8.0,  period: 30687,  color: [170, 220, 230], rings: true, ringFaint: true, moons: [] },
  { name: "Neptune", distance: 410, radius: 7.8,  period: 60190,  color: [60, 100, 220],  moons: [] },
];

// ─── Classes ───────────────────────────────────────────────────────────────────

class CelestialBody {
  constructor(name, distance, radius, period, col, moons = [], hasRings = false, ringFaint = false) {
    this.name = name;
    this.distance = distance;
    this.radius = radius;
    this.period = period;
    this.col = col;
    this.angle = random(TWO_PI);
    this.hasRings = hasRings;
    this.ringFaint = ringFaint;
    this.moons = moons.map(m =>
      new CelestialBody(m.name, m.distance, m.radius, m.period, m.color)
    );
  }

  update(dt) {
    if (this.period > 0) {
      this.angle += (TWO_PI / (this.period * 60)) * dt * timeScale;
    }
    for (let moon of this.moons) {
      moon.update(dt);
    }
  }

  getX() { return cos(this.angle) * this.distance; }
  getY() { return sin(this.angle) * this.distance; }

  draw() {
    push();
    let x = this.getX();
    let y = this.getY();
    translate(x, y);

    // Glow
    let glowSize = this.radius * 3;
    let c = color(this.col[0], this.col[1], this.col[2], 30);
    noStroke();
    for (let i = 3; i > 0; i--) {
      fill(color(this.col[0], this.col[1], this.col[2], 15 * i));
      ellipse(0, 0, this.radius * 2 + glowSize * (4 - i) / 2);
    }

    // Rings (drawn behind and in front)
    if (this.hasRings) {
      this.drawRings();
    }

    // Planet body
    noStroke();
    fill(this.col[0], this.col[1], this.col[2]);
    ellipse(0, 0, this.radius * 2);

    // Highlight
    fill(255, 255, 255, 50);
    ellipse(-this.radius * 0.25, -this.radius * 0.25, this.radius * 1.1);

    // Moon orbits & moons
    for (let moon of this.moons) {
      // Orbit line
      noFill();
      stroke(255, 255, 255, 20);
      strokeWeight(0.5);
      ellipse(0, 0, moon.distance * 2);
      moon.draw();
    }

    pop();
  }

  drawRings() {
    let alpha = this.ringFaint ? 40 : 80;
    noFill();
    strokeWeight(this.ringFaint ? 1.5 : 2.5);
    for (let i = 0; i < (this.ringFaint ? 2 : 4); i++) {
      let r = this.radius * 2.2 + i * 2.5;
      let a = alpha - i * 12;
      stroke(this.col[0] + 20, this.col[1] + 10, this.col[2] - 10, max(a, 10));
      ellipse(0, 0, r * 2, r * 0.6);
    }
  }
}

// ─── Starfield ─────────────────────────────────────────────────────────────────

function generateStars(count) {
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random(-2000, 2000),
      y: random(-2000, 2000),
      brightness: random(80, 255),
      size: random(0.5, 2.5),
      twinkleSpeed: random(0.01, 0.04),
      twinkleOffset: random(TWO_PI),
    });
  }
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    let b = s.brightness + sin(frameCount * s.twinkleSpeed + s.twinkleOffset) * 40;
    fill(255, 255, 255, b);
    ellipse(s.x, s.y, s.size);
  }
}

// ─── Asteroid Belt ─────────────────────────────────────────────────────────────

function generateAsteroids(count) {
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let dist = random(170, 195); // Between Mars and Jupiter
    asteroids.push({
      angle: angle,
      distance: dist,
      speed: random(0.0001, 0.0004),
      size: random(0.5, 2),
      brightness: random(100, 180),
    });
  }
}

function drawAsteroids(dt) {
  noStroke();
  for (let a of asteroids) {
    a.angle += a.speed * dt * timeScale;
    let x = cos(a.angle) * a.distance;
    let y = sin(a.angle) * a.distance;
    fill(a.brightness, a.brightness * 0.9, a.brightness * 0.8, 200);
    ellipse(x, y, a.size);
  }
}

// ─── Sun ───────────────────────────────────────────────────────────────────────

function drawSun() {
  // Outer glow layers
  noStroke();
  for (let i = 6; i > 0; i--) {
    let size = 30 + i * 18 + sin(frameCount * 0.02) * 3 * i;
    fill(255, 200, 50, 8);
    ellipse(0, 0, size);
  }

  // Corona
  for (let i = 4; i > 0; i--) {
    let size = 28 + i * 6;
    fill(255, 180, 50, 25);
    ellipse(0, 0, size);
  }

  // Sun body
  fill(255, 220, 80);
  ellipse(0, 0, 28);

  // Bright center
  fill(255, 250, 200);
  ellipse(0, 0, 16);
}

// ─── p5.js hooks ───────────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);

  generateStars(800);
  generateAsteroids(300);

  for (let d of PLANET_DATA) {
    planets.push(new CelestialBody(
      d.name, d.distance, d.radius, d.period, d.color,
      d.moons || [], d.rings || false, d.ringFaint || false
    ));
  }
}

function draw() {
  background(5, 5, 15);

  let dt = paused ? 0 : 1;

  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  // Stars (parallax — move slower)
  push();
  scale(0.5);
  drawStars();
  pop();

  // Orbit paths
  noFill();
  strokeWeight(0.5);
  for (let p of planets) {
    stroke(255, 255, 255, 15);
    ellipse(0, 0, p.distance * 2);
  }

  // Asteroid belt hint ring
  stroke(255, 255, 255, 8);
  strokeWeight(25);
  ellipse(0, 0, 365);

  // Asteroids
  drawAsteroids(dt);

  // Sun
  drawSun();

  // Planets
  for (let p of planets) {
    p.update(dt);
    p.draw();
  }

  pop();

  // HUD
  drawHUD();

  // Smooth zoom
  zoom = lerp(zoom, targetZoom, 0.1);
}

function drawHUD() {
  noStroke();
  fill(255, 255, 255, 150);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`Zoom: ${targetZoom.toFixed(1)}x  |  Speed: ${timeScale.toFixed(1)}x  |  ${paused ? "PAUSED" : "Playing"}`, 10, 10);
  fill(255, 255, 255, 80);
  textSize(10);
  text("Scroll: zoom  |  Drag: pan  |  ←→: speed  |  Space: pause  |  R: reset", 10, 28);
}

// ─── Input ─────────────────────────────────────────────────────────────────────

function mouseWheel(event) {
  let factor = event.delta > 0 ? 0.9 : 1.1;
  targetZoom = constrain(targetZoom * factor, 0.2, 10);
  return false; // prevent page scroll
}

function mousePressed() {
  dragging = true;
  dragStartX = mouseX;
  dragStartY = mouseY;
  panStartX = panX;
  panStartY = panY;
}

function mouseDragged() {
  if (dragging) {
    panX = panStartX + (mouseX - dragStartX);
    panY = panStartY + (mouseY - dragStartY);
  }
}

function mouseReleased() {
  dragging = false;
}

function keyPressed() {
  if (key === ' ') {
    paused = !paused;
  } else if (keyCode === RIGHT_ARROW) {
    timeScale = min(timeScale * 1.5, 50);
  } else if (keyCode === LEFT_ARROW) {
    timeScale = max(timeScale / 1.5, 0.1);
  } else if (key === 'r' || key === 'R') {
    targetZoom = 1;
    panX = 0;
    panY = 0;
    timeScale = 1;
    paused = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
