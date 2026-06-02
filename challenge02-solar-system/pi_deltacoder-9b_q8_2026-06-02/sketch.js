/**
 * Solar System Simulation
 * A p5.js visualization of the solar system with orbiting planets, moons, and effects
 */

let sun;
let planets = [];
let moons = [];
let stars = [];

// Zoom and pan controls
let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    
    // Create starfield background
    createStars();
    
    // Create the sun
    sun = new Sun(0, 0);
    
    // Create planets with orbital parameters
    // Distances and sizes are not to scale for visual clarity
    const planetData = [
        { name: 'Mercury', radius: 5, distance: 80, speed: 0.02, color: 10, glow: 80 },
        { name: 'Venus', radius: 8, distance: 120, speed: 0.015, color: 45, glow: 75 },
        { name: 'Earth', radius: 8, distance: 160, speed: 0.01, color: 180, glow: 85 },
        { name: 'Mars', radius: 6, distance: 200, speed: 0.008, color: 330, glow: 70 },
        { name: 'Jupiter', radius: 25, distance: 300, speed: 0.005, color: 30, glow: 90 },
        { name: 'Saturn', radius: 22, distance: 380, speed: 0.004, color: 50, glow: 85, hasRing: true },
        { name: 'Uranus', radius: 15, distance: 450, speed: 0.003, color: 190, glow: 75 },
        { name: 'Neptune', radius: 14, distance: 500, speed: 0.002, color: 220, glow: 80 }
    ];
    
    // Create planet objects
    for (const data of planetData) {
        planets.push(new Planet(data.name, data.radius, data.distance, data.speed, data.color, data.glow, data.hasRing));
    }
    
    // Create moons
    // Earth's moon
    moons.push(new Moon('Moon', 2, 30, 0.03, planets.find(p => p.name === 'Earth')));
    // Mars' moons (Phobos and Deimos)
    moons.push(new Moon('Phobos', 1.5, 15, 0.06, planets.find(p => p.name === 'Mars')));
    moons.push(new Moon('Deimos', 1, 20, 0.04, planets.find(p => p.name === 'Mars')));
    // Jupiter's moons
    moons.push(new Moon('Io', 1.8, 25, 0.04, planets.find(p => p.name === 'Jupiter')));
    moons.push(new Moon('Europa', 1.5, 35, 0.03, planets.find(p => p.name === 'Jupiter')));
    moons.push(new Moon('Ganymede', 2.5, 45, 0.025, planets.find(p => p.name === 'Jupiter')));
    moons.push(new Moon('Callisto', 2.2, 55, 0.02, planets.find(p => p.name === 'Jupiter')));
}

function draw() {
    background(0);
    
    // Apply zoom and pan
    push();
    translate(width / 2 + panX, height / 2 + panY);
    scale(zoom);
    
    // Draw starfield
    for (const star of stars) {
        noStroke();
        fill(star.brightness, star.color);
        circle(star.x, star.y, star.size);
    }
    
    // Draw sun
    sun.update();
    sun.draw();
    
    // Draw planets and their orbits
    for (const planet of planets) {
        planet.update();
        planet.draw();
    }
    
    // Draw moons
    for (const moon of moons) {
        moon.update();
        moon.draw();
    }
    
    pop();
    
    // Draw UI controls
    drawUI();
}

function createStars() {
    const numStars = 300;
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: random(-width, width),
            y: random(-height, height),
            size: random(0.5, 2),
            brightness: random(80, 100),
            color: random(0, 100)
        });
    }
}

