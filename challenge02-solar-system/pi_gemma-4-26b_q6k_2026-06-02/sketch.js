/** @type {p5.js.Sketch} */

let planets = [];
let sunSize = 50;
let stars = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Generate stars
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: random(width),
            y: random(height),
            size: random(0.5, 2),
            opacity: random(100, 255)
        });
    }

    // Planet data: [name, color, distance, size, orbitSpeed, moonsCount]
    const planetData = [
        ['Mercury', '#A5A5A5', 60, 8, 0.047, 0],
        ['Venus', '#E3BB76', 90, 14, 0.035, 0],
        ['Earth', '#2271B3', 130, 15, 0.029, 1], // Moon included below
        ['Mars', '#E27B58', 170, 12, 0.024, 2], // Moons included below
        ['Jupiter', '#D39C7E', 240, 35, 0.013, 4],
        ['Saturn', '#C5AB6E', 320, 30, 0.009, 2], // Rings included
        ['Uranus', '#BBE1E4', 380, 20, 0.006, 1],
        ['Neptune', '#6081FF', 430, 19, 0.005, 1]
    ];

    for (let i = 0; i < planetData.length; i++) {
        let [name, color, dist, size, speed, moons] = planetData[i];
        let p = new Planet(name, color, dist, size, speed);
        planets.push(p);

        // Add special moons
        if (name === 'Earth') {
            p.addMoon('#DDD', 25, 0.08);
        } else if (name === 'Mars') {
            p.addMoon('#888', 18, 0.05);
            p.addMoon('#777', 22, 0.07);
        } else if (name === 'Jupiter') {
            p.addMoon('#AA8877', 45, 0.02);
            p.addMoon('#997766', 52, 0.03);
            p.addMoon('#886655', 58, 0.015);
            p.addMoon('#775544', 65, 0.025);
        } else if (name === 'Saturn') {
            p.hasRings = true;
            p.addMoon('#CCCCBB', 45, 0.02);
            p.addMoon('#AAAA99', 52, 0.03);
        } else if (name === 'Uranus') {
            p.addMoon('#E0FFFF', 30, 0.04);
        } else if (name === 'Neptune') {
            p.addMoon('#4169E1', 30, 0.05);
        }
    }
}

function draw() {
    background(5, 5, 15);
    
    // Draw starfield
    noStroke();
    for (let star of stars) {
        fill(255, star.opacity);
        circle(star.x, star.y, star.size);
    }

    translate(width / 2, height / 2);

    // Draw Sun with glow
    for (let r = sunSize * 2; r > 0; r -= 2) {
        fill(255, 150, 0, 10);
        circle(0, 0, sunSize * 2 + r);
    }
    fill(255, 220, 0);
    noStroke();
    circle(0, 0, sunSize);
    fill(255, 255, 200);
    circle(0, 0, sunSize * 0.8);

    // Draw Planets
    for (let p of planets) {
        p.update();
        p.display();
    }
}

class Planet {
    constructor(name, color, distance, size, speed) {
        this.name = name;
        this.color = color;
        this.distance = distance;
        this.size = size;
        this.speed = speed;
        this.angle = random(TWO_PI);
        this.moons = [];
        this.hasRings = false;
    }

    addMoon(color, dist, speed) {
        this.moons.push({
            color: color,
            distance: dist,
            speed: speed
        });
    }

    update() {
        this.angle += this.speed;
    }

    display() {
        push();
        rotate(this.angle);
        translate(this.distance, 0);

        // Orbit path
        noFill();
        stroke(255, 255, 255, 30);
        strokeWeight(1);
        circle(0, 0, this.distance * 2);

        // Draw Saturn's rings
        if (this.hasRings) {
            noFill();
            stroke(this.color);
            strokeWeight(4);
            ellipse(0, 0, this.size * 3, this.size * 0.8);
            strokeWeight(1);
        }

        // Draw Planet
        noStroke();
        fill(this.color);
        circle(0, 0, this.size);
        
        // Add some shading/depth
        fill(0, 0, 0, 50);
        circle(this.size*0.1, this.size*0.1, this.size);

        // Draw Moons
        for (let moon of this.moons) {
            push();
            let mAngle = frameCount * moon.speed;
            translate(moon.distance * cos(mAngle), moon.distance * sin(mAngle));
            fill(moon.color);
            noStroke();
            circle(0, 0, this.size * 0.3);
            pop();
        }

        pop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
