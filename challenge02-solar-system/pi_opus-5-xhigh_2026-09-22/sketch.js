/**
 * Solar System — p5.js
 * ====================
 *
 * A Keplerian orbit simulation of the eight major planets, their brightest
 * moons, the asteroid and Kuiper belts, and a pair of comets.
 *
 * What is physically real here
 * ---------------------------
 *  - Semi-major axes, eccentricities, longitudes of perihelion, sidereal
 *    periods, body radii and (approximate) colours come from real data.
 *  - Positions are solved from Kepler's equation every frame, so planets
 *    genuinely speed up at perihelion and crawl at aphelion.
 *
 * Where artistic licence is taken (otherwise you would see nothing)
 * ----------------------------------------------------------------
 *  - Distances are compressed with a power law (au ** 0.55) and radii with
 *    (km ** 0.4); both keep the ordering and a sense of proportion while
 *    fitting Mercury and Neptune on one screen.
 *  - Orbital inclinations are ignored: everything shares one plane, which is
 *    drawn tilted towards the viewer.
 *  - Moons are pushed away from their planet and slowed down so they read as
 *    separate objects instead of a blur.
 *
 * Controls
 * --------
 *  drag / arrows  pan          wheel / +- zoom        space  pause
 *  , .            slower/faster            0-8  follow sun/planet
 *  o  orbits      l  labels    b  belts    h  help     r  reset view
 */

'use strict';

/* ------------------------------------------------------------------ scale -- */

const ORBIT_PX_AT_1AU = 74;
const ORBIT_COMPRESSION = 0.55;
const RADIUS_PX_AT_EARTH = 5.2;
const RADIUS_COMPRESSION = 0.4;
const PLANE_TILT = 0.52; // vertical squash of the orbital plane
const DAYS_PER_SECOND = 24; // at speed 1x
const MOON_SLOWDOWN = 0.18; // moons would otherwise strobe

const orbitPx = (au) => ORBIT_PX_AT_1AU * Math.pow(au, ORBIT_COMPRESSION);
const bodyPx = (km) => RADIUS_PX_AT_EARTH * Math.pow(km / 6371, RADIUS_COMPRESSION);

/* ------------------------------------------------------------------- data -- */

// The Sun keeps its own (smaller) drawn radius: the shared body compression
// would otherwise swallow Mercury's orbit whole.
const SUN = { name: 'Sun', radiusKm: 696340, drawRadius: 21, colour: [255, 196, 92] };

/**
 * au           semi-major axis (astronomical units)
 * e            eccentricity
 * peri         longitude of perihelion (degrees)
 * m0           mean anomaly at epoch (degrees) — spreads the planets out
 * periodDays   sidereal orbital period
 * radiusKm     equatorial radius
 * bands        extra cloud-band tints drawn over the disc
 */
