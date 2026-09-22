"use strict";

/**
 * Top-down orrery.
 * Screen distance is a logarithmic map of true AU so all eight planets fit;
 * the readout and the orbital periods stay on the real numbers.
 * Moon periods keep their real order but are compressed so a fast moon
 * such as Phobos does not become a blur.
 */

const SECONDS_PER_YEAR = 12;
const FIT_FRACTION = 0.46;
const CLEARANCE_FRACTION = 0.07;
const EARTH_FRACTION = 0.0058;
const SIZE_EXP = 0.45;
const LOG_OFFSET = 0.32;
const MERCURY_AU = 0.3871;
const NEPTUNE_AU = 30.11;

const SUN_SPOTS = [
  { x: -0.28, y: -0.12, rx: 0.16, ry: 0.1 },
  { x: 0.22, y: -0.28, rx: 0.1, ry: 0.08 },
  { x: 0.34, y: 0.16, rx: 0.14, ry: 0.09 },
  { x: -0.08, y: 0.3, rx: 0.12, ry: 0.07 },
  { x: 0.05, y: 0.02, rx: 0.08, ry: 0.06 },
];

const planets = [
  {
    name: "Mercury",
    au: 0.3871,
    radiusEarth: 0.383,
    periodYears: 0.2408,
    eccentricity: 0.2056,
    color: [168, 160, 150],
    phase: 0.55,
    spin: 2.4,
    moons: [],
  },
  {
    name: "Venus",
    au: 0.7233,
    radiusEarth: 0.949,
    periodYears: 0.6152,
    eccentricity: 0.0068,
    color: [214, 186, 122],
    phase: 2.15,
    spin: -0.9,
    atmosphere: "rgba(230, 200, 130, 0.22)",
    moons: [],
  },
  {
    name: "Earth",
    au: 1,
    radiusEarth: 1,
    periodYears: 1,
    eccentricity: 0.0167,
    color: [58, 118, 196],
    phase: 3.55,
    spin: 3.1,
    atmosphere: "rgba(90, 160, 255, 0.28)",
    moons: [
      {
        name: "Moon",
        radiusEarth: 0.2727,
        periodDays: 27.32,
        color: [196, 196, 188],
        phase: 0.8,
      },
    ],
  },
  {
    name: "Mars",
    au: 1.5237,
    radiusEarth: 0.532,
    periodYears: 1.8808,
    eccentricity: 0.0934,
    color: [186, 92, 52],
    phase: 5.05,
    spin: 2.8,
    moons: [
      {
        name: "Phobos",
        radiusEarth: 0.018,
        periodDays: 0.319,
        color: [150, 130, 114],
        phase: 0.3,
      },
      {
        name: "Deimos",
        radiusEarth: 0.012,
        periodDays: 1.263,
        color: [164, 150, 136],
        phase: 2.4,
      },
    ],
  },
  {
    name: "Jupiter",
    au: 5.2026,
    radiusEarth: 11.209,
    periodYears: 11.862,
    eccentricity: 0.0489,
    color: [214, 170, 122],
    phase: 1.05,
    spin: 6.5,
    atmosphere: "rgba(255, 190, 130, 0.12)",
    moons: [
      { name: "Io", radiusEarth: 0.286, periodDays: 1.769, color: [214, 196, 92], phase: 0.4 },
      { name: "Europa", radiusEarth: 0.245, periodDays: 3.551, color: [214, 206, 186], phase: 1.7 },
      { name: "Ganymede", radiusEarth: 0.413, periodDays: 7.155, color: [150, 134, 112], phase: 3.2 },
      { name: "Callisto", radiusEarth: 0.378, periodDays: 16.69, color: [110, 98, 86], phase: 4.6 },
    ],
  },
  {
    name: "Saturn",
    au: 9.5549,
    radiusEarth: 9.449,
    periodYears: 29.447,
    eccentricity: 0.0565,
    color: [224, 202, 156],
    phase: 4.15,
    spin: 5.4,
    atmosphere: "rgba(230, 210, 170, 0.12)",
    rings: {
      rotation: -0.55,
      flatten: 0.38,
      bands: [
        { inner: 1.2, outer: 1.42, color: [160, 140, 108, 0.28] },
        { inner: 1.5, outer: 1.95, color: [236, 216, 176, 0.78] },
        { inner: 2.12, outer: 2.42, color: [210, 190, 154, 0.55] },
      ],
    },
    moons: [
      { name: "Rhea", radiusEarth: 0.12, periodDays: 4.52, color: [196, 190, 180], phase: 1.1 },
      { name: "Titan", radiusEarth: 0.404, periodDays: 15.95, color: [196, 150, 72], phase: 2.8 },
    ],
  },
  {
    name: "Uranus",
    au: 19.218,
    radiusEarth: 4.007,
    periodYears: 84.017,
    eccentricity: 0.0457,
    color: [168, 214, 214],
    phase: 2.55,
    spin: -2.2,
    atmosphere: "rgba(180, 230, 230, 0.16)",
    rings: {
      rotation: 1.15,
      flatten: 0.09,
      bands: [
        { inner: 1.55, outer: 1.68, color: [190, 230, 228, 0.7] },
        { inner: 1.85, outer: 1.94, color: [170, 210, 214, 0.45] },
      ],
    },
    moons: [],
  },
  {
    name: "Neptune",
    au: 30.11,
    radiusEarth: 3.883,
    periodYears: 164.79,
    eccentricity: 0.0113,
    color: [52, 92, 210],
    phase: 5.7,
    spin: 3.4,
    atmosphere: "rgba(80, 120, 255, 0.2)",
    moons: [
      {
        name: "Triton",
        radiusEarth: 0.212,
        periodDays: 5.877,
        retrograde: true,
        color: [186, 196, 206],
        phase: 2.2,
      },
    ],
  },
];

