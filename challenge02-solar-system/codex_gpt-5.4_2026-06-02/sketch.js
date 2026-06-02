const AU = 52;
const BASE_SPEED = 0.0009;
const STAR_COUNT = 920;
const NEBULA_COUNT = 8;
const ASTEROID_COUNT = 240;

const stars = [];
const nebulas = [];
const asteroidBelt = [];

const view = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
};

const state = {
  speedMultiplier: 1,
  showLabels: true,
};

const hud = {
  speedValue: null,
  zoomValue: null,
  focusValue: null,
};

const planets = [
  {
    name: "Mercury",
    orbitRadius: 0.39 * AU,
    radius: 4.4,
    colour: "#b8ada3",
    orbitDays: 88,
    glow: "#e6d5c2",
    moons: [],
  },
  {
    name: "Venus",
    orbitRadius: 0.72 * AU,
    radius: 6.2,
    colour: "#d8b469",
    orbitDays: 225,
    glow: "#ffe0a1",
    moons: [],
  },
  {
    name: "Earth",
    orbitRadius: 1 * AU,
    radius: 6.5,
    colour: "#4d8cff",
    orbitDays: 365,
    glow: "#93c6ff",
    moons: [
      { name: "Moon", orbitRadius: 16, radius: 2.1, orbitDays: 27, colour: "#d9e0e6" },
    ],
  },
  {
    name: "Mars",
    orbitRadius: 1.52 * AU,
    radius: 5.1,
    colour: "#be6548",
    orbitDays: 687,
    glow: "#ef9b75",
    moons: [
      { name: "Phobos", orbitRadius: 10, radius: 1.1, orbitDays: 0.32, colour: "#b3aba3" },
      { name: "Deimos", orbitRadius: 14, radius: 0.9, orbitDays: 1.26, colour: "#8d847c" },
    ],
  },
  {
    name: "Jupiter",
    orbitRadius: 5.2 * AU,
    radius: 17,
    colour: "#d9a977",
    orbitDays: 4333,
    glow: "#ffd5a9",
    bands: ["#b5774a", "#d8b08a", "#f1d1ae"],
    moons: [
      { name: "Io", orbitRadius: 28, radius: 2, orbitDays: 1.77, colour: "#ffe39b" },
      { name: "Europa", orbitRadius: 34, radius: 1.8, orbitDays: 3.55, colour: "#dcd4be" },
      { name: "Ganymede", orbitRadius: 41, radius: 2.4, orbitDays: 7.15, colour: "#9f8e82" },
    ],
  },
  {
    name: "Saturn",
    orbitRadius: 9.58 * AU,
    radius: 15,
    colour: "#d7c08f",
    orbitDays: 10759,
    glow: "#f8e4be",
    ring: { inner: 19, outer: 31, tilt: 0.34, colour: "#d8c7a2" },
    moons: [
      { name: "Titan", orbitRadius: 34, radius: 2.3, orbitDays: 16, colour: "#e5bc65" },
      { name: "Enceladus", orbitRadius: 24, radius: 1.3, orbitDays: 1.37, colour: "#e4eef6" },
    ],
  },
  {
    name: "Uranus",
    orbitRadius: 19.22 * AU,
    radius: 11.5,
    colour: "#88d9dd",
    orbitDays: 30687,
    glow: "#bef8ff",
    ring: { inner: 14, outer: 19, tilt: 1.2, colour: "#aacfd4" },
    moons: [],
  },
  {
    name: "Neptune",
    orbitRadius: 30.05 * AU,
    radius: 11.2,
    colour: "#496cf2",
    orbitDays: 60190,
    glow: "#9bb1ff",
    moons: [{ name: "Triton", orbitRadius: 21, radius: 1.8, orbitDays: 5.88, colour: "#d5d7e0" }],
  },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(RADIANS);
  imageMode(CENTER);
  initialiseHud();
  generateScene();
  updateHud();
}

function draw() {
  paintBackdrop();

  push();
  translate(width / 2 + view.offsetX, height / 2 + view.offsetY);
  scale(view.zoom);

  drawStars();
  drawSun();
  drawAsteroidBelt();

  for (const planet of planets) {
    drawOrbitTrack(planet.orbitRadius);
  }

  for (const planet of planets) {
    drawPlanetSystem(planet);
  }

  pop();

  drawLegend();
}

