// Solar system simulation in p5.js.
//
// Scale model:
// - Orbital periods are real (in Earth years), animated at `SECONDS_PER_YEAR` for 1x speed.
// - Distances use a square-root compression of the real semi-major axes (AU), so the
//   ordering and relative spacing are preserved while Neptune still fits on screen.
// - Planet radii use a power-law compression of real radii (Earth radii); the Sun is
//   drawn much smaller than true scale, otherwise it would swallow the inner planets.

const SECONDS_PER_YEAR = 10;
const MOON_TIME_SCALE = 0.2; // slow moons down so their orbits read clearly
const SUN_RADIUS = 34;

const auToPixels = (au) => 70 + 95 * Math.sqrt(au);
const earthRadiiToPixels = (re) => 3.2 * Math.pow(re, 0.62);

const PLANETS = [
  { name: "Mercury", au: 0.387, years: 0.241, radius: 0.383, colours: ["#c9c2b8", "#6f665d"], tilt: 0 },
  { name: "Venus", au: 0.723, years: 0.615, radius: 0.949, colours: ["#f5dfa8", "#b58a43"], tilt: 0 },
  {
    name: "Earth", au: 1.0, years: 1.0, radius: 1.0, colours: ["#8fd3ff", "#1f5fa8"], tilt: 0,
    moons: [{ name: "Moon", distance: 9, days: 27.3, radius: 1.3, colour: "#d8d8d8" }],
  },
  {
    name: "Mars", au: 1.524, years: 1.881, radius: 0.532, colours: ["#ff9a6b", "#9c3b1b"], tilt: 0,
    moons: [
      { name: "Phobos", distance: 5, days: 0.32, radius: 0.7, colour: "#b3a497" },
      { name: "Deimos", distance: 7.5, days: 1.26, radius: 0.6, colour: "#a89a8c" },
    ],
  },
  {
    name: "Jupiter", au: 5.203, years: 11.86, radius: 11.21, colours: ["#f1d2a4", "#a0683a"], bands: true, tilt: 0,
    moons: [
      { name: "Io", distance: 22, days: 1.77, radius: 1.3, colour: "#f3e38a" },
      { name: "Europa", distance: 27, days: 3.55, radius: 1.1, colour: "#e8dcc6" },
      { name: "Ganymede", distance: 33, days: 7.15, radius: 1.6, colour: "#b8a996" },
      { name: "Callisto", distance: 40, days: 16.69, radius: 1.5, colour: "#8d8074" },
    ],
  },
  {
    name: "Saturn", au: 9.537, years: 29.45, radius: 9.45, colours: ["#f6e2b0", "#b89350"], bands: true,
    rings: { inner: 1.3, outer: 2.25, colour: [226, 206, 160] }, tilt: 0.45,
    moons: [{ name: "Titan", distance: 38, days: 15.95, radius: 1.5, colour: "#e0b26a" }],
  },
  {
    name: "Uranus", au: 19.19, years: 84.01, radius: 4.01, colours: ["#c8f4f6", "#5fb3c2"],
    rings: { inner: 1.5, outer: 1.9, colour: [180, 220, 230] }, tilt: 1.45,
    moons: [{ name: "Titania", distance: 15, days: 8.71, radius: 1.0, colour: "#c9c3bb" }],
  },
  {
    name: "Neptune", au: 30.07, years: 164.8, radius: 3.88, colours: ["#8fb3ff", "#2a48b8"], tilt: 0,
    moons: [{ name: "Triton", distance: 14, days: -5.88, radius: 1.0, colour: "#d6cfc9" }], // retrograde
  },
];

const state = {
  zoom: 1,
  panX: 0,
  panY: 0,
  speed: 1,
  paused: false,
  showLabels: true,
  showOrbits: true,
  showTrails: true,
  followIndex: -1,
  simYears: 0,
};

let planets = [];
let stars = [];
let asteroids = [];
let kuiper = [];
let comet;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  textFont("system-ui");

  planets = PLANETS.map((p, i) => ({
    ...p,
    orbit: auToPixels(p.au),
    size: earthRadiiToPixels(p.radius),
    phase: (i * 2.39996) % TWO_PI, // golden-angle spread so planets don't line up at start
    trail: [],
    moons: (p.moons || []).map((m, j) => ({ ...m, phase: j * 1.7 })),
  }));

  stars = Array.from({ length: 700 }, () => ({
    x: random(-1, 1),
    y: random(-1, 1),
    depth: random(0.05, 0.4),
    size: random(0.4, 1.8),
    twinkle: random(TWO_PI),
    tint: random([[255, 255, 255], [200, 215, 255], [255, 235, 210], [255, 210, 200]]),
  }));

  asteroids = makeBelt(1100, 2.1, 3.3);
  kuiper = makeBelt(900, 32, 48);

  comet = { a: 17.8, e: 0.967 * 0.9, years: 75.3, phase: 0.7, tiltAngle: -0.6 };

  fitToScreen();
}