for (const planet of planets) {
  planet.angle = planet.phase;
  planet.trail = [];
  planet.key = planet.name;
  for (const moon of planet.moons) {
    moon.angle = moon.phase;
    moon.rate = moonRate(moon.periodDays, Boolean(moon.retrograde));
    moon.key = "moon:" + planet.name + ":" + moon.name;
  }
}

const comet = {
  name: "Halley",
  key: "Halley",
  au: 9.6,
  eccentricity: 0.985,
  periodYears: 16,
  color: [210, 226, 236],
  angle: 2.4,
  trail: [],
};

let stars = [];
let asteroids = [];
let kuiper = [];

let camera = { x: 0, y: 0, zoom: 1 };
let zoomGoal = null;
let speed = 4;
let paused = false;
let showLabels = true;
let showOrbits = true;
let showHud = true;
let followName = null;
let timeYears = 0;
let dragMoved = 0;
let frameMetrics = null;
let legend = { x: 0, y: 0, w: 0, h: 0, rows: [] };
let hoveredKey = null;
let pendingFocus = null;

function setup() {
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.elt.style.display = "block";
  angleMode(RADIANS);
  ellipseMode(CENTER);
  const status = document.getElementById("status");
  if (status) status.remove();
  paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rng = mulberry32(20260922);
  stars = makeStars(rng, 340);
  asteroids = makeBelt(rng, 460, 2.15, 3.35, false);
  kuiper = makeBelt(rng, 170, 32, 46, true);
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash === "Sun" || hash === "Halley" || planets.some((planet) => planet.name === hash)) {
    pendingFocus = hash;
  }
  if (typeof describe === "function") {
    describe(
      "Animated top-down solar system. Eight planets orbit the Sun at different speeds, with moons, Saturn and Uranus rings, an asteroid belt, and a comet. Scroll to zoom, drag to pan, click a planet to follow it.",
    );
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  frameMetrics = makeMetrics();
  if (pendingFocus) {
    snapFocus(pendingFocus);
    pendingFocus = null;
  }
  const realDt = Math.min(typeof deltaTime === "number" ? deltaTime : 16, 80) / 1000;
  if (!paused) {
    const years = (realDt * speed) / SECONDS_PER_YEAR;
    timeYears += years;
    advance(years);
  }
  easeCamera(realDt);

  background(5, 7, 15);
  drawMilkyWay();
  drawStars();

  const view = viewOrigin();
  push();
  translate(view.x + camera.x, view.y + camera.y);
  scale(camera.zoom);

  drawSunGlow();
  if (showOrbits) drawAllOrbits();
  drawBelt(kuiper);
  drawBelt(asteroids);
  drawComet();
  drawSunBody();
  for (let i = planets.length - 1; i >= 0; i -= 1) drawPlanet(planets[i]);

  pop();

  drawVignette();
  hoveredKey = pickAt(mouseX, mouseY);
  if (showLabels) drawLabels();
  if (showHud) drawHud();
  cursor(dragMoved > 5 ? "grabbing" : hoveredKey ? "pointer" : "default");
}

function narrowLayout() {
  return showHud && width < 780;
}

function viewOrigin() {
  if (!narrowLayout()) return { x: width / 2, y: height / 2 };
  // Sit the orrery under the legend so a tall phone still shows every orbit.
  return { x: width / 2, y: height * 0.58 };
}

function makeMetrics() {
  const minDim = narrowLayout()
    ? Math.max(220, Math.min(width - 36, height * 0.62))
    : Math.max(320, Math.min(width, height));
  return {
    fit: minDim * (narrowLayout() ? 0.42 : FIT_FRACTION),
    clearance: minDim * CLEARANCE_FRACTION,
    earthPx: minDim * (narrowLayout() ? 0.011 : EARTH_FRACTION),
  };
}

function mapAu(au) {
  const f = (value) => Math.log(Math.max(value, 0.02) + LOG_OFFSET);
  const t = (f(au) - f(MERCURY_AU)) / (f(NEPTUNE_AU) - f(MERCURY_AU));
  return frameMetrics.clearance + t * (frameMetrics.fit - frameMetrics.clearance);
}

function trueAu(semiMajor, eccentricity, angle) {
  const e = eccentricity;
  return (semiMajor * (1 - e * e)) / (1 + e * Math.cos(angle));
}

function orbitPosition(semiMajor, eccentricity, angle) {
  const au = trueAu(semiMajor, eccentricity, angle);
  const r = mapAu(au);
  return { x: Math.cos(angle) * r, y: -Math.sin(angle) * r, au };
}

function bodyRadius(radiusEarth) {
  return Math.pow(radiusEarth, SIZE_EXP) * frameMetrics.earthPx;
}

function sunRadius() {
  const proportional = bodyRadius(109.2);
  const cap = mapAu(MERCURY_AU) * 0.52;
  const floor = bodyRadius(11.209) * 1.55;
  return Math.max(floor, Math.min(proportional, cap));
}

function neighborGap(au) {
  const here = mapAu(au);
  let gap = here;
  for (const planet of planets) {
    if (Math.abs(planet.au - au) < 1e-4) continue;
    gap = Math.min(gap, Math.abs(mapAu(planet.au) - here));
  }
  return gap;
}

