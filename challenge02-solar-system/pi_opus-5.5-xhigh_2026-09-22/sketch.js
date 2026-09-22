/**
 * Solar system in p5.js.
 *
 * Accuracy
 * - Planets (and Pluto) move on Keplerian ellipses built from JPL's J2000 mean orbital elements.
 *   Kepler's equation is solved every frame, so the layout at start matches today's sky and
 *   eccentric orbits speed up near perihelion. Periods follow Kepler's third law (P² = a³).
 * - Moons and rings lie in their planet's equatorial plane (real pole directions), so Uranus's
 *   system is tipped on its side and Triton orbits backwards.
 * - Comets Encke and Halley grow ion and dust tails that point away from the Sun.
 * - The asteroid belt shows the Kirkwood gaps, Jupiter drags its Trojans along at L4/L5.
 *
 * Display scales (true scale would make every planet invisible)
 * - Distance from the Sun: ORBIT_OFFSET + ORBIT_SCALE * √AU.
 * - Body radius: SIZE_SCALE * km^0.65; the Sun has a fixed size.
 * - Moon orbit radii are given in planet radii for legibility; moon periods are shown as
 *   MOON_PERIOD_OFFSET + real period (days), so Io and Phobos do not strobe.
 */
'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAYS_PER_YEAR = 365.25;
const LIGHT_MINUTES_PER_AU = 8.3167;
const EARTH_ORBITAL_SPEED = 29.7847; // km/s; scales vis-viva when r and a are in AU

const SUN_DISPLAY_RADIUS = 34;
const ORBIT_OFFSET = 56;
const ORBIT_SCALE = 130;
const SIZE_SCALE = 0.0168;
const MIN_BODY_RADIUS = 0.9;
const MOON_PERIOD_OFFSET = 16;

const DAYS_PER_SECOND = 12; // at ×1 one Earth year takes about 30 seconds
const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
const DEFAULT_TILT = 0.9;
const MAX_TILT = 1.35;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 60;
const FOLLOW_SECONDS = 1.1;

const TEX_W = 256; // texture circumference in pixels; half of it is visible at once
const TEX_H = 128;

const displayDistance = (au) => ORBIT_OFFSET + ORBIT_SCALE * Math.sqrt(au);
const displaySize = (km) => Math.max(MIN_BODY_RADIUS, SIZE_SCALE * km ** 0.65);

// ---------------------------------------------------------------------------
// Data: J2000 elements (a in AU, angles in degrees), physical data, pole directions
// (unit vectors in ecliptic coordinates) and moons (orbit in planet radii, period in days).
// ---------------------------------------------------------------------------

const SUN_DATA = {
  name: 'Sun',
  kind: 'G-type main-sequence star (G2V)',
  radiusKm: 696_340,
  dayHours: 609.1,
  surface: 'sun',
  note: 'Holds 99.86% of the mass of the solar system.',
};

const PLANET_DATA = [
  {
    name: 'Mercury',
    kind: 'Terrestrial planet',
    radiusKm: 2439.7,
    dayHours: 1407.6,
    elements: { a: 0.38709927, e: 0.20563593, i: 7.00497902, node: 48.33076593, peri: 77.45779628, L: 252.2503235 },
    color: [175, 165, 155],
    surface: 'mercury',
    note: 'A year here lasts 88 days, but one sunrise-to-sunrise day lasts 176.',
  },
  {
    name: 'Venus',
    kind: 'Terrestrial planet',
    radiusKm: 6051.8,
    dayHours: -5832.5,
    elements: { a: 0.72333566, e: 0.00677672, i: 3.39467605, node: 76.67984255, peri: 131.60246718, L: 181.9790995 },
    color: [235, 205, 150],
    atmosphere: [255, 222, 160],
    surface: 'venus',
    note: 'The hottest planet: its thick CO₂ atmosphere keeps the surface at 465 °C.',
  },
  {
    name: 'Earth',
    kind: 'Terrestrial planet',
    radiusKm: 6371,
    dayHours: 23.93,
    elements: { a: 1.00000261, e: 0.01671123, i: 0, node: 0, peri: 102.93768193, L: 100.46457166 },
    color: [90, 150, 230],
    atmosphere: [110, 170, 255],
    surface: 'earth',
    pole: [0, 0, 1],
    moons: [{ name: 'Moon', radiusKm: 1737.4, orbit: 3.4, periodDays: 27.32, color: [190, 188, 182] }],
    note: 'The only world known to host life.',
  },
  {
    name: 'Mars',
    kind: 'Terrestrial planet',
    radiusKm: 3389.5,
    dayHours: 24.62,
    elements: { a: 1.52371034, e: 0.0933941, i: 1.84969142, node: 49.55953891, peri: -23.94362959, L: -4.55343205 },
    color: [205, 110, 70],
    atmosphere: [235, 160, 120],
    surface: 'mars',
    pole: [0.4461, -0.0555, 0.8933],
    moons: [
      { name: 'Phobos', radiusKm: 11.3, orbit: 2.2, periodDays: 0.319, color: [150, 130, 115] },
      { name: 'Deimos', radiusKm: 6.2, orbit: 3.2, periodDays: 1.263, color: [165, 148, 130] },
    ],
    note: 'Home of Olympus Mons, the tallest volcano in the solar system.',
  },
  {
    name: 'Jupiter',
    kind: 'Gas giant',
    radiusKm: 69_911,
    dayHours: 9.93,
    elements: { a: 5.202887, e: 0.04838624, i: 1.30439695, node: 100.47390909, peri: 14.72847983, L: 34.39644051 },
    color: [215, 180, 140],
    surface: 'jupiter',
    pole: [-0.0146, -0.0357, 0.9993],
    moons: [
      { name: 'Io', radiusKm: 1821.6, orbit: 1.55, periodDays: 1.769, color: [232, 212, 100] },
      { name: 'Europa', radiusKm: 1560.8, orbit: 1.85, periodDays: 3.551, color: [222, 205, 175] },
      { name: 'Ganymede', radiusKm: 2634.1, orbit: 2.2, periodDays: 7.155, color: [165, 155, 145] },
      { name: 'Callisto', radiusKm: 2410.3, orbit: 2.65, periodDays: 16.689, color: [115, 105, 95] },
    ],
    note: 'More than twice as massive as all the other planets combined.',
  },
  {
    name: 'Saturn',
    kind: 'Gas giant',
    radiusKm: 58_232,
    dayHours: 10.7,
    elements: { a: 9.53667594, e: 0.05386179, i: 2.48599187, node: 113.66242448, peri: 92.59887831, L: 49.95424423 },
    color: [230, 205, 150],
    surface: 'saturn',
    pole: [0.0855, 0.4624, 0.8825],
    rings: [
      { inner: 1.24, outer: 1.52, color: 'rgba(165, 148, 122, 0.35)' },
      { inner: 1.53, outer: 1.72, color: 'rgba(222, 200, 160, 0.78)' },
      { inner: 1.72, outer: 1.95, color: 'rgba(236, 218, 180, 0.92)' },
      { inner: 2.03, outer: 2.2, color: 'rgba(208, 190, 155, 0.72)' },
      { inner: 2.22, outer: 2.27, color: 'rgba(200, 182, 150, 0.6)' },
    ],
    moons: [
      { name: 'Rhea', radiusKm: 763.8, orbit: 2.55, periodDays: 4.518, color: [200, 198, 195] },
      { name: 'Titan', radiusKm: 2574.7, orbit: 3.3, periodDays: 15.945, color: [225, 165, 75] },
    ],
    note: 'Its rings span 280,000 km but are mostly only tens of metres thick.',
  },
  {
    name: 'Uranus',
    kind: 'Ice giant',
    radiusKm: 25_362,
    dayHours: -17.24,
    elements: { a: 19.18916464, e: 0.04725744, i: 0.77263783, node: 74.01692503, peri: 170.9542763, L: 313.23810451 },
    color: [170, 225, 230],
    atmosphere: [160, 230, 240],
    surface: 'uranus',
    pole: [-0.212, -0.968, 0.1344],
    rings: [
      { inner: 1.64, outer: 1.67, color: 'rgba(200, 220, 230, 0.3)' },
      { inner: 1.95, outer: 2.0, color: 'rgba(210, 230, 240, 0.45)' },
    ],
    moons: [
      { name: 'Titania', radiusKm: 788.4, orbit: 2.6, periodDays: 8.706, color: [185, 175, 170] },
      { name: 'Oberon', radiusKm: 761.4, orbit: 3.2, periodDays: 13.463, color: [165, 145, 135] },
    ],
    note: 'Rolls around the Sun on its side: its axis is tilted by 98°.',
  },
  {
    name: 'Neptune',
    kind: 'Ice giant',
    radiusKm: 24_622,
    dayHours: 16.11,
    elements: { a: 30.06992276, e: 0.00859048, i: 1.77004347, node: 131.78422574, peri: 44.96476227, L: -55.12002969 },
    color: [70, 110, 220],
    atmosphere: [100, 150, 255],
    surface: 'neptune',
    pole: [0.3557, -0.3067, 0.8828],
    moons: [{ name: 'Triton', radiusKm: 1353.4, orbit: 2.9, periodDays: -5.877, color: [215, 195, 185] }],
    note: 'Winds reach 2,100 km/h, the fastest measured on any planet.',
  },
  {
    name: 'Pluto',
    kind: 'Dwarf planet',
    radiusKm: 1188.3,
    dayHours: -153.3,
    elements: { a: 39.48211675, e: 0.2488273, i: 17.14001206, node: 110.30393684, peri: 224.06891629, L: 238.92903833 },
    color: [205, 180, 150],
    surface: 'pluto',
    pole: [-0.6781, 0.6245, -0.3877],
    moons: [{ name: 'Charon', radiusKm: 606, orbit: 3.6, periodDays: 6.387, color: [160, 160, 165] }],
    note: 'Its inclined, eccentric orbit briefly brings it closer to the Sun than Neptune.',
  },
];

