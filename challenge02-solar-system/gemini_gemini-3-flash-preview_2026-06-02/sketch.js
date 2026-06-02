/**
 * Solar System Simulation in p5.js
 * Features:
 * - 8 major planets with relative sizes and distances
 * - Moons for Earth and Mars
 * - Rings for Saturn and Uranus
 * - Starfield background
 * - Glow effect for the Sun
 */

let planets = [];
let sunSize = 50;
let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create stars for the background
  for (let i = 0; i < 400; i++) {
    stars.push({
      x: random(-width, width),
      y: random(-height, height),
      size: random(1, 3),
      brightness: random(150, 255)
    });
  }

  // Planet data: name, color, distance (scaled), size (scaled), speed, moons, hasRings
  // Distances and sizes are roughly proportional for visual clarity rather than strict realism
  planets = [
    { name: "Mercury", color: "#A5A5A5", distance: 60, size: 8, speed: 0.04, moons: [] },
    { name: "Venus", color: "#E3BB76", distance: 90, size: 14, speed: 0.015, moons: [] },
    { name: "Earth", color: "#2271B3", distance: 130, size: 15, speed: 0.01, moons: [{ distance: 20, size: 4, speed: 0.05 }] },
    { name: "Mars", color: "#E27B58", distance: 170, size: 12, speed: 0.008, moons: [{ distance: 15, size: 3, speed: 0.08 }, { distance: 22, size: 2, speed: 0.06 }] },
    { name: "Jupiter", color: "#D39C7E", distance: 250, size: 35, speed: 0.004, moons: [] },
    { name: "Saturn", color: "#C5AB6E", distance: 330, size: 30, speed: 0.002, moons: [], hasRings: true },
    { name: "Uranus", color: "#B5E3E3", distance: 400, size: 22, speed: 0.0012, moons: [], hasRings: true },
    { name: "Neptune", color: "#6081FF", distance: 460, size: 21, speed: 0.001, moons: [] }
  ];
}

function draw() {
  background(5, 5, 15);
  translate(width / 2, height / 2);

  // Draw starfield
  noStroke();
  for (let star of stars) {
    fill(star.brightness);
    circle(star.x, star.y, star.size);
  }

  // Draw Sun with glow
  drawSun();

  // Draw Planets
  for (let p of planets) {
    push();
    let angle = frameCount * p.speed;
    rotate(angle);
    
    // Draw orbit path
    noFill();
    stroke(255, 255, 255, 30);
    ellipse(0, 0, p.distance * 2);

    // Position planet
    translate(p.distance, 0);
    
    // Draw Rings if applicable
    if (p.hasRings) {
      drawRings(p.size, p.color);
    }

    // Draw Planet
    noStroke();
    fill(p.color);
    circle(0, 0, p.size);
    
    // Draw planet shading (simple)
    fill(0, 0, 0, 100);
    arc(0, 0, p.size, p.size, PI + HALF_PI, HALF_PI);

    // Draw Moons
    for (let m of p.moons) {
      push();
      rotate(frameCount * m.speed);
      translate(m.distance, 0);
      fill(200);
      circle(0, 0, m.size);
      pop();
    }
    
    pop();
  }
}

function drawSun() {
  // Simple radial glow effect
  for (let i = 10; i > 0; i--) {
    fill(255, 200 - i * 15, 0, 20);
    noStroke();
    circle(0, 0, sunSize + i * 8);
  }
  fill(255, 240, 0);
  circle(0, 0, sunSize);
}

function drawRings(planetSize, planetColor) {
  noFill();
  strokeWeight(2);
  let ringColor = color(planetColor);
  ringColor.setAlpha(150);
  stroke(ringColor);
  ellipse(0, 0, planetSize * 2.2, planetSize * 0.8);
  
  ringColor.setAlpha(100);
  stroke(ringColor);
  ellipse(0, 0, planetSize * 2.5, planetSize * 0.9);
  strokeWeight(1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