const PLANETS = [
  {
    name: 'Mercury', au: 0.3871, e: 0.2056, peri: 77, m0: 174, periodDays: 87.97,
    radiusKm: 2440, colour: [168, 160, 150], bands: [],
  },
  {
    name: 'Venus', au: 0.7233, e: 0.0068, peri: 131, m0: 50, periodDays: 224.7,
    radiusKm: 6052, colour: [232, 196, 130], bands: [[255, 232, 190, 90]],
  },
  {
    name: 'Earth', au: 1.0, e: 0.0167, peri: 103, m0: 358, periodDays: 365.26,
    radiusKm: 6371, colour: [86, 138, 214], bands: [[120, 190, 140, 150], [235, 245, 255, 90]],
    moons: [{ name: 'Moon', radiusKm: 1737, periodDays: 27.3, distance: 3.4, colour: [206, 204, 198] }],
  },
  {
    name: 'Mars', au: 1.5237, e: 0.0934, peri: 336, m0: 19, periodDays: 686.98,
    radiusKm: 3390, colour: [199, 108, 73], bands: [[240, 235, 230, 110]],
    moons: [
      { name: 'Phobos', radiusKm: 11, periodDays: 0.32, distance: 2.9, colour: [170, 160, 150] },
      { name: 'Deimos', radiusKm: 6, periodDays: 1.26, distance: 4.3, colour: [150, 142, 134] },
    ],
  },
  {
    name: 'Jupiter', au: 5.2029, e: 0.0484, peri: 14, m0: 20, periodDays: 4332.6,
    radiusKm: 69911, colour: [214, 176, 132],
    bands: [[168, 126, 92, 170], [240, 222, 196, 140], [196, 110, 80, 130]],
    moons: [
      { name: 'Io', radiusKm: 1822, periodDays: 1.77, distance: 1.9, colour: [230, 214, 140] },
      { name: 'Europa', radiusKm: 1561, periodDays: 3.55, distance: 2.5, colour: [224, 214, 200] },
      { name: 'Ganymede', radiusKm: 2634, periodDays: 7.15, distance: 3.2, colour: [188, 172, 152] },
      { name: 'Callisto', radiusKm: 2410, periodDays: 16.69, distance: 4.1, colour: [140, 130, 122] },
    ],
  },
  {
    name: 'Saturn', au: 9.537, e: 0.0539, peri: 93, m0: 317, periodDays: 10759,
    radiusKm: 58232, colour: [226, 202, 150],
    bands: [[200, 176, 128, 150], [246, 232, 200, 120]],
    rings: { inner: 1.35, outer: 2.3, tilt: 0.34, colour: [232, 216, 180] },
    moons: [
      { name: 'Titan', radiusKm: 2575, periodDays: 15.95, distance: 3.6, colour: [214, 166, 96] },
      { name: 'Rhea', radiusKm: 764, periodDays: 4.52, distance: 2.4, colour: [196, 192, 186] },
    ],
  },
  {
    name: 'Uranus', au: 19.191, e: 0.0473, peri: 173, m0: 142, periodDays: 30687,
    radiusKm: 25362, colour: [150, 214, 220], bands: [[186, 232, 236, 110]],
    // Uranus rolls on its side, so its rings are seen almost edge-on vertically.
    rings: { inner: 1.6, outer: 2.0, tilt: 0.12, vertical: true, colour: [150, 200, 210] },
    moons: [{ name: 'Titania', radiusKm: 789, periodDays: 8.71, distance: 3.0, colour: [190, 190, 190] }],
  },
  {
    name: 'Neptune', au: 30.07, e: 0.0086, peri: 48, m0: 256, periodDays: 60190,
    radiusKm: 24622, colour: [76, 118, 214], bands: [[120, 160, 240, 120], [230, 240, 255, 70]],
    moons: [{ name: 'Triton', radiusKm: 1353, periodDays: 5.88, distance: 3.1, colour: [204, 198, 206] }],
  },
];

const COMETS = [
  { name: 'Halley', au: 17.8, e: 0.967, peri: 112, m0: 12, periodDays: 27510, colour: [188, 232, 255] },
  { name: 'Encke', au: 2.22, e: 0.848, peri: 187, m0: 200, periodDays: 1204, colour: [200, 244, 226] },
];

/* ------------------------------------------------------------------ state -- */

const camera = { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1, follow: 0 };
const view = { orbits: true, labels: true, belts: true, help: true, paused: false };

let simDays = 0;
let speed = 1;
let stars = [];
let asteroids = [];
let kuiper = [];
let dragging = false;

/* ------------------------------------------------------------------ setup -- */

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('sketch-holder');
  pixelDensity(Math.min(2, displayDensity()));
  ellipseMode(RADIUS);
  textFont('monospace');
  randomSeed(20260922);
  noiseSeed(20260922);

  stars = buildStarfield(760);
  asteroids = buildBelt(900, orbitPx(2.06), orbitPx(3.28), 0.9);
  kuiper = buildBelt(700, orbitPx(30.5), orbitPx(49), 0.55);
  fitToScreen();
  camera.x = camera.targetX;
  camera.y = camera.targetY;
  camera.zoom = camera.targetZoom;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fitToScreen();
}

function fitToScreen() {
  const span = orbitPx(30.07) * 1.12;
  camera.targetZoom = Math.min(width / (span * 2), height / (span * 2 * PLANE_TILT + 120));
  camera.targetX = 0;
  camera.targetY = 0;
  camera.follow = 0;
}

