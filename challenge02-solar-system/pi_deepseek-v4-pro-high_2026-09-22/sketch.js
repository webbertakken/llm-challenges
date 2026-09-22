/**
 * Solar system — a p5.js sketch.
 *
 * A central glowing sun with the 8 major planets on roughly proportional
 * orbits, moons around Earth, Mars, Jupiter and Saturn, Saturn's rings, an
 * asteroid belt, and a parallax starfield background. Orbits are drawn as
 * faint guide rings; speeds follow an inverse-square-ish (Kepler) law so the
 * inner planets overtake the outer ones.
 */

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

const SUN = {
  radius: 34,
  color: [255, 213, 128],
};

/**
 * Each planet: orbital distance, visual radius, colour, orbital period (in
 * "days", only relative magnitudes matter) and its moons.
 */
const PLANETS = [
  {
    name: "Mercury",
    distance: 52,
    radius: 3.6,
    color: [168, 160, 150],
    period: 88,
    moons: [],
  },
  {
    name: "Venus",
    distance: 78,
    radius: 6.6,
    color: [232, 190, 130],
    period: 225,
    moons: [],
  },
  {
    name: "Earth",
    distance: 105,
    radius: 7,
    color: [92, 148, 235],
    period: 365,
    moons: [{ distance: 14, radius: 2.2, color: [200, 200, 200], period: 27 }],
  },
  {
    name: "Mars",
    distance: 132,
    radius: 4.6,
    color: [224, 106, 78],
    period: 687,
    moons: [
      { distance: 10, radius: 1.2, color: [190, 180, 170], period: 0.3 },
      { distance: 14, radius: 1.1, color: [180, 170, 160], period: 1.3 },
    ],
  },
  {
    name: "Jupiter",
    distance: 196,
    radius: 19,
    color: [216, 180, 130],
    period: 4333,
    moons: [
      { distance: 26, radius: 2.6, color: [230, 214, 190], period: 1.8 },
      { distance: 32, radius: 2.2, color: [214, 200, 180], period: 3.6 },
      { distance: 38, radius: 2.9, color: [200, 190, 175], period: 7.2 },
    ],
  },
  {
    name: "Saturn",
    distance: 254,
    radius: 16,
    color: [226, 204, 156],
    period: 10759,
    rings: true,
    moons: [{ distance: 26, radius: 2.4, color: [214, 196, 166], period: 16 }],
  },
  {
    name: "Uranus",
    distance: 308,
    radius: 9.5,
    color: [150, 214, 220],
    period: 30687,
    moons: [],
  },
  {
    name: "Neptune",
    distance: 352,
    radius: 9,
    color: [86, 116, 210],
    period: 60190,
    moons: [],
  },
];

const ASTEROID_BELT = { inner: 150, outer: 178, count: 260 };

const STAR_COUNT = 300;
const GRAVITY_WARP_FACTOR = 140000; // converts period (days) -> angular speed

/* ------------------------------------------------------------------ *
 * Runtime state
 * ------------------------------------------------------------------ */

let stars = [];
let asteroids = [];
let planetStates = [];

/**
 * Prepare deterministic starfield and asteroid-belt members. We keep them
 * deterministic (seeded) so the background does not shimmer randomly every
 * frame, which reads as noise rather than space.
 */
function seedBackground() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    // Multiplicative congruential generator for a stable, non-random look.
    const r = (i * 9301 + 49297) % 233280;
    const r2 = (i * 13777 + 297) % 233280;
    stars.push({
      x: (r / 233280) * width,
      y: (r2 / 233280) * height,
      r: 0.5 + ((i * 7) % 10) / 6,
      twinkle: (i * 31) % 1000,
    });
  }

  asteroids = [];
  for (let i = 0; i < ASTEROID_BELT.count; i++) {
    const t = (i * 7919 + 13) % 233280 / 233280;
    const spread = ASTEROID_BELT.outer - ASTEROID_BELT.inner;
    asteroids.push({
      angle: t * TWO_PI,
      distance: ASTEROID_BELT.inner + ((i * 31) % 100) / 100 * spread,
      r: 0.8 + ((i * 13) % 10) / 7,
      speed: 0.004 + ((i * 17) % 10) / 2500,
      hue: 120 + ((i * 3) % 40),
    });
  }

  planetStates = PLANETS.map((planet) => {
    const phase = Math.random() * TWO_PI;
    return {
      angle: phase,
      moons: planet.moons.map((moon) => ({
        angle: Math.random() * TWO_PI,
      })),
    };
  });
}

function setup() {
  createCanvas(820, 820).parent("stage");
  pixelDensity(1);
  seedBackground();
}