function makeBelt(count, minAu, maxAu) {
  return Array.from({ length: count }, () => {
    const au = random(minAu, maxAu);
    return {
      orbit: auToPixels(au) + randomGaussian(0, 2),
      years: Math.pow(au, 1.5), // Kepler's third law
      phase: random(TWO_PI),
      size: random(0.6, 1.8),
      shade: random(110, 190),
    };
  });
}

function fitToScreen() {
  const outer = auToPixels(34);
  state.zoom = Math.min(width, height) / (2 * outer) * 1.05;
  state.panX = 0;
  state.panY = 0;
  state.followIndex = -1;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------------------------------------------------------- update

function update() {
  if (state.paused) return;
  const dt = Math.min(deltaTime, 50) / 1000;
  state.simYears += (dt * state.speed) / SECONDS_PER_YEAR;

  for (const p of planets) {
    p.angle = p.phase + (TWO_PI * state.simYears) / p.years;
    p.x = Math.cos(p.angle) * p.orbit;
    p.y = Math.sin(p.angle) * p.orbit;
    p.trail.push({ x: p.x, y: p.y });
    const maxTrail = 90;
    if (p.trail.length > maxTrail) p.trail.shift();

    for (const m of p.moons) {
      const moonYears = m.days / 365.25 / MOON_TIME_SCALE;
      m.angle = m.phase + (TWO_PI * state.simYears) / moonYears;
      m.x = p.x + Math.cos(m.angle) * (p.size + m.distance);
      m.y = p.y + Math.sin(m.angle) * (p.size + m.distance);
    }
  }
}

// Position on an ellipse with the Sun at a focus (Kepler's equation solved by Newton iteration).
function cometPosition(years) {
  const meanAnomaly = TWO_PI * (years / comet.years) + comet.phase;
  let E = meanAnomaly;
  for (let i = 0; i < 8; i++) E -= (E - comet.e * Math.sin(E) - meanAnomaly) / (1 - comet.e * Math.cos(E));
  const xAu = comet.a * (Math.cos(E) - comet.e);
  const yAu = comet.a * Math.sqrt(1 - comet.e * comet.e) * Math.sin(E);
  const rAu = Math.hypot(xAu, yAu);
  const theta = Math.atan2(yAu, xAu) + comet.tiltAngle;
  const r = auToPixels(rAu) - 70 + SUN_RADIUS * 0.8;
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r, rAu };
}

// ---------------------------------------------------------------- draw

function draw() {
  update();
  if (state.followIndex >= 0) {
    const target = planets[state.followIndex];
    state.panX = lerp(state.panX, -target.x * state.zoom, 0.15);
    state.panY = lerp(state.panY, -target.y * state.zoom, 0.15);
  }

  background(2, 3, 10);
  drawNebula();
  drawStars();

  push();
  translate(width / 2 + state.panX, height / 2 + state.panY);
  scale(state.zoom);

  if (state.showOrbits) drawOrbits();
  drawBelt(asteroids, [170, 150, 130]);
  drawBelt(kuiper, [140, 160, 200], 0.55);
  drawComet();
  if (state.showTrails) drawTrails();
  drawSun();
  for (const p of planets) drawPlanet(p);
  pop();

  if (state.showLabels) drawLabels();
  drawHud();
}