function buildStarfield(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      x: random(-1, 1),
      y: random(-1, 1),
      r: random(0.3, 1.5),
      depth: random(0.05, 0.45),
      glow: random(90, 235),
      phase: random(TWO_PI),
      twinkle: random(0.4, 2.2),
      tint: random() < 0.18 ? random([[190, 210, 255], [255, 220, 190]]) : [255, 255, 255],
    });
  }
  return out;
}

function buildBelt(count, inner, outer, thickness) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const a = random(inner, outer);
    out.push({
      a,
      e: random(0, 0.14),
      peri: random(TWO_PI),
      m0: random(TWO_PI),
      // Kepler's third law keeps the belt shearing realistically.
      speed: TWO_PI / (365.26 * Math.pow(a / orbitPx(1), 3 / ORBIT_COMPRESSION / 2)),
      size: random(0.35, 1.5),
      wobble: random(-thickness, thickness) * 14,
      bright: random(70, 190),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ orbit -- */

/** Newton solve of Kepler's equation M = E - e·sin E. */
function eccentricAnomaly(meanAnomaly, e) {
  let E = meanAnomaly;
  for (let i = 0; i < 6; i += 1) {
    const d = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-9) break;
  }
  return E;
}

/** Position on an ellipse with the Sun at one focus, in tilted screen space. */
function orbitPoint(a, e, periRad, E) {
  const b = a * Math.sqrt(1 - e * e);
  const px = a * (Math.cos(E) - e);
  const py = b * Math.sin(E);
  const cos = Math.cos(periRad);
  const sin = Math.sin(periRad);
  return { x: px * cos - py * sin, y: (px * sin + py * cos) * PLANE_TILT };
}

function stateOf(body, days) {
  const a = body.aPx !== undefined ? body.aPx : orbitPx(body.au);
  const M = radians(body.m0) + (TWO_PI * days) / body.periodDays;
  const E = eccentricAnomaly(((M % TWO_PI) + TWO_PI) % TWO_PI, body.e);
  const p = orbitPoint(a, body.e, radians(body.peri), E);
  p.a = a;
  p.E = E;
  return p;
}

/* ------------------------------------------------------------------- draw -- */

function draw() {
  if (!view.paused) simDays += (deltaTime / 1000) * DAYS_PER_SECOND * speed;

  background(4, 5, 12);
  drawStarfield();
  updateCamera();

  push();
  translate(width / 2, height / 2);
  scale(camera.zoom);
  translate(-camera.x, -camera.y);

  if (view.orbits) drawOrbits();
  if (view.belts) drawBelt(asteroids, 1);
  drawSun();

  const drawables = [];
  for (const planet of PLANETS) {
    const pos = stateOf(planet, simDays);
    planet.pos = pos;
    drawables.push({ y: pos.y, render: () => drawPlanet(planet, pos) });
  }
  for (const comet of COMETS) {
    const pos = stateOf(comet, simDays);
    comet.pos = pos;
    drawables.push({ y: pos.y, render: () => drawComet(comet, pos) });
  }
  // Painter's algorithm: whatever is lower on the tilted plane is nearer.
  drawables.sort((p, q) => p.y - q.y);
  for (const item of drawables) item.render();

  if (view.belts) drawBelt(kuiper, 0.75);
  pop();

  if (view.labels) drawLabels();
  drawHud();
}

/* --------------------------------------------------------------- elements -- */

function drawStarfield() {
  noStroke();
  const driftX = -camera.x * camera.zoom;
  const driftY = -camera.y * camera.zoom;
  for (const star of stars) {
    const x = wrap(star.x * width + driftX * star.depth, width);
    const y = wrap(star.y * height + driftY * star.depth, height);
    const pulse = 0.65 + 0.35 * Math.sin(millis() * 0.001 * star.twinkle + star.phase);
    fill(star.tint[0], star.tint[1], star.tint[2], star.glow * pulse);
    circle(x, y, star.r);
  }
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function drawSun() {
  const r = SUN.drawRadius;
  const pulse = 1 + 0.015 * Math.sin(millis() * 0.0016);
  noStroke();
  // Corona: one smooth radial gradient, so the inner planets stay readable.
  const corona = r * 4.4 * pulse;
  const gradient = drawingContext.createRadialGradient(0, 0, r * 0.7, 0, 0, corona);
  gradient.addColorStop(0, 'rgba(255,186,96,0.42)');
  gradient.addColorStop(0.18, 'rgba(255,146,48,0.16)');
  gradient.addColorStop(0.45, 'rgba(255,120,36,0.06)');
  gradient.addColorStop(1, 'rgba(255,100,30,0)');
  drawingContext.save();
  drawingContext.fillStyle = gradient;
  drawingContext.beginPath();
  drawingContext.arc(0, 0, corona, 0, TWO_PI);
  drawingContext.fill();
  drawingContext.restore();

  drawingContext.save();
  drawingContext.shadowBlur = 60;
  drawingContext.shadowColor = 'rgba(255,180,80,0.95)';
  fill(255, 236, 190);
  circle(0, 0, r * pulse);
  drawingContext.restore();
  fill(255, 252, 236);
  circle(0, 0, r * 0.82 * pulse);
}

function drawOrbits() {
  noFill();
  for (const planet of PLANETS) {
    stroke(140, 170, 235, 46);
    strokeWeight(1 / camera.zoom);
    traceOrbit(orbitPx(planet.au), planet.e, radians(planet.peri));
  }
  for (const comet of COMETS) {
    stroke(150, 230, 220, 42);
    strokeWeight(1 / camera.zoom);
    traceOrbit(orbitPx(comet.au), comet.e, radians(comet.peri));
  }
}

function traceOrbit(a, e, periRad) {
  beginShape();
  for (let i = 0; i <= 140; i += 1) {
    const p = orbitPoint(a, e, periRad, (i / 140) * TWO_PI);
    vertex(p.x, p.y);
  }
  endShape(CLOSE);
}

function drawBelt(rocks, alpha) {
  noStroke();
  for (const rock of rocks) {
    const E = rock.m0 + simDays * rock.speed;
    const p = orbitPoint(rock.a, rock.e, rock.peri, E);
    fill(206, 194, 176, rock.bright * alpha);
    circle(p.x, p.y + rock.wobble * PLANE_TILT, rock.size);
  }
}

function drawPlanet(planet, pos) {
  const r = bodyPx(planet.radiusKm);
  push();
  translate(pos.x, pos.y);

  if (planet.rings) drawRings(planet, r, true);
  drawDisc(r, planet.colour, planet.bands, pos);
  if (planet.rings) drawRings(planet, r, false);

  if (planet.moons) {
    for (const moon of planet.moons) {
      const angle = (TWO_PI * simDays * MOON_SLOWDOWN) / moon.periodDays + moon.name.length;
      const d = r * moon.distance + 4;
      const mx = Math.cos(angle) * d;
      const my = Math.sin(angle) * d * PLANE_TILT;
      const mr = Math.max(0.9, bodyPx(moon.radiusKm) * 0.55);
      noStroke();
      fill(moon.colour[0], moon.colour[1], moon.colour[2], 42);
      circle(mx, my, mr * 1.9);
      fill(moon.colour);
      circle(mx, my, mr);
      moon.screen = { x: pos.x + mx, y: pos.y + my };
    }
  }
  pop();
}

/** Planet disc with cloud bands and a terminator facing away from the Sun. */
function drawDisc(r, colour, bands, pos) {
  noStroke();
  // Atmospheric halo: a gradient, so there is no visible disc edge.
  const halo = drawingContext.createRadialGradient(0, 0, r * 0.95, 0, 0, r * 1.75);
  halo.addColorStop(0, `rgba(${colour[0]},${colour[1]},${colour[2]},0.28)`);
  halo.addColorStop(1, `rgba(${colour[0]},${colour[1]},${colour[2]},0)`);
  drawingContext.save();
  drawingContext.fillStyle = halo;
  drawingContext.beginPath();
  drawingContext.arc(0, 0, r * 1.75, 0, TWO_PI);
  drawingContext.fill();
  drawingContext.restore();

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, r, 0, TWO_PI);
  drawingContext.clip();

  fill(colour);
  circle(0, 0, r);
  for (let i = 0; i < bands.length; i += 1) {
    const band = bands[i];
    fill(band[0], band[1], band[2], band[3]);
    const offset = (i - (bands.length - 1) / 2) * r * 0.62;
    ellipse(0, offset, r * 1.2, r * 0.22 + r * 0.05 * i);
  }

  // Shading: a radial gradient centred on the sub-solar point, which gives a
  // soft terminator instead of a hard circular bite.
  const len = Math.max(1e-6, Math.hypot(pos.x, pos.y));
  const sx = (-pos.x / len) * r * 0.55;
  const sy = (-pos.y / len) * r * 0.55;
  const shade = drawingContext.createRadialGradient(sx, sy, r * 0.1, sx, sy, r * 2.05);
  shade.addColorStop(0, 'rgba(255,240,210,0.10)');
  shade.addColorStop(0.35, 'rgba(8,10,24,0.05)');
  shade.addColorStop(0.72, 'rgba(8,10,24,0.55)');
  shade.addColorStop(1, 'rgba(4,6,16,0.92)');
  drawingContext.fillStyle = shade;
  drawingContext.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  drawingContext.restore();

  // Sun-facing limb highlight.
  noFill();
  stroke(255, 246, 226, 120);
  strokeWeight(Math.max(0.4, r * 0.09));
  arc(0, 0, r * 0.96, r * 0.96, Math.atan2(-pos.y, -pos.x) - 0.9, Math.atan2(-pos.y, -pos.x) + 0.9);
  noStroke();
}

function drawRings(planet, r, behind) {
  const { inner, outer, tilt, colour, vertical } = planet.rings;
  push();
  if (vertical) rotate(HALF_PI);
  noFill();
  const steps = 9;
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const rad = lerp(r * inner, r * outer, t);
    const cassini = Math.abs(t - 0.62) < 0.07 ? 0.25 : 1; // Cassini division
    stroke(colour[0], colour[1], colour[2], (behind ? 90 : 150) * cassini);
    strokeWeight(Math.max(0.5, (r * (outer - inner)) / steps));
    const ry = rad * tilt;
    if (behind) arc(0, 0, rad, ry, PI, TWO_PI);
    else arc(0, 0, rad, ry, 0, PI);
  }
  pop();
  noStroke();
}