function moonOrbitRadii(planet, planetR) {
  const count = planet.moons.length;
  if (count === 0) return [];
  const gap = neighborGap(planet.au);
  const minReach = planetR * 2.05;
  const maxReach = Math.min(planetR * 3.5, Math.max(minReach + planetR * 0.35, gap * 0.42));
  return planet.moons.map((_, index) => {
    if (count === 1) return (minReach + maxReach) * 0.55;
    const t = index / (count - 1);
    return minReach + (maxReach - minReach) * t;
  });
}

function moonBodyRadius(moon, parentR) {
  const raw = bodyRadius(Math.max(moon.radiusEarth, 0.04));
  const minScreen = 1.25 / camera.zoom;
  return Math.max(minScreen, Math.min(raw, parentR * 0.38));
}

function worldOf(key) {
  if (key === "Sun") return { x: 0, y: 0, au: 0 };
  if (key === comet.key) return orbitPosition(comet.au, comet.eccentricity, comet.angle);
  for (const planet of planets) {
    const pos = orbitPosition(planet.au, planet.eccentricity, planet.angle);
    if (planet.key === key) return pos;
    const orbits = moonOrbitRadii(planet, bodyRadius(planet.radiusEarth));
    for (let i = 0; i < planet.moons.length; i += 1) {
      const moon = planet.moons[i];
      if (moon.key !== key) continue;
      const local = moonLocal(moon, orbits[i]);
      return { x: pos.x + local.x, y: pos.y + local.y, au: pos.au };
    }
  }
  return null;
}

function radiusOf(key) {
  if (key === "Sun") return sunRadius();
  if (key === comet.key) return 2.6;
  for (const planet of planets) {
    const planetR = bodyRadius(planet.radiusEarth);
    if (planet.key === key) return planetR;
    for (const moon of planet.moons) {
      if (moon.key === key) return moonBodyRadius(moon, planetR);
    }
  }
  return 0;
}

function moonLocal(moon, orbitR) {
  return {
    x: Math.cos(moon.angle) * orbitR,
    y: -Math.sin(moon.angle) * orbitR,
  };
}

function advance(years) {
  for (const planet of planets) {
    planet.angle += ((Math.PI * 2) / planet.periodYears) * years;
    if (frameCount % 2 === 0) pushTrail(planet.trail, planet.angle);
    for (const moon of planet.moons) moon.angle += moon.rate * years;
  }
  for (const rock of asteroids) rock.angle += ((Math.PI * 2) / rock.period) * years;
  for (const rock of kuiper) rock.angle += ((Math.PI * 2) / rock.period) * years;
  comet.angle += ((Math.PI * 2) / comet.periodYears) * years;
  if (frameCount % 2 === 0) pushTrail(comet.trail, comet.angle);
}

function pushTrail(trail, angle) {
  trail.push(angle);
  if (trail.length > 22) trail.shift();
}

function easeCamera(realDt) {
  const k = 1 - Math.exp(-realDt * 7);
  if (zoomGoal != null) {
    camera.zoom += (zoomGoal - camera.zoom) * k;
    if (Math.abs(camera.zoom - zoomGoal) < 0.004) zoomGoal = null;
  }
  if (!followName) return;
  const pos = worldOf(followName);
  if (!pos) return;
  const desiredX = -pos.x * camera.zoom;
  const desiredY = -pos.y * camera.zoom;
  camera.x += (desiredX - camera.x) * k;
  camera.y += (desiredY - camera.y) * k;
}

function drawMilkyWay() {
  push();
  translate(width * 0.5, height * 0.48);
  rotate(-0.6);
  noStroke();
  for (let i = 5; i >= 1; i -= 1) {
    fill(150, 170, 220, 4 + i);
    ellipse(0, 0, width * 1.5, 18 + i * 22);
  }
  pop();
}

function drawStars() {
  for (const star of stars) {
    const x = wrap(star.u * width + camera.x * 0.03 * star.depth, width);
    const y = wrap(star.v * height + camera.y * 0.03 * star.depth, height);
    const twinkle = 0.55 + 0.45 * Math.sin(millis() * 0.0015 + star.phase);
    const alpha = (90 + 150 * star.depth) * twinkle;
    stroke(star.color[0], star.color[1], star.color[2], alpha);
    strokeWeight(star.size);
    point(x, y);
    if (star.size > 1.6) {
      stroke(255, 255, 255, alpha * 0.45);
      strokeWeight(1);
      line(x - 3, y, x + 3, y);
      line(x, y - 3, x, y + 3);
    }
  }
}

function drawSunGlow() {
  const radius = sunRadius();
  const pulse = 1 + Math.sin(timeYears * 9) * 0.04;
  drawingContext.save();
  drawingContext.globalCompositeOperation = "lighter";
  const glow = drawingContext.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 5.2 * pulse);
  glow.addColorStop(0, "rgba(255, 220, 140, 0.95)");
  glow.addColorStop(0.18, "rgba(255, 150, 40, 0.35)");
  glow.addColorStop(0.45, "rgba(255, 80, 20, 0.08)");
  glow.addColorStop(1, "rgba(255, 40, 0, 0)");
  drawingContext.fillStyle = glow;
  drawingContext.beginPath();
  drawingContext.arc(0, 0, radius * 5.2 * pulse, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.restore();
}

