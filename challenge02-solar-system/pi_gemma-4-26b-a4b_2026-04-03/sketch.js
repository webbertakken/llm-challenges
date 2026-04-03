/**
 * Solar System Simulation
 * Using p5.js
 */

let planets = [];
let sun;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Sun setup
  sun = {
    x: width / 2,
    y: height / 2,
    radius: 50,
    color: color(255, 204, 0)
  };

  // Planet data: [name, distance, radius, speed, color, hasMoons]
  // Distances and sizes are scaled for visual appeal, not literal astronomical scales
  const planetData = [
    { name: "Mercury", dist: 70, radius: 6, speed: 0.04, color: color(169, 169, 169), moons: [] },
    { name: "Venus", dist: 100, radius: 12, speed: 0.015, color: color(255, 198, 79), moons: [] },
    { name: "Earth", dist: 140, radius: 13, speed: 0.01, color: color(0, 119, 190), moons: [{ dist: 20, radius: 3, speed: 0.05, color: color(200) }] },
    { name: "Mars", dist: 180, radius: 10, speed: 0.008, color: color(255, 69, 0), moons: [{ dist: 15, radius: 2, speed: 0.03, color: color(150) }] },
    { name: "Jupiter", dist: 250, radius: 30, speed: 0.004, color: color(216, 181, 133), moons: [
      { dist: 40, radius: 4, speed: 0.02, color: color(200) },
      { dist: 50, radius: 3, speed: 0.015, color: color(180) }
    ]},
    { name: "Saturn", dist: 320, radius: 25, speed: 0.003, color: color(234, 214, 184), moons: [
      { dist: 35, radius: 4, speed: 0.02, color: color(200) }
    ], ringRadius: 12 },
    { name: "Uranus", dist: 380, radius: 18, speed: 0.002, color: color(173, 216, 230), moons: [] },
    { name: "Neptune", dist: 430, radius: 17, speed: 0.001, color: color(0, 0, 139), moons: [] }
  ];

  for (let p of planetData) {
    planets.push({
      ...p,
      angle: random(TWO_PI),
      currentX: 0,
      currentY: 0
    });
  }
}

function draw() {
  background(5, 5, 15);
  drawStars();

  // Draw Sun
  drawSun();

  // Draw Planets
  for (let p of planets) {
    // Update position
    p.angle += p.speed;
    p.currentX = sun.x + cos(p.angle) * p.dist;
    p.currentY = sun.y + sin(p.angle) * p.dist;

    // Draw Orbit Path
    noFill();
    stroke(50);
    strokeWeight(1);
    ellipse(sun.x, sun.y, p.dist * 2);

    // Draw Saturn's Rings
    if (p.ringRadius) {
      noFill();
      stroke(150, 130, 100, 150);
      strokeWeight(4);
      ellipse(p.currentX, p.currentY, p.radius * 2 + p.ringRadius * 2);
    }

    // Draw Planet
    noStroke();
    fill(p.color);
    ellipse(p.currentX, p.currentY, p.radius * 2);
    
    // Add a little shading/highlight
    fill(255, 255, 255, 50);
    ellipse(p.currentX - p.radius/3, p.currentY - p.radius/3, p.radius);

    // Draw Moons
    for (let m of p.moons) {
      let mAngle = frameCount * m.speed;
      let mx = p.currentX + cos(mAngle) * m.dist;
      let my = p.currentY + sin(mAngle) * m.dist;
      
      noStroke();
      fill(m.color);
      ellipse(mx, my, m.radius * 2);
    }
  }
}

function drawSun() {
  // Sun Glow
  noStroke();
  for (let i = 10; i > 0; i--) {
    fill(255, 204, 0, 20 - i * 2);
    ellipse(sun.x, sun.y, sun.radius * 2 + i * 10);
  }
  
  // Core
  fill(sun.color);
  ellipse(sun.x, sun.y, sun.radius * 2);
  
  // Bright center
  fill(255, 255, 200);
  ellipse(sun.x, sun.y, sun.radius * 1.5);
}

const stars = [];
function initStars() {
  for (let i = 0; i < 400; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      brightness: random(100, 255)
    });
  }
}

function drawStars() {
  if (stars.length === 0) initStars();
  noStroke();
  for (let s of stars) {
    fill(s.brightness, s.brightness, s.brightness);
    ellipse(s.x, s.y, s.size);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sun.x = width / 2;
  sun.y = height / 2;
}