function drawComet(comet, pos) {
  const len = Math.max(1e-6, Math.hypot(pos.x, pos.y));
  const away = { x: pos.x / len, y: pos.y / len };
  // Tails are longest near the Sun, and always point away from it.
  const brightness = constrain(map(len, orbitPx(0.4), orbitPx(12), 1, 0.06), 0.06, 1);
  const tail = 26 + 150 * brightness;
  noStroke();
  blendMode(ADD);
  for (let i = 0; i < 60; i += 1) {
    const t = i / 60;
    const spread = t * 7 * brightness;
    const fade = (1 - t) * brightness;
    fill(comet.colour[0] * 0.14 * fade, comet.colour[1] * 0.18 * fade, comet.colour[2] * 0.2 * fade, 255);
    circle(
      pos.x + away.x * tail * t + Math.sin(t * 7 + simDays * 0.05) * spread,
      pos.y + away.y * tail * t * PLANE_TILT + Math.cos(t * 5) * spread * PLANE_TILT,
      2.4 + t * 8 * brightness,
    );
  }
  blendMode(BLEND);
  fill(255, 255, 255, 200 * brightness + 40);
  circle(pos.x, pos.y, 1.9);
}

/* ---------------------------------------------------------------- overlay -- */

function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom + width / 2,
    y: (y - camera.y) * camera.zoom + height / 2,
  };
}

