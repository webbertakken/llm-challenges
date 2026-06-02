let sun;
let planets = [];
let stars = [];
let zoom = 1;
let camX = 0;
let camY = 0;
let isDragging = false;
let previousMouseX;
let previousMouseY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Generate starfield
  for (let i = 0; i < 800; i++) {
    stars.push({
      x: random(-width * 2, width * 2),
      y: random(-height * 2, height * 2),
      size: random(0.5, 2.5),
      brightness: random(100, 255)
    });
  }

  // Define Sun
  sun = new CelestialBody(0, 0, 60, [255, 204, 0], 0, "Sun");

  // Define Planets
  // parameters: distance, radius, color, orbitSpeed, name
  
  // Mercury
  planets.push(new CelestialBody(90, 4, [168, 168, 168], 0.04, "Mercury"));
  
  // Venus
  planets.push(new CelestialBody(130, 9, [227, 187, 118], 0.015, "Venus"));
  
  // Earth
  let earth = new CelestialBody(180, 10, [40, 122, 184], 0.01, "Earth");
  earth.addMoon(new CelestialBody(22, 2, [200, 200, 200], 0.05, "Moon"));
  planets.push(earth);
  
  // Mars
  let mars = new CelestialBody(230, 5, [193, 68, 14], 0.008, "Mars");
  mars.addMoon(new CelestialBody(14, 1.5, [150, 150, 150], 0.06, "Phobos"));
  mars.addMoon(new CelestialBody(18, 1, [180, 180, 180], 0.04, "Deimos"));
  planets.push(mars);
  
  // Jupiter
  let jupiter = new CelestialBody(350, 25, [201, 144, 57], 0.002, "Jupiter");
  jupiter.addMoon(new CelestialBody(38, 3, [220, 220, 220], 0.03, "Io"));
  jupiter.addMoon(new CelestialBody(48, 2.5, [240, 240, 240], 0.02, "Europa"));
  jupiter.addMoon(new CelestialBody(58, 3.5, [190, 190, 190], 0.015, "Ganymede"));
  jupiter.addMoon(new CelestialBody(68, 3, [170, 170, 170], 0.01, "Callisto"));
  planets.push(jupiter);
  
  // Saturn
  let saturn = new CelestialBody(480, 21, [234, 214, 184], 0.0009, "Saturn");
  saturn.hasRings = true;
  saturn.addMoon(new CelestialBody(45, 4, [210, 210, 210], 0.025, "Titan"));
  planets.push(saturn);
  
  // Uranus
  let uranus = new CelestialBody(590, 14, [209, 231, 231], 0.0004, "Uranus");
  uranus.addMoon(new CelestialBody(25, 1.5, [200, 200, 200], 0.02, "Titania"));
  planets.push(uranus);
  
  // Neptune
  let neptune = new CelestialBody(680, 13, [63, 84, 186], 0.0001, "Neptune");
  neptune.addMoon(new CelestialBody(24, 2, [180, 180, 180], 0.015, "Triton"));
  planets.push(neptune);
}

function draw() {
  background(5, 8, 20);
  
  translate(width / 2 + camX, height / 2 + camY);
  scale(zoom);

  // Draw Starfield (with slight parallax effect)
  noStroke();
  for (let star of stars) {
    fill(255, 255, 255, star.brightness);
    ellipse(star.x - camX * 0.1, star.y - camY * 0.1, star.size / zoom, star.size / zoom);
  }

  // Draw asteroid belt between Mars and Jupiter
  stroke(150, 150, 150, 80);
  strokeWeight(max(1.5 / zoom, 0.5));
  for (let i = 0; i < 800; i++) {
    let a = i * 137.5; // golden angle for distribution
    let r = 280 + (noise(i) * 40);
    point(cos(a) * r, sin(a) * r);
  }

  sun.show();

  for (let planet of planets) {
    planet.update();
    planet.show();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  isDragging = true;
  previousMouseX = mouseX;
  previousMouseY = mouseY;
}

function mouseReleased() {
  isDragging = false;
}

function mouseDragged() {
  if (isDragging) {
    camX += (mouseX - previousMouseX);
    camY += (mouseY - previousMouseY);
    previousMouseX = mouseX;
    previousMouseY = mouseY;
  }
}

function mouseWheel(event) {
  let zoomAmount = 0.05;
  let oldZoom = zoom;
  if (event.delta > 0) {
    zoom -= zoomAmount;
  } else {
    zoom += zoomAmount;
  }
  zoom = constrain(zoom, 0.1, 5);
  
  // Optional: zoom towards mouse position (simplified)
  // Just standard zoom for now.
  return false; // Prevent default scrolling
}

class CelestialBody {
  constructor(distance, radius, color, orbitSpeed, name) {
    this.distance = distance;
    this.radius = radius;
    this.color = color;
    this.orbitSpeed = orbitSpeed;
    this.angle = random(TWO_PI);
    this.name = name;
    this.moons = [];
    this.hasRings = false;
  }

  addMoon(moon) {
    this.moons.push(moon);
  }

  update() {
    this.angle += this.orbitSpeed;
    for (let moon of this.moons) {
      moon.update();
    }
  }

  show() {
    push();
    
    // Draw orbit path
    if (this.distance > 0) {
      noFill();
      stroke(255, 255, 255, 30);
      strokeWeight(max(1 / zoom, 0.5)); // Keep orbit lines thin regardless of zoom
      ellipse(0, 0, this.distance * 2);
    }
    
    // Move to the position of the celestial body
    let x = this.distance * cos(this.angle);
    let y = this.distance * sin(this.angle);
    translate(x, y);

    // Glow effect for sun
    if (this.name === "Sun") {
      noStroke();
      for (let i = 0; i < 12; i++) {
        fill(255, 204, 0, 20 - i * 1.5);
        ellipse(0, 0, this.radius * 2 + i * 12);
      }
    }

    // Draw rings
    if (this.hasRings) {
      push();
      rotate(PI / 6); // Tilt the rings
      noFill();
      stroke(234, 214, 184, 150);
      strokeWeight(max(3 / zoom, 1));
      ellipse(0, 0, this.radius * 3.5, this.radius * 1.5);
      stroke(200, 200, 200, 100);
      strokeWeight(max(1.5 / zoom, 0.5));
      ellipse(0, 0, this.radius * 4.2, this.radius * 1.8);
      pop();
    }

    // Draw body
    noStroke();
    fill(this.color);
    ellipse(0, 0, this.radius * 2);

    // Simple shadow to make them look spherical
    if (this.name !== "Sun") {
      push();
      // Shadow should be drawn away from the sun
      rotate(this.angle + PI/2);
      fill(0, 0, 0, 150);
      arc(0, 0, this.radius * 2, this.radius * 2, 0, PI);
      pop();
    }
    
    // Label
    fill(255, 255, 255, 180);
    textSize(12 / max(zoom, 0.3));
    textAlign(CENTER);
    text(this.name, 0, this.radius + 18 / max(zoom, 0.3));

    // Draw moons
    for (let moon of this.moons) {
      moon.show();
    }
    pop();
  }
}