const COMET_DATA = [
  {
    name: 'Comet Encke',
    kind: 'Short-period comet',
    elements: { a: 2.2152, e: 0.8483, i: 11.35, node: 334.57, argPeri: 186.54, perihelion: '2023-10-22' },
    note: 'The shortest known orbital period of any bright comet: 3.3 years.',
  },
  {
    name: "Halley's Comet",
    kind: 'Periodic comet (retrograde orbit)',
    elements: { a: 17.834, e: 0.96714, i: 162.26, node: 58.42, argPeri: 111.33, perihelion: '1986-02-09' },
    note: 'Returns every 75 to 76 years; next perihelion in 2061.',
  },
];

// ---------------------------------------------------------------------------
// Small vector helpers
// ---------------------------------------------------------------------------

const vec = (x, y, z) => ({ x, y, z });
const add = (a, b) => vec(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => vec(a.x - b.x, a.y - b.y, a.z - b.z);
const scale = (a, s) => vec(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const normalise = (a) => scale(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const mix = (a, b, t) => {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
const rgba = (rgb, alpha) => `rgba(${rgb[0] | 0}, ${rgb[1] | 0}, ${rgb[2] | 0}, ${alpha})`;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Orthonormal basis (u, v) of the plane perpendicular to `pole`; u → v turns prograde. */
function equatorialBasis(pole) {
  const n = normalise(pole);
  const helper = Math.abs(n.z) < 0.9 ? vec(0, 0, 1) : vec(1, 0, 0);
  const u = normalise(cross(helper, n));
  return { u, v: cross(n, u) };
}

// ---------------------------------------------------------------------------
// Orbital mechanics
// ---------------------------------------------------------------------------

const daysSinceJ2000 = (ms) => (ms - J2000_MS) / DAY_MS;

function prepareOrbit(el) {
  const peri = el.peri ?? el.node + el.argPeri;
  const meanMotion = TAU / (DAYS_PER_YEAR * el.a ** 1.5); // Kepler's third law, rad/day
  const meanAnomalyAtJ2000 =
    el.L !== undefined ? (el.L - peri) * DEG : -meanMotion * daysSinceJ2000(Date.parse(el.perihelion));
  return {
    a: el.a,
    e: el.e,
    inclination: el.i,
    meanMotion,
    meanAnomalyAtJ2000,
    argPeri: (peri - el.node) * DEG,
    cosNode: Math.cos(el.node * DEG),
    sinNode: Math.sin(el.node * DEG),
    cosI: Math.cos(el.i * DEG),
    sinI: Math.sin(el.i * DEG),
  };
}

/** Solves Kepler's equation M = E - e·sin(E) for the eccentric anomaly E (Newton-Raphson). */
function eccentricAnomaly(meanAnomaly, e) {
  const M = Math.atan2(Math.sin(meanAnomaly), Math.cos(meanAnomaly));
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let step = 0; step < 30; step++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return E;
}

/** Position on the orbit for a true anomaly, in heliocentric ecliptic coordinates (AU). */
function orbitalToEcliptic(orbit, r, trueAnomaly) {
  const u = orbit.argPeri + trueAnomaly;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  return {
    x: r * (orbit.cosNode * cu - orbit.sinNode * su * orbit.cosI),
    y: r * (orbit.sinNode * cu + orbit.cosNode * su * orbit.cosI),
    z: r * su * orbit.sinI,
    r,
  };
}

function heliocentric(orbit, days) {
  const { a, e } = orbit;
  const E = eccentricAnomaly(orbit.meanAnomalyAtJ2000 + orbit.meanMotion * days, e);
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return orbitalToEcliptic(orbit, a * (1 - e * Math.cos(E)), trueAnomaly);
}

/** Maps a heliocentric position (AU) to display units, keeping its direction. */
function toDisplay(p) {
  const s = displayDistance(p.r) / p.r;
  return vec(p.x * s, p.y * s, p.z * s);
}

function orbitPath(orbit, samples) {
  const points = [];
  const semiLatusRectum = orbit.a * (1 - orbit.e * orbit.e);
  for (let k = 0; k <= samples; k++) {
    const nu = -Math.PI + (TAU * k) / samples;
    points.push(toDisplay(orbitalToEcliptic(orbit, semiLatusRectum / (1 + orbit.e * Math.cos(nu)), nu)));
  }
  return points;
}

/** Orbital speed from the vis-viva equation, in km/s. */
const orbitalSpeed = (r, a) => EARTH_ORBITAL_SPEED * Math.sqrt(2 / r - 1 / a);

// ---------------------------------------------------------------------------
// Procedural surface textures (seamless in longitude so they can scroll as the body spins)
// ---------------------------------------------------------------------------

function surfaceNoise(lon, lat, frequency, seed) {
  return noise(seed + Math.cos(lon) * frequency, seed + Math.sin(lon) * frequency, seed + lat * frequency * 1.3);
}

/** Distance to an ellipse centre in units of its radii (< 1 inside); used for storms and spots. */
function spot(lon, lat, lon0, lat0, width, height) {
  const dLon = Math.atan2(Math.sin(lon - lon0), Math.cos(lon - lon0));
  return Math.hypot(dLon / width, (lat - lat0) / height);
}

const SURFACES = {
  sun(lon, lat) {
    const granules = surfaceNoise(lon, lat, 10, 1);
    const spots = surfaceNoise(lon, lat, 2.4, 2);
    let c = mix([255, 150, 35], [255, 238, 170], granules * 1.5 - 0.25);
    if (spots > 0.7 && Math.abs(lat) < 0.55) c = mix(c, [130, 45, 5], (spots - 0.7) * 6);
    return c;
  },
  mercury(lon, lat) {
    const terrain = surfaceNoise(lon, lat, 2.4, 10);
    const craters = surfaceNoise(lon, lat, 8, 11);
    let v = 0.62 + (terrain - 0.5) * 0.9;
    if (craters > 0.66) v -= (craters - 0.66) * 1.8;
    else if (craters > 0.62) v += 0.1;
    return mix([40, 38, 36], [205, 195, 185], v);
  },
  venus(lon, lat) {
    const swirl = surfaceNoise(lon + lat * 1.2, lat * 2.5, 1.8, 20);
    return mix([205, 160, 95], [252, 236, 196], swirl * 1.6 - 0.25);
  },
  earth(lon, lat) {
    const land = surfaceNoise(lon, lat, 1.7, 30);
    const clouds = surfaceNoise(lon * 2, lat * 1.5, 2.6, 31);
    let c;
    if (Math.abs(lat) > 0.84) c = [236, 242, 250];
    else if (land > 0.54) c = mix([62, 125, 58], [168, 145, 95], (land - 0.54) * 7 + Math.abs(lat) * 0.3);
    else c = mix([14, 48, 125], [40, 105, 185], land / 0.54);
    if (clouds > 0.56) c = mix(c, [255, 255, 255], (clouds - 0.56) * 4.5);
    return c;
  },
  mars(lon, lat) {
    const terrain = surfaceNoise(lon, lat, 2, 40);
    const dust = surfaceNoise(lon, lat, 6, 41);
    if (Math.abs(lat) > 0.88 + (dust - 0.5) * 0.1) return [240, 232, 225];
    let c = mix([165, 72, 38], [222, 128, 78], dust * 1.4 - 0.2);
    if (terrain > 0.55) c = mix(c, [95, 52, 38], (terrain - 0.55) * 4);
    return c;
  },
  jupiter(lon, lat) {
    const turbulence = surfaceNoise(lon, lat, 3.5, 50) - 0.5;
    const band = Math.sin((lat + turbulence * 0.14) * 13) * 0.5 + 0.5;
    let c = mix([176, 112, 72], [240, 222, 190], band);
    c = mix(c, [255, 250, 240], (surfaceNoise(lon, lat, 9, 51) - 0.55) * 1.5);
    const storm = spot(lon, lat, Math.PI, 0.36, 0.42, 0.1);
    if (storm < 1) c = mix(c, [196, 88, 58], (1 - storm) * 2.2);
    return c;
  },
  saturn(lon, lat) {
    const turbulence = surfaceNoise(lon, lat, 3, 60) - 0.5;
    const band = Math.sin((lat + turbulence * 0.06) * 10) * 0.5 + 0.5;
    return mix([198, 162, 105], [246, 226, 178], band * 0.7 + 0.3);
  },
  uranus(lon, lat) {
    const haze = surfaceNoise(lon, lat * 3, 1.5, 70);
    return mix([140, 205, 215], [200, 240, 245], haze * 0.8 + Math.abs(lat) * 0.3);
  },
  neptune(lon, lat) {
    const turbulence = surfaceNoise(lon, lat, 3, 80) - 0.5;
    const band = Math.sin((lat + turbulence * 0.12) * 9) * 0.5 + 0.5;
    let c = mix([34, 62, 170], [85, 135, 235], band);
    if (spot(lon, lat, 1.2, 0.35, 0.35, 0.09) < 1) c = mix(c, [18, 30, 95], 0.8);
    if (surfaceNoise(lon * 3, lat * 0.5, 4, 81) > 0.66) c = mix(c, [235, 245, 255], 0.75);
    return c;
  },
  pluto(lon, lat) {
    const terrain = surfaceNoise(lon, lat, 2.5, 90);
    let c = mix([150, 115, 90], [222, 200, 175], terrain * 1.4 - 0.2);
    if (spot(lon, lat, Math.PI, -0.05, 0.5, 0.45) < 1) c = mix(c, [246, 236, 222], 0.85);
    else if (Math.abs(lat + 0.1) < 0.18 && terrain < 0.5) c = mix(c, [80, 45, 35], 0.7);
    return c;
  },
};

/** Paints `TEX_W` × `TEX_H` pixels plus a wrapped copy of the first half, so any half-width window is valid. */
function makeTexture(paint) {
  const g = createGraphics(TEX_W * 1.5, TEX_H);
  g.pixelDensity(1);
  g.loadPixels();
  const put = (x, y, c) => {
    const i = 4 * (y * g.width + x);
    g.pixels[i] = c[0];
    g.pixels[i + 1] = c[1];
    g.pixels[i + 2] = c[2];
    g.pixels[i + 3] = 255;
  };
  for (let y = 0; y < TEX_H; y++) {
    const lat = ((y + 0.5) / TEX_H) * 2 - 1;
    for (let x = 0; x < TEX_W; x++) {
      const c = paint((x / TEX_W) * TAU, lat);
      put(x, y, c);
      if (x < TEX_W / 2) put(x + TEX_W, y, c);
    }
  }
  g.updatePixels();
  return g;
}

// ---------------------------------------------------------------------------
// Scene construction
// ---------------------------------------------------------------------------

let sun;
let planets;
let comets;
let jupiter;
let asteroids;
let trojans;
let kuiperBelt;
let stars;
let backdrop;

const spinRate = (dayHours) => 0.03 * (24 / Math.abs(dayHours)) ** 0.3 * Math.sign(dayHours);

function createSun() {
  return {
    ...SUN_DATA,
    radius: SUN_DISPLAY_RADIUS,
    texture: makeTexture(SURFACES.sun),
    spin: 0,
    spinRate: spinRate(SUN_DATA.dayHours),
    pos: vec(0, 0, 0),
    screen: { x: 0, y: 0, depth: 0 },
  };
}

function createPlanet(data) {
  const orbit = prepareOrbit(data.elements);
  return {
    ...data,
    orbit,
    path: orbitPath(orbit, 360),
    radius: displaySize(data.radiusKm),
    texture: makeTexture(SURFACES[data.surface]),
    spin: random(),
    spinRate: spinRate(data.dayHours),
    basis: equatorialBasis(vec(...(data.pole ?? [0, 0, 1]))),
    rings: data.rings ?? [],
    moons: (data.moons ?? []).map((moon) => ({ ...moon, radius: displaySize(moon.radiusKm), phase: random(TAU) })),
    moonPlacements: [],
    helio: null,
    pos: vec(0, 0, 0),
    screen: { x: 0, y: 0, depth: 0 },
  };
}

function createComet(data) {
  const orbit = prepareOrbit(data.elements);
  return {
    ...data,
    orbit,
    path: orbitPath(orbit, 900),
    radius: 1.2,
    helio: null,
    pos: vec(0, 0, 0),
    screen: { x: 0, y: 0, depth: 0 },
  };
}

/** A small body on a low-eccentricity orbit (asteroids, Kuiper belt objects). */
function makeSmallBody(a, maxE, maxInclination, alpha) {
  return {
    a,
    e: random(maxE),
    meanMotion: TAU / (DAYS_PER_YEAR * a ** 1.5),
    phase: random(TAU),
    peri: random(TAU),
    node: random(TAU),
    sinI: Math.sin(random(maxInclination) * DEG),
    size: random(0.8, 1.7),
    alpha,
  };
}

function createAsteroidBelt(count) {
  const kirkwoodGaps = [2.502, 2.825, 2.958, 3.279]; // 3:1, 5:2, 7:3 and 2:1 resonances with Jupiter
  const belt = [];
  while (belt.length < count) {
    const a = random(2.1, 3.3);
    if (kirkwoodGaps.every((gap) => Math.abs(a - gap) > 0.03)) belt.push(makeSmallBody(a, 0.12, 14, random(0.35, 0.8)));
  }
  return belt;
}

function createTrojans(count) {
  return Array.from({ length: count }, (_, k) => ({
    offset: (k % 2 ? 60 : -60) * DEG + randomGaussian(0, 11) * DEG, // L4 leads Jupiter, L5 trails it
    a: 5.2 + randomGaussian(0, 0.14),
    libration: random(2, 10) * DEG,
    phase: random(TAU),
    lift: randomGaussian(0, 0.12),
    size: random(0.8, 1.5),
  }));
}

function createKuiperBelt(count) {
  return Array.from({ length: count }, () => {
    const a = random() < 0.3 ? randomGaussian(39.4, 0.6) : random(42, 48);
    return makeSmallBody(a, 0.2, 20, random(0.25, 0.6));
  });
}

function createStars(count) {
  const tints = [
    [255, 255, 255],
    [200, 215, 255],
    [255, 236, 210],
    [255, 210, 190],
  ];
  return Array.from({ length: count }, () => ({
    u: random(),
    v: random(),
    size: random() < 0.08 ? random(1.6, 2.4) : random(0.6, 1.4),
    fill: rgba(random(tints), 1),
    brightness: random(0.35, 1),
    twinkleSpeed: random(0.6, 2.2),
    phase: random(TAU),
    depth: random(0.02, 0.08),
  }));
}

/** Static deep-sky backdrop: a Milky Way band of noise, dust lanes and faint stars, plus a vignette. */
function renderBackdrop() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  const low = createGraphics(Math.ceil(width / 4), Math.ceil(height / 4));
  low.pixelDensity(1);
  low.loadPixels();
  const angle = -0.42;
  const bandAt = (x, y) => {
    const u = (x / low.width - 0.5) * (low.width / low.height);
    const v = y / low.height - 0.5;
    const d = u * Math.sin(angle) + v * Math.cos(angle);
    return Math.exp(-(d * d) / (2 * 0.13 * 0.13));
  };
  for (let y = 0; y < low.height; y++) {
    for (let x = 0; x < low.width; x++) {
      const band = bandAt(x, y);
      const clouds = noise(x * 0.025, y * 0.025, 500);
      const dustLanes = noise(x * 0.06 + 100, y * 0.06, 510);
      const glow = band * (0.25 + clouds) * (1 - 0.75 * clamp01((dustLanes - 0.5) * 4));
      const c = mix(mix([3, 4, 14], [26, 20, 52], glow * 1.6), [92, 80, 118], glow * glow * 1.4);
      const i = 4 * (y * low.width + x);
      low.pixels[i] = c[0];
      low.pixels[i + 1] = c[1];
      low.pixels[i + 2] = c[2];
      low.pixels[i + 3] = 255;
    }
  }
  low.updatePixels();
  g.image(low, 0, 0, width, height);

  g.noStroke();
  for (let k = 0; k < (width * height) / 900; k++) {
    const x = random(width);
    const y = random(height);
    if (random() > 0.25 + 0.75 * bandAt((x / width) * low.width, (y / height) * low.height)) continue;
    g.fill(230, 235, 255, random(40, 150));
    g.rect(x, y, 1, 1);
  }

  const ctx = g.drawingContext;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.hypot(width, height) * 0.6);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  low.remove();
  return g;
}

// ---------------------------------------------------------------------------
// Simulation state & camera
// ---------------------------------------------------------------------------

let simDays = daysSinceJ2000(Date.now());
let speedIndex = SPEEDS.indexOf(1);
let timeDirection = 1;
let paused = false;
let showLabels = true;
let showOrbits = true;
let hovered = null;
let press = null;
let hudCountdown = 0;

const view = {
  x: 0,
  y: 0,
  z: 0,
  zoom: 1,
  tilt: DEFAULT_TILT,
  goal: { x: 0, y: 0, z: 0, zoom: 1, tilt: DEFAULT_TILT },
  follow: null,
  followFrom: vec(0, 0, 0),
  followProgress: 1,
};

/** Per-frame projection constants: the orbital plane is tilted away from the viewer by `tilt`. */
const frame = { cos: 1, sin: 0, zoom: 1, cx: 0, cy: 0 };

function project(p) {
  const dx = p.x - view.x;
  const dy = p.y - view.y;
  const dz = p.z - view.z;
  return {
    x: frame.cx + dx * frame.zoom,
    y: frame.cy - (dy * frame.cos + dz * frame.sin) * frame.zoom,
    depth: -dy * frame.sin + dz * frame.cos,
  };
}

/** Screen-space components of a 3D offset or direction (no zoom applied). */
const screenOffsetX = (o) => o.x;
const screenOffsetY = (o) => -(o.y * frame.cos + o.z * frame.sin);

function fitZoom(tilt) {
  const extent = displayDistance(31);
  return Math.min((width / 2 - 24) / extent, (height / 2 - 24) / (extent * Math.cos(tilt) + 60));
}

function systemExtent(body) {
  const moonReach = Math.max(0, ...body.moons.map((moon) => moon.orbit));
  const ringReach = Math.max(0, ...body.rings.map((ring) => ring.outer));
  return body.radius * Math.max(4, moonReach + 0.5, ringReach + 0.5);
}

function followBody(body) {
  view.follow = body;
  view.followFrom = vec(view.x, view.y, view.z);
  view.followProgress = 0;
  if (body === sun) {
    view.goal.zoom = fitZoom(view.goal.tilt);
  } else if (body.moons) {
    view.goal.zoom = constrain((Math.min(width, height) * 0.32) / systemExtent(body), MIN_ZOOM, MAX_ZOOM);
  } else {
    view.goal.zoom = Math.max(view.goal.zoom, 2.5);
  }
}

function releaseFollow() {
  view.follow = null;
  Object.assign(view.goal, { x: view.x, y: view.y, z: view.z });
}

function resetView() {
  view.goal.tilt = DEFAULT_TILT;
  followBody(sun);
}

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 7);
  view.zoom = Math.exp(Math.log(view.zoom) + (Math.log(view.goal.zoom) - Math.log(view.zoom)) * k);
  view.tilt += (view.goal.tilt - view.tilt) * k;
  if (view.follow) {
    view.followProgress = Math.min(1, view.followProgress + dt / FOLLOW_SECONDS);
    const e = easeInOut(view.followProgress);
    const target = view.follow.pos;
    view.x = view.followFrom.x + (target.x - view.followFrom.x) * e;
    view.y = view.followFrom.y + (target.y - view.followFrom.y) * e;
    view.z = view.followFrom.z + (target.z - view.followFrom.z) * e;
  } else {
    view.x += (view.goal.x - view.x) * k;
    view.y += (view.goal.y - view.y) * k;
    view.z += (view.goal.z - view.z) * k;
  }
  Object.assign(frame, {
    cos: Math.cos(view.tilt),
    sin: Math.sin(view.tilt),
    zoom: view.zoom,
    cx: width / 2,
    cy: height / 2,
  });
}

