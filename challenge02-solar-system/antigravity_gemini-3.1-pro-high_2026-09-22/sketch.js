let stars = [];
let zoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

class CelestialBody {
  constructor(name, radius, distance, speed, color, hasRings = false) {
    this.name = name;
    this.radius = radius;
    this.distance = distance;
    this.speed = speed;
    this.color = color;
    this.angle = random(TWO_PI);
    this.moons = [];
    this.hasRings = hasRings;
  }

  addMoon(moon) {
    this.moons.push(moon);
  }

  update(dt) {
    this.angle += this.speed * dt;
    for (let moon of this.moons) {
      moon.update(dt);
    }
  }

  show() {
    push();
    // Orbit path
    if (this.distance > 0) {
      noFill();
      stroke(255, 50);
      strokeWeight(1 / zoom);
      ellipse(0, 0, this.distance * 2);
    }
    
    // Position
    let x = this.distance * cos(this.angle);
    let y = this.distance * sin(this.angle);
    translate(x, y);

    // Glow
    drawingContext.shadowBlur = this.name === 'Sun' ? 50 : 15;
    drawingContext.shadowColor = this.color;

    // Body
    noStroke();
    fill(this.color);
    ellipse(0, 0, this.radius * 2);
    
    // Reset glow for rings and moons
    drawingContext.shadowBlur = 0;

    // Rings
    if (this.hasRings) {
      noFill();
      stroke(180, 180, 160, 150);
      strokeWeight(2 / zoom);
      ellipse(0, 0, this.radius * 3.5, this.radius * 1.5);
    }

    // Moons
    for (let moon of this.moons) {
      moon.show();
    }
    pop();
  }
}

let sun;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create stars
  for (let i = 0; i < 500; i++) {
    stars.push({
      x: random(-2000, 2000),
      y: random(-2000, 2000),
      size: random(0.5, 2),
      alpha: random(50, 255)
    });
  }

  // Define scale: relative to Earth = 1
  // Sun is scaled down to be visible, distances are logarithmic/compressed
  sun = new CelestialBody('Sun', 40, 0, 0, '#FFCC00');
  
  let mercury = new CelestialBody('Mercury', 3.8, 60, 0.04, '#A8A8A8');
  let venus = new CelestialBody('Venus', 9.5, 90, 0.015, '#E0D0A0');
  let earth = new CelestialBody('Earth', 10, 130, 0.01, '#4B90C2');
  let moon = new CelestialBody('Moon', 2.7, 18, 0.05, '#E0E0E0');
  earth.addMoon(moon);
  
  let mars = new CelestialBody('Mars', 5.3, 170, 0.008, '#D16145');
  let phobos = new CelestialBody('Phobos', 1.5, 12, 0.06, '#A0A0A0');
  let deimos = new CelestialBody('Deimos', 1, 16, 0.04, '#B0B0B0');
  mars.addMoon(phobos);
  mars.addMoon(deimos);
  
  let jupiter = new CelestialBody('Jupiter', 25, 260, 0.002, '#C88B3A');
  let io = new CelestialBody('Io', 3, 35, 0.04, '#E0C060');
  let europa = new CelestialBody('Europa', 2.5, 45, 0.03, '#C0C0D0');
  let ganymede = new CelestialBody('Ganymede', 4, 58, 0.02, '#B0A090');
  let callisto = new CelestialBody('Callisto', 3.5, 75, 0.01, '#808080');
  jupiter.addMoon(io);
  jupiter.addMoon(europa);
  jupiter.addMoon(ganymede);
  jupiter.addMoon(callisto);
  
  let saturn = new CelestialBody('Saturn', 20, 360, 0.0009, '#EAD6B8', true);
  let titan = new CelestialBody('Titan', 4, 45, 0.02, '#E0B080');
  saturn.addMoon(titan);

  let uranus = new CelestialBody('Uranus', 15, 460, 0.0004, '#A9D6E5', true);
  let neptune = new CelestialBody('Neptune', 14, 560, 0.0001, '#3A5A8C');

  sun.moons.push(mercury, venus, earth, mars, jupiter, saturn, uranus, neptune);
  
  // Initial position centered
  offsetX = width / 2;
  offsetY = height / 2;
}

function draw() {
  background(10, 10, 20);
  
  // Handle panning
  if (isDragging) {
    offsetX += mouseX - lastMouseX;
    offsetY += mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }

  translate(offsetX, offsetY);
  scale(zoom);

  // Draw starfield
  noStroke();
  for (let star of stars) {
    fill(255, 255, 255, star.alpha);
    ellipse(star.x, star.y, star.size / zoom);
  }

  // Update and draw solar system
  // Time step modifier can be adjusted if needed, currently 1 frame = 1 unit
  sun.update(1);
  sun.show();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseWheel(event) {
  let zoomAmount = 0.1;
  if (event.delta > 0) {
    zoom *= (1 - zoomAmount);
  } else {
    zoom *= (1 + zoomAmount);
  }
  // Restrict zoom
  zoom = constrain(zoom, 0.1, 5);
}

function mousePressed() {
  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseReleased() {
  isDragging = false;
}