function initialiseHud() {
  hud.speedValue = document.getElementById("speed-value");
  hud.zoomValue = document.getElementById("zoom-value");
  hud.focusValue = document.getElementById("focus-value");

  document.getElementById("slower").addEventListener("click", () => {
    state.speedMultiplier = max(0.25, round((state.speedMultiplier - 0.25) * 100) / 100);
    updateHud();
  });

  document.getElementById("faster").addEventListener("click", () => {
    state.speedMultiplier = min(4, round((state.speedMultiplier + 0.25) * 100) / 100);
    updateHud();
  });

  document.getElementById("toggle-labels").addEventListener("click", () => {
    state.showLabels = !state.showLabels;
  });

  document.getElementById("reset-view").addEventListener("click", () => {
    view.zoom = 1;
    view.offsetX = 0;
    view.offsetY = 0;
    updateHud();
  });
}

function generateScene() {
  stars.length = 0;
  nebulas.length = 0;
  asteroidBelt.length = 0;

  for (let index = 0; index < STAR_COUNT; index += 1) {
    stars.push({
      x: random(-width * 1.5, width * 1.5),
      y: random(-height * 1.5, height * 1.5),
      size: random(0.5, 2.8),
      twinkleOffset: random(TWO_PI),
      alpha: random(90, 255),
    });
  }

  for (let index = 0; index < NEBULA_COUNT; index += 1) {
    nebulas.push({
      x: random(width * 0.1, width * 0.9),
      y: random(height * 0.08, height * 0.88),
      size: random(180, 420),
      hue: random([
        color(72, 140, 255, 20),
        color(48, 203, 184, 18),
        color(255, 163, 102, 18),
      ]),
    });
  }

  for (let index = 0; index < ASTEROID_COUNT; index += 1) {
    asteroidBelt.push({
      angle: random(TWO_PI),
      distance: random(2.15 * AU, 3.35 * AU),
      size: random(0.8, 2),
      offset: random(TWO_PI),
    });
  }
}

function paintBackdrop() {
  background(3, 6, 12);

  noStroke();
  for (const nebula of nebulas) {
    fill(nebula.hue);
    circle(nebula.x, nebula.y, nebula.size);
  }
}

function drawStars() {
  noStroke();
  const pulse = frameCount * 0.018;

  for (const star of stars) {
    const twinkle = 0.65 + 0.35 * sin(pulse + star.twinkleOffset);
    fill(255, 255, 255, star.alpha * twinkle);
    circle(star.x, star.y, star.size * twinkle);
  }
}

function drawSun() {
  const haloPulse = 18 + sin(frameCount * 0.03) * 4;

  noStroke();
  for (let ring = 5; ring >= 1; ring -= 1) {
    fill(255, 180, 70, 16 * ring);
    circle(0, 0, 88 + ring * haloPulse);
  }

  fill(255, 242, 170);
  circle(0, 0, 54);

  fill(255, 205, 84, 220);
  circle(0, 0, 42);

  fill(255, 245, 220, 220);
  circle(-8, -8, 12);
}

function drawAsteroidBelt() {
  noStroke();
  const time = frameCount * BASE_SPEED * state.speedMultiplier * 4;

  for (const asteroid of asteroidBelt) {
    const angle = asteroid.angle + time + asteroid.offset * 0.05;
    const x = cos(angle) * asteroid.distance;
    const y = sin(angle) * asteroid.distance * 0.9;
    fill(168, 151, 132, 110);
    circle(x, y, asteroid.size);
  }
}

function drawOrbitTrack(radius) {
  noFill();
  stroke(120, 180, 255, 34);
  strokeWeight(1 / view.zoom);
  ellipse(0, 0, radius * 2, radius * 2 * 0.92);
}

function drawPlanetSystem(planet) {
  const orbitAngle = frameCount * BASE_SPEED * state.speedMultiplier * (365 / planet.orbitDays);
  const planetX = cos(orbitAngle) * planet.orbitRadius;
  const planetY = sin(orbitAngle) * planet.orbitRadius * 0.92;

  push();
  translate(planetX, planetY);

  drawPlanetGlow(planet);
  if (planet.ring) {
    drawRing(planet.ring);
  }
  drawPlanetBody(planet);
  drawMoons(planet);

  if (state.showLabels) {
    drawBodyLabel(planet.name, 0, planet.radius + 18);
  }

  pop();
}