function drawNebula() {
  const ctx = drawingContext;
  const g = ctx.createRadialGradient(width * 0.75, height * 0.2, 0, width * 0.75, height * 0.2, Math.max(width, height) * 0.7);
  g.addColorStop(0, "rgba(60, 30, 90, 0.18)");
  g.addColorStop(0.5, "rgba(20, 30, 70, 0.10)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawStars() {
  noStroke();
  const t = millis() / 1000;
  const span = Math.max(width, height);
  for (const s of stars) {
    // Mild parallax: distant stars drift slowly as the camera pans.
    let x = width / 2 + s.x * span * 0.6 + state.panX * s.depth * 0.2;
    let y = height / 2 + s.y * span * 0.6 + state.panY * s.depth * 0.2;
    x = ((x % width) + width) % width;
    y = ((y % height) + height) % height;
    const a = 140 + 115 * Math.sin(t * (1 + s.depth * 4) + s.twinkle);
    fill(s.tint[0], s.tint[1], s.tint[2], a);
    circle(x, y, s.size);
  }
}

function drawOrbits() {
  noFill();
  strokeWeight(1 / state.zoom);
  for (const p of planets) {
    stroke(120, 140, 220, 45);
    circle(0, 0, p.orbit * 2);
  }
}

function drawBelt(belt, rgb, alpha = 1) {
  noStroke();
  const sizeScale = 1 / Math.sqrt(state.zoom);
  for (const a of belt) {
    const angle = a.phase + (TWO_PI * state.simYears) / a.years;
    const shade = a.shade / 170;
    fill(rgb[0] * shade, rgb[1] * shade, rgb[2] * shade, 200 * alpha);
    circle(Math.cos(angle) * a.orbit, Math.sin(angle) * a.orbit, a.size * sizeScale);
  }
}

function drawComet() {
  const pos = cometPosition(state.simYears);
  const ctx = drawingContext;
  // The tail points away from the Sun and grows as the comet approaches perihelion.
  const tailLength = constrain(260 / (pos.rAu + 0.6), 6, 180);
  const dir = Math.atan2(pos.y, pos.x);
  const tx = pos.x + Math.cos(dir) * tailLength;
  const ty = pos.y + Math.sin(dir) * tailLength;
  const g = ctx.createLinearGradient(pos.x, pos.y, tx, ty);
  g.addColorStop(0, "rgba(180, 230, 255, 0.75)");
  g.addColorStop(1, "rgba(180, 230, 255, 0)");
  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(190, 235, 255, 0.9)";
  ctx.fillStyle = "#eaf8ff";
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 1.8, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

function drawTrails() {
  noFill();
  strokeWeight(1.5 / state.zoom);
  for (const p of planets) {
    const c = color(p.colours[0]);
    for (let i = 1; i < p.trail.length; i++) {
      const a = p.trail[i - 1];
      const b = p.trail[i];
      stroke(red(c), green(c), blue(c), (i / p.trail.length) * 120);
      line(a.x, a.y, b.x, b.y);
    }
  }
}

function drawSun() {
  const ctx = drawingContext;
  const pulse = 1 + 0.03 * Math.sin(millis() / 600);

  // Corona: layered radial gradients.
  const corona = ctx.createRadialGradient(0, 0, SUN_RADIUS * 0.6, 0, 0, SUN_RADIUS * 4 * pulse);
  corona.addColorStop(0, "rgba(255, 200, 80, 0.55)");
  corona.addColorStop(0.3, "rgba(255, 140, 30, 0.18)");
  corona.addColorStop(1, "rgba(255, 100, 0, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS * 4 * pulse, 0, TWO_PI);
  ctx.fill();

  const body = ctx.createRadialGradient(-SUN_RADIUS * 0.3, -SUN_RADIUS * 0.3, 2, 0, 0, SUN_RADIUS);
  body.addColorStop(0, "#fffbe0");
  body.addColorStop(0.5, "#ffd35a");
  body.addColorStop(1, "#ff8a1c");
  ctx.save();
  ctx.shadowBlur = 60;
  ctx.shadowColor = "rgba(255, 170, 40, 0.9)";
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, SUN_RADIUS, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
}

function drawRings(p, frontHalf) {
  if (!p.rings) return;
  const ctx = drawingContext;
  const squash = 0.35;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  ctx.scale(1, squash);
  // Draw only the half behind or in front of the planet so the planet body occludes correctly.
  ctx.beginPath();
  if (frontHalf) ctx.rect(-p.size * 3, 0, p.size * 6, p.size * 3);
  else ctx.rect(-p.size * 3, -p.size * 3, p.size * 6, p.size * 3);
  ctx.clip();
  const [r, g, b] = p.rings.colour;
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const radius = p.size * lerp(p.rings.inner, p.rings.outer, t);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.25 + 0.35 * Math.sin(t * Math.PI)})`;
    ctx.lineWidth = (p.size * (p.rings.outer - p.rings.inner)) / steps;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TWO_PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanet(p) {
  const ctx = drawingContext;

  for (const m of p.moons) drawMoonOrbit(p, m);
  drawRings(p, false);

  // Lit from the Sun: gradient highlight offset toward the origin.
  const toSun = Math.atan2(-p.y, -p.x);
  const hx = p.x + Math.cos(toSun) * p.size * 0.5;
  const hy = p.y + Math.sin(toSun) * p.size * 0.5;
  const shading = ctx.createRadialGradient(hx, hy, p.size * 0.1, p.x, p.y, p.size * 1.1);
  shading.addColorStop(0, p.colours[0]);
  shading.addColorStop(0.7, p.colours[1]);
  shading.addColorStop(1, "#05060c");

  ctx.save();
  ctx.shadowBlur = p.size * 1.6;
  ctx.shadowColor = p.colours[0];
  ctx.fillStyle = shading;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  if (p.bands) drawBands(p);
  drawRings(p, true);

  for (const m of p.moons) drawMoon(m);
}

function drawBands(p) {
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
  ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = p.colours[1];
  for (let i = -3; i <= 3; i += 2) {
    ctx.fillRect(p.x - p.size, p.y + (i * p.size) / 4 - p.size * 0.06, p.size * 2, p.size * 0.14);
  }
  ctx.restore();
}

function drawMoonOrbit(p, m) {
  if (!state.showOrbits) return;
  noFill();
  stroke(200, 200, 230, 30);
  strokeWeight(0.6 / state.zoom);
  circle(p.x, p.y, (p.size + m.distance) * 2);
}

function drawMoon(m) {
  noStroke();
  fill(m.colour);
  drawingContext.save();
  drawingContext.shadowBlur = 4;
  drawingContext.shadowColor = m.colour;
  circle(m.x, m.y, m.radius * 2);
  drawingContext.restore();
}

// ---------------------------------------------------------------- overlay (screen space)

function worldToScreen(x, y) {
  return { x: width / 2 + state.panX + x * state.zoom, y: height / 2 + state.panY + y * state.zoom };
}

function drawLabels() {
  textSize(12);
  textAlign(CENTER, TOP);
  noStroke();
  for (const p of planets) {
    const s = worldToScreen(p.x, p.y);
    fill(220, 230, 255, 210);
    text(p.name, s.x, s.y + p.size * state.zoom + 6);
    if (state.zoom > 3) {
      textSize(10);
      fill(190, 200, 230, 170);
      for (const m of p.moons) {
        const ms = worldToScreen(m.x, m.y);
        text(m.name, ms.x, ms.y + m.radius * state.zoom + 3);
      }
      textSize(12);
    }
  }
}

function drawHud() {
  const years = state.simYears;
  const followed = state.followIndex >= 0 ? planets[state.followIndex].name : "Sun";
  noStroke();
  fill(207, 216, 255, 220);
  textAlign(LEFT, TOP);
  textSize(13);
  text(
    `Year ${years.toFixed(2)}   ·   speed ${state.speed}x${state.paused ? " (paused)" : ""}   ·   zoom ${state.zoom.toFixed(2)}   ·   centre: ${followed} (keys 0-8)`,
    14,
    14,
  );
}

// ---------------------------------------------------------------- interaction

function mouseDragged() {
  state.followIndex = -1;
  state.panX += movedX;
  state.panY += movedY;
}

function mouseWheel(event) {
  const factor = Math.exp(-event.delta * 0.0015);
  const newZoom = constrain(state.zoom * factor, 0.15, 40);
  // Zoom around the cursor: keep the world point under the mouse fixed.
  const cx = mouseX - width / 2;
  const cy = mouseY - height / 2;
  state.panX = cx - ((cx - state.panX) * newZoom) / state.zoom;
  state.panY = cy - ((cy - state.panY) * newZoom) / state.zoom;
  state.zoom = newZoom;
  return false;
}

function keyPressed() {
  if (key === " ") state.paused = !state.paused;
  else if (key === "+" || key === "=") state.speed = Math.min(64, state.speed * 2);
  else if (key === "-" || key === "_") state.speed = Math.max(0.125, state.speed / 2);
  else if (key === "l" || key === "L") state.showLabels = !state.showLabels;
  else if (key === "o" || key === "O") state.showOrbits = !state.showOrbits;
  else if (key === "t" || key === "T") state.showTrails = !state.showTrails;
  else if (key === "r" || key === "R") fitToScreen();
  else if (key >= "0" && key <= "8") {
    state.followIndex = Number(key) - 1;
    if (state.followIndex < 0) {
      state.panX = 0;
      state.panY = 0;
    } else {
      state.zoom = Math.max(state.zoom, 3);
    }
  }
  return key === " " ? false : undefined;
}