function drawLabels() {
  textAlign(LEFT, CENTER);
  textSize(11);
  const sun = worldToScreen(0, 0);
  noStroke();
  fill(255, 214, 150, 220);
  text('Sun', sun.x + 10, sun.y + SUN.drawRadius * camera.zoom + 12);

  for (const planet of PLANETS) {
    if (!planet.pos) continue;
    const s = worldToScreen(planet.pos.x, planet.pos.y);
    if (s.x < -60 || s.x > width + 60 || s.y < -40 || s.y > height + 40) continue;
    const off = bodyPx(planet.radiusKm) * camera.zoom + 7;
    fill(190, 210, 255, 200);
    text(planet.name, s.x + off, s.y - off * 0.5);
    if (camera.zoom > 2.2 && planet.moons) {
      textSize(9);
      for (const moon of planet.moons) {
        if (!moon.screen) continue;
        const ms = worldToScreen(moon.screen.x, moon.screen.y);
        fill(170, 185, 215, 170);
        text(moon.name, ms.x + 5, ms.y - 5);
      }
      textSize(11);
    }
  }
  for (const comet of COMETS) {
    if (!comet.pos) continue;
    const s = worldToScreen(comet.pos.x, comet.pos.y);
    fill(170, 235, 225, 170);
    text(`${comet.name}'s comet`, s.x + 8, s.y - 8);
  }
}

