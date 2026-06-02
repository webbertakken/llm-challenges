const AU_RADIUS = 66;
const BASE_YEAR_SECONDS = 18;
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 3.4;

const planets = [
  {
    name: "Mercury",
    colour: "#b7a48a",
    distance: 0.39,
    year: 0.241,
    radius: 4,
    start: 0.5,
    trail: []
  },
  {
    name: "Venus",
    colour: "#e3bd75",
    distance: 0.72,
    year: 0.615,
    radius: 7,
    start: 2.4,
    trail: []
  },
  {
    name: "Earth",
    colour: "#61a7ff",
    distance: 1,
    year: 1,
    radius: 8,
    start: 3.7,
    moons: [{ name: "Moon", radius: 2.2, distance: 16, period: 0.074, colour: "#d9d7cb" }],
    trail: []
  },
  {
    name: "Mars",
    colour: "#c46b45",
    distance: 1.52,
    year: 1.881,
    radius: 5.5,
    start: 1.2,
    moons: [
      { name: "Phobos", radius: 1.2, distance: 11, period: 0.021, colour: "#b7a08e" },
      { name: "Deimos", radius: 0.9, distance: 16, period: 0.069, colour: "#9c8f84" }
    ],
    trail: []
  },
  {
    name: "Jupiter",
    colour: "#d7a06f",
    distance: 5.2,
    year: 11.86,
    radius: 19,
    start: 5.1,
    bands: ["#f0cf9f", "#a76e4e", "#ede2cd"],
    moons: [
      { name: "Io", radius: 1.8, distance: 27, period: 0.0048, colour: "#f2d578" },
      { name: "Europa", radius: 1.6, distance: 34, period: 0.0097, colour: "#d8d3c8" },
      { name: "Ganymede", radius: 2.3, distance: 43, period: 0.0196, colour: "#a99b88" },
      { name: "Callisto", radius: 2.1, distance: 55, period: 0.0458, colour: "#8c8175" }
    ],
    trail: []
  },
  {
    name: "Saturn",
    colour: "#dfc187",
    distance: 9.58,
    year: 29.45,
    radius: 16,
    start: 0.1,
    ring: { inner: 21, outer: 34, colour: "#d6c391" },
    moons: [{ name: "Titan", radius: 2.1, distance: 46, period: 0.0438, colour: "#d29b54" }],
    trail: []
  },
  {
    name: "Uranus",
    colour: "#82d7df",
    distance: 19.2,
    year: 84,
    radius: 12,
    start: 4.6,
    ring: { inner: 15, outer: 20, colour: "#8ecdd2" },
    trail: []
  },
  {
    name: "Neptune",
    colour: "#5275e7",
    distance: 30.05,
    year: 164.8,
    radius: 12,
    start: 2.8,
    moons: [{ name: "Triton", radius: 1.8, distance: 25, period: 0.016, colour: "#bcc9df" }],
    trail: []
  }
];

const asteroidBelt = [];
const stars = [];
let simulationDays = 0;
let speedMultiplier = 1;
let paused = false;
let zoomLevel = 1;
let cameraOffset;
let dragStart;
let dragOrigin;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  cameraOffset = createVector(0, 0);
  createStars();
  createAsteroids();
}

function draw() {
  drawSpace();

  if (!paused) {
    const elapsedSeconds = deltaTime / 1000;
    simulationDays += elapsedSeconds * speedMultiplier * (365 / BASE_YEAR_SECONDS);
  }

  push();
  translate(width / 2 + cameraOffset.x, height / 2 + cameraOffset.y);
  scale(zoomLevel);
  drawSun();
  drawAsteroidBelt();
  drawPlanets();
  pop();
}

function drawSpace() {
  background(3, 4, 10);
  noStroke();

  for (const star of stars) {
    const pulse = sin(frameCount * star.twinkle + star.phase) * 0.45 + 0.75;
    fill(255, 255, 255, 160 * pulse);
    circle(star.x, star.y, star.size);
  }

  const glow = drawingContext.createRadialGradient(
    width / 2,
    height / 2,
    20,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );
  glow.addColorStop(0, "rgba(66, 87, 145, 0.24)");
  glow.addColorStop(0.42, "rgba(22, 28, 62, 0.11)");
  glow.addColorStop(1, "rgba(3, 4, 10, 0)");
  drawingContext.fillStyle = glow;
  rect(0, 0, width, height);
}

function drawSun() {
  for (let size = 82; size >= 28; size -= 14) {
    const alpha = map(size, 82, 28, 24, 210);
    fill(255, 145, 34, alpha);
    circle(0, 0, size);
  }

  fill("#ffd36a");
  circle(0, 0, 31);
  fill(255, 236, 160, 170);
  circle(-5, -6, 9);
}

function drawPlanets() {
  for (const planet of planets) {
    const orbitRadius = orbitDistance(planet.distance);
    drawOrbit(orbitRadius);

    const angle = planet.start + (TWO_PI * simulationDays) / (planet.year * 365);
    const x = cos(angle) * orbitRadius;
    const y = sin(angle) * orbitRadius * 0.985;
    updateTrail(planet, x, y);
    drawTrail(planet.trail, planet.colour);

    push();
    translate(x, y);
    rotate(angle * 0.18);
    drawPlanet(planet);
    drawMoons(planet);
    pop();
  }
}

