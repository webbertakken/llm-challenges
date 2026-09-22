// Solar System Simulation in p5.js

let panX = 0;
let panY = 0;
let zoom = 0.85;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let isPaused = false;
let speedFactor = 1.0;
let focusedTarget = null;

let stars = [];
let asteroids = [];
let planets = [];
let sun;

const PLANET_DATA = [
  {
    name: "Mercury",
    color: "#a0a0a0",
    distance: 85,
    radius: 4.5,
    orbitSpeed: 0.04,
    desc: "Smallest planet, closest to the Sun. Surface temperatures swing wildly between day and night.",
    moons: []
  },
  {
    name: "Venus",
    color: "#e3bb76",
    distance: 125,
    radius: 7.5,
    orbitSpeed: 0.028,
    desc: "Second planet from the Sun. Dense, toxic atmosphere traps heat in a runaway greenhouse effect.",
    moons: []
  },
  {
    name: "Earth",
    color: "#4ba3e3",
    distance: 175,
    radius: 8.5,
    orbitSpeed: 0.02,
    desc: "Our home planet. Only known astronomical object known to harbor life and liquid surface water.",
    moons: [
      { name: "Moon", distance: 16, radius: 2.2, speed: 0.08, color: "#d8d8d8" }
    ]
  },
  {
    name: "Mars",
    color: "#cc5a37",
    distance: 225,
    radius: 5.5,
    orbitSpeed: 0.015,
    desc: "The Red Planet. Dusty, cold desert world with a very thin atmosphere and the largest volcano in the solar system.",
    moons: [
      { name: "Phobos", distance: 11, radius: 1.5, speed: 0.11, color: "#bda89b" },
      { name: "Deimos", distance: 15, radius: 1.2, speed: 0.07, color: "#9c8f85" }
    ]
  },
  {
    name: "Jupiter",
    color: "#d4a373",
    distance: 330,
    radius: 20,
    orbitSpeed: 0.009,
    desc: "Massive gas giant with iconic atmospheric storm belts and the centuries-old Great Red Spot.",
    bands: true,
    moons: [
      { name: "Io", distance: 28, radius: 2.2, speed: 0.07, color: "#ffd166" },
      { name: "Europa", distance: 34, radius: 2.0, speed: 0.055, color: "#f1faee" },
      { name: "Ganymede", distance: 41, radius: 2.8, speed: 0.04, color: "#a8dadc" },
      { name: "Callisto", distance: 48, radius: 2.5, speed: 0.03, color: "#6c757d" }
    ]
  },
  {
    name: "Saturn",
    color: "#f4d35e",
    distance: 430,
    radius: 17,
    orbitSpeed: 0.0065,
    desc: "Gas giant famous for its dazzling system of icy planetary rings.",
    hasRings: true,
    ringInner: 22,
    ringOuter: 36,
    moons: [
      { name: "Titan", distance: 42, radius: 2.7, speed: 0.038, color: "#ee9b00" },
      { name: "Enceladus", distance: 49, radius: 1.6, speed: 0.025, color: "#ffffff" }
    ]
  },
  {
    name: "Uranus",
    color: "#64dfdf",
    distance: 530,
    radius: 12,
    orbitSpeed: 0.0045,
    desc: "Ice giant planet that rotates on its side at nearly a 98-degree tilt.",
    hasFaintRings: true,
    moons: [
      { name: "Titania", distance: 22, radius: 1.8, speed: 0.045, color: "#d3d3d3" },
      { name: "Oberon", distance: 28, radius: 1.7, speed: 0.035, color: "#b0c4de" }
    ]
  },
  {
    name: "Neptune",
    color: "#3a86ff",
    distance: 620,
    radius: 11.5,
    orbitSpeed: 0.0035,
    desc: "Distant, dark, cold and whipped by supersonic winds. Deep rich azure blue color.",
    moons: [
      { name: "Triton", distance: 24, radius: 2.2, speed: -0.04, color: "#e0e1dd" }
    ]
  }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  ellipseMode(RADIUS);

  // Initialize background stars
  for (let i = 0; i < 350; i++) {
    stars.push({
      x: random(-width * 2, width * 2),
      y: random(-height * 2, height * 2),
      size: random(0.8, 2.8),
      brightness: random(120, 255),
      twinkleSpeed: random(0.01, 0.05)
    });
  }

  // Asteroid belt between Mars (225) and Jupiter (330)
  for (let i = 0; i < 350; i++) {
    let r = random(255, 295);
    let angle = random(TWO_PI);
    let speed = sqrt(1 / r) * 0.28;
    asteroids.push({
      distance: r,
      angle: angle,
      speed: speed,
      size: random(1, 2.5),
      shade: random(90, 160)
    });
  }

  // Setup Sun
  sun = {
    radius: 36,
    color: color(255, 204, 0),
    glowPulse: 0
  };

  // Setup Planets
  planets = PLANET_DATA.map((p, idx) => ({
    ...p,
    angle: random(TWO_PI),
    currentX: 0,
    currentY: 0,
    moons: (p.moons || []).map(m => ({
      ...m,
      angle: random(TWO_PI)
    }))
  }));

  // Wire HTML controls
  const pauseBtn = document.getElementById("btn-pause");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? "Resume" : "Pause";
    });
  }

  const resetBtn = document.getElementById("btn-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      panX = 0;
      panY = 0;
      zoom = 0.85;
      focusedTarget = null;
    });
  }

  const speedSlider = document.getElementById("slider-speed");
  if (speedSlider) {
    speedSlider.addEventListener("input", (e) => {
      speedFactor = parseFloat(e.target.value);
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(4, 6, 15);

  // Smooth camera tracking
  if (focusedTarget) {
    panX = lerp(panX, -focusedTarget.currentX * zoom, 0.08);
    panY = lerp(panY, -focusedTarget.currentY * zoom, 0.08);
  }

  push();
  // Apply camera transformation
  translate(width / 2 + panX, height / 2 + panY);
  scale(zoom);

  // 1. Draw Twinkling Starfield
  drawStarfield();

  // 2. Draw Sun
  drawSun();

  // 3. Draw Asteroid Belt
  drawAsteroids();

  // 4. Draw Orbits and Planets
  let hoveredPlanet = null;
  for (let p of planets) {
    // Draw orbit path
    stroke(255, 255, 255, 18);
    strokeWeight(1 / zoom);
    noFill();
    ellipse(0, 0, p.distance, p.distance);

    // Update planet position
    if (!isPaused) {
      p.angle += p.orbitSpeed * 0.5 * speedFactor;
    }
    p.currentX = cos(p.angle) * p.distance;
    p.currentY = sin(p.angle) * p.distance;

    // Check hover
    let screenPlanetX = width / 2 + panX + p.currentX * zoom;
    let screenPlanetY = height / 2 + panY + p.currentY * zoom;
    let dToMouse = dist(mouseX, mouseY, screenPlanetX, screenPlanetY);
    let isHovered = dToMouse <= (p.radius + 6) * zoom;
    if (isHovered) {
      hoveredPlanet = p;
    }

    // Draw Planet
    push();
    translate(p.currentX, p.currentY);

    // Selection / hover halo
    if (isHovered || focusedTarget === p) {
      noFill();
      stroke(56, 189, 248, 180);
      strokeWeight(2 / zoom);
      ellipse(0, 0, p.radius + 5, p.radius + 5);
    }

    // Planet body
    noStroke();
    fill(p.color);
    ellipse(0, 0, p.radius, p.radius);

    // Planet details / bands
    if (p.bands) {
      stroke(180, 110, 60, 120);
      strokeWeight(2 / zoom);
      line(-p.radius * 0.8, -p.radius * 0.3, p.radius * 0.8, -p.radius * 0.3);
      line(-p.radius * 0.9, 0, p.radius * 0.9, 0);
      line(-p.radius * 0.8, p.radius * 0.3, p.radius * 0.8, p.radius * 0.3);
    }

    // Planet Rings (e.g. Saturn)
    if (p.hasRings) {
      noFill();
      stroke(220, 200, 140, 160);
      strokeWeight(4 / zoom);
      ellipse(0, 0, p.ringInner + 4, (p.ringInner + 4) * 0.35);
      stroke(245, 230, 180, 90);
      strokeWeight(3 / zoom);
      ellipse(0, 0, p.ringOuter, p.ringOuter * 0.35);
    }

    // Moons
    for (let m of p.moons) {
      if (!isPaused) {
        m.angle += m.speed * speedFactor;
      }
      let mx = cos(m.angle) * m.distance;
      let my = sin(m.angle) * m.distance;

      // Moon orbit
      noFill();
      stroke(255, 255, 255, 14);
      strokeWeight(0.7 / zoom);
      ellipse(0, 0, m.distance, m.distance);

      // Moon body
      noStroke();
      fill(m.color);
      ellipse(mx, my, m.radius, m.radius);
    }

    // Planet Label
    noStroke();
    fill(203, 213, 225, 180);
    textAlign(CENTER);
    textSize(11 / zoom);
    text(p.name, 0, p.radius + 14 / zoom);

    pop();
  }

  pop();

  // Update info panel
  updateInfoPanel(hoveredPlanet);
}

function drawSun() {
  sun.glowPulse += 0.03;
  let pulse = sin(sun.glowPulse) * 4;

  // Outer coronal glow layers
  noStroke();
  for (let r = sun.radius * 2.2; r > sun.radius; r -= 6) {
    let alpha = map(r, sun.radius, sun.radius * 2.2, 50, 0);
    fill(255, 150, 20, alpha);
    ellipse(0, 0, r + pulse, r + pulse);
  }

  // Inner bright glow
  fill(255, 220, 100, 140);
  ellipse(0, 0, sun.radius * 1.25, sun.radius * 1.25);

  // Core Sun body
  fill(255, 245, 160);
  ellipse(0, 0, sun.radius, sun.radius);
}

function drawStarfield() {
  noStroke();
  for (let s of stars) {
    let b = s.brightness + sin(frameCount * s.twinkleSpeed) * 40;
    fill(b, b, b + 20, 200);
    ellipse(s.x, s.y, s.size, s.size);
  }
}

function drawAsteroids() {
  noStroke();
  for (let a of asteroids) {
    if (!isPaused) {
      a.angle += a.speed * 0.5 * speedFactor;
    }
    let ax = cos(a.angle) * a.distance;
    let ay = sin(a.angle) * a.distance;
    fill(a.shade, a.shade, a.shade + 10, 180);
    ellipse(ax, ay, a.size, a.size);
  }
}

function updateInfoPanel(planet) {
  const panel = document.getElementById("info-panel");
  if (!panel) return;

  const target = planet || focusedTarget;
  if (target) {
    panel.style.display = "block";
    document.getElementById("info-name").textContent = target.name;
    let moonStr = target.moons && target.moons.length > 0 
      ? `<br><br><strong>Moons (${target.moons.length}):</strong> ` + target.moons.map(m => m.name).join(", ")
      : "<br><br><em>No major moons</em>";
    document.getElementById("info-desc").innerHTML = target.desc + moonStr;
  } else {
    panel.style.display = "none";
  }
}

function mousePressed() {
  // Ignore clicks on HUD or controls
  if (mouseY < 130 && mouseX < 360) return;

  // Check if a planet was clicked
  let clickedPlanet = null;
  for (let p of planets) {
    let screenPlanetX = width / 2 + panX + p.currentX * zoom;
    let screenPlanetY = height / 2 + panY + p.currentY * zoom;
    if (dist(mouseX, mouseY, screenPlanetX, screenPlanetY) <= (p.radius + 10) * zoom) {
      clickedPlanet = p;
      break;
    }
  }

  if (clickedPlanet) {
    focusedTarget = focusedTarget === clickedPlanet ? null : clickedPlanet;
  } else {
    isDragging = true;
    startDragX = mouseX - panX;
    startDragY = mouseY - panY;
  }
}

function mouseDragged() {
  if (isDragging) {
    panX = mouseX - startDragX;
    panY = mouseY - startDragY;
    focusedTarget = null;
  }
}

function mouseReleased() {
  isDragging = false;
}

function mouseWheel(event) {
  let zoomFactor = event.delta > 0 ? 0.9 : 1.1;
  zoom = constrain(zoom * zoomFactor, 0.15, 4.0);
  return false;
}