function drawSunBody() {
  const radius = sunRadius();
  const photo = drawingContext.createRadialGradient(
    -radius * 0.28,
    -radius * 0.3,
    radius * 0.08,
    0,
    0,
    radius,
  );
  photo.addColorStop(0, "#fffaf0");
  photo.addColorStop(0.35, "#ffd56a");
  photo.addColorStop(0.78, "#ff9a2a");
  photo.addColorStop(1, "#e25a12");
  drawingContext.fillStyle = photo;
  drawingContext.beginPath();
  drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
  drawingContext.fill();

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
  drawingContext.clip();
  drawingContext.rotate(timeYears * 0.35);
  for (const spot of SUN_SPOTS) {
    drawingContext.fillStyle = "rgba(180, 60, 12, 0.28)";
    drawingContext.beginPath();
    drawingContext.ellipse(spot.x * radius, spot.y * radius, spot.rx * radius, spot.ry * radius, 0, 0, Math.PI * 2);
    drawingContext.fill();
  }
  drawingContext.restore();
}

function drawAllOrbits() {
  noFill();
  for (const planet of planets) {
    stroke(planet.color[0], planet.color[1], planet.color[2], 54);
    strokeWeight(1 / camera.zoom);
    drawOrbitPath(planet.au, planet.eccentricity);
  }
  stroke(180, 200, 220, 40);
  strokeWeight(1 / camera.zoom);
  drawOrbitPath(comet.au, comet.eccentricity);
}

function drawOrbitPath(semiMajor, eccentricity) {
  beginShape();
  const steps = 180;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const pos = orbitPosition(semiMajor, eccentricity, angle);
    vertex(pos.x, pos.y);
  }
  endShape();
}

function drawBelt(rocks) {
  for (const rock of rocks) {
    const pos = orbitPosition(rock.au, rock.eccentricity, rock.angle);
    stroke(rock.color[0], rock.color[1], rock.color[2], rock.alpha);
    strokeWeight(rock.size / camera.zoom);
    point(pos.x, pos.y);
  }
}

function drawComet() {
  const pos = orbitPosition(comet.au, comet.eccentricity, comet.angle);
  drawTrail(comet.au, comet.eccentricity, comet.trail, "170, 198, 214");
  const away = Math.atan2(pos.y, pos.x);
  const tail = (38 + (1 - Math.min(pos.au, 2) / 2) * 70) ;
  const steps = 18;
  for (let i = steps; i >= 1; i -= 1) {
    const t = i / steps;
    const hot = Math.max(0, 1 - pos.au / 1.4);
    const x = pos.x + Math.cos(away) * tail * t;
    const y = pos.y + Math.sin(away) * tail * t;
    const radius = (1.2 + (1 - t) * 5.5) * (0.65 + hot);
    const alpha = 0.28 * (1 - t);
    const red = Math.round(170 + hot * 70);
    drawingContext.fillStyle = "rgba(" + red + ", 210, 230, " + alpha + ")";
    drawingContext.beginPath();
    drawingContext.arc(x, y, radius, 0, Math.PI * 2);
    drawingContext.fill();
  }
  drawingContext.save();
  drawingContext.translate(pos.x, pos.y);
  drawSphere(2.5 + (pos.au < 1 ? 1.4 : 0), [236, 244, 250], pos.x, pos.y, null);
  drawingContext.restore();
}

function drawPlanet(planet) {
  const pos = orbitPosition(planet.au, planet.eccentricity, planet.angle);
  const radius = bodyRadius(planet.radiusEarth);
  drawTrail(planet.au, planet.eccentricity, planet.trail, planet.color.join(", "));

  push();
  translate(pos.x, pos.y);
  if (planet.atmosphere) {
    drawingContext.fillStyle = planet.atmosphere;
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius * 1.22, 0, Math.PI * 2);
    drawingContext.fill();
  }
  if (planet.rings) drawRings(planet.rings, radius);
  drawSphere(radius, planet.color, pos.x, pos.y, (spin) => paintSurface(planet, radius, spin));
  if (planet.rings) drawRingShadow(planet.rings, radius);
  drawMoons(planet, radius, pos);
  pop();
}

function drawRings(rings, radius) {
  drawingContext.save();
  drawingContext.rotate(rings.rotation);
  drawingContext.scale(1, rings.flatten);
  for (const band of rings.bands) {
    fillAnnulus(radius * band.inner, radius * band.outer, css(band.color));
  }
  drawingContext.restore();
}

function drawRingShadow(rings, radius) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
  drawingContext.clip();
  drawingContext.rotate(rings.rotation);
  drawingContext.scale(1, rings.flatten);
  drawingContext.fillStyle = "rgba(0, 0, 0, 0.22)";
  drawingContext.fillRect(-radius, -radius * 0.07, radius * 2, radius * 0.14);
  drawingContext.restore();
}

function fillAnnulus(innerR, outerR, color) {
  drawingContext.beginPath();
  drawingContext.ellipse(0, 0, outerR, outerR, 0, 0, Math.PI * 2);
  drawingContext.ellipse(0, 0, innerR, innerR, 0, 0, Math.PI * 2, true);
  drawingContext.fillStyle = color;
  drawingContext.fill("evenodd");
}

function drawSphere(radius, rgb, worldX, worldY, paint) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, radius, 0, Math.PI * 2);
  drawingContext.clip();
  drawingContext.fillStyle = css(rgb);
  drawingContext.fillRect(-radius - 1, -radius - 1, radius * 2 + 2, radius * 2 + 2);
  if (paint) {
    drawingContext.save();
    paint(timeYears);
    drawingContext.restore();
  }
  const angle = Math.atan2(-worldY, -worldX);
  const lx = Math.cos(angle) * radius;
  const ly = Math.sin(angle) * radius;
  const shade = drawingContext.createLinearGradient(lx, ly, -lx, -ly);
  shade.addColorStop(0, "rgba(255,255,255,0.32)");
  shade.addColorStop(0.38, "rgba(255,255,255,0)");
  shade.addColorStop(0.62, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.66)");
  drawingContext.fillStyle = shade;
  drawingContext.fillRect(-radius, -radius, radius * 2, radius * 2);
  const spec = drawingContext.createRadialGradient(lx * 0.42, ly * 0.42, 0, lx * 0.42, ly * 0.42, radius * 0.55);
  spec.addColorStop(0, "rgba(255,255,255,0.38)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  drawingContext.fillStyle = spec;
  drawingContext.fillRect(-radius, -radius, radius * 2, radius * 2);
  drawingContext.restore();
}