function drawPlanetGlow(planet) {
  noStroke();
  fill(hexToRgb(planet.glow, 0.18));
  circle(0, 0, planet.radius * 4.2);
}

function drawPlanetBody(planet) {
  noStroke();
  fill(planet.colour);
  circle(0, 0, planet.radius * 2);

  if (planet.bands) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, planet.radius, 0, Math.PI * 2);
    drawingContext.clip();

    for (let index = 0; index < planet.bands.length; index += 1) {
      fill(planet.bands[index]);
      const bandY = map(index, 0, planet.bands.length - 1, -planet.radius * 0.55, planet.radius * 0.55);
      rectMode(CENTER);
      rect(0, bandY, planet.radius * 2.1, planet.radius * 0.35, planet.radius * 0.1);
    }

    drawingContext.restore();
    pop();
  }

  fill(255, 255, 255, 38);
  circle(-planet.radius * 0.28, -planet.radius * 0.32, planet.radius * 0.56);
}

function drawRing(ring) {
  push();
  rotate(ring.tilt);
  noFill();
  stroke(hexToRgb(ring.colour, 0.78));
  strokeWeight(3 / view.zoom);
  ellipse(0, 0, ring.outer * 2, ring.outer * 0.65);
  stroke(hexToRgb(ring.colour, 0.34));
  strokeWeight(6 / view.zoom);
  ellipse(0, 0, ring.inner * 2, ring.inner * 0.62);
  pop();
}

function drawMoons(planet) {
  const baseAngle = frameCount * BASE_SPEED * state.speedMultiplier;

  for (const moon of planet.moons) {
    const moonAngle = baseAngle * (365 / moon.orbitDays) * 0.55;
    const moonX = cos(moonAngle) * moon.orbitRadius;
    const moonY = sin(moonAngle) * moon.orbitRadius * 0.8;

    noFill();
    stroke(220, 230, 255, 32);
    strokeWeight(0.8 / view.zoom);
    ellipse(0, 0, moon.orbitRadius * 2, moon.orbitRadius * 1.6);

    noStroke();
    fill(moon.colour);
    circle(moonX, moonY, moon.radius * 2);
  }
}

function drawBodyLabel(label, x, y) {
  textSize(12 / view.zoom);
  const labelWidth = textWidth(label) + 16 / view.zoom;
  const labelHeight = 22 / view.zoom;

  noStroke();
  fill(6, 10, 20, 165);
  rectMode(CENTER);
  rect(x, y, labelWidth, labelHeight, 999 / view.zoom);
  fill(236, 246, 255);
  textAlign(CENTER, CENTER);
  text(label, x, y - 1 / view.zoom);
}

function drawLegend() {
  fill(255, 255, 255, 150);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text(
    "Approximate orbital ordering with stylised scaling for visibility",
    20,
    height - 28,
  );
}

function mousePressed(event) {
  if (event && event.target && event.target.tagName !== "CANVAS") {
    return;
  }

  view.dragging = true;
  view.lastMouseX = mouseX;
  view.lastMouseY = mouseY;
}

function mouseDragged() {
  if (!view.dragging) {
    return;
  }

  view.offsetX += mouseX - view.lastMouseX;
  view.offsetY += mouseY - view.lastMouseY;
  view.lastMouseX = mouseX;
  view.lastMouseY = mouseY;
  updateHud();
}

function mouseReleased() {
  view.dragging = false;
}

function mouseWheel(event) {
  const nextZoom = constrain(view.zoom * (event.delta > 0 ? 0.92 : 1.08), 0.45, 2.8);
  view.zoom = nextZoom;
  updateHud();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateScene();
}

function updateHud() {
  if (!hud.speedValue || !hud.zoomValue || !hud.focusValue) {
    return;
  }

  hud.speedValue.textContent = `${state.speedMultiplier.toFixed(2)}x`;
  hud.zoomValue.textContent = `${view.zoom.toFixed(2)}x`;
  hud.focusValue.textContent =
    view.offsetX === 0 && view.offsetY === 0 ? "Sun-centred" : "Custom pan";
}

function hexToRgb(hex, alpha) {
  const value = hex.replace("#", "");
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return color(red, green, blue, alpha * 255);
}
