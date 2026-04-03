// ─── Solar System Simulation ───────────────────────────────────────────────────

const PLANET_DATA = [
  { name: "Mercury", distance: 0.39, size: 0.38, speed: 4.15,  color: [169, 169, 169], moons: [] },
  { name: "Venus",   distance: 0.72, size: 0.95, speed: 1.62,  color: [255, 198, 73],  moons: [] },
  { name: "Earth",   distance: 1.00, size: 1.00, speed: 1.00,  color: [66, 133, 244],  moons: [{ size: 0.27, distance: 2.5, speed: 13.4, color: [200, 200, 200] }] },
  { name: "Mars",    distance: 1.52, size: 0.53, speed: 0.53,  color: [193, 68, 14],   moons: [{ size: 0.1, distance: 2.0, speed: 20, color: [180, 160, 140] }, { size: 0.08, distance: 3.0, speed: 14, color: [170, 150, 130] }] },
  { name: "Jupiter", distance: 5.20, size: 11.2, speed: 0.084, color: [201, 144, 57],  moons: [{ size: 0.29, distance: 1.8, speed: 8, color: [250, 220, 120] }, { size: 0.25, distance: 2.4, speed: 5, color: [200, 180, 150] }, { size: 0.41, distance: 3.2, speed: 3, color: [180, 170, 160] }, { size: 0.39, distance: 4.2, speed: 1.5, color: [150, 140, 130] }] },
  { name: "Saturn",  distance: 9.58, size: 9.45, speed: 0.034, color: [234, 214, 158], moons: [{ size: 0.4, distance: 3.0, speed: 4, color: [240, 210, 140] }, { size: 0.15, distance: 4.5, speed: 2, color: [180, 170, 160] }], rings: true },
  { name: "Uranus",  distance: 19.2, size: 4.01, speed: 0.012, color: [141, 210, 218], moons: [{ size: 0.12, distance: 2.5, speed: 5, color: [180, 200, 210] }] },
  { name: "Neptune", distance: 30.1, size: 3.88, speed: 0.006, color: [62, 84, 232],   moons: [{ size: 0.21, distance: 2.8, speed: 6, color: [200, 200, 220] }] },
];

const ASTEROID_COUNT = 400;
const STAR_COUNT = 800;

let stars = [];
let asteroids = [];
let cam = { x: 0, y: 0, zoom: 1 };
let dragging = false;
let dragStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };
let time = 0;

function scaleDistance(au) {
  // Compress outer planets so everything fits nicely
  return 60 + au * 28;
}

function scaleSize(relative) {
  // Clamp planet sizes to a visible but proportional range
  return map(pow(relative, 0.5), pow(0.38, 0.5), pow(11.2, 0.5), 3, 22);
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Pre-generate starfield
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: random(-2000, 2000),
      y: random(-2000, 2000),
      brightness: random(100, 255),
      size: random(0.5, 2.5),
      twinkleSpeed: random(0.01, 0.05),
      twinkleOffset: random(TWO_PI),
    });
  }

  // Pre-generate asteroid belt (between Mars and Jupiter)
  let beltInner = scaleDistance(2.1);
  let beltOuter = scaleDistance(3.3);
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    let r = random(beltInner, beltOuter);
    asteroids.push({
      angle: random(TWO_PI),
      radius: r,
      speed: random(0.0003, 0.0008),
      size: random(0.5, 2),
      brightness: random(80, 160),
    });
  }
}

function draw() {
  background(5, 5, 15);

  let speed = 0.002;
  time += speed;

  push();
  translate(width / 2 + cam.x, height / 2 + cam.y);
  scale(cam.zoom);

  drawStars();
  drawSun();
  drawOrbits();
  drawAsteroidBelt();
  drawPlanets();

  pop();

  drawHUD();
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    let twinkle = sin(frameCount * s.twinkleSpeed + s.twinkleOffset);
    let alpha = s.brightness * map(twinkle, -1, 1, 0.4, 1.0);
    fill(255, 255, 240, alpha);
    circle(s.x, s.y, s.size);
  }
}