function paintSurface(planet, radius, years) {
  const spin = years * planet.spin;
  if (planet.name === "Mercury") paintCraters(radius, spin, "rgba(90, 84, 78, 0.45)");
  else if (planet.name === "Venus") paintBands(radius, spin, ["rgba(196, 160, 96, 0.35)", "rgba(230, 206, 150, 0.28)"]);
  else if (planet.name === "Earth") paintEarth(radius, spin);
  else if (planet.name === "Mars") paintMars(radius, spin);
  else if (planet.name === "Jupiter") paintJupiter(radius, spin);
  else if (planet.name === "Saturn") paintBands(radius, spin, ["rgba(190, 150, 96, 0.28)", "rgba(236, 214, 176, 0.22)"]);
  else if (planet.name === "Uranus") paintBands(radius, spin, ["rgba(120, 180, 186, 0.25)"]);
  else if (planet.name === "Neptune") paintNeptune(radius, spin);
}

function paintCraters(radius, spin, color) {
  drawingContext.rotate(spin);
  const craters = [
    [-0.2, -0.15, 0.22],
    [0.28, 0.1, 0.14],
    [-0.05, 0.32, 0.16],
    [0.12, -0.34, 0.1],
  ];
  drawingContext.fillStyle = color;
  for (const crater of craters) {
    drawingContext.beginPath();
    drawingContext.arc(crater[0] * radius, crater[1] * radius, crater[2] * radius, 0, Math.PI * 2);
    drawingContext.fill();
  }
}

function paintBands(radius, spin, colors) {
  drawingContext.rotate(spin * 0.25);
  colors.forEach((color, index) => {
    drawingContext.fillStyle = color;
    const y = -radius + ((index + 1) / (colors.length + 1)) * radius * 2;
    drawingContext.fillRect(-radius, y, radius * 2, radius * 0.16);
  });
}