function zoomAt(mx, my, factor) {
  const zoom = constrain(view.goal.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  if (!view.follow) {
    const cosTilt = Math.cos(view.goal.tilt);
    const worldX = view.goal.x + (mx - width / 2) / view.goal.zoom;
    const worldY = view.goal.y - (my - height / 2) / (view.goal.zoom * cosTilt);
    view.goal.x = worldX - (mx - width / 2) / zoom;
    view.goal.y = worldY + (my - height / 2) / (zoom * cosTilt);
  }
  view.goal.zoom = zoom;
}

// ---------------------------------------------------------------------------
// p5 lifecycle
// ---------------------------------------------------------------------------

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(Math.min(2, displayDensity()));
  randomSeed(1977);
  noiseSeed(1977);
  noiseDetail(4, 0.5);
  describe(
    'An animated solar system: the glowing Sun, eight planets and Pluto on elliptical orbits with their moons, ' +
      "Saturn's and Uranus's rings, the asteroid and Kuiper belts, and two comets with tails, over a starry sky.",
  );

  sun = createSun();
  planets = PLANET_DATA.map(createPlanet);
  comets = COMET_DATA.map(createComet);
  jupiter = planets.find((planet) => planet.name === 'Jupiter');
  asteroids = createAsteroidBelt(1800);
  trojans = createTrojans(320);
  kuiperBelt = createKuiperBelt(900);
  stars = createStars(700);
  backdrop = renderBackdrop();
  coronaBuffer = createGraphics(CORONA_BUFFER_SIZE, CORONA_BUFFER_SIZE);
  coronaBuffer.pixelDensity(1);

  view.zoom = view.goal.zoom = fitZoom(DEFAULT_TILT);
  view.follow = sun;
  updateBodies();
  updateCamera(0);
  followFromHash();
  window.addEventListener('hashchange', followFromHash);
}

