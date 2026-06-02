/* eslint-env browser */
/* global p5 */

/**
 * Solar System sketch
 * -------------------
 * - Central sun with glow and subtle animated corona.
 * - 8 major planets at scaled distances / sizes (log-scaled so Neptune is
 *   still visible without dwarfing Mercury into a single pixel).
 * - Saturn has a tilted ring system.
 * - Earth and Jupiter have moons (Earth's Luna; Io, Europa, Ganymede,
 *   Callisto for Jupiter).
 * - Asteroid belt between Mars and Jupiter, Kuiper-ish dust past Neptune.
 * - Parallax starfield, twinkle, and a faint Milky-Way gradient.
 * - Pan with click-drag, zoom with the wheel, space pauses, R resets,
 *   +/- adjusts simulation speed, L toggles orbit guides.
 * - Hover a planet to see its name.
 */

const SIM = {
  paused: false,
  timeScale: 1,
  showOrbits: true,
  // pan offset in screen pixels
  panX: 0,
  panY: 0,
  zoom: 1,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  panStartX: 0,
  panStartY: 0,
};

/**
 * Planet definitions.
 *  - `dist`  : orbital radius in scene units (semi-major axis, log-ish)
 *  - `size`  : visual radius in scene units (sqrt-scaled real diameter)
 *  - `speed` : angular velocity, rad/sec, roughly proportional to 1/sqrt(a)
 *  - `color` : RGB tuple
 *  - `ring`  : optional ring spec { inner, outer, tilt, color }
 *  - `moons` : optional array of { dist, size, speed, color }
 */
const PLANETS = [
  {
    name: "Mercury",
    dist: 70,
    size: 3.2,
    speed: 1.6,
    color: [186, 173, 158],
  },
  {
    name: "Venus",
    dist: 100,
    size: 6.0,
    speed: 1.17,
    color: [232, 181, 110],
  },
  {
    name: "Earth",
    dist: 140,
    size: 6.4,
    speed: 1.0,
    color: [99, 161, 232],
    moons: [
      { dist: 14, size: 1.8, speed: 5.0, color: [210, 210, 220] },
    ],
  },
  {
    name: "Mars",
    dist: 185,
    size: 4.6,
    speed: 0.8,
    color: [205, 92, 64],
    moons: [
      { dist: 8, size: 0.8, speed: 7.5, color: [180, 150, 130] },
      { dist: 11, size: 0.6, speed: 6.0, color: [160, 130, 110] },
    ],
  },
  {
    name: "Jupiter",
    dist: 270,
    size: 18.0,
    speed: 0.44,
    color: [222, 184, 135],
    moons: [
      { dist: 26, size: 1.6, speed: 3.5, color: [240, 220, 160] }, // Io
      { dist: 32, size: 1.4, speed: 2.8, color: [220, 220, 220] }, // Europa
      { dist: 40, size: 2.0, speed: 2.1, color: [180, 170, 150] }, // Ganymede
      { dist: 50, size: 1.9, speed: 1.5, color: [120, 110, 100] }, // Callisto
    ],
  },
  {
    name: "Saturn",
    dist: 360,
    size: 15.0,
    speed: 0.32,
    color: [238, 213, 152],
    ring: {
      inner: 19,
      outer: 30,
      tilt: -0.45,
      color: [232, 210, 170, 180],
    },
    moons: [
      { dist: 36, size: 1.7, speed: 2.0, color: [210, 200, 180] }, // Titan
    ],
  },
  {
    name: "Uranus",
    dist: 440,
    size: 9.0,
    speed: 0.23,
    color: [170, 220, 230],
    ring: {
      inner: 11,
      outer: 14,
      tilt: 1.4, // nearly vertical, Uranus is tilted ~98 deg
      color: [200, 230, 240, 90],
    },
  },
  {
    name: "Neptune",
    dist: 510,
    size: 8.6,
    speed: 0.18,
    color: [80, 110, 220],
  },
];

const STAR_COUNT = 420;
const ASTEROID_COUNT = 220;
const KUIPER_COUNT = 140;