function drawPlanet(planet) {
  if (planet.ring) drawRing(planet.ring);

  noStroke();
  fill(planet.colour);
  circle(0, 0, planet.radius * 2);

  if (planet.bands) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, planet.radius, 0, Math.PI * 2);
    drawingContext.clip();
    noStroke();
    for (let index = 0; index < planet.bands.length; index += 1) {
      fill(planet.bands[index]);
      rect(-planet.radius, -planet.radius + index * 7, planet.radius * 2, 3.2);
    }
    drawingContext.restore();
    pop();
  }

  fill(255, 255, 255, 58);
  circle(-planet.radius * 0.35, -planet.radius * 0.42, planet.radius * 0.58);
}

function drawRing(ring) {
  push();
  rotate(-0.38);
  noFill();
  strokeWeight(2);
  stroke(`${ring.colour}99`);
  ellipse(0, 0, ring.outer * 2.1, ring.outer * 0.8);
  stroke(`${ring.colour}55`);
  ellipse(0, 0, ring.inner * 2.1, ring.inner * 0.78);
  pop();
}

function drawMoons(planet) {
  if (!planet.moons) return;

  for (const moon of planet.moons) {
    const angle = (TWO_PI * simulationDays) / (moon.period * 365);
    const x = cos(angle) * moon.distance;
    const y = sin(angle) * moon.distance * 0.72;

    noFill();
    stroke(255, 255, 255, 24);
    strokeWeight(0.8);
    ellipse(0, 0, moon.distance * 2, moon.distance * 1.44);

    noStroke();
    fill(moon.colour);
    circle(x, y, moon.radius * 2);
  }
}

function drawOrbit(radius) {
  noFill();
  stroke(255, 255, 255, 34);
  strokeWeight(1 / zoomLevel);
  ellipse(0, 0, radius * 2, radius * 1.97);
}

function drawTrail(trail, colour) {
  noFill();
  beginShape();
  for (let index = 0; index < trail.length; index += 1) {
    const point = trail[index];
    const alpha = map(index, 0, trail.length - 1, 0, 95);
    stroke(`${colour}${hex(Math.floor(alpha), 2)}`);
    strokeWeight(2 / zoomLevel);
    vertex(point.x, point.y);
  }
  endShape();
}

function drawAsteroidBelt() {
  noStroke();
  for (const rock of asteroidBelt) {
    const angle = rock.angle + simulationDays * rock.speed;
    const x = cos(angle) * rock.radius;
    const y = sin(angle) * rock.radius * 0.985;
    fill(rock.shade, rock.alpha);
    circle(x, y, rock.size);
  }
}

function createStars() {
  stars.length = 0;
  const starCount = Math.floor((windowWidth * windowHeight) / 5300);
  for (let index = 0; index < starCount; index += 1) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(0.7, 2.6),
      twinkle: random(0.008, 0.025),
      phase: random(TWO_PI)
    });
  }
}

function createAsteroids() {
  asteroidBelt.length = 0;
  for (let index = 0; index < 420; index += 1) {
    asteroidBelt.push({
      angle: random(TWO_PI),
      radius: random(orbitDistance(2.15), orbitDistance(3.35)),
      size: random(0.8, 2.2),
      speed: random(0.00018, 0.0005),
      shade: random(115, 188),
      alpha: random(52, 135)
    });
  }
}

function orbitDistance(astronomicalUnits) {
  return Math.log1p(astronomicalUnits * 1.7) * AU_RADIUS + astronomicalUnits * 7;
}

function updateTrail(planet, x, y) {
  planet.trail.push({ x, y });
  const maximumTrailLength = planet.distance > 9 ? 92 : 150;
  if (planet.trail.length > maximumTrailLength) planet.trail.shift();
}

function mousePressed() {
  dragStart = createVector(mouseX, mouseY);
  dragOrigin = cameraOffset.copy();
}

function mouseDragged() {
  if (!dragStart || !dragOrigin) return;
  cameraOffset = p5.Vector.add(dragOrigin, createVector(mouseX - dragStart.x, mouseY - dragStart.y));
}

function mouseWheel(event) {
  const nextZoom = zoomLevel * (event.delta > 0 ? 0.92 : 1.08);
  zoomLevel = constrain(nextZoom, MIN_ZOOM, MAX_ZOOM);
  return false;
}

function keyPressed() {
  if (key === " ") paused = !paused;
  if (key === "r" || key === "R") resetView();
  if (key === "1") speedMultiplier = 0.35;
  if (key === "2") speedMultiplier = 1;
  if (key === "3") speedMultiplier = 2.5;
  if (key === "4") speedMultiplier = 6;
}

function resetView() {
  zoomLevel = 1;
  speedMultiplier = 1;
  cameraOffset.set(0, 0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createStars();
}
