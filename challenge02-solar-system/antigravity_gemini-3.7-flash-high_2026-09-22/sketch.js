/**
 * Solar System Simulation in p5.js
 */

let zoom = 0.85;
let targetZoom = 0.85;
let panX = 0;
let panY = 0;
let targetPanX = 0;
let targetPanY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let timeScale = 1.0;
let isPaused = false;
let showOrbits = true;
let selectedBody = null;

let stars = [];
let asteroids = [];
let planets = [];
let sun;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container");
  ellipseMode(RADIUS);
  angleMode(RADIANS);

  // Initialize Stars
  for (let i = 0; i < 350; i++) {
    stars.push({
      x: random(-width * 2, width * 2),
      y: random(-height * 2, height * 2),
      size: random(0.5, 2.2),
      alpha: random(100, 255),
      twinkleSpeed: random(0.01, 0.05),
    });
  }

  // Define Celestial Bodies
  sun = {
    name: "Sun",
    type: "Yellow Dwarf Star (G2V)",
    radius: 34,
    color: [255, 204, 0],
    glowColor: [255, 120, 0, 40],
    distStr: "0 AU",
    periodStr: "N/A",
    moonsStr: "8 planets + minor bodies",
  };

  planets = [
    {
      name: "Mercury",
      type: "Terrestrial Planet",
      dist: 70,
      radius: 5,
      speed: 0.04,
      color: [180, 175, 170],
      orbitColor: "rgba(180, 175, 170, 0.2)",
      angle: random(TWO_PI),
      distStr: "0.39 AU (57.9M km)",
      periodStr: "88 days",
      moons: [],
      moonsStr: "0",
    },
    {
      name: "Venus",
      type: "Terrestrial Planet",
      dist: 105,
      radius: 8.5,
      speed: 0.028,
      color: [225, 185, 130],
      orbitColor: "rgba(225, 185, 130, 0.2)",
      angle: random(TWO_PI),
      distStr: "0.72 AU (108.2M km)",
      periodStr: "225 days",
      moons: [],
      moonsStr: "0",
    },
    {
      name: "Earth",
      type: "Terrestrial Planet",
      dist: 150,
      radius: 9,
      speed: 0.02,
      color: [70, 140, 240],
      orbitColor: "rgba(70, 140, 240, 0.2)",
      angle: random(TWO_PI),
      distStr: "1.00 AU (149.6M km)",
      periodStr: "365.25 days",
      moonsStr: "1 (Moon)",
      moons: [
        { name: "Moon", dist: 18, radius: 2.2, speed: 0.08, angle: random(TWO_PI), color: [210, 210, 210] },
      ],
    },
    {
      name: "Mars",
      type: "Terrestrial Planet",
      dist: 200,
      radius: 6.5,
      speed: 0.016,
      color: [215, 95, 60],
      orbitColor: "rgba(215, 95, 60, 0.2)",
      angle: random(TWO_PI),
      distStr: "1.52 AU (227.9M km)",
      periodStr: "687 days",
      moonsStr: "2 (Phobos, Deimos)",
      moons: [
        { name: "Phobos", dist: 12, radius: 1.5, speed: 0.09, angle: random(TWO_PI), color: [160, 150, 140] },
        { name: "Deimos", dist: 17, radius: 1.2, speed: 0.06, angle: random(TWO_PI), color: [140, 130, 120] },
      ],
    },
    {
      name: "Jupiter",
      type: "Gas Giant",
      dist: 310,
      radius: 20,
      speed: 0.0088,
      color: [210, 160, 115],
      bands: true,
      orbitColor: "rgba(210, 160, 115, 0.2)",
      angle: random(TWO_PI),
      distStr: "5.20 AU (778.5M km)",
      periodStr: "11.86 years",
      moonsStr: "95 (Io, Europa, Ganymede, Callisto, ...)",
      moons: [
        { name: "Io", dist: 28, radius: 2, speed: 0.08, angle: random(TWO_PI), color: [240, 230, 110] },
        { name: "Europa", dist: 35, radius: 1.8, speed: 0.06, angle: random(TWO_PI), color: [200, 210, 225] },
        { name: "Ganymede", dist: 43, radius: 2.5, speed: 0.045, angle: random(TWO_PI), color: [150, 145, 140] },
        { name: "Callisto", dist: 52, radius: 2.3, speed: 0.03, angle: random(TWO_PI), color: [120, 115, 110] },
      ],
    },
    {
      name: "Saturn",
      type: "Gas Giant",
      dist: 420,
      radius: 17,
      speed: 0.0065,
      color: [235, 210, 150],
      rings: { inner: 22, outer: 34, color: "rgba(215, 195, 150, 0.65)" },
      orbitColor: "rgba(235, 210, 150, 0.2)",
      angle: random(TWO_PI),
      distStr: "9.58 AU (1.43B km)",
      periodStr: "29.45 years",
      moonsStr: "146 (Titan, Enceladus, ...)",
      moons: [
        { name: "Titan", dist: 42, radius: 2.6, speed: 0.035, angle: random(TWO_PI), color: [230, 190, 100] },
        { name: "Enceladus", dist: 25, radius: 1.4, speed: 0.07, angle: random(TWO_PI), color: [240, 245, 255] },
      ],
    },
    {
      name: "Uranus",
      type: "Ice Giant",
      dist: 520,
      radius: 13,
      speed: 0.0046,
      color: [160, 220, 230],
      rings: { inner: 16, outer: 22, color: "rgba(160, 220, 230, 0.4)" },
      orbitColor: "rgba(160, 220, 230, 0.2)",
      angle: random(TWO_PI),
      distStr: "19.22 AU (2.87B km)",
      periodStr: "84.02 years",
      moonsStr: "28 (Titania, Oberon, ...)",
      moons: [
        { name: "Titania", dist: 26, radius: 1.8, speed: 0.04, angle: random(TWO_PI), color: [190, 195, 200] },
        { name: "Oberon", dist: 33, radius: 1.7, speed: 0.03, angle: random(TWO_PI), color: [170, 175, 180] },
      ],
    },
    {
      name: "Neptune",
      type: "Ice Giant",
      dist: 610,
      radius: 12.5,
      speed: 0.0036,
      color: [60, 110, 245],
      orbitColor: "rgba(60, 110, 245, 0.2)",
      angle: random(TWO_PI),
      distStr: "30.05 AU (4.50B km)",
      periodStr: "164.8 years",
      moonsStr: "16 (Triton, Proteus, ...)",
      moons: [
        { name: "Triton", dist: 24, radius: 2.0, speed: -0.045, angle: random(TWO_PI), color: [200, 215, 225] },
      ],
    },
  ];

  // Asteroid Belt (between Mars and Jupiter: dist 230 - 275)
  for (let i = 0; i < 280; i++) {
    asteroids.push({
      dist: random(230, 275),
      angle: random(TWO_PI),
      speed: random(0.011, 0.014),
      size: random(0.8, 2.0),
      color: random(110, 160),
    });
  }

  // Connect UI Controls
  const speedSlider = document.getElementById("speedSlider");
  const speedVal = document.getElementById("speedVal");
  if (speedSlider && speedVal) {
    speedSlider.addEventListener("input", (e) => {
      timeScale = parseFloat(e.target.value);
      speedVal.innerText = `${timeScale.toFixed(1)}x`;
    });
  }

  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      pauseBtn.innerText = isPaused ? "Resume" : "Pause";
    });
  }

  const resetCamBtn = document.getElementById("resetCamBtn");
  if (resetCamBtn) {
    resetCamBtn.addEventListener("click", () => {
      targetZoom = 0.85;
      targetPanX = 0;
      targetPanY = 0;
      selectedBody = null;
      hideInfo();
    });
  }

  const toggleOrbitsBtn = document.getElementById("toggleOrbitsBtn");
  if (toggleOrbitsBtn) {
    toggleOrbitsBtn.addEventListener("click", () => {
      showOrbits = !showOrbits;
    });
  }
}