function drawSun() {
  noStroke();

  // Outer glow layers
  let glowLayers = [
    { size: 120, alpha: 8,  color: [255, 100, 0] },
    { size: 80,  alpha: 15, color: [255, 140, 0] },
    { size: 55,  alpha: 25, color: [255, 180, 30] },
    { size: 38,  alpha: 40, color: [255, 200, 50] },
  ];

  for (let g of glowLayers) {
    let pulse = sin(time * 3) * 3;
    fill(g.color[0], g.color[1], g.color[2], g.alpha);
    circle(0, 0, g.size + pulse);
  }

  // Sun body
  fill(255, 220, 60);
  circle(0, 0, 28);

  // Bright core
  fill(255, 255, 200, 200);
  circle(0, 0, 14);
}

function drawOrbits() {
  noFill();
  stroke(255, 255, 255, 15);
  strokeWeight(0.5);
  for (let p of PLANET_DATA) {
    let r = scaleDistance(p.distance);
    circle(0, 0, r * 2);
  }
}

function drawAsteroidBelt() {
  noStroke();
  for (let a of asteroids) {
    a.angle += a.speed;
    let x = cos(a.angle) * a.radius;
    let y = sin(a.angle) * a.radius;
    fill(a.brightness, a.brightness * 0.9, a.brightness * 0.7, 150);
    circle(x, y, a.size);
  }
}

function drawPlanets() {
  for (let p of PLANET_DATA) {
    let orbitR = scaleDistance(p.distance);
    let angle = time * p.speed;
    let px = cos(angle) * orbitR;
    let py = sin(angle) * orbitR;

    push();
    translate(px, py);

    let r = scaleSize(p.size);

    // Planet glow
    noStroke();
    fill(p.color[0], p.color[1], p.color[2], 30);
    circle(0, 0, r * 4);
    fill(p.color[0], p.color[1], p.color[2], 50);
    circle(0, 0, r * 2.5);

    // Saturn rings
    if (p.rings) {
      drawRings(r);
    }

    // Planet body
    fill(p.color[0], p.color[1], p.color[2]);
    circle(0, 0, r * 2);

    // Highlight
    fill(255, 255, 255, 40);
    circle(-r * 0.25, -r * 0.25, r * 1.2);

    // Moons
    for (let m of p.moons) {
      let moonOrbitR = r + m.distance * r * 0.5;
      let moonAngle = time * m.speed;
      let mx = cos(moonAngle) * moonOrbitR;
      let my = sin(moonAngle) * moonOrbitR;

      // Moon orbit trace
      noFill();
      stroke(255, 255, 255, 10);
      strokeWeight(0.3);
      circle(0, 0, moonOrbitR * 2);

      // Moon body
      noStroke();
      let moonSize = max(1.5, m.size * r * 0.3);
      fill(m.color[0], m.color[1], m.color[2]);
      circle(mx, my, moonSize);
    }

    // Planet label
    fill(255, 255, 255, 140);
    noStroke();
    textAlign(CENTER);
    textSize(max(8, 10 / cam.zoom));
    text(p.name, 0, r + 12);

    pop();
  }
}

function drawRings(planetRadius) {
  noFill();
  strokeWeight(0.8);
  let ringCount = 6;
  for (let i = 0; i < ringCount; i++) {
    let rr = planetRadius * 1.4 + i * 2.5;
    let alpha = map(i, 0, ringCount - 1, 120, 40);
    stroke(210, 190, 140, alpha);

    push();
    // Tilt the rings
    scale(1, 0.35);
    circle(0, 0, rr * 2);
    pop();
  }
}

function drawHUD() {
  fill(255, 255, 255, 100);
  noStroke();
  textAlign(LEFT);
  textSize(12);
  text("Scroll to zoom | Drag to pan", 12, height - 14);
}

// ─── Interaction ───────────────────────────────────────────────────────────────

function mousePressed() {
  dragging = true;
  dragStart.x = mouseX;
  dragStart.y = mouseY;
  camStart.x = cam.x;
  camStart.y = cam.y;
}

function mouseDragged() {
  if (dragging) {
    cam.x = camStart.x + (mouseX - dragStart.x);
    cam.y = camStart.y + (mouseY - dragStart.y);
  }
}

function mouseReleased() {
  dragging = false;
}

function mouseWheel(event) {
  let zoomFactor = 0.05;
  if (event.delta > 0) {
    cam.zoom *= (1 - zoomFactor);
  } else {
    cam.zoom *= (1 + zoomFactor);
  }
  cam.zoom = constrain(cam.zoom, 0.1, 10);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