function paintEarth(radius, spin) {
  drawingContext.save();
  drawingContext.rotate(spin);
  drawingContext.fillStyle = "rgba(62, 140, 78, 0.95)";
  drawingContext.beginPath();
  drawingContext.ellipse(-radius * 0.22, -radius * 0.08, radius * 0.42, radius * 0.26, -0.4, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.beginPath();
  drawingContext.ellipse(radius * 0.32, radius * 0.12, radius * 0.22, radius * 0.34, 0.4, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.beginPath();
  drawingContext.ellipse(-radius * 0.02, radius * 0.42, radius * 0.26, radius * 0.12, 0, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.fillStyle = "rgba(240, 248, 255, 0.85)";
  drawingContext.beginPath();
  drawingContext.ellipse(0, -radius * 0.78, radius * 0.28, radius * 0.1, 0, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.restore();

  drawingContext.save();
  drawingContext.rotate(spin * 1.35);
  drawingContext.fillStyle = "rgba(255, 255, 255, 0.28)";
  drawingContext.beginPath();
  drawingContext.ellipse(radius * 0.1, -radius * 0.28, radius * 0.46, radius * 0.12, 0.2, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.beginPath();
  drawingContext.ellipse(-radius * 0.25, radius * 0.18, radius * 0.24, radius * 0.08, -0.3, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.restore();
}

function paintMars(radius, spin) {
  drawingContext.rotate(spin);
  drawingContext.fillStyle = "rgba(120, 50, 32, 0.55)";
  drawingContext.beginPath();
  drawingContext.ellipse(-radius * 0.1, radius * 0.05, radius * 0.28, radius * 0.18, 0.5, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.fillStyle = "rgba(245, 240, 236, 0.8)";
  drawingContext.beginPath();
  drawingContext.ellipse(0, -radius * 0.72, radius * 0.26, radius * 0.1, 0, 0, Math.PI * 2);
  drawingContext.fill();
}

function paintJupiter(radius, spin) {
  drawingContext.rotate(spin);
  const bands = [
    [-0.55, "rgba(168, 110, 70, 0.55)", 0.14],
    [-0.22, "rgba(236, 206, 166, 0.4)", 0.12],
    [0.08, "rgba(176, 96, 58, 0.5)", 0.16],
    [0.4, "rgba(214, 164, 112, 0.35)", 0.12],
  ];
  for (const band of bands) {
    drawingContext.fillStyle = band[1];
    drawingContext.fillRect(-radius, band[0] * radius, radius * 2, band[2] * radius);
  }
  drawingContext.fillStyle = "rgba(186, 64, 42, 0.85)";
  drawingContext.beginPath();
  drawingContext.ellipse(radius * 0.32, radius * 0.22, radius * 0.26, radius * 0.14, 0, 0, Math.PI * 2);
  drawingContext.fill();
}

function paintNeptune(radius, spin) {
  drawingContext.rotate(spin);
  drawingContext.fillStyle = "rgba(20, 40, 120, 0.45)";
  drawingContext.beginPath();
  drawingContext.ellipse(radius * 0.2, -radius * 0.15, radius * 0.2, radius * 0.12, 0, 0, Math.PI * 2);
  drawingContext.fill();
  drawingContext.fillStyle = "rgba(220, 230, 255, 0.35)";
  drawingContext.fillRect(-radius, radius * 0.35, radius * 2, radius * 0.1);
}

function drawMoons(planet, planetR, planetPos) {
  const orbits = moonOrbitRadii(planet, planetR);
  for (let i = 0; i < planet.moons.length; i += 1) {
    const moon = planet.moons[i];
    const orbitR = orbits[i];
    const local = moonLocal(moon, orbitR);
    if (showOrbits) {
      drawingContext.beginPath();
      drawingContext.strokeStyle = "rgba(200, 210, 230, 0.28)";
      drawingContext.lineWidth = 1 / camera.zoom;
      drawingContext.arc(0, 0, orbitR, 0, Math.PI * 2);
      drawingContext.stroke();
    }
    const radius = moonBodyRadius(moon, planetR);
    drawingContext.save();
    drawingContext.translate(local.x, local.y);
    drawSphere(radius, moon.color, planetPos.x + local.x, planetPos.y + local.y, null);
    drawingContext.restore();
  }
}

function drawTrail(semiMajor, eccentricity, trail, rgb) {
  if (trail.length < 2) return;
  drawingContext.lineCap = "round";
  for (let i = 1; i < trail.length; i += 1) {
    const a = orbitPosition(semiMajor, eccentricity, trail[i - 1]);
    const b = orbitPosition(semiMajor, eccentricity, trail[i]);
    drawingContext.strokeStyle = "rgba(" + rgb + ", " + (i / trail.length) * 0.7 + ")";
    drawingContext.lineWidth = 1.6 / camera.zoom;
    drawingContext.beginPath();
    drawingContext.moveTo(a.x, a.y);
    drawingContext.lineTo(b.x, b.y);
    drawingContext.stroke();
  }
}

function drawVignette() {
  const vignette = drawingContext.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  drawingContext.fillStyle = vignette;
  drawingContext.fillRect(0, 0, width, height);
}

function drawLabels() {
  const items = visibleLabels().sort((a, b) => labelPriority(a) - labelPriority(b));
  const placed = [];
  textFont("sans-serif");
  textSize(12);
  textAlign(LEFT, CENTER);
  for (const item of items) {
    const anchor = labelAnchor(item);
    const tw = textWidth(item.text);
    const labelX = clamp(anchor.x, 8, Math.max(8, width - tw - 10));
    const labelY = clamp(anchor.y, 12, Math.max(12, height - 12));
    if (showHud && insideLegend(labelX, labelY)) continue;
    const box = { x: labelX - 4, y: labelY - 9, w: tw + 8, h: 18 };
    if (placed.some((other) => boxesOverlap(other, box))) continue;
    placed.push(box);
    noStroke();
    fill(5, 7, 15, item.kind === "planet" ? 170 : 120);
    rect(box.x, box.y, box.w, box.h, 4);
    fill(item.kind === "planet" ? 236 : 190);
    text(item.text, labelX, labelY);
  }
}

function labelPriority(item) {
  if (!followName) return item.kind === "planet" ? 0 : 1;
  if (item.key === followName) return 0;
  if (item.key.startsWith("moon:" + followName + ":")) return 1;
  return 2;
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function comfortablyOnScreen(x, y) {
  const screen = worldToScreen(x, y);
  return screen.x >= 56 && screen.y >= 56 && screen.x <= width - 56 && screen.y <= height - 56;
}

function visibleLabels() {
  const items = [];
  if (!followName || followName === "Sun" || comfortablyOnScreen(0, 0)) {
    items.push({ key: "Sun", text: "Sun", x: 0, y: 0, offset: sunRadius() + 8, kind: "planet" });
  }
  for (const planet of planets) {
    const pos = orbitPosition(planet.au, planet.eccentricity, planet.angle);
    const radius = bodyRadius(planet.radiusEarth);
    const nearEdge = followName && planet.key !== followName && !comfortablyOnScreen(pos.x, pos.y);
    if (!nearEdge) {
      items.push({
        key: planet.key,
        text: planet.name,
        x: pos.x,
        y: pos.y,
        offset: radius + 8,
        kind: "planet",
      });
    }
    const showMoons = followName === planet.key || hoveredKey === planet.key || (camera.zoom >= 1.8 && !followName);
    if (!showMoons) continue;
    const orbits = moonOrbitRadii(planet, radius);
    for (let i = 0; i < planet.moons.length; i += 1) {
      const moon = planet.moons[i];
      const local = moonLocal(moon, orbits[i]);
      items.push({
        key: moon.key,
        text: moon.name,
        x: pos.x + local.x,
        y: pos.y + local.y,
        offset: moonBodyRadius(moon, radius) + 7,
        kind: "moon",
      });
    }
  }
  const cometPos = orbitPosition(comet.au, comet.eccentricity, comet.angle);
  if ((camera.zoom >= 1.2 || hoveredKey === comet.key || followName === comet.key) && (!followName || followName === comet.key || comfortablyOnScreen(cometPos.x, cometPos.y))) {
    items.push({
      key: comet.key,
      text: "Halley",
      x: cometPos.x,
      y: cometPos.y,
      offset: 10,
      kind: "moon",
    });
  }
  return items;
}

function labelAnchor(item) {
  const screen = worldToScreen(item.x, item.y);
  if (item.key === "Sun") return { x: screen.x + item.offset, y: screen.y + 2 };
  const sun = worldToScreen(0, 0);
  const dx = screen.x - sun.x;
  const dy = screen.y - sun.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: screen.x + (dx / len) * item.offset, y: screen.y + (dy / len) * item.offset };
}

function drawHud() {
  const narrow = narrowLayout();
  const panelX = 12;
  const panelY = 12;
  const panelW = narrow ? Math.min(168, width - 20) : 236;
  const rowH = narrow || height < 700 ? 18 : 22;
  const rows = [{ key: "Sun", name: "Sun", color: [255, 196, 90] }].concat(
    planets.map((planet) => ({ key: planet.key, name: planet.name, color: planet.color })),
  );
  const header = narrow ? 46 : 58;
  const hints = narrow ? 36 : 78;
  const panelH = header + rows.length * rowH + hints;
  legend = { x: panelX, y: panelY, w: panelW, h: panelH, rows: [] };

  noStroke();
  fill(8, 12, 24, 188);
  rect(panelX, panelY, panelW, panelH, 10);
  fill(228, 177, 90);
  rect(panelX, panelY + 12, 3, panelH - 24, 2);

  fill(236, 230, 214);
  textFont("serif");
  textSize(narrow ? 16 : 20);
  textAlign(LEFT, TOP);
  text("Solar system", panelX + 14, panelY + 10);
  textFont("sans-serif");
  textSize(11);
  fill(168, 178, 198);
  if (!narrow) text("True periods · distances log-scaled", panelX + 14, panelY + 34);

  textSize(13);
  rows.forEach((row, index) => {
    const y = panelY + header + index * rowH;
    legend.rows.push({ key: row.key, y, h: rowH });
    const active = row.key === followName || row.key === hoveredKey;
    if (active) {
      fill(255, 255, 255, 18);
      rect(panelX + 10, y, panelW - 20, rowH - 2, 4);
    }
    fill(row.color[0], row.color[1], row.color[2]);
    circle(panelX + 24, y + rowH * 0.42, 8);
    fill(active ? 255 : 214);
    textAlign(LEFT, CENTER);
    text(row.name, panelX + 36, y + rowH * 0.42);
    if (row.key === followName) {
      textAlign(RIGHT, CENTER);
      fill(228, 177, 90);
      text("follow", panelX + panelW - 16, y + rowH * 0.42);
    }
  });

  const hintY = panelY + header + rows.length * rowH + 6;
  textAlign(LEFT, TOP);
  textSize(11);
  fill(154, 164, 184);
  const rate = paused ? "paused" : speed + "×";
  text("Year " + timeYears.toFixed(2) + "   " + rate, panelX + 14, hintY);
  if (!narrow) {
    text("Scroll zoom · drag pan · click to follow", panelX + 14, hintY + 16);
    text("[ ] speed · space pause · L labels", panelX + 14, hintY + 32);
    text("O orbits · H panel · R reset view", panelX + 14, hintY + 48);
  } else {
    text("Drag pan · tap to follow", panelX + 14, hintY + 16);
  }

  const subject = describeKey(hoveredKey || followName);
  if (!subject) return;
  const cardW = narrow ? Math.min(200, width - 24) : 220;
  const cardX = narrow ? 12 : width - cardW - 16;
  const cardY = narrow ? height - (subject.lines.length * 18 + 40) : 16;
  fill(8, 12, 24, 188);
  rect(cardX, cardY, cardW, subject.lines.length * 18 + 28, 10);
  fill(228, 177, 90);
  textFont("serif");
  textSize(18);
  textAlign(LEFT, TOP);
  text(subject.title, cardX + 14, cardY + 10);
  textFont("sans-serif");
  textSize(12);
  fill(206, 214, 226);
  subject.lines.forEach((line, index) => {
    text(line, cardX + 14, cardY + 36 + index * 18);
  });
}

function describeKey(key) {
  if (!key) return null;
  if (key === "Sun") {
    return { title: "Sun", lines: ["109 Earth radii", "The clock is in Earth years"] };
  }
  if (key === comet.key) {
    const pos = orbitPosition(comet.au, comet.eccentricity, comet.angle);
    return {
      title: "Halley",
      lines: [
        pos.au.toFixed(2) + " AU from the Sun",
        "Halley-like ellipse",
        "Period shortened so a pass is visible",
      ],
    };
  }
  for (const planet of planets) {
    if (planet.key === key) {
      const pos = orbitPosition(planet.au, planet.eccentricity, planet.angle);
      const lines = [
        pos.au.toFixed(3) + " AU · " + formatPeriod(planet.periodYears),
        planet.radiusEarth.toFixed(2) + " Earth radii",
      ];
      if (planet.moons.length) lines.push(planet.moons.map((moon) => moon.name).join(", "));
      return { title: planet.name, lines };
    }
    for (const moon of planet.moons) {
      if (moon.key !== key) continue;
      return {
        title: moon.name,
        lines: [
          "Moon of " + planet.name,
          formatDays(moon.periodDays) + (moon.retrograde ? " · retrograde" : ""),
          moon.radiusEarth.toFixed(3) + " Earth radii",
        ],
      };
    }
  }
  return null;
}

function formatPeriod(years) {
  if (years < 1) return Math.round(years * 365.25) + " days";
  return (years < 10 ? years.toFixed(2) : years.toFixed(1)) + " yr";
}

function formatDays(days) {
  if (days < 2) return days.toFixed(2) + " days";
  return days.toFixed(1) + " days";
}

function insideLegend(x, y) {
  return x >= legend.x && x <= legend.x + legend.w && y >= legend.y - 12 && y <= legend.y + legend.h;
}

function worldToScreen(x, y) {
  const view = viewOrigin();
  return {
    x: view.x + camera.x + x * camera.zoom,
    y: view.y + camera.y + y * camera.zoom,
  };
}

function pickAt(sx, sy) {
  let best = null;
  let bestDist = Infinity;
  const consider = (key, pos, radius) => {
    const screen = worldToScreen(pos.x, pos.y);
    const dist = Math.hypot(screen.x - sx, screen.y - sy);
    const reach = Math.max(14, radius * camera.zoom + 7);
    if (dist <= reach && dist < bestDist) {
      best = key;
      bestDist = dist;
    }
  };
  consider("Sun", { x: 0, y: 0 }, sunRadius());
  for (const planet of planets) {
    const pos = orbitPosition(planet.au, planet.eccentricity, planet.angle);
    const radius = bodyRadius(planet.radiusEarth);
    consider(planet.key, pos, radius);
    const orbits = moonOrbitRadii(planet, radius);
    for (let i = 0; i < planet.moons.length; i += 1) {
      const moon = planet.moons[i];
      const local = moonLocal(moon, orbits[i]);
      consider(moon.key, { x: pos.x + local.x, y: pos.y + local.y }, moonBodyRadius(moon, radius));
    }
  }
  consider(comet.key, orbitPosition(comet.au, comet.eccentricity, comet.angle), 8 / camera.zoom);
  return best;
}

function focusOn(key) {
  followName = key;
  const radius = radiusOf(key);
  if (radius <= 0) return;
  const target = key === "Sun" ? 64 : key.startsWith("moon:") ? 18 : 24;
  zoomGoal = clamp(target / radius, 0.55, 8);
}

function snapFocus(key) {
  followName = key;
  const radius = radiusOf(key);
  const pos = worldOf(key);
  if (!pos || radius <= 0) return;
  const target = key === "Sun" ? 64 : 28;
  camera.zoom = clamp(target / radius, 0.55, 8);
  camera.x = -pos.x * camera.zoom;
  camera.y = -pos.y * camera.zoom;
  zoomGoal = null;
}

function resetView() {
  followName = null;
  zoomGoal = 1;
  camera.x = 0;
  camera.y = 0;
}

function mousePressed() {
  dragMoved = 0;
}

function mouseDragged() {
  dragMoved += Math.abs(mouseX - pmouseX) + Math.abs(mouseY - pmouseY);
  if (dragMoved <= 4) return;
  followName = null;
  zoomGoal = null;
  camera.x += mouseX - pmouseX;
  camera.y += mouseY - pmouseY;
}

function mouseReleased() {
  if (dragMoved > 5) return;
  if (showHud && mouseX >= legend.x && mouseX <= legend.x + legend.w) {
    const row = legend.rows.find((item) => mouseY >= item.y && mouseY < item.y + item.h);
    if (row) {
      focusOn(row.key);
      return;
    }
  }
  const hit = pickAt(mouseX, mouseY);
  if (hit) focusOn(hit);
  else followName = null;
}

function mouseWheel(event) {
  const delta = typeof event.delta === "number" ? event.delta : event.deltaY || 0;
  const factor = delta > 0 ? 0.9 : 1.11;
  const next = clamp(camera.zoom * factor, 0.35, 14);
  const view = viewOrigin();
  if (!followName) {
    const worldX = (mouseX - view.x - camera.x) / camera.zoom;
    const worldY = (mouseY - view.y - camera.y) / camera.zoom;
    camera.zoom = next;
    camera.x = mouseX - view.x - worldX * camera.zoom;
    camera.y = mouseY - view.y - worldY * camera.zoom;
  } else {
    camera.zoom = next;
  }
  zoomGoal = null;
  return false;
}

function keyPressed() {
  if (key === " ") paused = !paused;
  else if (key === "l" || key === "L") showLabels = !showLabels;
  else if (key === "o" || key === "O") showOrbits = !showOrbits;
  else if (key === "h" || key === "H") showHud = !showHud;
  else if (key === "r" || key === "R") resetView();
  else if (key === "[" || key === "-") speed = Math.max(0.25, speed / 2);
  else if (key === "]" || key === "=" || key === "+") speed = Math.min(256, speed * 2);
  else if (key === "0" || key === "Escape" || keyCode === 27) followName = null;
  else if (key >= "1" && key <= "8") focusOn(planets[Number(key) - 1].name);
  return false;
}

function css(color) {
  if (color.length === 4) return "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + ")";
  return "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function moonRate(periodDays, retrograde) {
  const visualSeconds = Math.max(2.4, 3.1 + Math.log10(Math.max(periodDays, 0.2)) * 2.5);
  const rate = (Math.PI * 2) / (visualSeconds / SECONDS_PER_YEAR);
  return retrograde ? -rate : rate;
}

function makeStars(rng, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const hue = rng();
    let color = [230, 234, 244];
    if (hue > 0.88) color = [255, 214, 180];
    else if (hue < 0.08) color = [180, 205, 255];
    list.push({
      u: rng(),
      v: rng(),
      depth: rng(),
      size: rng() > 0.94 ? 2 : 1,
      phase: rng() * Math.PI * 2,
      color,
    });
  }
  return list;
}

function makeBelt(rng, count, auMin, auMax, cold) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const au = auMin + rng() * (auMax - auMin);
    const shade = cold ? 140 + Math.floor(rng() * 50) : 120 + Math.floor(rng() * 80);
    list.push({
      au,
      eccentricity: rng() * (cold ? 0.08 : 0.12),
      angle: rng() * Math.PI * 2,
      period: Math.pow(au, 1.5),
      size: cold ? 0.8 + rng() * 1.1 : 0.7 + rng() * 1.5,
      alpha: cold ? 50 + rng() * 70 : 80 + rng() * 110,
      color: cold ? [shade, shade + 10, shade + 24] : [shade, shade - 15, shade - 30],
    });
  }
  return list;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
