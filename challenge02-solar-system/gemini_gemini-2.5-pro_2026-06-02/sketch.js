// Solar System in p5.js

let sun;
const planets = [];
let stars = [];

class Planet {
  constructor(radius, distance, speed, color, angle = 0) {
    this.radius = radius;
    this.distance = distance;
    this.speed = speed;
    this.angle = angle;
    this.color = color;
    this.moons = [];
  }

  addMoon(radius, distance, speed, color) {
    const moon = new Planet(radius, distance, speed, color, random(TWO_PI));
    this.moons.push(moon);
  }

  update() {
    this.angle += this.speed;
    for (const moon of this.moons) {
      moon.update();
    }
  }

  show() {
    push();
    fill(this.color);
    noStroke();
    rotate(this.angle);
    translate(this.distance, 0);
    ellipse(0, 0, this.radius * 2);

    for (const moon of this.moons) {
      moon.show();
    }
    pop();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Sun
  sun = new Planet(50, 0, 0, color(255, 204, 0));

  // Planets (radius, distance, speed, color)
  // Not to scale, but proportional-ish for visualization
  planets.push(new Planet(8, 80, 0.04, color(200, 200, 200))); // Mercury
  planets.push(new Planet(12, 120, 0.025, color(237, 185, 122))); // Venus
  
  // Earth and Moon
  const earth = new Planet(13, 180, 0.015, color(100, 149, 237));
  earth.addMoon(4, 20, 0.1, color(220, 220, 220)); // Moon
  planets.push(earth);

  planets.push(new Planet(10, 240, 0.01, color(210, 90, 60))); // Mars

  // Jupiter and Moons
  const jupiter = new Planet(30, 320, 0.005, color(222, 206, 184));
  jupiter.addMoon(5, 40, 0.08, color(180)); // Io
  jupiter.addMoon(7, 55, 0.06, color(200)); // Europa
  jupiter.addMoon(6, 70, 0.04, color(160)); // Ganymede
  planets.push(jupiter);
  
  // Saturn with rings
  const saturn = new Planet(25, 420, 0.003, color(232, 214, 184));
  planets.push(saturn);
  
  planets.push(new Planet(20, 510, 0.002, color(173, 216, 230))); // Uranus
  planets.push(new Planet(18, 590, 0.001, color(64, 105, 225))); // Neptune

  // Starfield
  for (let i = 0; i < 500; i++) {
    stars.push({
      x: random(-width * 2, width * 2),
      y: random(-height * 2, height * 2),
      size: random(1, 3)
    });
  }
}

function draw() {
  background(0);
  translate(width / 2, height / 2);

  // Draw starfield
  for (const star of stars) {
    fill(255);
    noStroke();
    ellipse(star.x, star.y, star.size);
  }

  // Draw Sun with glow
  drawingContext.shadowBlur = 32;
  drawingContext.shadowColor = color(255, 204, 0);
  sun.show();
  drawingContext.shadowBlur = 0;

  // Draw planet orbits
  for (const p of planets) {
    stroke(255, 50);
    noFill();
    ellipse(0, 0, p.distance * 2);
  }

  // Draw planets and moons
  for (const p of planets) {
    p.update();
    p.show();
  }
  
  // Draw Saturn's rings
  const saturn = planets[5];
  push();
  rotate(saturn.angle);
  translate(saturn.distance, 0);
  fill(170, 160, 140, 150);
  noStroke();
  ellipse(0, 0, saturn.radius * 3.5, saturn.radius * 0.5);
  ellipse(0, 0, saturn.radius * 2.5, saturn.radius * 0.2);
  pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
