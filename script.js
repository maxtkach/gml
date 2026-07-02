/* ==========================================================================
   GRAND MASTER LIGHT — Interactive Spotlight & Particles Script (Red Edition)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('light-canvas');
    const ctx = canvas.getContext('2d');
    const spotlight = document.getElementById('spotlight');
    const lightBeam = document.querySelector('.light-beam');
    const logo = document.getElementById('brand-logo');

    // State Variables
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Mouse coordinates (target positions)
    let mouse = { x: width / 2, y: height / 2, active: false };
    // Smoothed spotlight coordinates (current positions)
    let spot = { x: width / 2, y: height / 2 };
    
    // Idle animation variables
    let idleTime = 0;
    let isIdle = true;
    const idleTimeout = 2000; // start idle animation after 2s of inactivity

    // Light beam state (synchronized via JS)
    let beamAngle = 0;

    // Particle settings
    const particles = [];
    const particleCount = Math.min(120, Math.floor((width * height) / 12000));

    // Handle Window Resize
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Handle Mouse & Touch Interaction
    function updateMouseCoords(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        mouse.x = clientX;
        mouse.y = clientY;
        mouse.active = true;
        isIdle = false;
        idleTime = Date.now();
    }

    window.addEventListener('mousemove', updateMouseCoords);
    window.addEventListener('touchmove', updateMouseCoords, { passive: true });
    window.addEventListener('touchstart', updateMouseCoords, { passive: true });

    // Particle Constructor
    class Particle {
        constructor() {
            this.reset();
            // Start at random Y
            this.y = Math.random() * height;
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -10;
            this.size = Math.random() * 2.2 + 0.6;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = Math.random() * 0.5 + 0.2;
            this.baseAlpha = Math.random() * 0.15 + 0.05;
            this.alpha = this.baseAlpha;
            // Wobble effect in the wind
            this.wobbleSpeed = Math.random() * 0.02 + 0.005;
            this.wobbleDistance = Math.random() * 0.5;
            this.wobbleAngle = Math.random() * Math.PI * 2;
        }

        update() {
            this.y += this.speedY;
            this.wobbleAngle += this.wobbleSpeed;
            this.x += this.speedX + Math.sin(this.wobbleAngle) * this.wobbleDistance;

            // Reset if goes off screen
            if (this.y > height || this.x < -20 || this.x > width + 20) {
                this.reset();
            }
        }
    }

    // Initialize Particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Main Animation Loop
    function animate(timestamp) {
        // Clear canvas with background color
        ctx.fillStyle = 'rgba(5, 1, 3, 1)';
        ctx.fillRect(0, 0, width, height);

        const now = Date.now();

        // 1. Calculate Idle Circular Motion
        if (now - idleTime > idleTimeout) {
            isIdle = true;
        }

        if (isIdle) {
            // Gentle circular trajectory for the spotlight when user is inactive
            const time = now * 0.0008;
            const radiusX = Math.min(width * 0.25, 250);
            const radiusY = Math.min(height * 0.2, 180);
            mouse.x = width / 2 + Math.sin(time) * radiusX;
            mouse.y = height / 2 + Math.cos(time * 0.7) * radiusY;
        }

        // 2. Smooth spotlight tracking (Inertia/Lerp)
        spot.x += (mouse.x - spot.x) * 0.08;
        spot.y += (mouse.y - spot.y) * 0.08;

        // 3. Update CSS variables for CSS radial gradient spotlight
        document.documentElement.style.setProperty('--mouse-x', `${spot.x}px`);
        document.documentElement.style.setProperty('--mouse-y', `${spot.y}px`);

        // 4. Update Volumetric Stage Beam (sweep angle)
        beamAngle = Math.sin(now * 0.0003) * 11; // -11 to 11 degrees
        if (lightBeam) {
            lightBeam.style.transform = `translateX(-50%) rotate(${beamAngle}deg)`;
        }

        // 5. Dynamic Logo Shadow Directional Effect
        if (logo) {
            const logoRect = logo.getBoundingClientRect();
            const logoCenterX = logoRect.left + logoRect.width / 2;
            const logoCenterY = logoRect.top + logoRect.height / 2;

            const dx = spot.x - logoCenterX;
            const dy = spot.y - logoCenterY;
            const dist = Math.hypot(dx, dy);

            // Calculate shadow displacement in opposite direction
            const maxOffset = 18;
            const strength = Math.min(dist / 300, 1); // clamp
            const shadowX = -dx * 0.04 * strength;
            const shadowY = -dy * 0.04 * strength;
            const blur = Math.max(8, 20 - dist * 0.02);

            logo.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${blur}px rgba(255, 30, 86, ${0.15 + (1 - strength) * 0.15}))`;
        }

        // 6. Draw Volumetric Light-beams & Spotlight interactions on Particles
        const beamOriginX = width / 2;
        const beamOriginY = -150;
        const beamAngleRad = (beamAngle * Math.PI) / 180;
        const coneHalfAngleRad = (10 * Math.PI) / 180; // 10 degrees half-width of the beam

        particles.forEach(p => {
            p.update();

            // Calculate interaction with cursor spotlight
            const distToMouse = Math.hypot(p.x - spot.x, p.y - spot.y);
            let spotlightGlow = 0;
            if (distToMouse < 350) {
                // Glow factor increases as particle gets closer to the center of cursor light
                spotlightGlow = (1 - distToMouse / 350) * 0.85;
            }

            // Calculate interaction with stage sweep light beam
            // Vector from beam origin to particle
            const dx = p.x - beamOriginX;
            const dy = p.y - beamOriginY;
            const distanceToOrigin = Math.hypot(dx, dy);
            
            // Angle of the line from origin to particle (relative to vertical down)
            const angleToParticle = Math.atan2(dx, dy); // 0 is straight down

            // Difference between beam angle and particle angle
            const diffAngle = angleToParticle - beamAngleRad;
            
            let beamGlow = 0;
            if (Math.abs(diffAngle) < coneHalfAngleRad) {
                // Particle is inside the cone, calculate glow based on proximity to center of beam
                const coneProximity = 1 - Math.abs(diffAngle) / coneHalfAngleRad;
                // Fade out beam further down the screen
                const distanceFade = Math.max(0, 1 - distanceToOrigin / (height * 1.5));
                beamGlow = coneProximity * distanceFade * 0.9;
            }

            // Combine glows and calculate final opacity and color
            const totalGlow = Math.max(spotlightGlow, beamGlow);
            
            if (totalGlow > 0) {
                p.alpha = p.baseAlpha + (1 - p.baseAlpha) * totalGlow;
                p.currentColor = `rgba(255, 170, 185, ${p.alpha})`; // Warm light-red/pink glow when illuminated
                p.currentSize = p.size * (1 + totalGlow * 1.5);
            } else {
                p.alpha = p.baseAlpha;
                p.currentColor = `rgba(255, 255, 255, ${p.alpha})`;
                p.currentSize = p.size;
            }

            // Render Particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.currentSize, 0, Math.PI * 2);
            ctx.fillStyle = p.currentColor;

            // Draw a subtle glow shadow for highlighted particles
            if (totalGlow > 0.4) {
                ctx.shadowBlur = p.currentSize * 2;
                ctx.shadowColor = 'rgba(255, 30, 86, 0.6)';
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fill();
        });

        // Clear shadow settings for canvas performance
        ctx.shadowBlur = 0;

        requestAnimationFrame(animate);
    }

    // Start Animation
    animate();
});