/** Deep link: `index.html#saturn` opens the view following Saturn. */
function followFromHash() {
  const name = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  const body = [sun, ...planets, ...comets].find((candidate) => candidate.name.toLowerCase().includes(name));
  if (name && body) followBody(body);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  backdrop.remove();
  backdrop = renderBackdrop();
  if (view.follow === sun) view.goal.zoom = fitZoom(view.goal.tilt);
}

function draw() {
  const dt = Math.min(deltaTime, 100) / 1000;
  advanceTime(dt);
  updateBodies();
  updateCamera(dt);

  const ctx = drawingContext;
  ctx.drawImage(backdrop.elt, 0, 0, width, height);
  drawStars(ctx);
  if (showOrbits) drawOrbits(ctx);
  drawBelts(ctx);
  drawBodies(ctx);
  hovered = press ? null : bodyAt(mouseX, mouseY);
  drawLabels(ctx);
  drawSelection(ctx);
  canvasCursor();

  hudCountdown -= dt;
  if (hudCountdown <= 0) {
    hudCountdown = 0.15;
    updateHud();
  }
}

function advanceTime(dt) {
  if (paused) return;
  simDays += timeDirection * SPEEDS[speedIndex] * DAYS_PER_SECOND * dt;
  for (const body of [sun, ...planets]) body.spin += timeDirection * body.spinRate * dt;
}

