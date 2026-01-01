const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let rockets = [];
let particles = [];

const words = ["FELIZ", "AÑO", "NUEVO", "2026"];
let currentWordIndex = 0;

// --- CLASE COHETE ---
function Rocket(targetX, targetY, color, payloadText) {
    this.x = window.innerWidth / 2;
    if (!payloadText) this.x += (Math.random() - 0.5) * 200;
    this.y = window.innerHeight;
    this.targetX = targetX;
    this.targetY = targetY;
    this.payloadText = payloadText;
    this.color = payloadText ? "#FFFFFF" : color; 
    const speedFactor = payloadText ? 110 : 100;
    this.vx = (targetX - this.x) / speedFactor;
    this.vy = -Math.sqrt(2 * 0.05 * (window.innerHeight - targetY));
    if (payloadText) this.vy *= 0.95;
    this.gravity = 0.05;
}

Rocket.prototype.draw = function() {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 3, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    if (this.payloadText) {
         ctx.shadowBlur = 10;
         ctx.shadowColor = "white";
         ctx.fill();
    }
    ctx.restore();
};

Rocket.prototype.update = function(index) {
    this.vx *= 0.998;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;

    if (this.vy >= 0 || this.y <= this.targetY) {
        this.explode();
        rockets.splice(index, 1);
    }
};

Rocket.prototype.explode = function() {
    if (this.payloadText) {
        // Pasar la posición exacta de la explosión
        spawnTextParticles(this.payloadText, this.x, this.y);
    } else {
        for (let i = 0; i < 70; i++) {
            // Partículas normales no necesitan destino
            particles.push(new Particle(this.x, this.y, this.color, false));
        }
    }
};

// --- CLASE PARTÍCULA (Modificada para el nuevo efecto) ---
// Ahora acepta destX y destY (destino) si es texto
function Particle(x, y, color, isText, destX, destY) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isText = isText;
    this.alpha = 1;
    this.friction = 0.95;
    this.gravity = 0.06;

    if (isText) {
        // NUEVO ESTADO: 'gathering' (reuniéndose después de explotar)
        this.state = 'gathering';
        this.destX = destX; // Dónde debe terminar para formar la letra
        this.destY = destY;
        this.waitTimer = 150; // Tiempo de espera una vez formado
        // Velocidad inicial de explosión, pero menos caótica
        this.velocity = {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
        };
    } else {
        this.state = 'exploding';
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }
}

Particle.prototype.draw = function() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    // Las de texto son un poco más pequeñas para mejor definición
    ctx.arc(this.x, this.y, this.isText ? 1.8 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
};

Particle.prototype.update = function() {
    if (this.state === 'gathering') {
        // --- LA MAGIA DEL NUEVO EFECTO ---
        // 1. Física de explosión inicial
        this.velocity.x *= 0.92; // Frenado rápido
        this.velocity.y *= 0.92;
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // 2. Fuerza de atracción hacia el destino final (Easing)
        // Se mueven un 10% de la distancia restante en cada frame
        this.x += (this.destX - this.x) * 0.1;
        this.y += (this.destY - this.y) * 0.1;

        // Si están muy cerca del destino, se quedan quietas ('waiting')
        const dist = Math.hypot(this.destX - this.x, this.destY - this.y);
        if (dist < 1) {
            this.x = this.destX;
            this.y = this.destY;
            this.state = 'waiting';
        }

    } else if (this.state === 'waiting') {
        // Estado estático para leer
        this.waitTimer--;
        if (this.waitTimer <= 0) {
            this.state = 'exploding';
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10;
            this.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
        }
    } else {
        // Estado de explosión final (desvanecimiento)
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.isText ? 0.015 : 0.02;
    }
};

// --- FUNCIONES DE CONTROL ---

function spawnTextParticles(text, centerX, centerY) {
    ctx.font = "bold 60px Arial";
    const textWidth = ctx.measureText(text).width;
    const offscreen = document.createElement('canvas');
    offscreen.width = textWidth + 40;
    offscreen.height = 100;
    const octx = offscreen.getContext('2d');
    octx.font = "bold 60px Arial";
    octx.fillStyle = "white";
    octx.textAlign = "center";
    octx.fillText(text, offscreen.width / 2, 70);
    
    const imageData = octx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    const startXOffset = centerX - (offscreen.width / 2);
    const startYOffset = centerY - 50;

    for (let y = 0; y < offscreen.height; y += 4) {
        for (let x = 0; x < offscreen.width; x += 4) {
            if (imageData[(y * offscreen.width + x) * 4 + 3] > 128) {
                // Destino final calculado
                const destX = startXOffset + x;
                const destY = startYOffset + y;
                // IMPORTANTE: Nacen en centerX, centerY, pero saben su destX, destY
                particles.push(new Particle(centerX, centerY, "white", true, destX, destY));
            }
        }
    }
}

function launchTextRocket(text) {
    const targetX = canvas.width / 2;
    const targetY = canvas.height / 3; 
    rockets.push(new Rocket(targetX, targetY, null, text));
}

function launchBackgroundRocket() {
    const targetX = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
    const targetY = Math.random() * (canvas.height / 2) + 100; 
    const color = 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 65%)';
    rockets.push(new Rocket(targetX, targetY, color, null));
}

canvas.addEventListener('mousedown', function(e) {
    const color = 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 80%)';
    rockets.push(new Rocket(e.clientX, e.clientY, color, null));
});

function animate() {
    ctx.fillStyle = 'rgba(0, 5, 16, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].update(i);
        if (rockets[i]) rockets[i].draw();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    requestAnimationFrame(animate);
}

setInterval(launchBackgroundRocket, 1200);

setInterval(function() {
    launchTextRocket(words[currentWordIndex]);
    currentWordIndex = (currentWordIndex + 1) % words.length;
}, 7000);

function openCard() { document.getElementById('card-modal').classList.remove('hidden'); }
function closeCard() { document.getElementById('card-modal').classList.add('hidden'); }

animate();
setTimeout(function() { launchTextRocket(words[0]); }, 1000);