function draw() {
  background(4, 7, 16);

  // Smooth camera interpolation
  zoom = lerp(zoom, targetZoom, 0.1);
  panX = lerp(panX, targetPanX, 0.1);
  panY = lerp(panY, targetPanY, 0.1);

  // Center coordinate system with pan & zoom
  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  // 1. Draw Starfield
  drawStars();

  // 2. Draw Sun Glow and Sun Body
  drawSun();

  // 3. Draw Asteroid Belt
  drawAsteroids();

  // 4. Draw Orbit Lines and Planets
  drawPlanets();

  pop();
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    let alpha = s.alpha + sin(frameCount * s.twinkleSpeed) * 50;
    fill(255, 255, 255, constrain(alpha, 40, 255));
    circle(s.x, s.y, s.size);
  }
}

function drawSun() {
  push();
  noStroke();

  // Outer corona animated layers
  let pulse = sin(frameCount * 0.03) * 4;
  for (let r = 80; r > 34; r -= 6) {
    let alpha = map(r, 34, 80, 50, 0);
    fill(255, 140, 0, alpha);
    circle(0, 0, r + pulse * 0.5);
  }

  // Inner intense glow
  for (let r = 45; r > 34; r -= 2) {
    fill(255, 220, 50, 60);
    circle(0, 0, r);
  }

  // Core
  fill(sun.color[0], sun.color[1], sun.color[2]);
  circle(0, 0, sun.radius);

  // Sun spot / surface texture details
  fill(255, 240, 180, 180);
  circle(4, -5, sun.radius * 0.7);
  fill(255, 255, 240, 220);
  circle(6, -8, sun.radius * 0.4);

  // Sun Label
  fill(255, 220, 150, 200);
  textAlign(CENTER);
  textSize(11 / zoom);
  text("Sun", 0, sun.radius + 16);

  pop();
}

