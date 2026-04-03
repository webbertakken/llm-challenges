// Solar System Simulation using p5.js
// Central sun with orbiting planets and moons

let sun;
let planets = [];
let moons = [];
let stars = [];
let centerX, centerY;
let orbitSpeeds = [];
let planetDistances = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    centerX = width / 2;
    centerY = height / 2;
    
    // Create the sun
    sun = new Planet(0, 0, 40, 6, 0);
    
    // Create planets with proportional sizes and distances
    // Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
    planets = [
        new Planet(200, 0.0004, 8, 8, 0, 0),      // Mercury
        new Planet(280, 0.0002, 12, 9, 0, 1),     // Venus
        new Planet(380, 0.00015, 14, 10, 0, 2),   // Earth
        new Planet(520, 0.0001, 10, 11, 0, 3),   // Mars
        new Planet(780, 0.00006, 30, 12, 0, 4),  // Jupiter
        new Planet(1050, 0.00004, 26, 13, 0, 5), // Saturn
        new Planet(1300, 0.00003, 20, 14, 0, 6), // Uranus
        new Planet(1550, 0.00002, 18, 15, 0, 7)  // Neptune
    ];
    
    // Create moons for Earth and Jupiter
    moons = [
        new Moon(380, 10, 0, 2),     // Earth's moon
        new Moon(380, 15, 0, 3),     // Second moon for Earth
        new Moon(780, 20, 0, 4),     // Jupiter's moon
        new Moon(780, 25, 0, 5),     // Another Jupiter moon
        new Moon(780, 30, 0, 6),     // Another Jupiter moon
        new Moon(780, 35, 0, 7)      // Another Jupiter moon
    ];
    
    // Create starfield background
    for (let i = 0; i < 200; i++) {
        stars.push(new Star(random(width), random(height)));
    }
    
    // Initialize orbit speeds
    orbitSpeeds = planets.map(p => p.orbitSpeed);
}

function draw() {
    background(0);
    
    // Draw starfield
    for (let star of stars) {
        star.show();
    }
    
    // Draw sun with glow effect
    noStroke();
    fill(60, 100, 100, 100);
    ellipse(centerX, centerY, sun.radius * 2);
    fill(50, 90, 100, 80);
    ellipse(centerX, centerY, sun.radius * 1.8);
    fill(40, 80, 100, 60);
    ellipse(centerX, centerY, sun.radius * 1.6);
    
    // Draw sun body
    fill(0, 60, 100, 100);
    ellipse(centerX, centerY, sun.radius);
    
    // Draw orbital paths
    for (let planet of planets) {
        noFill();
        strokeWeight(1);
        stroke(255, 100);
        ellipse(centerX, centerY, planet.distance * 2);
    }
    
    // Draw planets and moons
    for (let planet of planets) {
        planet.update();
        planet.show();
    }
    
    for (let moon of moons) {
        moon.update();
        moon.show();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    centerX = width / 2;
    centerY = height / 2;
}

// Planet class
class Planet {
    constructor(distance, orbitSpeed, radius, hue, size, index) {
        this.distance = distance;
        this.orbitSpeed = orbitSpeed;
        this.radius = radius;
        this.angle = random(TWO_PI);
        this.size = size;
        this.index = index;
    }
    
    update() {
        this.angle += this.orbitSpeed;
    }
    
    show() {
        let x = centerX + cos(this.angle) * this.distance;
        let y = centerY + sin(this.angle) * this.distance;
        
        // Draw glow
        noStroke();
        fill(this.index * 30, 90, 100, 80);
        ellipse(x, y, this.radius * 2);
        
        // Draw planet body
        fill(this.index * 30, 90, 100, 100);
        ellipse(x, y, this.radius);
    }
}

// Moon class
class Moon {
    constructor(planetDistance, orbitSpeed, radius, hue) {
        this.distance = random(planetDistance * 0.1, planetDistance * 0.2);
        this.orbitSpeed = orbitSpeed;
        this.angle = random(TWO_PI);
        this.radius = radius;
    }
    
    update() {
        this.angle += this.orbitSpeed * 2;
    }
    
    show() {
        let x = centerX + cos(this.angle) * this.distance;
        let y = centerY + sin(this.angle) * this.distance;
        
        noStroke();
        fill(this.radius * 3, 90, 100, 90);
        ellipse(x, y, this.radius);
    }
}

// Star class
class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = random(0.5, 2);
        this.brightness = random(50, 100);
    }
    
    show() {
        noStroke();
        fill(this.brightness, 0, 0, this.brightness);
        ellipse(this.x, this.y, this.size);
    }
}