function updateBodies() {
  for (const body of [...planets, ...comets]) {
    body.helio = heliocentric(body.orbit, simDays);
    body.pos = toDisplay(body.helio);
  }
}

// ---------------------------------------------------------------------------
// Rendering: background layers
// ---------------------------------------------------------------------------

function drawStars(ctx) {
  const t = millis() / 1000;
  for (const star of stars) {
    const x = (((star.u * width - view.x * star.depth) % width) + width) % width;
    const y = (((star.v * height + view.y * star.depth * frame.cos) % height) + height) % height;
    ctx.globalAlpha = star.brightness * (0.7 + 0.3 * Math.sin(t * star.twinkleSpeed + star.phase));
    ctx.fillStyle = star.fill;
    ctx.fillRect(x, y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function strokePath(ctx, points, closed) {
  ctx.beginPath();
  points.forEach((point, k) => {
    const s = project(point);
    if (k === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  if (closed) ctx.closePath();
  ctx.stroke();
}

function drawOrbits(ctx) {
  ctx.save();
  for (const planet of planets) {
    const selected = view.follow === planet || hovered === planet;
    ctx.strokeStyle = rgba(planet.color, selected ? 0.75 : 0.28);
    ctx.lineWidth = selected ? 1.6 : 1;
    strokePath(ctx, planet.path, true);
  }
  ctx.setLineDash([3, 6]);
  for (const comet of comets) {
    const selected = view.follow === comet || hovered === comet;
    ctx.strokeStyle = selected ? 'rgba(170, 215, 255, 0.7)' : 'rgba(150, 195, 255, 0.22)';
    strokePath(ctx, comet.path, true);
  }
  ctx.restore();
}

/** Projects a small body directly into the canvas (no allocations: thousands per frame). */
function plotDot(ctx, x, y, z, size) {
  const dx = x - view.x;
  const dy = y - view.y;
  const dz = z - view.z;
  const sx = frame.cx + dx * frame.zoom;
  const sy = frame.cy - (dy * frame.cos + dz * frame.sin) * frame.zoom;
  if (sx < -4 || sy < -4 || sx > width + 4 || sy > height + 4) return;
  ctx.fillRect(sx, sy, size, size);
}

function drawSmallBodies(ctx, list, rgb) {
  const sizeScale = constrain(view.zoom, 0.8, 2.4);
  ctx.fillStyle = rgba(rgb, 1);
  for (const body of list) {
    const M = body.phase + body.meanMotion * simDays;
    const r = body.a * (1 - body.e * Math.cos(M));
    const longitude = body.peri + M + 2 * body.e * Math.sin(M); // first-order equation of the centre
    const s = displayDistance(r);
    ctx.globalAlpha = body.alpha;
    plotDot(
      ctx,
      Math.cos(longitude) * s,
      Math.sin(longitude) * s,
      s * body.sinI * Math.sin(longitude - body.node),
      body.size * sizeScale,
    );
  }
  ctx.globalAlpha = 1;
}

function drawBelts(ctx) {
  drawSmallBodies(ctx, asteroids, [205, 185, 165]);
  drawSmallBodies(ctx, kuiperBelt, [160, 180, 220]);

  const jupiterLongitude = Math.atan2(jupiter.helio.y, jupiter.helio.x);
  const libration = (TAU * simDays) / (150 * DAYS_PER_YEAR);
  const sizeScale = constrain(view.zoom, 0.8, 2.4);
  ctx.fillStyle = 'rgba(225, 175, 140, 0.6)';
  for (const trojan of trojans) {
    const longitude = jupiterLongitude + trojan.offset + trojan.libration * Math.sin(trojan.phase + libration);
    const s = displayDistance(trojan.a);
    plotDot(ctx, Math.cos(longitude) * s, Math.sin(longitude) * s, trojan.lift * s * 0.2, trojan.size * sizeScale);
  }
}

// ---------------------------------------------------------------------------
// Rendering: Sun, planets, moons, rings, comets
// ---------------------------------------------------------------------------

function fillCircleGradient(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r1, 0, TAU);
  ctx.fill();
}

/**
 * Draws the visible hemisphere of a scrolling texture, clipped to a disc. The disc is cut into
 * vertical strips whose longitudes follow asin(x), so surface features bunch up towards the limb
 * like on a real sphere.
 */
function drawTexturedDisc(ctx, texture, x, y, r, spin) {
  const offset = (1 - (((spin % 1) + 1) % 1)) * TEX_W;
  const strips = Math.round(constrain(r / 2, 6, 64));
  const sourceX = (screenFraction) => offset + (Math.asin(screenFraction) / Math.PI + 0.5) * (TEX_W / 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let k = 0; k < strips; k++) {
    const left = -1 + (2 * k) / strips;
    const right = -1 + (2 * (k + 1)) / strips;
    const from = sourceX(left);
    const to = sourceX(right);
    const destinationX = x + left * r;
    const destinationWidth = (right - left) * r + 0.6; // overlap hides seams between strips
    ctx.drawImage(texture.elt, from, 0, Math.max(0.5, to - from), TEX_H, destinationX, y - r, destinationWidth, 2 * r);
  }
  ctx.restore();
}

/** Direction to the Sun as seen on screen (x, y) plus how much the lit side faces the viewer. */
function sunlight(helio) {
  const toSun = normalise(scale(helio, -1));
  return { x: screenOffsetX(toSun), y: screenOffsetY(toSun), facing: -toSun.y * frame.sin + toSun.z * frame.cos };
}

function shadeSphere(ctx, x, y, r, light) {
  const hx = x + light.x * r * 0.6;
  const hy = y + light.y * r * 0.6;
  const reach = r * Math.max(1.2, 1.9 + 1.1 * light.facing);
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, reach);
  g.addColorStop(0, 'rgba(255, 250, 235, 0.22)');
  g.addColorStop(0.32, 'rgba(0, 0, 0, 0)');
  g.addColorStop(0.7, 'rgba(0, 0, 0, 0.72)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

const CORONA_BUFFER_SIZE = 110;
const CORONA_EXTENT = 3.6; // corona buffer half-size in solar radii
let coronaBuffer;

/** Tapered streamers whose length breathes with noise and fades to nothing at the tip. */
function drawStreamers(ctx, x, y, r, t, seed, count, rgb, alpha) {
  for (let k = 0; k < count; k++) {
    const a = ((k + 0.5 * noise(seed, k)) / count) * TAU;
    const n = noise(seed + Math.cos(a) * 1.4, seed + Math.sin(a) * 1.4, t * 0.25);
    const tip = r * (1.25 + 2.2 * n ** 2);
    const halfWidth = (TAU / count) * 0.9;
    const g = ctx.createLinearGradient(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, x + Math.cos(a) * tip, y + Math.sin(a) * tip);
    g.addColorStop(0, rgba(rgb, alpha));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a - halfWidth) * r * 0.9, y + Math.sin(a - halfWidth) * r * 0.9);
    ctx.lineTo(x + Math.cos(a) * tip, y + Math.sin(a) * tip);
    ctx.lineTo(x + Math.cos(a + halfWidth) * r * 0.9, y + Math.sin(a + halfWidth) * r * 0.9);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The corona is painted into a small offscreen buffer and scaled up: the bilinear upscale
 * blurs the streamers into a soft glow for the price of a few dozen tiny fills.
 */
function drawCorona(ctx, x, y, r, t) {
  const buffer = coronaBuffer.drawingContext;
  const half = CORONA_BUFFER_SIZE / 2;
  const bufferRadius = half / CORONA_EXTENT;
  buffer.clearRect(0, 0, CORONA_BUFFER_SIZE, CORONA_BUFFER_SIZE);
  buffer.globalCompositeOperation = 'lighter';
  drawStreamers(buffer, half, half, bufferRadius, t, 3, 48, [255, 215, 150], 0.26);
  drawStreamers(buffer, half, half, bufferRadius, t * 1.4, 40, 30, [255, 160, 80], 0.2);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(coronaBuffer.elt, x - r * CORONA_EXTENT, y - r * CORONA_EXTENT, 2 * r * CORONA_EXTENT, 2 * r * CORONA_EXTENT);
}

function drawSun(ctx) {
  const { x, y } = sun.screen;
  const r = sun.radius * view.zoom;
  const t = millis() / 1000;
  const pulse = 1 + 0.03 * Math.sin(t * 1.3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  fillCircleGradient(ctx, x, y, r * 0.5, r * 7 * pulse, [
    [0, 'rgba(255, 185, 90, 0.42)'],
    [0.22, 'rgba(255, 140, 50, 0.13)'],
    [1, 'rgba(255, 100, 30, 0)'],
  ]);
  drawCorona(ctx, x, y, r, t);
  ctx.restore();
  drawTexturedDisc(ctx, sun.texture, x, y, r, sun.spin);
  fillCircleGradient(ctx, x, y, 0, r, [
    [0, 'rgba(255, 255, 230, 0.3)'],
    [0.55, 'rgba(255, 210, 130, 0)'],
    [0.88, 'rgba(210, 90, 10, 0.25)'],
    [1, 'rgba(150, 45, 0, 0.6)'],
  ]);
}

/** Traces a circle of `radius` (screen px) in the plane (u, v) around (cx, cy) from angle `from` to `to`. */
function traceEquatorialArc(ctx, cx, cy, basis, radius, from, to, continuePath) {
  const steps = 48;
  for (let k = 0; k <= steps; k++) {
    const a = from + ((to - from) * k) / steps;
    const o = add(scale(basis.u, Math.cos(a) * radius), scale(basis.v, Math.sin(a) * radius));
    const sx = cx + screenOffsetX(o);
    const sy = cy + screenOffsetY(o);
    if (k === 0 && !continuePath) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
}

/** Rings are split into the half behind the planet and the half in front of it. */
function drawRings(ctx, planet, half) {
  const toViewer = vec(0, -frame.sin, frame.cos);
  const nearest = Math.atan2(dot(planet.basis.v, toViewer), dot(planet.basis.u, toViewer));
  const from = half === 'back' ? nearest + Math.PI / 2 : nearest - Math.PI / 2;
  const unit = planet.radius * view.zoom;
  const { x, y } = planet.screen;
  for (const ring of planet.rings) {
    const seam = 0.6 / Math.max(1, ring.outer * unit); // ~half a pixel of overlap hides the anti-aliased join
    ctx.beginPath();
    traceEquatorialArc(ctx, x, y, planet.basis, ring.outer * unit, from - seam, from + Math.PI + seam, false);
    traceEquatorialArc(ctx, x, y, planet.basis, ring.inner * unit, from + Math.PI + seam, from - seam, true);
    ctx.closePath();
    ctx.fillStyle = ring.color;
    ctx.fill();
  }
}

function moonPlacement(planet, moon) {
  const period = (MOON_PERIOD_OFFSET + Math.abs(moon.periodDays)) * Math.sign(moon.periodDays);
  const angle = moon.phase + (TAU * simDays) / period;
  const radius = moon.orbit * planet.radius;
  const offset = add(scale(planet.basis.u, Math.cos(angle) * radius), scale(planet.basis.v, Math.sin(angle) * radius));
  return { moon, screen: project(add(planet.pos, offset)) };
}

function drawMoon(ctx, placement, light) {
  const { moon, screen } = placement;
  const r = Math.max(1, moon.radius * view.zoom);
  ctx.fillStyle = rgba(moon.color, 1);
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, TAU);
  ctx.fill();
  if (r > 2) shadeSphere(ctx, screen.x, screen.y, r, light);
}

function drawAtmosphere(ctx, x, y, r, rgb) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  fillCircleGradient(ctx, x, y, r * 0.9, r * 1.28, [
    [0, rgba(rgb, 0)],
    [0.3, rgba(rgb, 0.42)],
    [1, rgba(rgb, 0)],
  ]);
  ctx.restore();
}

function drawPlanet(ctx, planet) {
  const { x, y, depth } = planet.screen;
  const r = Math.max(1.2, planet.radius * view.zoom);
  const light = sunlight(planet.helio);
  const moons = planet.moons.map((moon) => moonPlacement(planet, moon)).sort((a, b) => a.screen.depth - b.screen.depth);

  if (showOrbits && planet.moons.length > 0 && planet.radius * view.zoom * 2 > 6) {
    ctx.strokeStyle = 'rgba(200, 210, 255, 0.16)';
    ctx.lineWidth = 1;
    for (const moon of planet.moons) {
      ctx.beginPath();
      traceEquatorialArc(ctx, x, y, planet.basis, moon.orbit * planet.radius * view.zoom, 0, TAU, false);
      ctx.stroke();
    }
  }

  moons.filter((m) => m.screen.depth < depth).forEach((m) => drawMoon(ctx, m, light));
  if (planet.rings.length > 0) drawRings(ctx, planet, 'back');
  if (r < 2.5) {
    ctx.fillStyle = rgba(planet.color, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  } else {
    drawTexturedDisc(ctx, planet.texture, x, y, r, planet.spin);
    shadeSphere(ctx, x, y, r, light);
    if (planet.atmosphere) drawAtmosphere(ctx, x, y, r, planet.atmosphere);
  }
  if (planet.rings.length > 0) drawRings(ctx, planet, 'front');
  moons.filter((m) => m.screen.depth >= depth).forEach((m) => drawMoon(ctx, m, light));
  planet.moonPlacements = moons;
}

function drawTail(ctx, from, tipWorld, spread, rgb, alpha) {
  const tip = project(tipWorld);
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const nx = -dy / length;
  const ny = dx / length;
  const g = ctx.createLinearGradient(from.x, from.y, tip.x, tip.y);
  g.addColorStop(0, rgba(rgb, alpha));
  g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g;
  for (const widen of [1, 0.45]) {
    const w = length * spread * widen;
    ctx.beginPath();
    ctx.moveTo(from.x + nx * 1.5, from.y + ny * 1.5);
    ctx.lineTo(tip.x + nx * w, tip.y + ny * w);
    ctx.lineTo(tip.x - nx * w, tip.y - ny * w);
    ctx.lineTo(from.x - nx * 1.5, from.y - ny * 1.5);
    ctx.closePath();
    ctx.fill();
  }
}

function drawComet(ctx, comet) {
  const r = comet.helio.r;
  const activity = clamp01((3.5 - r) / 2.5);
  const { x, y } = comet.screen;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (activity > 0) {
    const away = normalise(comet.pos);
    const heading = normalise(sub(toDisplay(heliocentric(comet.orbit, simDays + 0.5)), comet.pos));
    const length = Math.min(160, 90 / r) * activity;
    drawTail(ctx, comet.screen, add(comet.pos, scale(away, length)), 0.08, [130, 185, 255], 0.6 * activity);
    const dustDirection = normalise(sub(away, scale(heading, 0.45)));
    drawTail(ctx, comet.screen, add(comet.pos, scale(dustDirection, length * 0.75)), 0.2, [255, 226, 176], 0.45 * activity);
  }
  const coma = Math.max(2, (1.5 + 5 * activity) * Math.sqrt(view.zoom));
  fillCircleGradient(ctx, x, y, 0, coma * 2.5, [
    [0, 'rgba(235, 245, 255, 0.95)'],
    [0.25, 'rgba(150, 200, 255, 0.35)'],
    [1, 'rgba(120, 170, 255, 0)'],
  ]);
  ctx.restore();
}

/** Everything that can occlude something else is drawn back to front. */
function drawBodies(ctx) {
  sun.screen = project(sun.pos);
  const items = [{ depth: sun.screen.depth, render: () => drawSun(ctx) }];
  for (const planet of planets) {
    planet.screen = project(planet.pos);
    items.push({ depth: planet.screen.depth, render: () => drawPlanet(ctx, planet) });
  }
  for (const comet of comets) {
    comet.screen = project(comet.pos);
    items.push({ depth: comet.screen.depth, render: () => drawComet(ctx, comet) });
  }
  items.sort((a, b) => a.depth - b.depth).forEach((item) => item.render());
}

// ---------------------------------------------------------------------------
// Rendering: labels & selection
// ---------------------------------------------------------------------------

function screenRadius(body) {
  return Math.max(body === sun ? 4 : 3, body.radius * view.zoom);
}

const LABEL_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function drawLabel(ctx, body, emphasis) {
  const { x, y } = body.screen;
  const r = screenRadius(body);
  const minor = !body.moons || body.kind === 'Dwarf planet';
  ctx.font = `${minor ? 11 : 12.5}px ${LABEL_FONT}`;
  ctx.fillStyle = emphasis ? 'rgb(255, 214, 130)' : `rgba(215, 222, 255, ${minor ? 0.68 : 0.9})`;
  ctx.fillText(body.name, x + r + 6, y - r * 0.4 - 2);
}

function drawLabels(ctx) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const body of [...planets, ...comets]) {
    const emphasis = body === view.follow || body === hovered;
    if (showLabels || emphasis) drawLabel(ctx, body, emphasis);
  }
  if (hovered === sun) drawLabel(ctx, sun, true);
  ctx.font = `10.5px ${LABEL_FONT}`;
  ctx.fillStyle = 'rgba(190, 198, 230, 0.8)';
  for (const planet of planets) {
    if (!showLabels || planet.moons.length === 0) continue;
    const innermostOrbitPixels = planet.radius * view.zoom * Math.min(...planet.moons.map((moon) => moon.orbit));
    if (innermostOrbitPixels < 70) continue;
    for (const { moon, screen } of planet.moonPlacements) {
      ctx.fillText(moon.name, screen.x + Math.max(1, moon.radius * view.zoom) + 4, screen.y);
    }
  }
}

function drawSelection(ctx) {
  const body = view.follow;
  if (!body || body === sun) return;
  const { x, y } = body.screen;
  const r = screenRadius(body) + 6 + Math.sin(millis() / 300) * 1.5;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 214, 130, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const formatNumber = (value, digits = 0) =>
  value.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function formatDate(days) {
  const date = new Date(J2000_MS + days * DAY_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatPeriod(years) {
  return years < 2 ? `${formatNumber(years * DAYS_PER_YEAR, 0)} days` : `${formatNumber(years, 2)} years`;
}

function formatDayLength(hours) {
  const length = Math.abs(hours) < 48 ? `${formatNumber(Math.abs(hours), 1)} h` : `${formatNumber(Math.abs(hours) / 24, 1)} days`;
  return hours < 0 ? `${length} (retrograde)` : length;
}

function bodyFacts(body) {
  if (body === sun) {
    return [
      ['Radius', `${formatNumber(body.radiusKm)} km`],
      ['Surface temperature', '5,772 K'],
      ['Rotation (equator)', formatDayLength(body.dayHours)],
      ['Age', '4.6 billion years'],
    ];
  }
  const { a, e, inclination } = body.orbit;
  const r = body.helio.r;
  const facts = [
    ['Distance from Sun', `${formatNumber(r, 3)} AU`],
    ['Light travel time', `${formatNumber(r * LIGHT_MINUTES_PER_AU, 1)} min`],
    ['Orbital speed', `${formatNumber(orbitalSpeed(r, a), 2)} km/s`],
    ['Orbital period', formatPeriod(a ** 1.5)],
    ['Eccentricity', formatNumber(e, 4)],
    ['Inclination', `${formatNumber(inclination, 2)}°`],
  ];
  if (!body.moons) {
    return [...facts, ['Perihelion', `${formatNumber(a * (1 - e), 2)} AU`], ['Aphelion', `${formatNumber(a * (1 + e), 2)} AU`]];
  }
  return [
    ['Radius', `${formatNumber(body.radiusKm)} km`],
    ...facts,
    ['Day length', formatDayLength(body.dayHours)],
    ['Moons shown', body.moons.map((moon) => moon.name).join(', ') || 'none'],
  ];
}

function updateInfo() {
  const card = $('info');
  const body = view.follow;
  card.classList.toggle('visible', Boolean(body));
  if (!body) return;
  $('info-name').textContent = body.name;
  $('info-kind').textContent = body.kind;
  $('info-note').textContent = body.note;
  const list = $('info-facts');
  list.replaceChildren(
    ...bodyFacts(body).flatMap(([label, value]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      return [term, detail];
    }),
  );
}

function updateHud() {
  $('hud-date').textContent = formatDate(simDays);
  const speed = SPEEDS[speedIndex];
  const secondsPerYear = DAYS_PER_YEAR / (speed * DAYS_PER_SECOND);
  const yearText = secondsPerYear >= 1 ? `1 yr ≈ ${formatNumber(secondsPerYear, 0)} s` : `${formatNumber(1 / secondsPerYear, 1)} yr/s`;
  $('hud-speed').textContent = `${paused ? 'paused · ' : ''}${timeDirection < 0 ? '−' : ''}×${speed} · ${yearText}`;
  $('hud-follow').textContent = view.follow ? view.follow.name : 'free camera';
  updateInfo();
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function bodyAt(mx, my) {
  let best = null;
  let bestDistance = Infinity;
  for (const body of [sun, ...planets, ...comets]) {
    const d = Math.hypot(body.screen.x - mx, body.screen.y - my);
    if (d < screenRadius(body) + 8 && d < bestDistance) {
      best = body;
      bestDistance = d;
    }
  }
  return best;
}

function canvasCursor() {
  cursor(press?.dragging ? 'grabbing' : hovered ? 'pointer' : 'grab');
}

function mousePressed() {
  press = { x: mouseX, y: mouseY, dragging: false };
}

function mouseDragged() {
  if (!press) return;
  if (!press.dragging && Math.hypot(mouseX - press.x, mouseY - press.y) > 4) {
    press.dragging = true;
    if (!keyIsDown(SHIFT)) releaseFollow();
  }
  if (!press.dragging) return;
  const dx = mouseX - pmouseX;
  const dy = mouseY - pmouseY;
  if (keyIsDown(SHIFT)) {
    view.goal.tilt = constrain(view.goal.tilt + dy * 0.006, 0, MAX_TILT);
    return;
  }
  const cosTilt = Math.cos(view.tilt);
  view.x -= dx / view.zoom;
  view.y += dy / (view.zoom * cosTilt);
  view.goal.x = view.x;
  view.goal.y = view.y;
}

function mouseReleased() {
  if (press && !press.dragging) {
    const body = bodyAt(mouseX, mouseY);
    if (body) followBody(body);
  }
  press = null;
}

function doubleClicked() {
  resetView();
}

function mouseWheel(event) {
  zoomAt(mouseX, mouseY, Math.exp(-event.delta * 0.0015));
  return false;
}

function keyPressed() {
  if (key >= '1' && key <= '9') {
    followBody(planets[Number(key) - 1]);
  } else if (key === '0' || keyCode === ESCAPE) {
    resetView();
  } else if (key === ' ') {
    paused = !paused;
  } else if (keyCode === RIGHT_ARROW || key === '+' || key === '=') {
    speedIndex = Math.min(SPEEDS.length - 1, speedIndex + 1);
  } else if (keyCode === LEFT_ARROW || key === '-') {
    speedIndex = Math.max(0, speedIndex - 1);
  } else if (keyCode === UP_ARROW) {
    view.goal.tilt = Math.min(MAX_TILT, view.goal.tilt + 0.1);
  } else if (keyCode === DOWN_ARROW) {
    view.goal.tilt = Math.max(0, view.goal.tilt - 0.1);
  } else if (key === 'r' || key === 'R') {
    timeDirection *= -1;
  } else if (key === 'l' || key === 'L') {
    showLabels = !showLabels;
  } else if (key === 'o' || key === 'O') {
    showOrbits = !showOrbits;
  } else if (key === 'h' || key === 'H') {
    $('help').classList.toggle('hidden');
  } else {
    return true;
  }
  hudCountdown = 0;
  return false;
}