function drawAsteroids() {
  noStroke();
  for (let a of asteroids) {
    if (!isPaused) {
      a.angle += a.speed * timeScale * 0.05;
    }
    let x = cos(a.angle) * a.dist;
    let y = sin(a.angle) * a.dist;
    fill(a.color, a.color, a.color, 160);
    circle(x, y, a.size);
  }
}

function drawPlanets() {
  for (let p of planets) {
    // 1. Draw Orbit Ring
    if (showOrbits) {
      noFill();
      stroke(p.orbitColor);
      strokeWeight(1 / zoom);
      circle(0, 0, p.dist);
    }

    // 2. Update Planet Position
    if (!isPaused) {
      p.angle += p.speed * timeScale * 0.05;
    }
    let px = cos(p.angle) * p.dist;
    let py = sin(p.angle) * p.dist;
    p.currentX = px;
    p.currentY = py;

    push();
    translate(px, py);

    // 3. Draw Rings (if Saturn / Uranus)
    if (p.rings) {
      push();
      noFill();
      stroke(p.rings.color);
      strokeWeight((p.rings.outer - p.rings.inner) * 0.7);
      scale(1.2, 0.4); // tilt perspective
      circle(0, 0, (p.rings.inner + p.rings.outer) / 2);
      pop();
    }

    // 4. Draw Planet Body
    noStroke();
    fill(p.color[0], p.color[1], p.color[2]);
    circle(0, 0, p.radius);

    // 5. Sunlit Shading / Day-Night Terminator
    let sunAngle = atan2(-py, -px);
    push();
    rotate(sunAngle);
    // Dark shadow hemisphere
    fill(0, 0, 0, 110);
    arc(0, 0, p.radius, p.radius, HALF_PI, -HALF_PI);
    pop();

    // 6. Draw Planet Moons
    if (p.moons && p.moons.length > 0) {
      for (let m of p.moons) {
        if (!isPaused) {
          m.angle += m.speed * timeScale * 0.1;
        }
        let mx = cos(m.angle) * m.dist;
        let my = sin(m.angle) * m.dist;

        // Moon Orbit
        if (showOrbits && zoom > 1.2) {
          noFill();
          stroke(255, 255, 255, 30);
          strokeWeight(0.5 / zoom);
          circle(0, 0, m.dist);
        }

        // Moon Body
        noStroke();
        fill(m.color[0], m.color[1], m.color[2]);
        circle(mx, my, m.radius);
      }
    }

    // 7. Planet Label
    fill(220, 230, 245, 200);
    textAlign(CENTER);
    textSize(10 / zoom);
    text(p.name, 0, p.radius + 12 / zoom);

    pop();
  }
}

// Interaction Handlers
function mousePressed() {
  if (mouseY < 200 && mouseX < 340) {
    return; // Don't pan if clicking UI overlay
  }

  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;

  // Check planet selection
  let worldX = (mouseX - width / 2 - panX) / zoom;
  let worldY = (mouseY - height / 2 - panY) / zoom;

  // Check Sun click
  if (dist(worldX, worldY, 0, 0) <= sun.radius + 5) {
    showInfo(sun);
    return;
  }

  // Check Planets click
  for (let p of planets) {
    if (dist(worldX, worldY, p.currentX, p.currentY) <= p.radius + 6) {
      showInfo(p);
      return;
    }
  }
}

function mouseDragged() {
  if (isDragging) {
    targetPanX += mouseX - lastMouseX;
    targetPanY += mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

function mouseReleased() {
  isDragging = false;
}

function mouseWheel(event) {
  let zoomFactor = event.delta > 0 ? 0.9 : 1.1;
  targetZoom = constrain(targetZoom * zoomFactor, 0.25, 4.0);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function showInfo(body) {
  selectedBody = body;
  const panel = document.getElementById("planet-info-panel");
  if (!panel) return;
  panel.style.display = "block";
  document.getElementById("infoName").innerText = body.name;
  document.getElementById("infoType").innerText = body.type;
  document.getElementById("infoDist").innerText = body.distStr;
  document.getElementById("infoPeriod").innerText = body.periodStr;
  document.getElementById("infoMoons").innerText = body.moonsStr;
}

function hideInfo() {
  selectedBody = null;
  const panel = document.getElementById("planet-info-panel");
  if (panel) panel.style.display = "none";
}