function focusName() {
  if (camera.follow === 0) return 'Sun';
  if (camera.follow > 0) return PLANETS[camera.follow - 1].name;
  return 'free';
}

function drawHud() {
  const years = simDays / 365.26;
  const lines = [
    `epoch  +${years.toFixed(2)} yr  (${Math.floor(simDays).toLocaleString()} d)`,
    `speed  ${speed.toFixed(2)}x  ${view.paused ? '[paused]' : ''}`,
    `zoom   ${camera.zoom.toFixed(2)}x   focus: ${focusName()}`,
  ];
  const help = [
    '',
    'drag / arrows  pan        wheel or + -  zoom',
    'space  pause              , .  slower / faster',
    '0-8  follow sun/planet    r  reset view',
    'o  orbits   l  labels   b  belts   h  hide help',
  ];
  const all = view.help ? lines.concat(help) : lines;

  noStroke();
  fill(8, 11, 24, 170);
  rect(14, 14, 330, 20 + all.length * 16, 8);
  textAlign(LEFT, TOP);
  textSize(11);
  for (let i = 0; i < all.length; i += 1) {
    fill(i < lines.length ? color(210, 226, 255) : color(150, 168, 205));
    text(all[i], 28, 24 + i * 16);
  }
}

/* --------------------------------------------------------------- controls -- */

function updateCamera() {
  if (camera.follow > 0) {
    const planet = PLANETS[camera.follow - 1];
    if (planet.pos) {
      camera.targetX = planet.pos.x;
      camera.targetY = planet.pos.y;
    }
  }
  if (keyIsDown(LEFT_ARROW)) camera.targetX -= 8 / camera.zoom;
  if (keyIsDown(RIGHT_ARROW)) camera.targetX += 8 / camera.zoom;
  if (keyIsDown(UP_ARROW)) camera.targetY -= 8 / camera.zoom;
  if (keyIsDown(DOWN_ARROW)) camera.targetY += 8 / camera.zoom;

  camera.x = lerp(camera.x, camera.targetX, 0.12);
  camera.y = lerp(camera.y, camera.targetY, 0.12);
  camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.12);
}

function mousePressed() {
  dragging = true;
}

function mouseReleased() {
  dragging = false;
}

function mouseDragged() {
  if (!dragging) return;
  camera.follow = -1;
  camera.targetX -= movedX / camera.zoom;
  camera.targetY -= movedY / camera.zoom;
}

function mouseWheel(event) {
  const factor = Math.exp(-event.delta * 0.0015);
  camera.targetZoom = constrain(camera.targetZoom * factor, 0.08, 60);
  return false;
}

function keyPressed() {
  const zoomStep = 1.25;
  if (key === ' ') view.paused = !view.paused;
  else if (key === 'o' || key === 'O') view.orbits = !view.orbits;
  else if (key === 'l' || key === 'L') view.labels = !view.labels;
  else if (key === 'b' || key === 'B') view.belts = !view.belts;
  else if (key === 'h' || key === 'H') view.help = !view.help;
  else if (key === 'r' || key === 'R') fitToScreen();
  else if (key === ',' || key === '<') speed = Math.max(0.05, speed / 2);
  else if (key === '.' || key === '>') speed = Math.min(256, speed * 2);
  else if (key === '+' || key === '=') camera.targetZoom = constrain(camera.targetZoom * zoomStep, 0.08, 60);
  else if (key === '-' || key === '_') camera.targetZoom = constrain(camera.targetZoom / zoomStep, 0.08, 60);
  else if (key >= '0' && key <= '8') {
    camera.follow = Number(key);
    if (camera.follow === 0) {
      camera.targetX = 0;
      camera.targetY = 0;
    } else {
      camera.targetZoom = Math.max(camera.targetZoom, 3.5);
    }
  }
  if (key === ' ') return false; // keep the page from scrolling
  return true;
}