function drawUI() {
    fill(200);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text('Solar System Simulation', 10, 10);
    
    textAlign(LEFT, TOP);
    text(`Zoom: ${zoom.toFixed(2)}x`, 10, 25);
    text(`Pan: (${panX.toFixed(0)}, ${panY.toFixed(0)})`, 10, 40);
    text('Scroll to zoom | Drag to pan', 10, 55);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// Mouse interaction for zoom and pan
function mousePressed() {
    if (mouseButton === LEFT) {
        isDragging = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
    } else if (mouseButton === WHEEL) {
        zoom *= 1.1;
    }
}

function mouseDragged() {
    if (isDragging) {
        panX += mouseX - lastMouseX;
        panY += mouseY - lastMouseY;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
    }
}

function mouseWheel(e) {
    zoom *= e.pressedKeys.includes('Shift') ? 1.2 : 1.05;
}

class Sun {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.pulse = 0;
    }
    
    update() {
        this.pulse = sin(frameCount * 0.1) * 5 + 3;
    }
    
    draw() {
        // Outer glow
        noStroke();
        fill(50, 100, 100, 30);
        ellipse(this.x, this.y, this.radius * 4 + this.pulse * 2);
        
        // Inner glow
        fill(45, 100, 100, 50);
        ellipse(this.x, this.y, this.radius * 2 + this.pulse);
        
        // Sun body
        fill(40, 100, 100);
        ellipse(this.x, this.y, this.radius * 2 + this.pulse);
        
        // Sun surface details
        fill(35, 80, 90, 70);
        ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.2, this.radius * 0.4);
        ellipse(this.x + this.radius * 0.4, this.y + this.radius * 0.1, this.radius * 0.3);
        ellipse(this.x - this.radius * 0.1, this.y + this.radius * 0.4, this.radius * 0.35);
    }
}

class Planet {
    constructor(name, radius, distance, speed, color, glow, hasRing = false) {
        this.name = name;
        this.radius = radius;
        this.distance = distance;
        this.angle = random(TWO_PI);
        this.speed = speed;
        this.color = color;
        this.glow = glow;
        this.hasRing = hasRing;
        this.orbitAngle = 0;
    }
    
    update() {
        this.angle += this.speed;
        if (this.hasRing) {
            this.orbitAngle += 0.01;
        }
    }
    
    draw() {
        const x = cos(this.angle) * this.distance;
        const y = sin(this.angle) * this.distance;
        
        // Draw orbit path
        noFill();
        stroke(255, 50, 50, 20);
        strokeWeight(1);
        ellipse(0, 0, this.distance * 2, this.distance * 2);
        
        // Draw ring if present
        if (this.hasRing) {
            noStroke();
            fill(200, 30, 80, 40);
            beginShape();
            for (let i = 0; i < 60; i++) {
                const ringX = cos(this.angle + i * 0.1) * this.distance;
                const ringY = sin(this.angle + i * 0.1) * this.distance;
                const ringOffset = cos(this.orbitAngle + i * 0.1) * this.radius;
                vertex(ringX + ringOffset, ringY + ringOffset);
            }
            endShape(CLOSE);
        }
        
        // Draw planet
        // Glow
        noStroke();
        fill(this.color, this.glow, 100, 60);
        ellipse(x, y, this.radius * 2);
        
        // Planet body
        fill(this.color, this.glow, 100);
        ellipse(x, y, this.radius * 2);
        
        // Shadow/night side
        fill(0, 0, 0, 50);
        ellipse(x - this.radius * 0.5, y - this.radius * 0.5, this.radius * 1.5);
        
        // Name label
        fill(255);
        noStroke();
        textAlign(LEFT, TOP);
        textSize(10);
        text(this.name, x - this.radius - 5, y + this.radius + 10);
    }
}

class Moon {
    constructor(name, radius, distance, speed, parentPlanet) {
        this.name = name;
        this.radius = radius;
        this.distance = distance;
        this.speed = speed;
        this.angle = random(TWO_PI);
        this.parentPlanet = parentPlanet;
    }
    
    update() {
        this.angle += this.speed;
    }
    
    draw() {
        if (!this.parentPlanet) return;
        
        const parentX = cos(this.parentPlanet.angle) * this.parentPlanet.distance;
        const parentY = sin(this.parentPlanet.angle) * this.parentPlanet.distance;
        
        const moonX = parentX + cos(this.angle) * this.distance;
        const moonY = parentY + sin(this.angle) * this.distance;
        
        // Draw moon orbit
        noFill();
        stroke(255, 50, 50, 20);
        strokeWeight(0.5);
        ellipse(parentX, parentY, this.distance * 2);
        
        // Draw moon
        noStroke();
        fill(200, 20, 100);
        ellipse(moonX, moonY, this.radius * 2);
    }
}