function draw() {
  background(5, 6, 15);

  translate(width / 2, height / 2);

  drawStars();
  drawOrbits();
  drawSun();
  drawAsteroidBelt();
  drawPlanets();
}

/* ------------------------------------------------------------------ *
 * Background
 * ------------------------------------------------------------------ */

function drawStars() {
  noStroke();
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin((frameCount * 0.03 + s.twinkle) / 60);
    fill(255, 255, 255, 110 * tw + 80);
    circle(s.x - width / 2, s.y - height / 2, s.r * 2);
  }
}

/* ------------------------------------------------------------------ *
 * Orbit guide rings
 * ------------------------------------------------------------------ */

function drawOrbits() {
  noFill();
  stroke(120, 150, 220, 28);
  strokeWeight(1);
  for (const planet of PLANETS) {
    circle(0, 0, planet.distance * 2);
  }
}

/* ------------------------------------------------------------------ *
 * The sun, with a soft multi-layer glow
 * ------------------------------------------------------------------ */

function drawSun() {
  noStroke();
  // Layered glow, brightest at the centre.
  for (let i = 6; i >= 1; i--) {
    const r = SUN.radius + i * 14;
    fill(SUN.color[0], SUN.color[1], SUN.color[2], 6 + (7 - i) * 4);
    circle(0, 0, r * 2);
  }
  fill(SUN.color[0], SUN.color[1], SUN.color[2]);
  circle(0, 0, SUN.radius * 2);
}

/* ------------------------------------------------------------------ *
 * Asteroid belt (static ring of drifting rocks)
 * ------------------------------------------------------------------ */

function drawAsteroidBelt() {
  noStroke();
  for (const a of asteroids) {
    const angle = a.angle + frameCount * a.speed;
    const x = Math.cos(angle) * a.distance;
    const y = Math.sin(angle) * a.distance;
    fill(a.hue, a.hue * 0.7, a.hue * 0.5, 120);
    circle(x, y, a.r * 2);
  }
}

/* ------------------------------------------------------------------ *
 * Planets + moons
 * ------------------------------------------------------------------ */

function drawPlanets() {
  for (let p = 0; p < PLANETS.length; p++) {
    const planet = PLANETS[p];
    const state = planetStates[p];

    const speed = (TWO_PI / Math.sqrt(planet.period)) * Math.sqrt(365) * 0.06;
    state.angle += speed;

    const x = Math.cos(state.angle) * planet.distance;
    const y = Math.sin(state.angle) * planet.distance;

    drawMoons(planet, state, x, y);
    if (planet.rings) drawRings(planet, x, y);
    drawPlanetBody(planet, x, y);
  }
}

function drawPlanetBody(planet, x, y) {
  noStroke();
  // Subtle halo so each planet reads against the dark background.
  fill(planet.color[0], planet.color[1], planet.color[2], 40);
  circle(x, y, planet.radius * 2 + 8);

  fill(planet.color[0], planet.color[1], planet.color[2]);
  circle(x, y, planet.radius * 2);

  // Simple lit/dark shading: a darker crescent towards the sun's opposite side.
  fill(0, 0, 0, 60);
  circle(x + planet.radius * 0.35, y + planet.radius * 0.35, planet.radius * 1.4);
}

function drawMoons(planet, state, px, py) {
  for (let m = 0; m < planet.moons.length; m++) {
    const moon = planet.moons[m];
    const mState = state.moons[m];
    const speed = (TWO_PI / Math.sqrt(moon.period)) * Math.sqrt(27) * 0.35;
    mState.angle += speed;

    const mx = px + Math.cos(mState.angle) * moon.distance;
    const my = py + Math.sin(mState.angle) * moon.distance;

    noStroke();
    fill(moon.color[0], moon.color[1], moon.color[2]);
    circle(mx, my, moon.radius * 2);
  }
}

function drawRings(planet, x, y) {
  noFill();
  stroke(planet.color[0], planet.color[1], planet.color[2], 120);
  strokeWeight(2);
  ellipse(x, y, planet.radius * 3.4, planet.radius * 1.2);
  stroke(planet.color[0], planet.color[1], planet.color[2], 60);
  strokeWeight(1);
  ellipse(x, y, planet.radius * 4.2, planet.radius * 1.6);
}

/* ------------------------------------------------------------------ *
 * Optional: a light trail behind each planet adds a sense of motion.
 * (Kept out of the default render path for clarity; uncomment to enable.)
 * ------------------------------------------------------------------ */
// function drawPlanetTrail(planet, state) {
//   stroke(planet.color[0], planet.color[1], planet.color[2], 14);
//   noFill();
//   arc(0, 0, planet.distance * 2, planet.distance * 2,
//       state.angle - 0.5, state.angle);
// }