let stars = [];
let asteroids = [];
let kuiper = [];
let simTime = 0;
let hoverName = "";
let hoverEl;

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.parent("stage");
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  colorMode(RGB, 255, 255, 255, 255);

  // Background starfield with three parallax layers for depth.
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: random(-1, 1),
      y: random(-1, 1),
      depth: random(0.2, 1),
      twinkle: random(TWO_PI),
      hue: random(180, 255),
    });
  }

  // Asteroid belt between Mars (185) and Jupiter (270).
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    asteroids.push({
      a: random(205, 250),
      theta: random(TWO_PI),
      omega: random(0.15, 0.35),
      r: random(0.4, 1.4),
      tilt: random(-3, 3),
      shade: random(120, 200),
    });
  }

  // Kuiper belt just past Neptune.
  for (let i = 0; i < KUIPER_COUNT; i++) {
    kuiper.push({
      a: random(540, 620),
      theta: random(TWO_PI),
      omega: random(0.04, 0.09),
      r: random(0.3, 1.0),
      shade: random(110, 180),
    });
  }

  hoverEl = document.querySelector(".planet-label");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // background gradient (deep navy -> near black) drawn once per frame.
  drawBackdrop();
  drawStars();

  // World transform: centre origin, then pan, then zoom.
  push();
  translate(width / 2 + SIM.panX, height / 2 + SIM.panY);
  scale(SIM.zoom);

  const dt = SIM.paused ? 0 : (deltaTime / 1000) * SIM.timeScale;
  simTime += dt;

  drawOrbits();
  drawAsteroidBelt(dt);
  drawKuiperBelt(dt);
  drawSun();

  hoverName = "";
  const mx = (mouseX - width / 2 - SIM.panX) / SIM.zoom;
  const my = (mouseY - height / 2 - SIM.panY) / SIM.zoom;

  for (const p of PLANETS) {
    const angle = simTime * p.speed * 0.35; // base scaling so Mercury is brisk but not dizzying
    const x = cos(angle) * p.dist;
    const y = sin(angle) * p.dist;

    if (p.ring) drawRing(x, y, p);
    drawPlanet(x, y, p);
    if (p.moons) drawMoons(x, y, p);

    // hover detection in scene-space
    const dx = mx - x;
    const dy = my - y;
    if (dx * dx + dy * dy <= p.size * p.size * 1.6) {
      hoverName = p.name;
    }
  }

  pop();

  if (hoverEl) {
    hoverEl.textContent = hoverName
      ? `${hoverName}`
      : "Hover a planet for its name";
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawBackdrop() {
  // Vertical gradient by drawing a few translucent rectangles.
  noStroke();
  const top = color(8, 10, 24);
  const bot = color(3, 4, 10);
  for (let i = 0; i < height; i += 4) {
    const t = i / height;
    const c = lerpColor(top, bot, t);
    fill(c);
    rect(0, i, width, 4);
  }

  // Soft Milky-Way band: faint diagonal glow.
  push();
  translate(width * 0.5, height * 0.5);
  rotate(-0.4);
  noStroke();
  for (let r = 0; r < 6; r++) {
    fill(120, 140, 200, 4 + r * 2);
    ellipse(0, 0, width * 1.6, 80 + r * 30);
  }
  pop();
}

function drawStars() {
  noStroke();
  for (const s of stars) {
    const x = (s.x * width) / 2 + width / 2 + SIM.panX * s.depth * 0.1;
    const y = (s.y * height) / 2 + height / 2 + SIM.panY * s.depth * 0.1;
    const tw = 0.6 + 0.4 * sin(simTime * 2 + s.twinkle);
    const a = 80 + 175 * s.depth * tw;
    fill(s.hue, s.hue, 255, a);
    circle(x, y, 1.2 + s.depth * 1.6);
  }
}

function drawOrbits() {
  if (!SIM.showOrbits) return;
  noFill();
  strokeWeight(0.5 / SIM.zoom);
  for (const p of PLANETS) {
    stroke(255, 255, 255, 28);
    circle(0, 0, p.dist * 2);
  }
}

function drawSun() {
  // multi-layer glow
  noStroke();
  const pulse = 1 + 0.03 * sin(simTime * 1.7);
  for (let r = 110; r > 0; r -= 6) {
    const a = map(r, 0, 110, 110, 0);
    fill(255, 200, 90, a * 0.25);
    circle(0, 0, r * 2 * pulse);
  }
  // hot core
  fill(255, 230, 160);
  circle(0, 0, 36 * pulse);
  fill(255, 250, 220);
  circle(0, 0, 22 * pulse);

  // corona flicker via short radial spokes
  stroke(255, 220, 140, 80);
  strokeWeight(0.6);
  for (let i = 0; i < 24; i++) {
    const a = i * (TWO_PI / 24) + simTime * 0.4;
    const len = 22 + 4 * sin(simTime * 3 + i);
    line(cos(a) * 16, sin(a) * 16, cos(a) * (16 + len), sin(a) * (16 + len));
  }
}

function drawPlanet(x, y, p) {
  noStroke();
  // soft glow
  for (let r = p.size * 2.2; r > p.size; r -= 1) {
    const a = map(r, p.size, p.size * 2.2, 60, 0);
    fill(p.color[0], p.color[1], p.color[2], a);
    circle(x, y, r * 2);
  }
  // body with a tiny bit of shading
  fill(p.color[0], p.color[1], p.color[2]);
  circle(x, y, p.size * 2);

  // sunward highlight
  const ang = atan2(-y, -x);
  fill(255, 255, 255, 40);
  circle(x + cos(ang) * p.size * 0.4, y + sin(ang) * p.size * 0.4, p.size * 0.9);

  // night-side shadow
  fill(0, 0, 0, 90);
  circle(x - cos(ang) * p.size * 0.5, y - sin(ang) * p.size * 0.5, p.size * 1.2);
}

function drawRing(x, y, p) {
  push();
  translate(x, y);
  rotate(p.ring.tilt);
  noFill();
  // multiple concentric strokes give a smooth banded look
  const [r, g, b, a] = p.ring.color;
  for (let rad = p.ring.inner; rad <= p.ring.outer; rad += 0.5) {
    const t = (rad - p.ring.inner) / (p.ring.outer - p.ring.inner);
    const alpha = a * (0.4 + 0.6 * sin(t * PI));
    stroke(r, g, b, alpha);
    strokeWeight(0.6);
    ellipse(0, 0, rad * 2, rad * 0.45);
  }
  pop();
}

function drawMoons(px, py, planet) {
  for (let i = 0; i < planet.moons.length; i++) {
    const m = planet.moons[i];
    const phase = i * 1.3;
    const a = simTime * m.speed + phase;
    const mx = px + cos(a) * m.dist;
    const my = py + sin(a) * m.dist;
    // moon orbit line
    if (SIM.showOrbits) {
      noFill();
      stroke(255, 255, 255, 18);
      strokeWeight(0.4 / SIM.zoom);
      circle(px, py, m.dist * 2);
    }
    noStroke();
    fill(m.color[0], m.color[1], m.color[2]);
    circle(mx, my, m.size * 2);
  }
}

function drawAsteroidBelt(dt) {
  noStroke();
  for (const a of asteroids) {
    a.theta += a.omega * dt * 0.05;
    const x = cos(a.theta) * a.a;
    const y = sin(a.theta) * a.a + a.tilt;
    fill(a.shade, a.shade * 0.9, a.shade * 0.7, 180);
    circle(x, y, a.r);
  }
}

function drawKuiperBelt(dt) {
  noStroke();
  for (const k of kuiper) {
    k.theta += k.omega * dt * 0.05;
    const x = cos(k.theta) * k.a;
    const y = sin(k.theta) * k.a;
    fill(k.shade, k.shade, k.shade * 1.1, 140);
    circle(x, y, k.r);
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function mousePressed() {
  SIM.dragging = true;
  SIM.dragStartX = mouseX;
  SIM.dragStartY = mouseY;
  SIM.panStartX = SIM.panX;
  SIM.panStartY = SIM.panY;
}

function mouseDragged() {
  if (!SIM.dragging) return;
  SIM.panX = SIM.panStartX + (mouseX - SIM.dragStartX);
  SIM.panY = SIM.panStartY + (mouseY - SIM.dragStartY);
}

function mouseReleased() {
  SIM.dragging = false;
}

function mouseWheel(event) {
  const factor = event.delta > 0 ? 0.92 : 1.08;
  SIM.zoom = constrain(SIM.zoom * factor, 0.25, 6);
  return false; // prevent page scroll
}

function keyPressed() {
  if (key === " ") SIM.paused = !SIM.paused;
  else if (key === "r" || key === "R") {
    SIM.panX = 0;
    SIM.panY = 0;
    SIM.zoom = 1;
    SIM.timeScale = 1;
    SIM.paused = false;
  } else if (key === "l" || key === "L") {
    SIM.showOrbits = !SIM.showOrbits;
  } else if (key === "+" || key === "=") {
    SIM.timeScale = Math.min(SIM.timeScale * 1.4, 16);
  } else if (key === "-" || key === "_") {
    SIM.timeScale = Math.max(SIM.timeScale / 1.4, 0.1);
  }
}

// expose the p5 globals (only needed so linters / TS skim find them)
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.mousePressed = mousePressed;
window.mouseDragged = mouseDragged;
window.mouseReleased = mouseReleased;
window.mouseWheel = mouseWheel;
window.keyPressed = keyPressed;
